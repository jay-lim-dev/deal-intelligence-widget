// ─── Tab Switching ──────────────────────────────────────────────────────────

const tabBtns   = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + target).classList.add('active');
  });
});

// ─── Messaging: Character Count ─────────────────────────────────────────────

const toNumber  = document.getElementById('to-number');
const smsBody   = document.getElementById('sms-body');
const charCount = document.getElementById('char-count');
const btnSend   = document.getElementById('btn-send');
const btnClear  = document.getElementById('btn-clear');
const statusMsg = document.getElementById('status-msg');
const SMS_MAX   = 160;

// Set by populateMessaging once the record loads; gates the Send button.
var mobileNumber  = null;
// Tracks the date of the last separator rendered; prevents duplicate separators.
var lastChatDate  = null;

const FROM_NUMBER = '14355000394';

smsBody.addEventListener('input', () => {
  const len = smsBody.value.length;
  charCount.textContent = `${len} / ${SMS_MAX}`;
  charCount.classList.remove('warning', 'over');
  if (len >= SMS_MAX) {
    charCount.classList.add('over');
  } else if (len >= SMS_MAX * 0.85) {
    charCount.classList.add('warning');
  }
  btnSend.disabled = len === 0 || !mobileNumber;
});

// ─── Messaging: Clear ───────────────────────────────────────────────────────

btnClear.addEventListener('click', () => {
  smsBody.value = '';
  charCount.textContent = `0 / ${SMS_MAX}`;
  charCount.classList.remove('warning', 'over');
  btnSend.disabled = true;
  clearStatus();
});

// ─── Messaging: Send ────────────────────────────────────────────────────────

btnSend.addEventListener('click', function() {
  btnSend.disabled    = true;
  btnSend.textContent = 'Sending…';
  clearStatus();

  ZOHO.CRM.FUNCTIONS.execute('sendTwilioSMS', {
    arguments: JSON.stringify({
      fromNumber: FROM_NUMBER,
      toNumber:   mobileNumber,
      msg:        smsBody.value
    })
  })
  .then(function(data) {
    if (data && data.code === 'success') {
      var sentText = smsBody.value;
      smsBody.value = '';
      charCount.textContent = '0 / ' + SMS_MAX;
      charCount.classList.remove('warning', 'over');
      appendChatBubble(sentText, 'OUT', new Date());
    } else {
      showStatus('error', 'Failed to send. Please try again.');
    }
  })
  .catch(function() {
    showStatus('error', 'Failed to send. Please try again.');
  })
  .finally(function() {
    btnSend.textContent = 'Send SMS';
    btnSend.disabled    = smsBody.value.length === 0 || !mobileNumber;
  });
});

// ─── Messaging: Helpers ──────────────────────────────────────────────────────

function showStatus(type, message) {
  statusMsg.className = 'status-msg ' + type;
  statusMsg.textContent = message;
}

function clearStatus() {
  statusMsg.className = 'status-msg';
  statusMsg.textContent = '';
}

// ─── Zoho SDK: PageLoad ──────────────────────────────────────────────────────

ZOHO.embeddedApp.on('PageLoad', function(data) {
  const recordId = data.EntityId;

  // Deal fields — drives the spinner/content/error state for the whole panel
  ZOHO.CRM.API.getRecord({ Entity: 'Deals', RecordID: recordId })
    .then(
      function(response) {
        if (response && response.data && response.data.length > 0) {
          populateOverview(response.data[0]);
          populateMessaging(response.data[0]);
          showOverviewState('content');
        } else {
          showOverviewState('error');
        }
      },
      function() { showOverviewState('error'); }
    );

  loadSMSHistory(recordId);

  // Stage field metadata + stage history fire in parallel.
  // buildTimeline only runs once both have resolved.
  var stageMap    = null;
  var historyData = null;

  function tryBuildTimeline() {
    if (stageMap !== null && historyData !== null) buildTimeline(historyData, stageMap);
  }

  ZOHO.CRM.META.getFields({ Entity: 'Deals' }).then(
    function(r) {
      try   { stageMap = buildStageMap(r); }
      catch (e) { stageMap = {}; }
      tryBuildTimeline();
    },
    function() { stageMap = {}; tryBuildTimeline(); }
  );

  ZOHO.CRM.API.getRelatedRecords({
    Entity:      'Deals',
    RecordID:    recordId,
    RelatedList: 'Stage_History'
  }).then(
    function(r) { historyData = (r && r.data) ? r.data : []; tryBuildTimeline(); },
    function()  { historyData = [];                           tryBuildTimeline(); }
  );
});

ZOHO.embeddedApp.init();

// ─── Overview: Populate ──────────────────────────────────────────────────────

function populateOverview(record) {
  setField('field-deal-name',       record.Deal_Name);
  setField('field-deal-owner',      record.Owner ? record.Owner.name : null);
  setField('field-total',           formatUSD(record.Total));
  setField('field-monthly-payment', formatUSD(record.Monthly_Payment));
  setField('field-total-savings',   formatUSD(record.Total_Program_Savings));
}

// ─── Messaging: Populate ─────────────────────────────────────────────────────

function populateMessaging(record) {
  if (record.Mobile) {
    mobileNumber       = record.Mobile;
    toNumber.value     = record.Mobile;
    toNumber.classList.remove('no-number');
  } else {
    mobileNumber       = null;
    toNumber.value     = 'No mobile number on this record';
    toNumber.classList.add('no-number');
  }
  // Re-evaluate in case the user typed before the record finished loading
  btnSend.disabled = smsBody.value.length === 0 || !mobileNumber;
}

// Sets text content and toggles the .empty class for null/blank values.
function setField(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  const isEmpty = value === null || value === undefined || value === '';
  el.textContent = isEmpty ? '—' : value;
  el.classList.toggle('empty', isEmpty);
}

// Returns a USD string (e.g. $12,500.00) or null if the value is not a number.
function formatUSD(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

// ─── Overview: State Management ──────────────────────────────────────────────

// state: 'loading' | 'content' | 'error'
function showOverviewState(state) {
  document.getElementById('overview-spinner').classList.toggle('hidden', state !== 'loading');
  document.getElementById('overview-content').classList.toggle('hidden', state !== 'content');
  document.getElementById('overview-error').classList.toggle('hidden',   state !== 'error');
}

// ─── Stage Timeline ──────────────────────────────────────────────────────────

function buildTimeline(entries, stageMap) {
  const container = document.getElementById('stage-timeline');
  stageMap = stageMap || {};

  const valid = entries.filter(function(e) {
    return e.Stage && (e.Last_Modified_Time || e.Modified_Time);
  });

  if (valid.length === 0) {
    container.innerHTML = '<p class="timeline-placeholder">No stage history found.</p>';
    return;
  }

  // Sort descending — most recent entry first
  const sorted = valid
    .map(function(e) {
      // Stage holds a picklist record ID — resolve it via the field metadata map
      var stageId   = (e.Stage && typeof e.Stage === 'object') ? e.Stage.id : String(e.Stage);
      var stageName = stageMap[stageId] || e.Stage;
      return { stage: stageName, date: new Date(e.Last_Modified_Time || e.Modified_Time) };
    })
    .sort(function(a, b) { return b.date - a.date; });

  container.innerHTML = sorted.map(function(entry, index) {
    const isActive   = index === 0;
    const prevDate   = isActive ? null : sorted[index - 1].date;
    const durationMs = isActive ? null : (prevDate - entry.date);

    return (
      '<div class="vt-node' + (isActive ? ' active' : '') + '">' +
        '<div class="vt-left">' +
          '<div class="vt-dot"></div>' +
          '<div class="vt-line"></div>' +
        '</div>' +
        '<div class="vt-content">' +
          '<div class="vt-stage">' + esc(entry.stage) + '</div>' +
          '<div class="vt-date">Entered ' + formatDate(entry.date) + '</div>' +
          (isActive
            ? '<div class="vt-badge">Current</div>'
            : '<div class="vt-duration">Spent ' + formatDuration(durationMs) + '</div>') +
        '</div>' +
      '</div>'
    );
  }).join('');
}

// Builds a {stageId: stageName} map from the Deals field metadata response.
function buildStageMap(metaResponse) {
  var map    = {};
  var fields = (metaResponse && metaResponse.fields) ? metaResponse.fields : [];
  for (var i = 0; i < fields.length; i++) {
    if (fields[i].api_name === 'Stage') {
      var values = fields[i].pick_list_values || [];
      for (var j = 0; j < values.length; j++) {
        var v = values[j];
        if (v.id) map[String(v.id)] = v.display_value || v.actual_value;
      }
      break;
    }
  }
  return map;
}

// Escapes HTML special characters to prevent XSS from CRM data.
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(date) {
  var d = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  var t = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return d + ' · ' + t;
}

function formatDuration(ms) {
  var days = Math.floor(ms / 86400000);
  if (days < 1) {
    var hours = Math.floor(ms / 3600000);
    return hours < 1 ? 'less than an hour' : hours === 1 ? '1 hour' : hours + ' hours';
  }
  if (days < 30)  return days === 1   ? '1 day'   : days + ' days';
  var months = Math.round(days / 30.4);
  return months === 1 ? '1 month' : months + ' months';
}

// ─── Chat: SMS History ───────────────────────────────────────────────────────

function loadSMSHistory(recordId) {
  ZOHO.CRM.API.getRelatedRecords({
    Entity:      'Deals',
    RecordID:    recordId,
    RelatedList: 'Twilio_SMS_History',
    page:        1,
    per_page:    200
  }).then(
    function(response) {
      console.log('[SMS History] response:', response);
      renderChatHistory((response && response.data) ? response.data : []);
    },
    function(err) {
      console.error('[SMS History] error:', err);
      renderChatHistory([]);
    }
  );
}

function renderChatHistory(records) {
  document.getElementById('chat-loading').classList.add('hidden');
  var chatMessages = document.getElementById('chat-messages');
  chatMessages.classList.remove('hidden');

  if (!records.length) {
    chatMessages.innerHTML = '<p class="chat-empty">No messages yet.</p>';
    return;
  }

  records.sort(function(a, b) {
    return new Date(a.Message_Time) - new Date(b.Message_Time);
  });

  lastChatDate = null;
  var html = '';
  records.forEach(function(r) {
    var date    = new Date(r.Message_Time);
    var dateStr = date.toDateString();
    if (dateStr !== lastChatDate) {
      html += buildDateSeparator(date);
      lastChatDate = dateStr;
    }
    html += buildBubble(r.Text, r.Direction, r.Message_Time);
  });
  chatMessages.innerHTML = html;

  scrollChatToBottom();
}

function appendChatBubble(text, direction, date) {
  var chatMessages = document.getElementById('chat-messages');
  var empty = chatMessages.querySelector('.chat-empty');
  if (empty) empty.remove();

  // Insert a date separator if the day has changed since the last message
  var dateStr = date.toDateString();
  if (dateStr !== lastChatDate) {
    chatMessages.insertAdjacentHTML('beforeend', buildDateSeparator(date));
    lastChatDate = dateStr;
  }

  chatMessages.insertAdjacentHTML('beforeend', buildBubble(text, direction, date.toISOString()));
  scrollChatToBottom();
}

function buildBubble(text, direction, timestamp) {
  var isOut   = direction === 'OUT';
  var timeStr = timestamp ? formatChatTime(new Date(timestamp)) : '';
  return (
    '<div class="msg-row ' + (isOut ? 'out' : 'in') + '">' +
      '<div class="msg-bubble ' + (isOut ? 'out' : 'in') + '">' +
        '<div class="msg-text">' + esc(text || '') + '</div>' +
        '<div class="msg-time">' + timeStr + '</div>' +
      '</div>' +
    '</div>'
  );
}

function scrollChatToBottom() {
  var win = document.getElementById('chat-window');
  if (win) win.scrollTop = win.scrollHeight;
}

function formatChatTime(date) {
  if (isNaN(date)) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function buildDateSeparator(date) {
  return '<div class="date-separator"><span>' + formatSeparatorDate(date) + '</span></div>';
}

function formatSeparatorDate(date) {
  var now       = new Date();
  var yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === now.toDateString())       return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
