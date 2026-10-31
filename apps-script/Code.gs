/**
 * Field of Green Prints — commission receiver (Google Apps Script web app).
 *
 * Each request from the iPad kiosk becomes:
 *   My Drive / Field of Green Prints Commissions / <date time - name> /
 *     photo.jpg (selfie taken on the iPad), phone-1.jpg ... (sent from the customer's phone),
 *     request.txt
 * plus a row in the "Commission log" spreadsheet in that same folder, where you track
 * Status, Price and Notes.
 *
 * Phone photos: the kiosk shows a QR code with a one-time code. The customer's phone sends
 * full-size photos here; they wait in a temporary folder until the request is submitted,
 * then move into the request's folder. Leftovers are cleaned up daily.
 *
 * Setup steps are in README.md next to this file.
 */

// Must match APPS_SCRIPT_KEY in src/config.js.
const SHARED_KEY = 'fogp-kiosk';
const ROOT_FOLDER_NAME = 'Field of Green Prints Commissions';
const PHONE_FOLDER_NAME = '_Phone uploads (temporary)';
const SHEET_NAME = 'Commission log';
const STATUSES = ['New', 'Quoted', 'Accepted', 'Printing', 'Done', 'Declined'];
// Columns are matched by header text, so you can reorder them or add your own in the sheet.
const HEADERS = ['Status', 'Submitted', 'Name', 'Contact', 'Request', 'Price', 'Notes', 'Photo', 'Phone photos', 'Folder', 'ID'];

const PHONE_SESSION_MINUTES = 30;
const PHONE_MAX_PHOTOS = 10;
const PHONE_MAX_CHARS = 45 * 1024 * 1024; // base64 text, about a 33 MB photo
const CACHE_SECONDS = 6 * 60 * 60;         // longest CacheService allows

/**
 * GET with no parameters: health check, shows {"ok":true,...}.
 * GET ?poll=<code>&key=<key>: the kiosk asking which phone photos have arrived.
 */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.poll) {
    if (SHARED_KEY && p.key !== SHARED_KEY) return json_({ ok: false, error: 'bad key' });
    if (!validCode_(p.poll)) return json_({ ok: false, error: 'bad code' });
    return json_({ ok: true, photos: phonePhotos_(p.poll) });
  }
  return json_({ ok: true, app: 'fogp-commissions' });
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad json' });
  }
  if (SHARED_KEY && data.key !== SHARED_KEY) return json_({ ok: false, error: 'bad key' });
  if (data.type === 'phone-session') return startPhoneSession_(data);
  if (data.type === 'phone-upload') return phoneUpload_(data);
  return saveRequest_(data);
}

// ─────────── Commission requests ───────────

function saveRequest_(data) {
  if (!data.id) return json_({ ok: false, error: 'missing id' });
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet_();
    const cols = columns_(sheet);
    // The kiosk retries anything it didn't get a reply for, so the same request can arrive twice.
    if (alreadySaved_(sheet, cols, data.id)) return json_({ ok: true, duplicate: true });

    const when = data.timestamp ? new Date(data.timestamp) : new Date();
    const stamp = Utilities.formatDate(when, Session.getScriptTimeZone(), 'yyyy-MM-dd HHmm');
    const folder = getRoot_().createFolder(stamp + ' - ' + safeName_(data.name || data.contact || 'request'));

    let photoUrl = '';
    const m = /^data:(image\/[\w+.-]+);base64,/.exec(data.photo || '');
    if (m) {
      const bytes = Utilities.base64Decode(data.photo.slice(m[0].length));
      photoUrl = folder.createFile(Utilities.newBlob(bytes, m[1], 'photo.' + extFor_(m[1]))).getUrl();
    }

    // Phone photos: only files still waiting in the temporary folder can be claimed.
    const tmpId = getPhoneFolder_().getId();
    let phoneCount = 0;
    (Array.isArray(data.phonePhotos) ? data.phonePhotos : []).slice(0, PHONE_MAX_PHOTOS).forEach((id) => {
      try {
        const f = DriveApp.getFileById(String(id));
        if (!inFolder_(f, tmpId)) return;
        phoneCount++;
        const ext = (/\.[A-Za-z0-9]{2,5}$/.exec(f.getName()) || ['.' + extFor_(f.getMimeType())])[0].toLowerCase();
        f.setName('phone-' + phoneCount + ext);
        f.moveTo(folder);
      } catch (err) {}
    });

    folder.createFile('request.txt', [
      'Submitted: ' + stamp,
      'Name:      ' + (data.name || '—'),
      'Contact:   ' + (data.contact || '—'),
      'Photos:    ' + ([photoUrl ? 'selfie' : '', phoneCount ? phoneCount + ' from phone' : ''].filter(String).join(', ') || 'none'),
      '',
      'Request:',
      data.request || '—',
      '',
      'Price, status and notes are tracked in the "' + SHEET_NAME + '" sheet.',
      'ID: ' + data.id,
    ].join('\n'), MimeType.PLAIN_TEXT);

    const values = {
      'Status': 'New',
      'Submitted': when,
      'Received': new Date(),
      'Name': cell_(data.name),
      'Contact': cell_(data.contact),
      'Request': cell_(data.request),
      'Photo': photoUrl ? link_(photoUrl, 'Open photo') : '',
      'Phone photos': phoneCount || '',
      'Folder': link_(folder.getUrl(), 'Open folder'),
      'ID': cell_(data.id),
    };
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    sheet.appendRow(headers.map((h) => (h in values ? values[h] : '')));
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// ─────────── Phone photos ───────────

// The kiosk registers a code when it shows the QR; uploads are only accepted for live codes.
function startPhoneSession_(data) {
  if (!validCode_(data.code)) return json_({ ok: false, error: 'bad code' });
  CacheService.getScriptCache().put('ps:' + data.code, '1', PHONE_SESSION_MINUTES * 60);
  return json_({ ok: true });
}

function phoneUpload_(data) {
  const code = data.code;
  if (!validCode_(code)) return json_({ ok: false, error: 'bad code' });
  const cache = CacheService.getScriptCache();
  if (!cache.get('ps:' + code)) return json_({ ok: false, error: 'expired' });
  const m = /^data:(image\/[\w+.-]+);base64,/.exec(data.data || '');
  if (!m) return json_({ ok: false, error: 'not an image' });
  if (data.data.length > PHONE_MAX_CHARS) return json_({ ok: false, error: 'too big' });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ids = JSON.parse(cache.get('px:' + code) || '[]');
    if (ids.length >= PHONE_MAX_PHOTOS) return json_({ ok: false, error: 'too many' });
    let name = safeName_(data.name || 'photo');
    if (!/\.[A-Za-z0-9]{2,5}$/.test(name)) name += '.' + extFor_(m[1]);
    const bytes = Utilities.base64Decode(data.data.slice(m[0].length));
    const file = getPhoneFolder_().createFile(Utilities.newBlob(bytes, m[1], code + '__' + (ids.length + 1) + '__' + name));
    ids.push(file.getId());
    cache.put('px:' + code, JSON.stringify(ids), CACHE_SECONDS);
    const preview = String(data.preview || '');
    if (/^data:image\/jpeg;base64,/.test(preview) && preview.length < 90000) cache.put('pv:' + file.getId(), preview, CACHE_SECONDS);
    return json_({ ok: true, count: ids.length });
  } finally {
    lock.releaseLock();
  }
}

function phonePhotos_(code) {
  const cache = CacheService.getScriptCache();
  const ids = JSON.parse(cache.get('px:' + code) || '[]');
  const previews = ids.length ? cache.getAll(ids.map((id) => 'pv:' + id)) : {};
  return ids.map((id) => ({ id: id, preview: previews['pv:' + id] || '' }));
}

/** Runs daily (installed by setup): trashes phone photos that were never attached to a request. */
function cleanupPhoneUploads() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const files = getPhoneFolder_().getFiles();
  while (files.hasNext()) {
    const f = files.next();
    if (f.getDateCreated().getTime() < cutoff) f.setTrashed(true);
  }
}

// ─────────── Setup & storage ───────────

/**
 * Run this from the editor after pasting in new code: it asks for any new permissions,
 * creates the folders + sheet, upgrades the sheet's columns and formatting, and installs
 * the daily cleanup. Safe to run again any time.
 */
function setup() {
  const root = getRoot_();
  getPhoneFolder_();
  const sheet = getSheet_();
  formatSheet_(sheet);
  if (!ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === 'cleanupPhoneUploads')) {
    ScriptApp.newTrigger('cleanupPhoneUploads').timeBased().everyDays(1).create();
  }
  Logger.log('Folder: ' + root.getUrl());
  Logger.log('Sheet:  ' + sheet.getParent().getUrl());
}

function getRoot_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('ROOT_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) {}
  }
  const folder = DriveApp.createFolder(ROOT_FOLDER_NAME);
  props.setProperty('ROOT_ID', folder.getId());
  return folder;
}

function getPhoneFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PHONE_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) {}
  }
  const folder = getRoot_().createFolder(PHONE_FOLDER_NAME);
  props.setProperty('PHONE_ID', folder.getId());
  return folder;
}

function getSheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  let sheet = null;
  if (id) {
    try { sheet = SpreadsheetApp.openById(id).getSheets()[0]; } catch (e) {}
  }
  if (!sheet) {
    const ss = SpreadsheetApp.create(SHEET_NAME);
    DriveApp.getFileById(ss.getId()).moveTo(getRoot_());
    sheet = ss.getSheets()[0];
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    props.setProperty('SHEET_ID', ss.getId());
    formatSheet_(sheet);
    return sheet;
  }
  // Sheets made by older versions of this script: add Status up front, anything else missing at the end.
  const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  let changed = false;
  if (headers.indexOf('Status') < 0) {
    sheet.insertColumnBefore(1);
    sheet.getRange(1, 1).setValue('Status');
    changed = true;
  }
  HEADERS.forEach((h) => {
    if (h !== 'Status' && headers.indexOf(h) < 0) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h);
      changed = true;
    }
  });
  if (changed) formatSheet_(sheet);
  return sheet;
}

// Header text → 1-based column number.
function columns_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const cols = {};
  headers.forEach((h, i) => { if (h) cols[h] = i + 1; });
  return cols;
}

function formatSheet_(sheet) {
  const cols = columns_(sheet);
  const lastCol = sheet.getLastColumn();
  const rows = sheet.getMaxRows() - 1;
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, lastCol).setFontWeight('bold');
  if (cols['Status']) {
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(true).build();
    sheet.getRange(2, cols['Status'], rows, 1).setDataValidation(rule);
  }
  if (cols['Price']) sheet.getRange(2, cols['Price'], rows, 1).setNumberFormat('$#,##0.00');
  if (cols['Submitted']) sheet.getRange(2, cols['Submitted'], rows, 1).setNumberFormat('ddd mmm d, h:mm am/pm');
  if (cols['Request']) {
    sheet.setColumnWidth(cols['Request'], 360);
    sheet.getRange(2, cols['Request'], rows, 1).setWrap(true);
  }
  if (cols['Notes']) {
    sheet.setColumnWidth(cols['Notes'], 240);
    sheet.getRange(2, cols['Notes'], rows, 1).setWrap(true);
  }
}

function alreadySaved_(sheet, cols, id) {
  const last = sheet.getLastRow();
  if (last < 2 || !cols['ID']) return false;
  return !!sheet.getRange(2, cols['ID'], last - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findNext();
}

// ─────────── Helpers ───────────

function validCode_(code) {
  return /^[a-z0-9]{12,32}$/.test(String(code || ''));
}

function inFolder_(file, folderId) {
  const parents = file.getParents();
  while (parents.hasNext()) if (parents.next().getId() === folderId) return true;
  return false;
}

function extFor_(mime) {
  const sub = String(mime || '').split('/')[1] || 'bin';
  return sub === 'jpeg' ? 'jpg' : sub.replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'bin';
}

// Customer text starting with = + - @ would otherwise be run as a spreadsheet formula.
function cell_(v) {
  const s = v == null ? '' : String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// Drive URLs only ever come from this script, never from the customer.
function link_(url, label) {
  return '=HYPERLINK("' + url.replace(/"/g, '') + '","' + label + '")';
}

function safeName_(s) {
  return String(s).replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim().slice(0, 60) || 'request';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
