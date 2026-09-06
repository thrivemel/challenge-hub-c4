# WordPress build notes

The Hub is one self-contained `index.html`. On WordPress it goes in a **full-width, no-sidebar page template**, and WordPress supplies three things the file deliberately does not carry.

## 1. The three injected values

Put this **before** the Hub's own script, in the page template or a Code Block:

```html
<script>
  window.THRIVE_ZOOM           = "";   // the real join link. NEVER commit it.
  window.THRIVE_ZOOM_PASSCODE  = "";   // the passcode. NEVER commit it either.
  window.THRIVE_QUEST_ENDPOINT = "https://script.google.com/…/exec";     // see apps-script/
</script>
```

**The Zoom link is not in this repo on purpose.** It carries an embedded passcode, and this repo is public, so committing it would let anyone read it from source and drop into a live session with Sharla. It lives in WordPress only.

Same reasoning for the Quest endpoint: the tracker holds registrant names and emails, so the sheet is never named here.

## 2. The gate

**This is the part the page cannot do for itself.** Everything in `index.html` runs in the browser, so any check it performs can be bypassed by anyone who opens dev tools. The email step on the welcome screen is a courtesy, not security.

Real gating has to happen in WordPress, before the page renders. What it needs to enforce:

- Only people **registered for the current challenge** get in.
- **Team members** get in regardless.
- Everyone else gets the opt-in page, not the Hub.

Two workable shapes, in order of preference:

**A. Token in the magic link.** GHL already issues a non-expiring magic link per contact. Have it carry a token, and have WordPress validate that token against the challenge's tag (`CHALLENGE.tag`, currently `challenge-sept-2026`) before serving the page. This is the least friction for leads: one click from an email, no password.

**B. Membership plugin.** Gate the page to a role, and sync GHL registrations into WordPress users per round. More moving parts, and it asks leads to log in, which will cost attendance.

Whichever is chosen, **the day videos must be gated too**, not just the page. An unlisted video URL sitting in the HTML is public to anyone who views source.

## 3. Rolling to the next challenge

Everything that changes per round lives in one place: the `CHALLENGE` object at the top of the script in `index.html`. Nothing else should need touching.

1. `id` — bump it (`c4` to `c5`). This also resets everyone's saved progress, which is what you want for a new round.
2. `name` and `tag` — the new dates, and the new GHL tag that grants access.
3. `days[]` — the five dates and titles. Quest post and Playbook URLs are the evergreen pretty links (`giftfromthrive.com/name`, `/intrigue`, `/trust`, `/invitation`, `/success`) and normally do not change.
4. `replaysCloseAt` — the Sunday after the challenge, 9:00pm PT. Keep the `-07:00` offset (or `-08:00` outside daylight time) so it is unambiguous.
5. Swap `hero.mp4` and `hero-poster.jpg` if you want new b-roll.
6. Re-point the Quest endpoint at the new round's tracker, and re-deploy the Apps Script against it.

### Replays closing

`replaysCloseAt` makes each day page swap to a "this replay has closed" state that still offers the Playbook and the Summit link. Past that moment nobody sees a session video.

Client side this is presentation only. To actually stop access, WordPress has to stop serving the videos at the same moment — otherwise the URLs still work for anyone who kept them.

## 4. Before it goes live

- **Delete the review tools.** Three marked blocks: `<div id="rev">` in the markup, its CSS section, and its script section. That is the floating "Review tools" button.
- **Swap the two video placeholders** for real embeds. Sharla wants Fathom used the moment each session ends rather than waiting on the Zoom render.
- Confirm the mobile Facebook-app problem Philippe found: tapping a Group link from a mobile browser opens Facebook in the browser rather than the app, which breaks the join flow. The troubleshooting block covers it, but it should be tested on a real phone.
- Sharla to approve the Summit block wording. Price, scholarship framing and Leah's bonus slots are deliberately absent.
