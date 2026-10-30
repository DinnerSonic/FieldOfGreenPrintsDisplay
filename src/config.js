// ═══ Commission backend ═══
// Paste the Google Apps Script web app URL (ends in /exec) between the quotes.
// See apps-script/README.md for the one-time setup.
// Leave it empty to run in local-backup mode: requests (with photos) stay on the iPad
// and upload automatically once a URL is set.
export const APPS_SCRIPT_URL = '';

// Must match SHARED_KEY in apps-script/Code.gs. This ships in the public page, so it only
// keeps casual junk out; it is not a password.
export const APPS_SCRIPT_KEY = 'fogp-kiosk';

// ═══ Kiosk ═══
export const SHOW_WELCOME = true;
export const IDLE_SECONDS = 60;

// ═══ Photos ═══
export const PHOTO_MAX_EDGE = 1600;   // px, longest side
export const PHOTO_JPEG_QUALITY = 0.85;
