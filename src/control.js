// Kiosk control page (control.html), for the artist's computer. Talks to the Apps Script, which
// relays commands to the kiosk and keeps its latest status and performance logs.
// See src/remote.js for the kiosk side and apps-script/Code.gs for the relay.

import './control.css';
import { APPS_SCRIPT_URL } from './config.js';
import { postToScript } from './phone.js';
import { SETTINGS, settingLabel } from './themes/index.js';

const PW_KEY = 'fogp_control_pw'; // remembered on this computer only
const STATUS_MS = 4000;
const ONLINE_MS = 45 * 1000;      // the kiosk checks in at least every 30 s while it's open

const $ = (sel) => document.querySelector(sel);
let password = '';
let statusTimer = 0;
let openLog = null; // { name, text }

const call = (action, extra = {}) => postToScript({ type: 'control', password, action, ...extra });

// ─────────── Connecting ───────────
$('#ctLogin').addEventListener('submit', (e) => {
  e.preventDefault();
  connect($('#ctPassword').value);
});

async function connect(pw) {
  password = pw;
  showError('');
  if (!APPS_SCRIPT_URL) return showError('APPS_SCRIPT_URL is not set in src/config.js.');
  let res;
  try { res = await call('status'); } catch (e) { return showError('Couldn’t reach the Apps Script. Check your internet connection.'); }
  if (!res.ok) {
    showError(res.error === 'wrong password' ? 'Wrong password.'
      // An older script treats this as a commission request.
      : res.error === 'missing id' ? 'The Apps Script needs updating first: see “Remote control” in apps-script/README.md.'
      : res.error);
    return;
  }
  try { localStorage.setItem(PW_KEY, pw); } catch (e) {}
  $('#ctMain').hidden = false;
  $('#ctLogin').hidden = true;
  renderStatus(res);
  loadLogs();
  clearInterval(statusTimer);
  statusTimer = setInterval(refresh, STATUS_MS);
}

function showError(msg) {
  $('#ctError').textContent = msg;
  $('#ctError').hidden = !msg;
}

// ─────────── Status ───────────
async function refresh() {
  if (document.hidden) return;
  try {
    const res = await call('status');
    if (res.ok) renderStatus(res);
  } catch (e) {}
}

function ago(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return `${Math.floor(s / 3600)} h ${Math.floor(s / 60) % 60} min ago`;
}

function renderStatus({ status: st, queued, now }) {
  const pill = $('#ctOnline');
  const dl = $('#ctStatus');
  if (!st) {
    pill.textContent = 'never seen';
    pill.className = 'ct-pill off';
    dl.replaceChildren(row('Kiosk', 'hasn’t checked in yet. Open the app on the iPad (it needs this build or newer).'));
    return;
  }
  const online = now - st.seen < ONLINE_MS;
  pill.textContent = online ? 'online' : 'offline';
  pill.className = 'ct-pill ' + (online ? 'on' : 'off');
  const perf = st.perf || {};
  const last = st.lastCommand;
  dl.replaceChildren(
    row('Last check-in', ago(now - st.seen) + (online ? '' : ' (the app is closed, asleep or offline)')),
    row('Showing', st.screen),
    row('Theme', `${settingLabel(st.themeSetting)}${st.themeSetting === 'auto' ? ' (' + st.theme + ' now)' : ''}${st.daypart ? ' · ' + st.daypart : ''}`),
    row('Build', st.build),
    row('Waiting to upload', String(st.pendingUploads || 0)),
    row('Performance log', perf.auto ? `auto test, step ${perf.auto}` : perf.logging ? `logging (${perf.marks} marks)` : 'not logging'),
    row('Falling pieces', st.particles || 'normal'),
    row('Debug', `numbers ${perf.numbers ? 'on' : 'off'} · effects off: ${(perf.effectsOff || []).join(', ') || 'none'}`),
    row('App open for', ago(st.upFor * 1000).replace(' ago', '')),
    row('Last command', last ? `${last.do}: ${last.ok ? '' : 'FAILED: '}${last.result} (${ago(now - last.at)})` : '—'),
    row('Waiting for the kiosk', queued.length ? queued.map(describe).join(', ') : 'nothing'),
  );
}

function row(k, v) {
  const frag = document.createDocumentFragment();
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = k;
  dd.textContent = v;
  frag.append(dt, dd);
  return frag;
}

function describe(cmd) {
  if (cmd.do === 'go') return 'show ' + cmd.to;
  if (cmd.do === 'theme') return 'theme ' + cmd.setting;
  if (cmd.do === 'perf') return 'log ' + cmd.action;
  if (cmd.do === 'numbers') return 'numbers ' + (cmd.on ? 'on' : 'off');
  if (cmd.do === 'effects') return 'effects off: ' + (cmd.off.join(', ') || 'none');
  if (cmd.do === 'snow') return 'pieces: ' + (cmd.motion || (cmd.count == null ? 'theme’s own count' : cmd.count));
  return cmd.do;
}

// ─────────── Commands ───────────
async function send(command, btn) {
  if (btn) btn.disabled = true;
  try {
    const res = await call('command', { command });
    if (!res.ok) showError(res.error);
    refresh();
  } catch (e) {
    showError('Couldn’t send that. Check your internet connection.');
  } finally {
    if (btn) setTimeout(() => { btn.disabled = false; }, 600);
  }
}

$('#ctThemes').replaceChildren(...SETTINGS.map((s) => {
  const b = document.createElement('button');
  b.textContent = settingLabel(s);
  b.dataset.theme = s;
  return b;
}));

document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || !password) return;
  if (b.dataset.go) send({ do: 'go', to: b.dataset.go }, b);
  else if (b.dataset.theme) send({ do: 'theme', setting: b.dataset.theme }, b);
  else if (b.dataset.perf) send({ do: 'perf', action: b.dataset.perf }, b);
  else if (b.dataset.numbers) send({ do: 'numbers', on: b.dataset.numbers === '1' }, b);
  else if ('effects' in b.dataset) send({ do: 'effects', off: b.dataset.effects ? [b.dataset.effects] : [] }, b);
  else if ('reload' in b.dataset) send({ do: 'reload' }, b);
  else if (b.dataset.motion) send({ do: 'snow', motion: b.dataset.motion }, b);
  else if ('countDefault' in b.dataset) send({ do: 'snow', count: null }, b);
});

$('#ctCount').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!password) return;
  const n = Math.max(0, Math.min(200, Math.round(Number($('#ctCountValue').value) || 0)));
  $('#ctCountValue').value = n;
  send({ do: 'snow', count: n }, e.submitter);
});

// ─────────── Logs ───────────
$('#ctRefreshLogs').addEventListener('click', loadLogs);

async function loadLogs() {
  const list = $('#ctLogs');
  let res;
  try { res = await call('logs'); } catch (e) { return; }
  if (!res.ok) return;
  if (!res.logs.length) {
    list.innerHTML = '<li class="ct-note">No logs yet. They appear here when a log or auto test finishes.</li>';
    return;
  }
  list.replaceChildren(...res.logs.map((l) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.className = 'ct-log';
    b.textContent = l.name.replace(/\.txt$/, '');
    b.addEventListener('click', () => showLog(l.id));
    const size = document.createElement('span');
    size.className = 'ct-note';
    size.textContent = `${Math.max(1, Math.round(l.size / 1024))} KB`;
    li.append(b, size);
    return li;
  }));
}

async function showLog(id) {
  $('#ctLogMsg').textContent = 'Loading…';
  $('#ctLogView').hidden = false;
  const res = await call('log', { id });
  if (!res.ok) { $('#ctLogMsg').textContent = res.error; return; }
  openLog = { name: res.name, text: res.text };
  $('#ctLogText').textContent = res.text;
  $('#ctLogMsg').textContent = res.name;
  $('#ctLogView').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('#ctCopyLog').addEventListener('click', async () => {
  if (!openLog) return;
  try {
    await navigator.clipboard.writeText(openLog.text);
    $('#ctLogMsg').textContent = 'Copied.';
  } catch (e) {
    $('#ctLogMsg').textContent = 'Couldn’t copy: select the text below instead.';
  }
});

$('#ctDownloadLog').addEventListener('click', () => {
  if (!openLog) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([openLog.text], { type: 'text/plain' }));
  a.download = openLog.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('#ctCloseLog').addEventListener('click', () => {
  $('#ctLogView').hidden = true;
  openLog = null;
});

// ─────────── Start ───────────
try {
  const saved = localStorage.getItem(PW_KEY);
  if (saved) { $('#ctPassword').value = saved; connect(saved); }
} catch (e) {}
