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

const smsBody   = document.getElementById('sms-body');
const charCount = document.getElementById('char-count');
const btnSend   = document.getElementById('btn-send');
const btnClear  = document.getElementById('btn-clear');
const statusMsg = document.getElementById('status-msg');
const SMS_MAX   = 160;

smsBody.addEventListener('input', () => {
  const len = smsBody.value.length;
  charCount.textContent = `${len} / ${SMS_MAX}`;
  charCount.classList.remove('warning', 'over');
  if (len >= SMS_MAX) {
    charCount.classList.add('over');
  } else if (len >= SMS_MAX * 0.85) {
    charCount.classList.add('warning');
  }
  btnSend.disabled = len === 0;
});

// ─── Messaging: Clear ───────────────────────────────────────────────────────

btnClear.addEventListener('click', () => {
  smsBody.value = '';
  charCount.textContent = `0 / ${SMS_MAX}`;
  charCount.classList.remove('warning', 'over');
  btnSend.disabled = true;
  clearStatus();
});

// ─── Messaging: Send (stub — Twilio integration wired in next) ───────────────

btnSend.addEventListener('click', () => {
  showStatus('success', 'Message sent successfully.');
  smsBody.value = '';
  charCount.textContent = `0 / ${SMS_MAX}`;
  charCount.classList.remove('warning', 'over');
  btnSend.disabled = true;
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

  ZOHO.CRM.API.getRecord({ Entity: 'Deals', RecordID: recordId })
    .then(
      function(response) {
        if (response && response.data && response.data.length > 0) {
          populateOverview(response.data[0]);
          showOverviewState('content');
        } else {
          showOverviewState('error');
        }
      },
      function() {
        showOverviewState('error');
      }
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
