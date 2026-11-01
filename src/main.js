import './styles.css';
import './theme.css';
import QRCodeStyling from 'qr-code-styling';
import brands from './data/brands.json';
import flags from './data/flags.json';
import { FOODS } from './data/foods.js';
import { THEME_SETTINGS, themeSetting, setThemeSetting, activeTheme, addDecorations } from './theme.js';
import {
  APPS_SCRIPT_URL, SHOW_WELCOME, IDLE_SECONDS, PHOTO_MAX_EDGE, PHOTO_JPEG_QUALITY, KEEP_SENT_DAYS,
} from './config.js';
import {
  newId, saveRecord, sendRecord, flushQueue, countPending, appendLog,
  migrateLegacyQueue, requestPersistence, pruneSent, listRecords, deleteRecord,
} from './commissions.js';
import {
  PHONE_MAX_PHOTOS, phoneUploadsAvailable, newPhoneCode, startPhoneSession, pollPhonePhotos, phoneUploadUrl,
} from './phone.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const root = $('#root');
const stage = $('#stage');

// ─────────── State ───────────
// screen: home | info | payment | credits | pride | commission | thanks | review | status
// signs:  null | 'picker' | brb | at530 | otherbooth | bulk | lunch
const state = {
  screen: 'home', entered: false, signs: null,
  infoSel: 'instagram', paySel: 'zelle', cameraOpen: false, phoneOpen: false,
};

let photo = null;   // JPEG data URL of the current capture
let snow = null;    // home-screen snowfall control (src/theme.js)

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
  $('#phone').classList.toggle('on', s.phoneOpen);
  renderSelection();
  paintFrame();
  // Holiday snow on the signs and thank-you screens runs from CSS while they're showing;
  // the home screen's only while nothing covers it.
  if (snow) snow.setHome(isHoliday() && s.screen === 'home' && !s.signs);
  // Refresh the saved-requests count/list whenever the artist screens open.
  if (s.signs !== lastSigns && (s.signs === 'picker' || s.signs === 'saved')) renderSaved();
  lastSigns = s.signs;
}
let lastSigns = null;

// ─────────── Stage fit ───────────
function isStandalone() {
  return navigator.standalone === true ||
    matchMedia('(display-mode: standalone)').matches ||
    matchMedia('(display-mode: fullscreen)').matches;
}

function setStageSize(w, h) {
  stage.style.width = stage.style.minWidth = w + 'px';
  stage.style.height = stage.style.minHeight = h + 'px';
}

// Browser (PC preview): a fixed 1024x768 stage on the mint frame, scaled down if needed.
// iOS home-screen app: fill the whole area the page is allowed to draw in. The design is
// 1024x768; the stage is scaled to fit and then stretched (wider or taller) to cover any
// leftover space. Any strip iOS keeps for itself shows the page background, which
// paintFrame() keeps matched to the current screen.
function fitStage() {
  // While typing, the keyboard shrinks the visible area; keep the stage as it was instead
  // of shrinking everything (the typing panel sits above the keyboard).
  if (editing) return;
  const vv = window.visualViewport;
  if (!isStandalone()) {
    document.documentElement.classList.remove('standalone');
    setStageSize(1024, 768);
    const vw = (vv ? vv.width : innerWidth) || 1024;
    const vh = (vv ? vv.height : innerHeight) || 768;
    const scale = Math.min(1, vw / 1024, vh / 768);
    stage.style.transform = scale < 0.999 ? `scale(${scale})` : 'none';
    paintFrame();
    return;
  }
  document.documentElement.classList.add('standalone');
  const vw = Math.round(Math.min(vv ? vv.width : Infinity, innerWidth || Infinity,
    document.documentElement.clientWidth || Infinity)) || 1024;
  const vh = Math.round(Math.min(vv ? vv.height : Infinity, innerHeight || Infinity,
    document.documentElement.clientHeight || Infinity)) || 768;
  const scale = Math.min(vw / 1024, vh / 768);
  setStageSize(Math.max(1024, Math.ceil(vw / scale)), Math.max(768, Math.ceil(vh / scale)));
  stage.style.transform = `scale(${scale})`;
  paintFrame();
}

// Edge color of each screen's background, used for anything outside the stage.
const FRAME_COLORS = {
  pride: '#FFF4F8', thanks: '#FFB8CE',
  brb: '#FFB8CE', at530: '#FFB8CE', lunch: '#FFB8CE', otherbooth: '#FFD98C', bulk: '#B7EFD1',
};
// Holiday: white where a snowbank meets the bottom edge, the night sky's bottom color elsewhere.
const HOLIDAY_FRAME_COLORS = {
  home: '#FFFFFF', thanks: '#FFFFFF', brb: '#FFFFFF', at530: '#FFFFFF', lunch: '#FFFFFF',
  picker: '#7d0a1c', otherbooth: '#FFD98C', bulk: '#B7EFD1',
};
function paintFrame() {
  const colors = isHoliday() ? HOLIDAY_FRAME_COLORS : FRAME_COLORS;
  const fallback = isHoliday() ? '#1d3a6e' : '#FFD9E3';
  const color = !isStandalone() ? '#9FECC4'
    : colors[state.signs] || (state.signs ? fallback : colors[state.screen] || fallback);
  for (const el of [document.documentElement, document.body, root]) el.style.background = color;
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

// Candy-styled QR code as a PNG data URL.
async function qrDataUrl(data, ecLevel = 'H') {
  const qr = new QRCodeStyling({
    width: 480, height: 480, type: 'canvas', data, margin: 6,
    qrOptions: { errorCorrectionLevel: ecLevel },
    dotsOptions: { color: '#2a1a2e', type: 'rounded' },
    backgroundOptions: { color: '#ffffff' },
    cornersSquareOptions: { type: 'extra-rounded', color: '#FF6FA3' },
    cornersDotOptions: { type: 'dot', color: '#34D374' },
  });
  const blob = await qr.getRawData('png');
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}

function generateQrs() {
  for (const [key, b] of Object.entries(brands)) {
    // Cached PNGs are tagged with their URL so an edited link regenerates its code.
    try {
      const cached = localStorage.getItem('fogp_qr_' + key);
      if (cached && localStorage.getItem('fogp_qr_' + key + '_src') === b.url) { qrCache[key] = cached; continue; }
    } catch (e) {}
    qrDataUrl(b.url).then((png) => {
      qrCache[key] = png;
      try {
        localStorage.setItem('fogp_qr_' + key, png);
        localStorage.setItem('fogp_qr_' + key + '_src', b.url);
      } catch (e) {}
      renderSelection();
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
  const w = stage.offsetWidth, h = stage.offsetHeight; // stage size before scaling
  const k = r.width / w || 1;
  const x = (x0 - r.left) / k, y = (y0 - r.top) / k;
  const Z = 100;
  if (y < Z && x > w - Z) return 'tr';
  if (y > h - Z && x < Z) return 'bl';
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
      clearForm();
      set({ screen: 'home', entered: false, signs: null, cameraOpen: false, phoneOpen: false });
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

function clearForm() {
  [fName, fContact, fRequest].forEach((f) => { f.value = ''; f.classList.remove('invalid'); });
  clearPhotos();
}

// Selfie + phone photos, shown as small tiles next to the photo buttons.
const STRIP_TILES = 3;
function renderPhotos() {
  const tiles = [];
  if (photo) tiles.push({ src: photo, selfie: true });
  phonePhotos.forEach((p) => tiles.push({ src: p.preview }));
  const strip = $('#photoStrip');
  const shown = tiles.length > STRIP_TILES ? tiles.slice(0, STRIP_TILES - 1) : tiles;
  const nodes = shown.map((t) => photoTile(t.src, t.selfie));
  if (tiles.length > shown.length) nodes.push(el('div', 'photo-tile', '+' + (tiles.length - shown.length)));
  if (tiles.length) {
    const clear = el('div', 'photo-clear press', 'Clear');
    clear.dataset.action = 'clearPhotos';
    nodes.push(clear);
  }
  strip.replaceChildren(...nodes);
  // The phone overlay shows everything that's arrived so far.
  const n = phonePhotos.length;
  $('#phoneThumbs').replaceChildren(...phonePhotos.map((p) => photoTile(p.preview)));
  if (!phoneError) {
    $('#phoneStatus').textContent = n ? `Got ${n} photo${n === 1 ? '' : 's'}! Send more, or tap Done.` : 'Waiting for photos…';
  }
}

function photoTile(src, selfie) {
  const t = el('div', 'photo-tile' + (selfie ? ' selfie' : ''));
  if (src) { const img = el('img'); img.src = src; img.alt = ''; t.append(img); }
  else t.textContent = '📷'; // a format the phone couldn't preview; the original still arrives
  return t;
}

function clearPhotos() {
  photo = null;
  endPhoneSession();
  renderPhotos();
}

// ─────────── Photos from the customer's phone ───────────
// "From your phone" shows a QR code with a one-time code. The phone page (upload.html) sends
// full-size photos to the Apps Script under that code; the kiosk polls for small previews and,
// on submit, passes the photo IDs along so the script files the originals with the request.
let phoneCode = null;    // one-time code in the QR; null until the overlay is first opened
let phonePhotos = [];    // [{ id, preview }] arrived so far
let phoneError = false;
let phonePollTimer = null;

async function openPhone() {
  set({ phoneOpen: true });
  if (phoneCode) { schedulePhonePoll(0); return; }
  const code = phoneCode = newPhoneCode();
  phoneError = false;
  $('#phoneQr').removeAttribute('src');
  $('#phoneStatus').classList.remove('err');
  renderPhotos();
  // 'M' error correction keeps the longer upload link easy to scan.
  qrDataUrl(phoneUploadUrl(code), 'M').then((png) => { if (phoneCode === code) $('#phoneQr').src = png; });
  let ok = false;
  try { ok = phoneUploadsAvailable() && (await startPhoneSession(code)).ok; } catch (e) {}
  if (phoneCode !== code) return;
  if (!ok) {
    phoneCode = null; // try again next time it's opened
    phoneError = true;
    $('#phoneStatus').textContent = 'Phone upload isn’t available right now, sorry! You can take a selfie instead.';
    $('#phoneStatus').classList.add('err');
    return;
  }
  schedulePhonePoll(1500);
}

function closePhone() { set({ phoneOpen: false }); }

function endPhoneSession() {
  clearTimeout(phonePollTimer);
  phoneCode = null;
  phonePhotos = [];
  phoneError = false;
}

// Poll quickly while the QR is showing, slowly while the customer finishes the form.
function schedulePhonePoll(delay) {
  clearTimeout(phonePollTimer);
  if (phoneCode) phonePollTimer = setTimeout(pollPhone, delay);
}

async function pollPhone() {
  const code = phoneCode;
  if (!code || state.screen !== 'commission') return;
  try {
    const res = await pollPhonePhotos(code);
    if (code !== phoneCode) return;
    if (res.ok && res.photos.length !== phonePhotos.length) {
      phonePhotos = res.photos.slice(0, PHONE_MAX_PHOTOS);
      renderPhotos();
    }
  } catch (e) {}
  schedulePhonePoll(state.phoneOpen ? 2500 : 5000);
}

function openCommission() {
  clearForm();
  set({ screen: 'commission', cameraOpen: false, phoneOpen: false });
}

function cancelCommission() {
  stopStream();
  clearForm();
  set({ cameraOpen: false, phoneOpen: false, screen: 'info' });
}

function submitStep1() {
  const name = fName.value.trim(), contact = fContact.value.trim(), request = fRequest.value.trim();
  fContact.classList.toggle('invalid', !contact);
  fRequest.classList.toggle('invalid', !request);
  // Runs inside the Submit tap, so iOS will open the keyboard for the missing field.
  if (!contact || !request) { openEditor(!contact ? fContact : fRequest); return; }
  submitRequest({
    id: newId(), name, contact, request, photo: photo || '',
    phonePhotos: phonePhotos.map((p) => p.id),
    timestamp: new Date().toISOString(),
  });
  clearForm(); // don't leave one customer's details behind for the next
  showThanks();
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

let cameraCheck = null;

// Front (selfie) camera only: it's the only camera exposed in the kiosk enclosure.
// Ask for a sharp picture (the camera picks the closest size it supports). If the preview ever
// goes black, iOS's camera service is usually stuck (restarting the iPad fixes it).
async function startCamera() {
  set({ cameraOpen: true });
  stopStream();
  clearTimeout(cameraCheck);
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
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    let playError = '';
    // If no picture has arrived after a few seconds, say why on screen (for troubleshooting).
    // Set up before play(), which never settles when the camera sends no frames.
    cameraCheck = setTimeout(() => {
      if (!state.cameraOpen || video.videoWidth) return;
      const t = s.getVideoTracks()[0];
      const set_ = t && t.getSettings ? t.getSettings() : {};
      cameraMsg.style.display = 'block';
      cameraMsg.textContent = 'Camera preview not showing. Details: ' + [
        'track ' + (t ? t.readyState + (t.muted ? '/muted' : '') : 'none'),
        'size ' + (set_.width || '?') + 'x' + (set_.height || '?'),
        'video ' + video.readyState + (video.paused ? '/paused' : '/playing'),
        playError && 'play ' + playError,
      ].filter(Boolean).join(' · ');
    }, 3000);
    video.play().catch((e) => { playError = e.name; });
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
  renderPhotos();
  stopStream();
  set({ cameraOpen: false });
}

// ─────────── Thank you ───────────
// The request is saved and sent the moment it's submitted. "Thank you!" shows for a few
// seconds, then the kiosk resets for the next customer. Pricing happens later, in the sheet.
const THANKS_SECONDS = 3;
let thanksTimer = null;

async function submitRequest(record) {
  appendLog(record);
  try { await saveRecord({ ...record, status: 'pending' }); }
  catch (e) { console.warn('could not save commission locally', e); }
  // Uploads in the background; anything that fails is retried later (see flushQueue).
  if (APPS_SCRIPT_URL) await sendRecord(record);
  updateStamp();
}

function showThanks() {
  clearTimeout(thanksTimer);
  set({ screen: 'thanks', phoneOpen: false });
  thanksTimer = setTimeout(() => {
    if (state.screen === 'thanks') set({ screen: 'home', entered: false });
  }, THANKS_SECONDS * 1000);
}

// ─────────── Artist: saved requests ───────────
// Lists the requests kept on this iPad (newest first) with a two-tap Delete on each.
async function renderSaved() {
  let recs = [];
  try { recs = await listRecords(); } catch (e) {}
  recs.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
  const waiting = recs.filter((r) => r.status === 'pending').length;
  $('#savedCount').textContent = recs.length;
  $('#savedSub').textContent = recs.length
    ? `${recs.length} on this iPad${waiting ? ` · ${waiting} waiting to upload` : ''} · uploaded ones are removed after ${KEEP_SENT_DAYS} days`
    : '';
  $('#savedList').replaceChildren(...(recs.length ? recs.map(savedRow) : [el('div', 'saved-empty', 'Nothing saved on this iPad.')]));
}

function savedRow(r) {
  const row = el('div', 'saved-row');
  const thumb = el('div', 'saved-thumb');
  if (r.photo) { const img = el('img'); img.src = r.photo; img.alt = ''; thumb.append(img); }
  else thumb.textContent = '—';
  const who = el('div', 'saved-who', r.name || 'No name');
  if (r.contact) who.append(el('span', null, ' · ' + r.contact));
  const meta = el('div', 'saved-meta');
  const pending = r.status === 'pending';
  meta.append(el('span', 'saved-badge ' + (pending ? 'pending' : 'sent'), pending ? 'Waiting to upload' : 'Uploaded'));
  const when = new Date(r.timestamp);
  if (!isNaN(when)) meta.append(el('span', null, when.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })));
  const phoneCount = (r.phonePhotos || []).length;
  if (phoneCount) meta.append(el('span', null, `${phoneCount} phone photo${phoneCount === 1 ? '' : 's'}`));
  const main = el('div', 'saved-main');
  main.append(who, el('div', 'saved-text', r.request || ''), meta);
  const del = el('div', 'saved-del press', 'Delete');
  del.dataset.del = r.id;
  del.dataset.pending = pending ? '1' : '';
  row.append(thumb, main, del);
  return row;
}

// First tap arms the button, second tap deletes. Unsent requests get a stronger warning.
async function deleteSaved(btn) {
  if (!btn.classList.contains('confirm')) {
    btn.classList.add('confirm');
    btn.textContent = btn.dataset.pending ? 'Not uploaded! Tap again to delete' : 'Tap again to delete';
    setTimeout(() => { if (btn.isConnected) { btn.classList.remove('confirm'); btn.textContent = 'Delete'; } }, 3000);
    return;
  }
  try { await deleteRecord(btn.dataset.del); } catch (e) {}
  renderSaved();
  updateStamp();
}

// ─────────── Build stamp ───────────
async function updateStamp() {
  let text = typeof __BUILD_STAMP__ === 'string' ? __BUILD_STAMP__ : 'build dev';
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
  startCamera, closeCamera, capturePhoto,
  openPhone, closePhone, clearPhotos,
  closeSigns: () => set({ signs: null, screen: 'home' }),
  closeEditor,
  cycleTheme,
};

stage.addEventListener('click', (e) => {
  const del = e.target.closest('[data-del]');
  if (del) { deleteSaved(del); return; }
  const savedRowEl = e.target.closest('.saved-row');
  if (savedRowEl) { savedRowEl.classList.toggle('open'); return; }
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

// Upload anything waiting, then tidy up old local copies.
const flush = () => flushQueue().then(() => pruneSent().catch(() => {})).then(updateStamp);
addEventListener('online', flush);
document.addEventListener('visibilitychange', () => {
  // Switching to another app (e.g. Square): let go of the camera, so iOS doesn't leave it
  // stuck showing black when we come back.
  if (document.hidden) { if (stream || state.cameraOpen) closeCamera(); }
  else flush();
});
setInterval(flush, 60000);

// ─────────── Theme ───────────
const isHoliday = () => document.documentElement.dataset.theme === 'holiday';
const THEME_LABELS = { auto: 'Auto', holiday: 'Holiday', classic: 'Classic' };

function applyTheme() {
  const active = activeTheme();
  document.documentElement.dataset.theme = active;
  const setting = themeSetting();
  $('#themeTitle').textContent = 'Theme: ' + THEME_LABELS[setting] + (setting === 'auto' ? ` (${THEME_LABELS[active]} now)` : '');
  $('.theme-prev .classic').classList.toggle('dim', active !== 'classic');
  $('.theme-prev .holiday').classList.toggle('dim', active !== 'holiday');
}

function cycleTheme() {
  const i = THEME_SETTINGS.indexOf(themeSetting());
  setThemeSetting(THEME_SETTINGS[(i + 1) % THEME_SETTINGS.length]);
  applyTheme();
  render();
}

snow = addDecorations(stage);
applyTheme();
// In Auto, pick up the change of season without a restart.
setInterval(() => { const before = document.documentElement.dataset.theme; applyTheme(); if (before !== document.documentElement.dataset.theme) render(); }, 10 * 60 * 1000);
document.addEventListener('visibilitychange', () => render());

fitStage();
render();
bindCorners();
generateQrs();
loadCredits();
renderFlags();
startLunchRotation();
resetIdle();
requestPersistence();
migrateLegacyQueue().catch(() => {}).then(flush);
