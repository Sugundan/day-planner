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
 * Done! The URL is remembered, so future saves are one click.
 *
 * UPDATING FROM AN OLDER VERSION (needed for the daily backup):
 * paste this whole file over the old code, then
 * Deploy → Manage deployments → pencil (Edit) → Version: New version → Deploy.
 * The URL stays the same.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var tabName = data.tabName || 'Daily Log';
    var rows = data.rows || [];

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
  return out('Planner receiver v2 is running. Use the app to save data.');
}

function out(msg) {
  return ContentService.createTextOutput(msg).setMimeType(
    ContentService.MimeType.TEXT
  );
}
