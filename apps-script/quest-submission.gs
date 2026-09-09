/**
 * Challenge Hub -> Raffle Tickets Tracker
 *
 * Receives a Quest submission from the Hub and ticks that person's day column
 * in the tracker. The tracker is a MATRIX, not a log: one row per registrant,
 * one column per Quest. So this finds the person by email and writes into their
 * row. It does not append.
 *
 * Anyone it cannot match goes to an "Unmatched" tab rather than being dropped,
 * so the Concierge can reconcile instead of a lead silently losing a ticket.
 *
 * ---------------------------------------------------------------------------
 * SETUP, once per challenge round
 * ---------------------------------------------------------------------------
 * 1. Open the Raffle Tickets Tracker.
 * 2. Extensions > Apps Script. Paste this file in, replacing anything there.
 * 3. Set SHEET_NAME below if the registrant tab is not the first one.
 * 4. Deploy > New deployment > type "Web app".
 *      Execute as:        Me
 *      Who has access:    Anyone
 *    "Anyone" is required because the Hub posts from the browser. The endpoint
 *    only ever writes a tick against an email that is already in the tracker,
 *    so it cannot be used to read anything out.
 * 5. Copy the /exec URL it gives you.
 * 6. In WordPress, set it before the Hub script runs:
 *      <script>window.THRIVE_QUEST_ENDPOINT = "https://script.google.com/.../exec";</script>
 *
 * Re-deploy as a NEW VERSION after any edit, or the old code keeps running.
 */

var SHEET_NAME   = '';   // '' uses the first tab
var HEADER_ROW   = 11;   // row holding "Name / Facebook Profile Name / Email / ..."
var EMAIL_HEADER = 'Email';

/** Column header text for each day's Quest, matched loosely (case and whitespace ignored). */
var DAY_COLUMNS = {
  1: 'Day 1',
  2: 'Day 2',
  3: 'Day 3',
  4: 'Day 4',
  5: 'Day 5'
};

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var email = String(body.email || '').trim().toLowerCase();
    var day   = parseInt(body.day, 10);

    if (!email || !(day >= 1 && day <= 5)) {
      return reply({ ok: false, reason: 'missing email or day' });
    }

    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
    var head  = sheet.getRange(HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];

    var emailCol = findCol(head, EMAIL_HEADER);
    var dayCol   = findCol(head, DAY_COLUMNS[day]);
    if (emailCol < 0 || dayCol < 0) {
      return reply({ ok: false, reason: 'header row ' + HEADER_ROW + ' does not have the expected columns' });
    }

    var firstData = HEADER_ROW + 1;
    var rows = sheet.getLastRow() - HEADER_ROW;
    var emails = rows > 0
      ? sheet.getRange(firstData, emailCol + 1, rows, 1).getValues()
      : [];

    for (var i = 0; i < emails.length; i++) {
      if (String(emails[i][0] || '').trim().toLowerCase() === email) {
        var cell = sheet.getRange(firstData + i, dayCol + 1);
        if (!String(cell.getValue()).trim()) cell.setValue(1);   // never overwrite a manual entry
        if (body.postUrl) cell.setNote('Hub submission ' + new Date().toISOString() + '\n' + body.postUrl);
        return reply({ ok: true, matched: true, row: firstData + i });
      }
    }

    unmatched(ss).appendRow([new Date(), body.challenge || '', day, email, body.postUrl || '']);
    return reply({ ok: true, matched: false });

  } catch (err) {
    return reply({ ok: false, reason: String(err) });
  }
}

/** Health check: opening the /exec URL in a browser should say "ready". */
function doGet() {
  return reply({ ok: true, status: 'ready' });
}

function findCol(header, label) {
  var want = norm(label);
  for (var i = 0; i < header.length; i++) {
    if (norm(header[i]).indexOf(want) === 0) return i;
  }
  return -1;
}

function norm(v) {
  return String(v || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function unmatched(ss) {
  var name = 'Unmatched Hub submissions';
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(['Received', 'Challenge', 'Day', 'Email', 'Post URL']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function reply(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
