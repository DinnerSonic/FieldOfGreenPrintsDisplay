import './styles.css';
import QRCodeStyling from 'qr-code-styling';
import brands from './data/brands.json';
import flags from './data/flags.json';
import { FOODS } from './data/foods.js';
import {
  APPS_SCRIPT_URL, SHOW_WELCOME, IDLE_SECONDS, PHOTO_MAX_EDGE, PHOTO_JPEG_QUALITY,
} from './config.js';
import {
  newId, saveRecord, sendRecord, flushQueue, countPending, appendLog,
  migrateLegacyQueue, requestPersistence,
} from './commissions.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const root = $('#root');
const stage = $('#stage');

// ─────────── State ───────────
// screen: home | info | payment | credits | pride | commission | thanks | review | status
// signs:  null | 'picker' | brb | at530 | otherbooth | bulk | lunch
const state = {
  screen: 'home', entered: false, signs: null,
  infoSel: 'instagram', paySel: 'zelle', cameraOpen: false,
};
let draft = null;   // { name, contact, request, photo }
let photo = null;   // JPEG data URL of the current capture

function set(patch) { Object.assign(state, patch); render(); }

function render() {
  const s = state;
  $$('[data-screen]').forEach((el) => el.classList.toggle('on', el.dataset.screen === s.screen));
  const welcomeOn = SHOW_WELCOME && !s.entered;
  stage.classList.toggle('entered', !welcomeOn);
  $('#prideBtn').classList.toggle('on', s.screen === 'home' && !s.signs && !welcomeOn);
  $('#signsPicker').classList.toggle('on', s.signs === 'picker');
  $$('[data-sign]').forEach((el) => el.classList.toggle('on', el.dataset.sign === s.signs));
  $('#camera').classList.toggle('on', s.cameraOpen);
  renderSelection();
}

// ─────────── Stage fit ───────────
function isStandalone() {
  return navigator.standalone === true ||
    matchMedia('(display-mode: standalone)').matches ||
    matchMedia('(display-mode: fullscreen)').matches;
}

// Browser: center the 1024x768 stage, scaling down if the window is smaller.
// iOS home-screen app: iOS paints a strip below the document that page content can't reach,
// so scale the stage to fit above it and nudge it down by half, making the mint frame even.
function fitStage() {
  // While typing, the keyboard shrinks the visible area; keep the stage as it was instead
  // of shrinking everything (the typing panel sits above the keyboard).
  if (editing) return;
  const vv = window.visualViewport;
  if (!isStandalone()) {
    document.documentElement.classList.remove('standalone');
    const vw = (vv ? vv.width : innerWidth) || 1024;
    const vh = (vv ? vv.height : innerHeight) || 768;
    const scale = Math.min(1, vw / 1024, vh / 768);
    stage.style.transform = scale < 0.999 ? `scale(${scale})` : 'none';
    return;
  }
  document.documentElement.classList.add('standalone');
  const vw = Math.round(Math.min(vv ? vv.width : Infinity, innerWidth || Infinity,
    document.documentElement.clientWidth || Infinity)) || 1024;
  const vh = Math.round(Math.min(vv ? vv.height : Infinity, innerHeight || Infinity,
    document.documentElement.clientHeight || Infinity)) || 768;
  const landscape = vw >= vh;
  const sw = (screen && screen.width) || 0;
  const sh = (screen && screen.height) || 0;
  const screenH = landscape ? Math.min(sw, sh) : Math.max(sw, sh);
  const strip = Math.max(0, Math.min(200, (screenH || vh) - vh));
  const avail = Math.max(200, vh - strip);
  const scale = Math.min(vw / 1024, avail / 768);
  stage.style.transform = `translateY(${Math.round(strip / 2)}px) scale(${scale})`;
}

// ─────────── QR codes ───────────
const qrCache = {};

function renderSelection() {
  const pick = { info: state.infoSel, pay: state.paySel };
  $$('[data-side][data-sel]').forEach((btn) => {
    const b = brands[btn.dataset.sel];
    btn.style.setProperty('--brand', b.color);
    btn.style.setProperty('--brand-dark', b.dark);
    btn.classList.toggle('active', pick[btn.dataset.side] === btn.dataset.sel);
  });
  for (const side of ['info', 'pay']) {
    const b = brands[pick[side]];
    const img = $(`[data-qr="${side}"]`);
    if (qrCache[pick[side]] && img.src !== qrCache[pick[side]]) img.src = qrCache[pick[side]];
    $(`[data-cap="${side}-label"]`).textContent = b.label;
    $(`[data-cap="${side}-sub"]`).textContent = b.sub;
    $(`[data-card="${side}"]`).style.setProperty('--ledge', b.shadow);
  }
}

function generateQrs() {
  for (const [key, b] of Object.entries(brands)) {
    // Cached PNGs are tagged with their URL so an edited link regenerates its code.
    try {
      const cached = localStorage.getItem('fogp_qr_' + key);
      if (cached && localStorage.getItem('fogp_qr_' + key + '_src') === b.url) { qrCache[key] = cached; continue; }
    } catch (e) {}
    const qr = new QRCodeStyling({
      width: 480, height: 480, type: 'canvas', data: b.url, margin: 6,
      qrOptions: { errorCorrectionLevel: 'H' },
      dotsOptions: { color: '#2a1a2e', type: 'rounded' },
      backgroundOptions: { color: '#ffffff' },
      cornersSquareOptions: { type: 'extra-rounded', color: '#FF6FA3' },
      cornersDotOptions: { type: 'dot', color: '#34D374' },
    });
    qr.getRawData('png').then((blob) => {
      const r = new FileReader();
      r.onload = () => {
        qrCache[key] = r.result;
        try {
          localStorage.setItem('fogp_qr_' + key, r.result);
          localStorage.setItem('fogp_qr_' + key + '_src', b.url);
        } catch (e) {}
        renderSelection();
      };
      r.readAsDataURL(blob);
    });
  }
  renderSelection();
}

// ─────────── Credits & flags ───────────
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

async function loadCredits() {
  let credits = [];
  try { credits = await (await fetch('credits.json', { cache: 'no-cache' })).json(); }
  catch (e) { console.warn('credits.json failed to load', e); return; }
  const grid = $('#creditsGrid');
  grid.replaceChildren(...credits.map((c) => {
    const card = el('div', 'credit-card');
    const logo = (c.logo || '').trim();
    if (logo && !logo.endsWith('/')) {
      const img = el('img');
      img.src = logo; img.alt = c.name; img.draggable = false;
      card.append(img, el('div', 'credit-name', c.name));
      if ((c.description || '').trim()) card.append(el('div', 'credit-desc', c.description));
    } else {
      card.append(el('div', 'credit-name-big', c.name));
    }
    return card;
  }));
}

function renderFlags() {
  $('#flagsGrid').replaceChildren(...flags.map((f) => {
    const item = el('div', 'flag');
    const img = el('img');
    img.src = 'assets/PrideFlags/small/' + encodeURIComponent(f.image);
    img.alt = '';
    item.append(img, el('div', 'flag-name', f.name), el('div', 'flag-desc', f.description));
    return item;
  }));
}

// ─────────── Lunch emoji ───────────
// Draw each emoji off-screen; keep it only if it renders in color and as a single glyph.
function filterSupported(list) {
  try {
    const size = 32;
    const c = document.createElement('canvas');
    c.width = size * 3; c.height = size * 1.5;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.font = size + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.textBaseline = 'top';
    const refW = ctx.measureText('🍔').width || size;
    const ok = list.filter((e) => {
      if (ctx.measureText(e).width > refW * 1.4) return false; // ZWJ sequence split into pieces
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#000';
      ctx.fillText(e, 0, 4);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] > 0 && (Math.abs(d[i] - d[i + 1]) > 20 || Math.abs(d[i + 1] - d[i + 2]) > 20)) return true;
      }
      return false; // no color pixels → tofu box
    });
    return ok.length ? ok : list;
  } catch (err) { return list; }
}

function startLunchRotation() {
  const foods = filterSupported(FOODS);
  const n = foods.length;
  let idx = Math.floor(Math.random() * n);
  const show = () => $$('.lunch-emoji').forEach((e) => { e.textContent = foods[idx]; });
  show();
  setInterval(() => {
    let i = Math.floor(Math.random() * (n - 1));
    if (i >= idx) i++;
    idx = i;
    show();
  }, 5000);
}

// ─────────── Idle reset ───────────
// After a quiet spell, fall back to the welcome screen. Never interrupts the commission flow.
let idleTimer = null;
function resetIdle() {
  clearTimeout(idleTimer);
  if (!IDLE_SECONDS || !SHOW_WELCOME) return;
  idleTimer = setTimeout(() => {
    const safe = ['home', 'info', 'payment', 'credits', 'pride'];
    if (!safe.includes(state.screen) || state.signs || state.cameraOpen) { resetIdle(); return; }
    $$('.scroll', stage).forEach((e) => { e.scrollTop = 0; });
    set({ screen: 'home', entered: false });
  }, IDLE_SECONDS * 1000);
}

// ─────────── Secret corners ───────────
// Hold top-right + bottom-left 0.5s → toggle booth signs. Hold bottom-left alone 0.5s → hard reset.
const corners = new Map();
let cornerAction = null;
let cornerTimer = null;

function cornerOf(x0, y0) {
  const r = stage.getBoundingClientRect();
  const k = r.width / 1024 || 1;
  const x = (x0 - r.left) / k, y = (y0 - r.top) / k;
  const Z = 100;
  if (y < Z && x > 1024 - Z) return 'tr';
  if (y > 768 - Z && x < Z) return 'bl';
  return null;
}

function cornerDown(id, x, y) {
  const z = cornerOf(x, y);
  if (z) corners.set(id, z); else corners.delete(id);
  evalCorners();
}
function cornerUp(id) { if (corners.delete(id)) evalCorners(); }

function evalCorners() {
  const zs = [...corners.values()];
  let want = null;
  if (zs.length === 2 && zs.includes('tr') && zs.includes('bl')) want = 'signs';
  else if (zs.length === 1 && zs[0] === 'bl') want = 'reset';
  if (want === cornerAction) return;
  clearTimeout(cornerTimer);
  cornerAction = want;
  if (!want) return;
  cornerTimer = setTimeout(() => {
    cornerAction = null;
    if (want === 'signs') {
      // closed → picker; picker → closed; showing a sign → back to picker
      set({ signs: state.signs === 'picker' ? null : 'picker' });
    } else {
      stopStream();
      closeEditor();
      photo = null; draft = null;
      set({ screen: 'home', entered: false, signs: null, cameraOpen: false });
    }
  }, 500);
}

function bindCorners() {
  // Touch events on the iPad (pointer events get cancelled by multi-finger gestures); pointer events for a mouse.
  // Passive, so the browser never waits on these before handling a tap.
  const opts = { capture: true, passive: true };
  addEventListener('touchstart', (e) => [...e.changedTouches].forEach((t) => cornerDown('t' + t.identifier, t.clientX, t.clientY)), opts);
  const up = (e) => [...e.changedTouches].forEach((t) => cornerUp('t' + t.identifier));
  addEventListener('touchend', up, opts);
  addEventListener('touchcancel', up, opts);
  addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') cornerDown(e.pointerId, e.clientX, e.clientY); }, true);
  const pup = (e) => { if (e.pointerType !== 'touch') cornerUp(e.pointerId); };
  addEventListener('pointerup', pup, true);
  addEventListener('pointercancel', pup, true);
}

// ─────────── Commission form ───────────
const fName = $('#fName'), fContact = $('#fContact'), fRequest = $('#fRequest');

function openCommission() {
  photo = null; draft = null;
  [fName, fContact, fRequest].forEach((f) => { f.value = ''; f.classList.remove('invalid'); });
  $('#photoWrap').classList.remove('on');
  set({ screen: 'commission' });
}

function cancelCommission() {
  stopStream();
  photo = null; draft = null;
  set({ cameraOpen: false, screen: 'info' });
}

function submitStep1() {
  const name = fName.value.trim(), contact = fContact.value.trim(), request = fRequest.value.trim();
  fContact.classList.toggle('invalid', !contact);
  fRequest.classList.toggle('invalid', !request);
  // Runs inside the Submit tap, so iOS will open the keyboard for the missing field.
  if (!contact || !request) { openEditor(!contact ? fContact : fRequest); return; }
  draft = { name, contact, request, photo: photo || '' };
  set({ screen: 'thanks' });
}

// ─────────── Typing panel ───────────
// The form fields are read-only stand-ins. Tapping one opens a panel pinned to the top of
// the screen with the real text box, so what's being typed stays above the iPad keyboard.
const editor = $('#editor');
const edInput = $('#editorInput'), edText = $('#editorText');
let editing = null;  // the form field being edited
let edField = null;  // the panel's input or textarea standing in for it

function openEditor(field) {
  if (editing === field) return;
  editing = field;
  const multi = field.tagName === 'TEXTAREA';
  edField = multi ? edText : edInput;
  edInput.style.display = multi ? 'none' : '';
  edText.style.display = multi ? '' : 'none';
  if (!multi) {
    edInput.type = field.type;
    edInput.inputMode = field.inputMode || '';
    ['min', 'step'].forEach((a) => (field.hasAttribute(a) ? edInput.setAttribute(a, field.getAttribute(a)) : edInput.removeAttribute(a)));
  }
  edField.placeholder = field.placeholder;
  edField.value = field.value;
  $('#editorLabel').textContent = field.dataset.label;
  editor.classList.add('on');
  edField.focus(); // must happen during the tap, or iOS won't show the keyboard
  const end = edField.value.length;
  try { edField.setSelectionRange(end, end); } catch (e) {} // number inputs don't support it
}

function closeEditor() {
  if (!editing) return;
  editing.value = edField.value;
  if (edField.value.trim()) editing.classList.remove('invalid');
  editing = null;
  editor.classList.remove('on');
  edField.blur();
  scrollTo(0, 0);
  // Re-fit once the keyboard has finished sliding away.
  [100, 400, 800].forEach((t) => setTimeout(fitStage, t));
}

[edInput, edText].forEach((f) => {
  f.addEventListener('input', () => { if (editing) editing.value = f.value; });
  // The keyboard's own hide key blurs the field: treat that as Done.
  f.addEventListener('blur', () => setTimeout(() => { if (editing && document.activeElement !== edField) closeEditor(); }, 50));
});
edInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); closeEditor(); } });
editor.addEventListener('click', (e) => { if (e.target === editor) closeEditor(); });

// ─────────── Camera ───────────
const video = $('#video');
const cameraMsg = $('#cameraMsg');
let stream = null;

// Front (selfie) camera only: it's the only camera exposed in the kiosk enclosure.
async function startCamera() {
  set({ cameraOpen: true });
  stopStream();
  cameraMsg.style.display = 'none';
  video.style.display = '';
  try {
    const s = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1440 } },
      audio: false,
    });
    // The overlay may have been closed while iOS showed the permission prompt.
    if (!state.cameraOpen) { s.getTracks().forEach((t) => t.stop()); return; }
    stream = s;
    video.srcObject = s;
    await video.play().catch(() => {});
  } catch (e) {
    video.style.display = 'none';
    cameraMsg.style.display = 'block';
    cameraMsg.textContent = 'Camera unavailable — please allow camera access, or tap Cancel to skip the photo.';
  }
}

function stopStream() {
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
  try { video.srcObject = null; } catch (e) {}
}

function closeCamera() { stopStream(); set({ cameraOpen: false }); }

function capturePhoto() {
  if (!video.videoWidth) return;
  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
  const w = Math.round(video.videoWidth * scale), h = Math.round(video.videoHeight * scale);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  // The selfie preview is mirrored, so save what the customer saw.
  ctx.translate(w, 0); ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, w, h);
  photo = c.toDataURL('image/jpeg', PHOTO_JPEG_QUALITY);
  $('#photoImg').src = photo;
  $('#photoWrap').classList.add('on');
  stopStream();
  set({ cameraOpen: false });
}

function removePhoto() {
  photo = null;
  $('#photoWrap').classList.remove('on');
}

// ─────────── Thank you → hidden review ───────────
// Press and hold anywhere on the thank-you screen for 3 s to open the artist review.
function bindThanksHold() {
  const thanks = $('#thanks');
  let t = null;
  thanks.addEventListener('pointerdown', () => {
    clearTimeout(t);
    t = setTimeout(() => { fillReview(); set({ screen: 'review' }); }, 3000);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => thanks.addEventListener(ev, () => clearTimeout(t)));
}

function fillReview() {
  const d = draft || {};
  const put = (id, v) => { $(id).textContent = (v && String(v).trim()) ? v : '—'; };
  put('#revName', d.name);
  put('#revContact', d.contact);
  put('#revRequest', d.request);
  const wrap = $('#revPhotoWrap');
  wrap.style.display = d.photo ? 'flex' : 'none';
  if (d.photo) $('#revPhotoImg').src = d.photo;
  $('#revPrice').value = '';
  $('#revNotes').value = '';
}

// ─────────── Save & send ───────────
const STATUS = {
  sending: { icon: '⏳', title: 'Saving…', sub: 'Sending your request…', color: '#4a2f44' },
  sent: { icon: '✓', title: 'Sent!', sub: 'The request was delivered successfully.', color: '#1f8a47' },
  queued: { icon: '☁', title: 'Saved — will send when online', sub: "There's no connection right now. It will upload automatically once the iPad is back online.", color: '#c98a1a' },
  local: { icon: '✓', title: 'Saved on this device', sub: 'No online destination is set yet, so the request is stored locally as a backup.', color: '#1f8a47' },
};

function setStatus(kind) {
  const m = STATUS[kind] || STATUS.sending;
  const icon = $('#statusIcon');
  icon.textContent = m.icon; icon.style.color = m.color;
  $('#statusTitle').textContent = m.title;
  $('#statusSub').textContent = m.sub;
}

let saving = false;
async function submitFinal() {
  if (saving) return;
  saving = true;
  document.activeElement && document.activeElement.blur();
  const d = draft || {};
  const record = {
    id: newId(),
    name: d.name || '', contact: d.contact || '', request: d.request || '',
    price: $('#revPrice').value.trim(),
    notes: $('#revNotes').value.trim(),
    photo: d.photo || '',
    timestamp: new Date().toISOString(),
  };
  appendLog(record);
  setStatus('sending');
  set({ screen: 'status' });
  try {
    try { await saveRecord({ ...record, status: 'pending' }); }
    catch (e) { console.warn('could not save commission locally', e); }
    if (!APPS_SCRIPT_URL) { setStatus('local'); return; }
    const res = await sendRecord(record);
    setStatus(res.ok ? 'sent' : 'queued');
  } finally {
    saving = false;
    updateStamp();
  }
}

function returnMenu() { photo = null; draft = null; set({ screen: 'home' }); }

// ─────────── Build stamp ───────────
async function updateStamp() {
  let text = __BUILD_STAMP__;
  try {
    const n = await countPending();
    if (n) text += ` · ${n} waiting to upload`;
  } catch (e) {}
  $('#buildStamp').textContent = text;
}

// ─────────── Wiring ───────────
const ACTIONS = {
  enter: () => { if (!state.entered) set({ entered: true }); },
  openCommission, cancelCommission, submitStep1,
  startCamera, closeCamera, capturePhoto, removePhoto,
  submitFinal, returnMenu,
  closeSigns: () => set({ signs: null, screen: 'home' }),
  closeEditor,
};

stage.addEventListener('click', (e) => {
  const field = e.target.closest('.field');
  if (field && !editor.contains(field)) { openEditor($('input, textarea', field)); return; }
  const t = e.target.closest('[data-action],[data-goto],[data-sel],[data-sign-pick]');
  if (!t) return;
  if (t.dataset.action) ACTIONS[t.dataset.action]();
  else if (t.dataset.goto) set({ screen: t.dataset.goto });
  else if (t.dataset.sel) set(t.dataset.side === 'info' ? { infoSel: t.dataset.sel } : { paySel: t.dataset.sel });
  else if (t.dataset.signPick) set({ signs: t.dataset.signPick });
});

// Press feedback is applied the instant a finger lands. (CSS :active on iOS waits until
// Safari has decided the touch isn't a scroll, which makes buttons feel laggy.)
const PRESSABLE = '.press, .menu-item, .pride-btn, .sign-card';
let pressed = null;
const release = () => { if (pressed) { pressed.classList.remove('is-pressed'); pressed = null; } };
stage.addEventListener('pointerdown', (e) => {
  release();
  pressed = e.target.closest(PRESSABLE);
  if (pressed) pressed.classList.add('is-pressed');
});
['pointerup', 'pointercancel'].forEach((ev) => addEventListener(ev, release, true));
addEventListener('pointerdown', resetIdle, true);

addEventListener('load', fitStage);
addEventListener('resize', fitStage);
addEventListener('orientationchange', fitStage);
if (window.visualViewport) visualViewport.addEventListener('resize', fitStage);
// Re-apply once things settle: fonts/images can change what the browser reports.
[120, 500, 1500].forEach((t) => setTimeout(fitStage, t));

const flush = () => flushQueue().then(updateStamp);
addEventListener('online', flush);
document.addEventListener('visibilitychange', () => { if (!document.hidden) flush(); });
setInterval(flush, 60000);

fitStage();
render();
bindCorners();
bindThanksHold();
generateQrs();
loadCredits();
renderFlags();
startLunchRotation();
resetIdle();
requestPersistence();
migrateLegacyQueue().catch(() => {}).then(flush);
