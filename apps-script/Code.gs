/**
 * Field of Green Prints — commission receiver (Google Apps Script web app).
 *
 * Each request from the iPad kiosk becomes:
 *   My Drive / Field of Green Prints Commissions / <date time - name> / photo.jpg + request.txt
 * plus a row in the "Commission log" spreadsheet in that same folder.
 *
 * Setup steps are in README.md next to this file.
 */

// Must match APPS_SCRIPT_KEY in src/config.js.
const SHARED_KEY = 'fogp-kiosk';
const ROOT_FOLDER_NAME = 'Field of Green Prints Commissions';
const SHEET_NAME = 'Commission log';
const HEADERS = ['Received', 'Submitted', 'Name', 'Contact', 'Request', 'Price', 'Notes', 'Photo', 'Folder', 'ID'];
const ID_COLUMN = 10;

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
    // The kiosk retries anything it didn't get a reply for, so the same request can arrive twice.
    if (alreadySaved_(sheet, data.id)) return json_({ ok: true, duplicate: true });

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
      'Price:     ' + (data.price || '—'),
      '',
      'Request:',
      data.request || '—',
      '',
      'Notes:',
      data.notes || '—',
      '',
      'ID: ' + data.id,
    ].join('\n'), MimeType.PLAIN_TEXT);

    sheet.appendRow([
      new Date(), when,
      cell_(data.name), cell_(data.contact), cell_(data.request),
      data.price ? Number(data.price) || cell_(data.price) : '',
      cell_(data.notes), photoUrl, folder.getUrl(), cell_(data.id),
    ]);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

/** Run this once from the editor: it asks for Drive permission and creates the folder + sheet. */
function setup() {
  const root = getRoot_();
  const sheet = getSheet_();
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
  if (id) {
    try { return SpreadsheetApp.openById(id).getSheets()[0]; } catch (e) {}
  }
  const ss = SpreadsheetApp.create(SHEET_NAME);
  DriveApp.getFileById(ss.getId()).moveTo(getRoot_());
  const sheet = ss.getSheets()[0];
  sheet.appendRow(HEADERS);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  props.setProperty('SHEET_ID', ss.getId());
  return sheet;
}

function alreadySaved_(sheet, id) {
  const last = sheet.getLastRow();
  if (last < 2) return false;
  return !!sheet.getRange(2, ID_COLUMN, last - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findNext();
}

// Customer text starting with = + - @ would otherwise be run as a spreadsheet formula.
function cell_(v) {
  const s = v == null ? '' : String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function safeName_(s) {
  return String(s).replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim().slice(0, 60) || 'request';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
