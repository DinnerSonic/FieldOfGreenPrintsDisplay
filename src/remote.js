// Remote control, kiosk side. The kiosk checks in with the Apps Script, reporting what it's
// showing and picking up commands sent from the control page (control.html). It checks in every
// few seconds while the control page is in use, otherwise every 30 s, and not at all while the
// app is in the background. See apps-script/Code.gs.

import { APPS_SCRIPT_URL } from './config.js';
import { postToScript } from './phone.js';

const FAST_MS = 5 * 1000;
const SLOW_MS = 30 * 1000;
const DONE_KEY = 'fogp_remote_done'; // the last command run, kept across a reload

/**
 * status(): what to report. run(cmd): carries out a command, returns a short result
 * (or throws). Commands look like { id, do: 'go', to: 'home' }.
 */
// A copy running on a development computer must not pose as the kiosk (or upload logs) on the
// real script; it can still talk to a local test script.
const isLocal = (host) => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host);
const enabled = () => !!APPS_SCRIPT_URL && (!isLocal(location.hostname) || isLocal(new URL(APPS_SCRIPT_URL).hostname));

export function startRemote({ status, run }) {
  if (!enabled()) return;
  let last = readDone();
  let fast = false, busy = false, timer = 0;

  const schedule = () => { clearTimeout(timer); timer = setTimeout(checkin, fast ? FAST_MS : SLOW_MS); };

  async function checkin() {
    if (busy) return;
    if (document.hidden) { schedule(); return; }
    busy = true;
    let ran = false;
    try {
      const res = await postToScript({ type: 'kiosk-checkin', status: { ...status(), lastCommand: last } });
      fast = !!res.fast;
      for (const cmd of res.commands || []) {
        let ok = true, result;
        try { result = await run(cmd); } catch (e) { ok = false; result = String((e && e.message) || e); }
        last = { id: cmd.id, do: cmd.do, ok, result: result == null ? '' : String(result), at: Date.now() };
        saveDone(last);
        ran = true;
      }
    } catch (e) {} // offline or the script is busy: try again next time
    busy = false;
    if (ran) checkin(); else schedule(); // report what a command did straight away
  }

  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkin(); });
  checkin();
}

/** Save a performance log to the Drive folder the control page reads. */
export const uploadLog = (name, text) => (enabled() ? postToScript({ type: 'kiosk-log', name, text }) : Promise.resolve());

function readDone() {
  try { return JSON.parse(localStorage.getItem(DONE_KEY) || 'null'); } catch (e) { return null; }
}

function saveDone(v) {
  try { localStorage.setItem(DONE_KEY, JSON.stringify(v)); } catch (e) {}
}
