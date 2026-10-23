/**
 * Challenge Hub -> Sign-ins and Issues
 *
 * One endpoint, two tabs, all three rounds. Every row carries its round, so
 * C1, C2 and C3 live in the same sheet and are filtered apart rather than
 * split into three sheets nobody keeps in step.
 *
 *   Sign-ins  one row per sign-in attempt, including the exact wording a
 *             lead saw when it failed.
 *   Issues    faults the page caught on a real visitor's device: a script
 *             error, or an asset that would not load.
 *
 * This is what the Hub reports about itself. Issues a HUMAN notices go to the
 * Monday "Issues and Changes Log" board, not here, so the two do not drift
 * into being a worse copy of each other.
 * Append-only: this is a log, not a matrix, so it never overwrites anything.
 *
 * Why it exists: until 23 Oct 2026 nothing anywhere recorded a failed sign-in.
 * A lead who could not get in was invisible unless they wrote to the Concierge.
 * That is how the September 429 lockout stayed hidden for as long as it did.
 *
 * ---------------------------------------------------------------------------
 * SETUP
 * 1. Open the "Challenge Hub | Sign-in Log" sheet.
 * 2. Extensions -> Apps Script. Paste this file in, replacing anything there.
 * 3. Deploy -> New deployment -> type "Web app".
 *       Execute as:      Me
 *       Who has access:  Anyone
 *    "Anyone" is required because the Hub posts from a visitor's browser with
 *    no Google sign-in. The URL is the only secret, and the endpoint only ever
 *    writes; it returns nothing about anybody.
 * 4. Copy the /exec URL and give it to Aether. It goes in the Hub config as
 *    loginLogEndpoint. Until it is set the Hub logs nothing at all.
 * 5. Re-deploy as a NEW VERSION after any edit, or the old code keeps running.
 * ---------------------------------------------------------------------------
 */

var SHEET_NAME  = 'Sign-ins';
var ISSUE_SHEET = 'Issues';

var HEADER = ['Received', 'Outcome', 'What they saw', 'Email', 'Device',
              'Wrong tries', 'HTTP', 'Round', 'Tag', 'Screen', 'Page',
              'Challenge', 'User agent'];

var ISSUE_HEADER = ['Received', 'Round', 'Kind', 'What broke', 'Where',
                    'Device', 'Screen', 'Signed in as', 'Challenge',
                    'User agent'];

/* Plain-English names, so the sheet reads without anyone knowing the code. */
var KIND = {
  script_error:  'The page hit a JavaScript error',
  asset_missing: 'Something on the page would not load',
  promise_error: 'A background request failed'
};

/* The wording each outcome actually puts in front of the lead, so whoever
   reads this sheet knows what that person experienced without reading code.
   Keep these in step with loginNotice() in index.html. */
var SAW = {
  in:            'Signed in',
  not_on_list:   'We cannot find that email on the Challenge list',
  rate_limited:  'Too many tries, locked out for about 15 minutes',
  service_down:  'Sign-in is having a moment, try again shortly',
  unreachable:   'Could not reach the sign-in service at all'
};

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    /* Concurrent writers would otherwise land on the same row. 20s is far more
       than an append needs and well inside the 30s a web app is given. */
    lock.waitLock(20000);

    var body = {};
    try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
    catch (err) { return reply({ ok: false, error: 'bad json' }); }

    /* Issues take a different shape and a different tab. Anything without a
       type is a sign-in, which is what the first version of this sent. */
    if (String(body.type || '') === 'issue') return issue(body);

    var outcome = String(body.outcome || '').slice(0, 40);
    if (!outcome) return reply({ ok: false, error: 'no outcome' });

    var sheet = tab(SHEET_NAME, HEADER);
    sheet.appendRow([
      new Date(),
      outcome,
      SAW[outcome] || '',
      String(body.email || '').slice(0, 254),
      device(String(body.agent || '')),
      Number(body.attempt || 0),   /* wrong-email tries so far, not total attempts */
      Number(body.status || 0),
      String(body.round || ''),
      String(body.tag || ''),
      String(body.screen || ''),
      String(body.page || ''),
      String(body.challenge || ''),
      String(body.agent || '').slice(0, 300)
    ]);

    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (err2) {}
  }
}

function issue(body) {
  var kind = String(body.kind || '').slice(0, 40);
  if (!kind) return reply({ ok: false, error: 'no kind' });
  var sh = tab(ISSUE_SHEET, ISSUE_HEADER);
  sh.appendRow([
    new Date(),
    String(body.round || ''),
    KIND[kind] || kind,
    String(body.detail || '').slice(0, 500),
    String(body.page || ''),
    device(String(body.agent || '')),
    String(body.screen || ''),
    String(body.email || '').slice(0, 254),
    String(body.challenge || ''),
    String(body.agent || '').slice(0, 300)
  ]);
  return reply({ ok: true });
}

/* Visiting the URL in a browser should say something human, so whoever finds
   it later knows what it is rather than seeing an error. */
function doGet() {
  return reply({ ok: true, service: 'Challenge Hub sign-in log' });
}

function tab(name, header) {
  name   = name   || SHEET_NAME;
  header = header || HEADER;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh && name === SHEET_NAME) {
    /* First run. The sheet was created with one empty tab carrying the header,
       so adopt that rather than leaving a stray tab next to a new one. */
    var all = ss.getSheets();
    sh = (all.length === 1 && all[0].getLastRow() <= 1)
       ? all[0].setName(SHEET_NAME)
       : ss.insertSheet(SHEET_NAME);
  }
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(header);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, header.length).setFontWeight('bold');
  }
  return sh;
}

/* Roughly 90% of this audience is on a phone, and "phone or not" is the thing
   anyone reading the sheet actually wants. The full agent string is kept in
   the last column for the rare case where the detail matters. */
function device(ua) {
  var u = ua.toLowerCase();
  if (!u) return '';
  if (u.indexOf('ipad') > -1 || (u.indexOf('android') > -1 && u.indexOf('mobile') < 0)) return 'Tablet';
  if (u.indexOf('iphone') > -1 || u.indexOf('android') > -1 || u.indexOf('mobile') > -1) return 'Phone';
  return 'Desktop';
}

function reply(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
