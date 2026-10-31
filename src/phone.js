// Photos sent from a customer's phone: shared by the kiosk (src/main.js) and the phone page
// (src/upload.js). The kiosk shows a QR code with a one-time code; the phone sends photos to
// the Apps Script under that code, and the kiosk polls for them. See apps-script/Code.gs.

import { APPS_SCRIPT_URL, APPS_SCRIPT_KEY } from './config.js';

export const PHONE_MAX_PHOTOS = 10; // matches PHONE_MAX_PHOTOS in apps-script/Code.gs

export const phoneUploadsAvailable = () => !!APPS_SCRIPT_URL;

const CODE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
export function newPhoneCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}
export const isPhoneCode = (code) => /^[a-z0-9]{12,32}$/.test(code || '');

// Plain-text POST: a "simple" request, so no CORS preflight (Apps Script can't answer one).
async function post(body) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...body, key: APPS_SCRIPT_KEY }),
    redirect: 'follow',
  });
  return res.json();
}

/** Kiosk: register the code shown in the QR, so the script accepts uploads for it. */
export const startPhoneSession = (code) => post({ type: 'phone-session', code });

/** Kiosk: which photos have arrived for this code. → { ok, photos: [{ id, preview }] } */
export async function pollPhonePhotos(code) {
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set('poll', code);
  url.searchParams.set('key', APPS_SCRIPT_KEY);
  return (await fetch(url, { redirect: 'follow' })).json();
}

/** Phone: send one photo at full size, plus a small JPEG preview for the kiosk. */
export const uploadPhonePhoto = (code, { name, data, preview }) =>
  post({ type: 'phone-upload', code, name, data, preview });

/** The phone page's address for a code (same site as the kiosk). */
export const phoneUploadUrl = (code) => new URL('upload.html?c=' + code, location.href).href;
