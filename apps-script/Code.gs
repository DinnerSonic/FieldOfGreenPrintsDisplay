/**
 * Field of Green Prints — commission receiver (Google Apps Script web app).
 *
 * Each request from the iPad kiosk becomes:
 *   My Drive / Field of Green Prints Commissions / <date time - name> / photo.jpg + request.txt
 * plus a row in the "Commission log" spreadsheet in that same folder, where you track
 * Status, Price and Notes.
 *
 * Setup steps are in README.md next to this file.
 */

// Must match APPS_SCRIPT_KEY in src/config.js.
const SHARED_KEY = 'fogp-kiosk';
const ROOT_FOLDER_NAME = 'Field of Green Prints Commissions';
const SHEET_NAME = 'Commission log';
const STATUSES = ['New', 'Quoted', 'Accepted', 'Printing', 'Done', 'Declined'];
// Columns are matched by header text, so you can reorder them or add your own in the sheet.
const HEADERS = ['Status', 'Submitted', 'Name', 'Contact', 'Request', 'Price', 'Notes', 'Photo', 'Folder', 'ID'];

/** Health check: open the /exec URL in a browser and you should see {"ok":true,...}. */
function doGet() {
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
      const ext = m[1] === 'image/jpeg' ? 'jpg' : m[1].split('/')[1];
      const bytes = Utilities.base64Decode(data.photo.slice(m[0].length));
      photoUrl = folder.createFile(Utilities.newBlob(bytes, m[1], 'photo.' + ext)).getUrl();
    }

    folder.createFile('request.txt', [
      'Submitted: ' + stamp,
      'Name:      ' + (data.name || '—'),
      'Contact:   ' + (data.contact || '—'),
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

/**
 * Run this once from the editor: it asks for Drive permission, creates the folder + sheet,
 * and (re)applies the sheet's formatting. Safe to run again any time.
 */
function setup() {
  const root = getRoot_();
  const sheet = getSheet_();
  formatSheet_(sheet);
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
  }
  // Older sheets (from the first version of this script) have no Status column: add it up front.
  const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  if (headers.indexOf('Status') < 0) {
    sheet.insertColumnBefore(1);
    sheet.getRange(1, 1).setValue('Status');
    formatSheet_(sheet);
  }
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
