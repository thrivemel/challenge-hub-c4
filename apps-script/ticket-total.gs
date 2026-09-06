/**
 * Raffle Tickets Tracker -> a Champion's Golden Ticket total
 *
 * Give it an email, it returns that person's real total from the tracker.
 * It is deliberately built so it cannot invent a number.
 *
 * ---------------------------------------------------------------------------
 * WHY IT DOES NOT READ THE "TOTAL RAFFLE TICKETS EARNED" COLUMN
 * ---------------------------------------------------------------------------
 * That column is a formula that stops partway down the sheet. Checked against
 * the live tracker on 4 September 2026: 22 people had tickets, and 15 of those
 * 22 had a BLANK Total cell. Reading that column would have told two thirds of
 * the ticket holders they had none.
 *
 * So this adds up the ticket columns itself. It finds them by their headers,
 * every one of which contains "tix" (Pre-Challenge Quests, DM Concierge, Days
 * 1 to 5, Summit signup, and the three bonuses), and it skips the Total column.
 * If a column is added or moved, it is still found.
 *
 * ---------------------------------------------------------------------------
 * DUPLICATES
 * ---------------------------------------------------------------------------
 * The tracker had 35 duplicated email addresses on 4 September. All of them
 * had zero tickets on both rows, so nobody's count was wrong yet, but a tick
 * landing on the second copy mid-week would have split someone's total.
 * This sums EVERY row that matches the email, so a split total still comes
 * out right, and it reports how many rows it added up so the team can see it.
 *
 * ---------------------------------------------------------------------------
 * IT NEVER GUESSES
 * ---------------------------------------------------------------------------
 * If the email is not in the tracker it returns found:false and no number.
 * The Hub then says the Concierge holds the count. It never shows a zero to
 * someone who simply is not on the list, because that reads as "you have none"
 * rather than "we cannot find you".
 *
 * ---------------------------------------------------------------------------
 * SETUP, once per round
 * ---------------------------------------------------------------------------
 * 1. Open the Raffle Tickets Tracker.
 * 2. Extensions > Apps Script. Paste this in.
 * 3. Put a long random string in SHARED_SECRET below and keep it out of the
 *    public repo. Without it this endpoint would tell anyone whether a given
 *    email is registered.
 * 4. Deploy > New deployment > Web app.
 *      Execute as:     Me
 *      Who has access: Anyone
 * 5. Copy the /exec URL into config.js on the server as
 *    window.THRIVE_TICKETS_ENDPOINT.
 *
 * Re-deploy as a NEW VERSION after any edit, or the old code keeps running.
 */

var SHEET_NAME    = '';     // '' uses the first tab
var HEADER_SCAN   = 40;     // rows to scan from the top looking for the header
var EMAIL_HEADER  = 'Email';
var NAME_HEADER   = 'Name';
var TOTAL_HEADER  = 'total raffle tickets';
var SHARED_SECRET = 'PUT-A-LONG-RANDOM-STRING-HERE';

function doGet(e)  { return handle(e && e.parameter ? e.parameter : {}); }
function doPost(e) {
  var p = {};
  try { p = JSON.parse(e.postData.contents); } catch (err) { p = (e && e.parameter) || {}; }
  return handle(p);
}

function handle(p) {
  try {
    if (SHARED_SECRET && String(p.key || '') !== SHARED_SECRET) {
      return reply({ ok: false, reason: 'unauthorised' });
    }
    var email = String(p.email || '').trim().toLowerCase();
    if (!email) return reply({ ok: true, found: false });

    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];

    var headerRow = findHeaderRow(sheet);
    if (headerRow < 1) return reply({ ok: false, reason: 'header row not found' });

    var lastCol = sheet.getLastColumn();
    var head    = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];

    var emailCol = findCol(head, EMAIL_HEADER);
    if (emailCol < 0) return reply({ ok: false, reason: 'email column not found' });

    var tixCols = ticketColumns(head);
    if (!tixCols.length) return reply({ ok: false, reason: 'no ticket columns found' });

    var firstRow = headerRow + 1;
    var nRows    = sheet.getLastRow() - headerRow;
    if (nRows < 1) return reply({ ok: true, found: false });

    var grid = sheet.getRange(firstRow, 1, nRows, lastCol).getValues();

    var total = 0, matched = 0;
    for (var i = 0; i < grid.length; i++) {
      if (String(grid[i][emailCol] || '').trim().toLowerCase() !== email) continue;
      matched++;
      for (var j = 0; j < tixCols.length; j++) {
        total += toNumber(grid[i][tixCols[j]]);
      }
    }

    if (!matched) return reply({ ok: true, found: false });
    return reply({
      ok: true,
      found: true,
      total: total,
      rows: matched,                       // >1 means duplicate rows were summed
      asOf: Utilities.formatDate(new Date(), 'America/Los_Angeles', 'd MMM, h:mm a') + ' PT'
    });

  } catch (err) {
    /* Never leak a stack trace to a page a lead can read. */
    return reply({ ok: false, reason: 'error' });
  }
}

/** The first row in the top HEADER_SCAN carrying BOTH a Name and an Email column. */
function findHeaderRow(sheet) {
  var scan = Math.min(HEADER_SCAN, sheet.getLastRow());
  if (scan < 1) return -1;
  var grid = sheet.getRange(1, 1, scan, sheet.getLastColumn()).getValues();
  for (var r = 0; r < scan; r++) {
    if (findCol(grid[r], EMAIL_HEADER) > -1 && findCol(grid[r], NAME_HEADER) > -1) return r + 1;
  }
  return -1;
}

/**
 * Every ticket column, found by the word "tix" in its header, with the
 * Total column excluded so it is never counted twice.
 */
function ticketColumns(head) {
  var out = [];
  for (var i = 0; i < head.length; i++) {
    var h = norm(head[i]);
    if (!h) continue;
    if (h.indexOf(TOTAL_HEADER) === 0) continue;
    if (h.indexOf('tix') > -1) out.push(i);
  }
  return out;
}

function findCol(head, label) {
  var want = norm(label);
  for (var i = 0; i < head.length; i++) {
    if (norm(head[i]).indexOf(want) === 0) return i;
  }
  return -1;
}

function norm(v) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Blank, text and stray characters all count as zero rather than breaking. */
function toNumber(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  var s = String(v == null ? '' : v).trim();
  if (!s) return 0;
  return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : 0;
}

function reply(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run this from the Apps Script editor to check the sheet before going live.
 * It prints what the endpoint would find, without exposing anything.
 */
function auditTracker() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
  var headerRow = findHeaderRow(sheet);
  var lastCol   = sheet.getLastColumn();
  var head      = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
  var emailCol  = findCol(head, EMAIL_HEADER);
  var tixCols   = ticketColumns(head);
  var grid      = sheet.getRange(headerRow + 1, 1, sheet.getLastRow() - headerRow, lastCol).getValues();

  var seen = {}, dupes = 0, holders = 0, noEmailHolders = 0;
  for (var i = 0; i < grid.length; i++) {
    var e = String(grid[i][emailCol] || '').trim().toLowerCase();
    var t = 0;
    for (var j = 0; j < tixCols.length; j++) t += toNumber(grid[i][tixCols[j]]);
    if (t > 0) { holders++; if (!e) noEmailHolders++; }
    if (e) { if (seen[e]) dupes++; seen[e] = true; }
  }
  Logger.log('header row: %s', headerRow);
  Logger.log('ticket columns: %s', tixCols.length);
  Logger.log('people with tickets: %s', holders);
  Logger.log('ticket holders with NO email (cannot be looked up): %s', noEmailHolders);
  Logger.log('duplicate email rows: %s', dupes);
}
