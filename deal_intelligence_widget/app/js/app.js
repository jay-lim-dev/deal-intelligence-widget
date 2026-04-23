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

const smsBody  = document.getElementById('sms-body');
const charCount = document.getElementById('char-count');
const btnSend   = document.getElementById('btn-send');
const btnClear  = document.getElementById('btn-clear');
const statusMsg = document.getElementById('status-msg');

const SMS_MAX = 160;

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
  // Placeholder: replace with Twilio fetch() call
  showStatus('success', 'Message sent successfully.');
  smsBody.value = '';
  charCount.textContent = `0 / ${SMS_MAX}`;
  charCount.classList.remove('warning', 'over');
  btnSend.disabled = true;
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function showStatus(type, message) {
  statusMsg.className = 'status-msg ' + type;
  statusMsg.textContent = message;
}

function clearStatus() {
  statusMsg.className = 'status-msg';
  statusMsg.textContent = '';
}
