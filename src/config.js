// ═══ Commission backend ═══
// Paste the Google Apps Script web app URL (ends in /exec) between the quotes.
// See apps-script/README.md for the one-time setup.
// Leave it empty to run in local-backup mode: requests (with photos) stay on the iPad
// and upload automatically once a URL is set.
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxM3YADUHeXK_yaw1uQRFVEXA_c84_Lcds26h8FVoVWFArO68XbiPmJpJNFCZplNTf2CA/exec';

// Must match SHARED_KEY in apps-script/Code.gs. This ships in the public page, so it only
// keeps casual junk out; it is not a password.
export const APPS_SCRIPT_KEY = 'fogp-kiosk';

// ═══ Kiosk ═══
export const SHOW_WELCOME = true;
export const IDLE_SECONDS = 60;

// ═══ Photos ═══
export const PHOTO_MAX_EDGE = 1600;   // px, longest side
export const PHOTO_JPEG_QUALITY = 0.85;

// ═══ Storage on the iPad ═══
// Requests are kept on the iPad as a backup after they upload; this many days later the
// local copy is deleted. Requests that haven't uploaded yet are never deleted.
export const KEEP_SENT_DAYS = 14;
