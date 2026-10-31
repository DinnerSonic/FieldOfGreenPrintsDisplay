// Phone page: the customer scans the kiosk's QR code, picks photos, and they're sent at full
// size to the Apps Script under the kiosk's one-time code. The kiosk shows them as they land.

import './upload.css';
import { isPhoneCode, phoneUploadsAvailable, uploadPhonePhoto, PHONE_MAX_PHOTOS } from './phone.js';

const $ = (s) => document.querySelector(s);
const code = new URLSearchParams(location.search).get('c');
const fileInput = $('#upFile');
const pickLabel = $('#upPickLabel');
const list = $('#upList');
const sendBtn = $('#upSend');
const msg = $('#upMsg');

const MAX_BYTES = 33 * 1024 * 1024; // matches PHONE_MAX_CHARS in apps-script/Code.gs
const MIME_BY_EXT = { heic: 'image/heic', heif: 'image/heif', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

let items = [];      // { file, badge, state: 'ready' | 'sending' | 'sent' | 'failed' }
let sentCount = 0;
let sending = false;

function showMsg(text, isError) {
  msg.hidden = !text;
  msg.textContent = text || '';
  msg.classList.toggle('err', !!isError);
}

function expired() {
  $('#upForm').hidden = true;
  $('#upIntro').hidden = true;
  showMsg('This link has expired. Scan the code on the booth screen again.', true);
}

function setBadge(item, text, kind) {
  item.badge.textContent = text;
  item.badge.className = 'up-badge' + (kind ? ' ' + kind : '');
  item.badge.hidden = !text;
}

function updateButtons() {
  const waiting = items.filter((i) => i.state === 'ready' || i.state === 'failed').length;
  sendBtn.hidden = !waiting;
  sendBtn.disabled = sending;
  sendBtn.textContent = items.some((i) => i.state === 'failed') ? 'Try again'
    : 'Send ' + waiting + ' photo' + (waiting === 1 ? '' : 's');
  pickLabel.textContent = items.length ? 'Add more photos' : 'Choose photos';
}

function addFiles(files) {
  showMsg('');
  const room = PHONE_MAX_PHOTOS - sentCount - items.filter((i) => i.state !== 'sent').length;
  if (files.length > room) showMsg('You can send up to ' + PHONE_MAX_PHOTOS + ' photos.', true);
  for (const file of files.slice(0, Math.max(0, room))) {
    const el = document.createElement('div');
    el.className = 'up-item';
    const img = document.createElement('img');
    img.alt = '';
    img.src = URL.createObjectURL(file);
    img.onerror = () => { img.replaceWith(Object.assign(document.createElement('div'), { className: 'up-noprev', textContent: '📷' })); };
    const badge = document.createElement('div');
    el.append(img, badge);
    list.append(el);
    const item = { file, badge, state: 'ready' };
    setBadge(item, '');
    items.push(item);
  }
  updateButtons();
}

function readDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

// Small JPEG for the kiosk's thumbnail (the original is what gets saved).
async function makePreview(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 320 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.7);
  } catch (e) {
    return ''; // e.g. a format this browser can't draw; the kiosk shows a placeholder
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function sendOne(item) {
  if (item.file.size > MAX_BYTES) { item.state = 'failed'; setBadge(item, 'Too large', 'err'); return 'skip'; }
  item.state = 'sending';
  setBadge(item, 'Sending…');
  try {
    let data = await readDataUrl(item.file);
    // Some phones don't label HEIC photos; fill the type in from the file name.
    if (!/^data:image\//.test(data)) {
      const mime = MIME_BY_EXT[(item.file.name.split('.').pop() || '').toLowerCase()];
      if (!mime) { item.state = 'failed'; setBadge(item, 'Not a photo', 'err'); return 'skip'; }
      data = data.replace(/^data:[^;,]*(;base64)?,/, 'data:' + mime + ';base64,');
    }
    const res = await uploadPhonePhoto(code, { name: item.file.name, data, preview: await makePreview(item.file) });
    if (res.ok) { item.state = 'sent'; sentCount++; setBadge(item, '✓ Sent', 'ok'); return 'ok'; }
    item.state = 'failed';
    if (res.error === 'expired') return 'expired';
    if (res.error === 'too many') { setBadge(item, 'Limit reached', 'err'); return 'stop'; }
    setBadge(item, res.error === 'too big' ? 'Too large' : 'Didn’t send', 'err');
    return 'skip';
  } catch (e) {
    item.state = 'failed';
    setBadge(item, 'Didn’t send', 'err');
    return 'network';
  }
}

async function sendAll() {
  if (sending) return;
  sending = true;
  showMsg('');
  updateButtons();
  let outcome = 'ok';
  for (const item of items.filter((i) => i.state === 'ready' || i.state === 'failed')) {
    const r = await sendOne(item);
    if (r === 'expired') { outcome = r; break; }
    if (r === 'stop') { outcome = r; break; }
    if (r !== 'ok') outcome = r;
  }
  sending = false;
  updateButtons();
  if (outcome === 'expired') return expired();
  if (outcome === 'stop') return showMsg('That’s the most photos one request can hold.', true);
  if (outcome === 'network') return showMsg('Some photos didn’t send. Check your connection and tap Try again.', true);
  if (items.every((i) => i.state === 'sent')) showMsg('Sent! Check the booth screen 💚');
  else showMsg('Some photos couldn’t be sent.', true);
}

if (!isPhoneCode(code) || !phoneUploadsAvailable()) {
  expired();
} else {
  fileInput.addEventListener('change', () => {
    const files = [...fileInput.files];
    fileInput.value = '';
    if (files.length) addFiles(files);
  });
  sendBtn.addEventListener('click', sendAll);
}
