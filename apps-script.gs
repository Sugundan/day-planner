/**
 * Planner → Google Sheets receiver
 *
 * SETUP (one time, ~3 minutes):
 * 1. Open your Google Sheet (or create a new one at sheets.new)
 * 2. Menu: Extensions → Apps Script
 * 3. Delete any code there and paste this entire file
 * 4. Click Deploy → New deployment
 *    - Click the gear icon → select "Web app"
 *    - Description: Planner
 *    - Execute as: Me
 *    - Who has access: Anyone        ← important!
 * 5. Click Deploy → Authorize (choose your Google account,
 *    click "Advanced" → "Go to ... (unsafe)" → Allow)
 * 6. Copy the Web app URL (ends in /exec)
 * 7. Paste that URL into the Planner app's
 *    "Apps Script URL" field → tap "Save today's data"
 *
 * 8. PROTECT IT: set ACCESS_KEY below to a long secret phrase (20+ characters),
 *    then type the same phrase in the app: Settings → Sheet → Access key.
 *    Without a key, anyone who learns the URL can read or overwrite your data.
 *
 * Done! The URL is remembered, so future saves are one click.
 *
 * UPDATING FROM AN OLDER VERSION (needed for the daily backup):
 * paste this whole file over the old code, then
 * Deploy → Manage deployments → pencil (Edit) → Version: New version → Deploy.
 * The URL stays the same.
 */

var ACCESS_KEY = '';   // <-- put your secret phrase between the quotes

function authed_(k) { return !ACCESS_KEY || String(k || '') === ACCESS_KEY; }

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (!authed_(data.key)) return out('error: wrong access key');
    var tabName = String(data.tabName || 'Daily Log');
    if (!/^[\w \-().]{1,60}$/.test(tabName)) return out('error: bad tab name');
    var rows = Array.isArray(data.rows) ? data.rows : [];
    if (rows.length > 20000) return out('error: too many rows');
    rows = rows.map(function (r) {
      return (Array.isArray(r) ? r : []).slice(0, 30).map(function (c) {
        return typeof c === 'string' ? c.slice(0, 50000) : c;
      });
    });
    // never wipe a tab with an (almost) empty payload
    if (data.replace === true && rows.length < 2) return out('error: refusing to replace with empty data');

    // Always write to the sheet this script is attached to
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(tabName);

    // replace = true is used by the daily backup: keep the previous copy
    // as "<tab> (previous)", then start the tab fresh.
    if (data.replace === true && rows.length > 0) {
      if (sheet && sheet.getLastRow() > 0) {
        var oldPrev = ss.getSheetByName(tabName + ' (previous)');
        if (oldPrev) ss.deleteSheet(oldPrev);
        var copy = sheet.copyTo(ss);
        copy.setName(tabName + ' (previous)');
        sheet.clear();
      }
    }

    // Create the tab if it doesn't exist yet
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    }

    if (rows.length === 0) {
      return out('error: no rows received');
    }

    // First row from the app is the header — only write it once
    var header = rows[0];
    var dataRows = rows.slice(1);
    // If the columns changed since this tab was last written (new app version), keep the old
    // tab as "<name> (old columns)" and start a fresh one, so rows never sit under wrong headers.
    if (sheet.getLastRow() > 0) {
      var oldHdr = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0]
        .map(String).filter(function (x, i, arr) { return x !== '' || i < header.length; });
      var same = oldHdr.length >= header.length;
      for (var i = 0; same && i < header.length; i++) if (String(oldHdr[i]) !== String(header[i])) same = false;
      if (!same) {
        var oldName = tabName + ' (old columns)';
        var oldCopy = ss.getSheetByName(oldName);
        if (oldCopy) ss.deleteSheet(oldCopy);
        sheet.copyTo(ss).setName(oldName);
        sheet.clear();
      }
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(header);
      sheet.getRange(1, 1, 1, header.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    // Append all data rows in one batch (fast)
    if (dataRows.length > 0) {
      sheet
        .getRange(sheet.getLastRow() + 1, 1, dataRows.length, header.length)
        .setValues(dataRows.map(function (r) {
          // pad/trim each row to header length
          var row = r.slice(0, header.length);
          while (row.length < header.length) row.push('');
          return row;
        }));
    }

    return out('success: ' + dataRows.length + ' rows saved');
  } catch (err) {
    return out('error: ' + err.message);
  }
}

// GET: with no parameters it just says it is running (the app checks for "receiver v2").
// ?action=read&tab=NAME returns that tab's rows as JSON (used by "Restore from backup").
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'read') {
    if (!authed_(p.key)) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'wrong access key' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    try {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(p.tab || '');
      var rows = sh && sh.getLastRow() > 0 ? sh.getDataRange().getValues() : [];
      return ContentService.createTextOutput(JSON.stringify({ ok: true, rows: rows }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err.message) }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  return out('Planner receiver v2 is running. ' + (ACCESS_KEY ? '(access key required)' : 'WARNING: no access key set.'));
}

function out(msg) {
  return ContentService.createTextOutput(msg).setMimeType(
    ContentService.MimeType.TEXT
  );
}
