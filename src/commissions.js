// Commission storage + upload.
//
// Every finished request is written to IndexedDB on the iPad first (photo included), then
// uploaded to the Apps Script backend. Anything that fails stays "pending" and is retried
// on launch, when the iPad comes back online, and once a minute. localStorage only holds
// ~5 MB, which is a handful of photos, so the full records live in IndexedDB instead.

import { APPS_SCRIPT_URL, APPS_SCRIPT_KEY } from './config.js';

const DB_NAME = 'fogp';
const STORE = 'commissions';
const LOG_KEY = 'fogp_commission_log';          // metadata-only history (kept from the prototype)
const LEGACY_QUEUE_KEY = 'fogp_commission_queue'; // prototype's localStorage queue, migrated on start

let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const s = req.result.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('status', 'status');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out && 'result' in out ? out.result : undefined);
    t.onerror = () => reject(t.error);
  });
}

export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export const saveRecord = (rec) => tx('readwrite', (s) => s.put(rec));
const pendingRecords = () => tx('readonly', (s) => s.index('status').getAll('pending'));
export const countPending = () => tx('readonly', (s) => s.index('status').count('pending'));

async function markSent(rec) {
  await saveRecord({ ...rec, status: 'sent', sentAt: new Date().toISOString() });
}

export function appendLog(record) {
  try {
    const l = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    l.push({ ...record, photo: record.photo ? '[photo attached]' : '' });
    localStorage.setItem(LOG_KEY, JSON.stringify(l));
  } catch (e) {}
}

// Move anything left in the prototype's localStorage queue into IndexedDB.
export async function migrateLegacyQueue() {
  let q;
  try { q = JSON.parse(localStorage.getItem(LEGACY_QUEUE_KEY) || '[]'); } catch (e) { return; }
  if (!q.length) return;
  for (const r of q) await saveRecord({ id: newId(), ...r, status: 'pending' });
  localStorage.removeItem(LEGACY_QUEUE_KEY);
}

// Ask Safari not to evict our storage under pressure.
export function requestPersistence() {
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
}

function payload(rec) {
  const { status, sentAt, ...rest } = rec;
  return { ...rest, key: APPS_SCRIPT_KEY };
}

// POST as text/plain so it's a "simple" request (no CORS preflight, which Apps Script can't
// answer). Apps Script normally replies with CORS headers, so we can read the JSON and know
// it landed. If the reply can't be read, fall back to an opaque no-cors POST: if that goes
// through the script got it (and it ignores repeats of the same id).
export async function sendRecord(rec) {
  if (!APPS_SCRIPT_URL) return { ok: false, reason: 'noendpoint' };
  const body = JSON.stringify(payload(rec));
  const post = (mode) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    return fetch(APPS_SCRIPT_URL, {
      method: 'POST', mode, body, redirect: 'follow', signal: ctrl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    }).finally(() => clearTimeout(timer));
  };
  try {
    const data = await (await post('cors')).json();
    if (!data.ok) return { ok: false, reason: data.error || 'rejected' };
  } catch (e) {
    try { await post('no-cors'); } catch (e2) { return { ok: false, reason: 'network' }; }
  }
  await markSent(rec);
  return { ok: true };
}

let flushing = null;
export function flushQueue() {
  if (!APPS_SCRIPT_URL) return Promise.resolve();
  if (!flushing) {
    flushing = (async () => {
      try {
        for (const rec of await pendingRecords()) {
          const res = await sendRecord(rec);
          if (!res.ok && res.reason === 'network') break; // offline: try again later
        }
      } catch (e) {
        console.warn('commission flush failed', e);
      } finally {
        flushing = null;
      }
    })();
  }
  return flushing;
}
