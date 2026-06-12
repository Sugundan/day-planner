/**
 * Day Planner → Google Sheets receiver
 *
 * SETUP (one time, ~3 minutes):
 * 1. Open your Google Sheet (or create a new one at sheets.new)
 * 2. Menu: Extensions → Apps Script
 * 3. Delete any code there and paste this entire file
 * 4. Click Deploy → New deployment
 *    - Click the gear icon → select "Web app"
 *    - Description: Day Planner
 *    - Execute as: Me
 *    - Who has access: Anyone        ← important!
 * 5. Click Deploy → Authorize (choose your Google account,
 *    click "Advanced" → "Go to ... (unsafe)" → Allow)
 * 6. Copy the Web app URL (ends in /exec)
 * 7. Paste that URL into the Day Planner app's
 *    "Apps Script URL" field → tap "Save today's data"
 *
 * Done! The URL is remembered, so future saves are one click.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var tabName = data.tabName || 'Daily Log';
    var rows = data.rows || [];

    // Always write to the sheet this script is attached to
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(tabName);

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

// Simple GET so you can test the URL in a browser
function doGet() {
  return out('Day Planner receiver is running. Use the app to save data.');
}

function out(msg) {
  return ContentService.createTextOutput(msg).setMimeType(
    ContentService.MimeType.TEXT
  );
}
