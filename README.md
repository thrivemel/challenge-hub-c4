# Challenge Hub, C4 (September 7 to 11, 2026)

The content control centre for the Book 5 Consults in 5 Days Challenge.

**Live:** https://thriveacademy2026.github.io/challenge-hub-c4/

One responsive page. Desktop gets a sticky day-nav sidebar plus a two-column day layout; mobile collapses to a single column with the day list inline. Same file, no separate mobile build to keep in sync.

## Layout

**Welcome page and inside are deliberately different.**

- **Welcome page** (signed out): the Summit banner composition, full bleed. Sharla left, centred type, Jesse right, navy strip across the foot with the two of them standing in front of it. Warm neutral ground.
- **Inside** (signed in): the sidebar layout. That is the working part of the product and it does not carry a hero.

**The sidebar layout is the design.** Persistent left nav with the five days, Golden Ticket progress and the Concierge block; content on the right. That was settled early and it stays. On mobile the sidebar drops and the day list appears inline on the Hub.

The branding below is applied *on top of* that layout. It does not change it.

## The branding

Palette sampled off the Client Attraction Summit banner and the live thrive-academy.com, not interpreted from the guide.

| | Value | Role |
|---|---|---|
| Ground | `#DAD6DA` | masthead and sidebar |
| Band | `#1A325C` | navy as a **strip**, never a background field |
| Accent | `#00AEEF` | highlighted words in the strip |
| Buttons | `#044470` | filled; outline buttons are `#1A325C` hairline |

- **Display type is Raleway 200**, not semibold. The live site ships weight 200 and that lightness is most of what makes Thrive read as high-end.
- **Buttons are Oswald 400 at 5px tracking**, 1px border, square corners, matching the live site exactly.
- **Labels are Oswald 300 at 6 to 8px tracking.** The wide tracking is the brand signature.
- Navy appears as the strip under the masthead and as type. Never as a page background - that is the distinction Sharla was drawing.
### The welcome page uses b-roll, not cutouts

Cutouts kept getting cut. Footage does not. The welcome page now runs real b-roll of Sharla working at her desk, so **nothing of her is ever cropped, covered or pasted** - the frame simply shows what the camera saw.

- Source: `Bahia bar.MOV`, from the **Sharla B-roll Mar-Jun 2026** folder (Ella's pick). Solid brand-teal dress, warm hotel bar interior. That folder is the professional shoot and it is a different class of footage from the phone clips; shot 1920x1080 at 60fps with real depth of field. Her dress is brand teal, which is why this clip in particular works.
- Cut `crop=1470:674:450:20` to **2.18:1**, matching the hero's own aspect so the browser barely crops it, and shifted right so she sits about a third in, leaving the right for the copy. 6 second loop, **480KB**.
- The window is 4.2s to 10.2s. Earlier than that the photographer is visible in shot; later she doubles over laughing and her face leaves frame. The crop keeps 20px of headroom because her head rises as she laughs.
- `hero-poster.jpg` is the still fallback. It shows if the video is slow, blocked, or the viewer has asked for reduced motion.
- **She sits on the left of the frame, so the copy sits on the right.** The scrim is opaque under the words and clears toward her, which is what keeps her visible and the type readable. Flipping one without the other buries her.
- On mobile there is no room to run footage behind the words without burying her face under the scrim, so it becomes its own band above the navy strip instead.
- Reduced-motion viewers get the poster, held. There is also a play nudge on first interaction, because some engines hold muted autoplay until the user has touched the page and a frozen first frame reads as broken.

The transparent portraits `sharla-summit.png` and `jesse-summit.png` are still in the repo and are clean, reusable assets, but nothing references them now.

### Type scale

One scale, tokens at the top of the stylesheet. Before this pass there were **six sizes between 11 and 14px** doing no work, Oswald ran at four weights, and label tracking had six different values for one role.

| Token | Size | Role |
|---|---|---|
| `--t-display` | clamp 34-52 | h1, Raleway 200 |
| `--t-title` | clamp 24-34 | h2, Raleway 200 |
| `--t-lede` | clamp 17-19 | intro paragraphs, Raleway 300 |
| `--t-body` | 16.5 | reading text, Raleway 400 |
| `--t-small` | 14 | captions |
| `--t-micro` | 12 | labels, Oswald 300 |

Tracking is one value per role, not per element: `--ls-eyebrow` .62em, `--ls-label` .42em, `--ls-btn` .34em, `--ls-micro` .24em. The wide eyebrow tracking is deliberate; it is where the live site's airiness comes from.

**Oswald is 300 for labels and 400 for buttons. Nothing else.** 500 and 600 were off-system and are gone.

**Body text was the real problem.** Inside pages had no comfortable reading size at all: the scale jumped from 14px straight to 52px, so Quest steps and ticket copy were being read at 12-13.5px. They are 16.5px now.

**Measure is capped.** Concierge lines were running 127 characters per line. Reading text now tops out at 73 on desktop and 52 on mobile.

**Font weights are requested, not assumed.** The stylesheet asks for Raleway 200-600 and Oswald 300-500, matching every weight the CSS actually uses. Worth checking after any edit: if a weight is used but not requested, the browser silently synthesises it from the nearest face and the light display type quietly stops being light. That happened once here and was invisible until measured.

## What works

- Magic-link login, plus manual email entry with a real error state
- Day locking, with locked days visible but not clickable
- Two states per day: before the live (countdown, Join Zoom) and after (video, Quest)
- Quest step tracking with Golden Tickets, persisted in `localStorage`
- Day 1 uses its own Quest format (Compelling Consult Name), not the four-step one
- Copy-to-clipboard for the registration email, for the Facebook Group join question
- Non-Facebook submission path for Days 1 to 5

## Wired to real URLs

Playbooks (all 5 verified live), Quest posts (`giftfromthrive.com/day1` to `day5`), and the September Summit order page.

**The Zoom join link is deliberately not in this repo.** It carries an embedded `?pwd=` password, so committing it to a public repo would let anyone read it from source and join the live session. The `ZOOM` constant is a placeholder and the Join button says so. Inject the real link server-side behind the magic-link gate, or paste it only into a private production build.

## Days, and the Grand Finale

Days are looked up by their `n`, not by array position, so the numbering does not have to be contiguous. Day 8 (Grand Finale) sits after Day 5 without any 6 or 7 existing.

The Finale is configured with `quest:"none"` and no playbook, so it renders as a session plus the Summit invitation: no Quest steps, no Golden Ticket block, no "submit your post" link. It is also excluded from the ticket denominator, which is why the counter reads "of 5" and not "of 6".

**Its date still needs confirming.** `date` is `DATE TO CONFIRM`. Counting eight days from Mon Sept 7 lands on Mon Sept 14, which falls after the Sunday replay cut-off, so it needs a real answer rather than an assumption.

`unlockAll: true` opens every day at once. Set it to `false` to gate day by day again.

## Verified against the challenge assets folder

Checked against `CHALLENGE WEEK SCHEDULE Sept 7-11.png` in the assets folder:

- Day titles and dates match exactly (Sept 7 Consult Name, 8 Intrigue, 9 Trust, 10 Invitation, 11 Success).
- Sessions are **10 to 11am Pacific / 1 to 2pm Eastern**. The Hub says 10:00am PT / 1:00pm ET, which is right.
- **Replays come down Sept 13 at 9pm Pacific / midnight Eastern.** That is exactly what `replaysCloseAt` was already set to, now confirmed rather than assumed.

**The published schedule has no Grand Finale on it.** It runs Sept 7 to 11 plus the Sunday takedown. The Day 8 tab is in the Hub as requested but its date is still unconfirmed and it does not appear on the schedule the team is circulating.

The week schedule graphic itself now sits on the Pre-Challenge page under Step 1, since "when are the calls" is the question it answers.

The five `DAY N QUEST.png` graphics are square 1500x1500 social assets. They are the right artwork but the wrong shape for a 16:9 video poster, and cropping them would mean cropping Sharla, so they are not used here.

## Welcome video

`welcome.mp4` on the Pre-Challenge page. Real player with controls and sound, not the muted decorative pattern used for the hero b-roll, and `preload="none"` so it costs nothing until someone presses play.

Source was 796MB at 1080p and 20Mbps; encoded to 1280x720 at CRF 28 with 96k audio, which is **20.8MB** for 5:10. Comfortably inside GitHub's limits.

For production, consider moving it to a proper video host. GitHub Pages is not built for serving video at volume, and a gated Hub should not have a public video URL sitting in the page source anyway.

## Rolling to the next challenge
Everything per-round lives in the `CHALLENGE` object at the top of the script in `index.html`. Nothing else needs touching. Full runbook in **WORDPRESS.md**.

`id` (bump it, which also resets saved progress) · `name` and `tag` · the five `days` · `replaysCloseAt` · the b-roll files.

## Replays close automatically

`replaysCloseAt` is set to 9:00pm PT on the Sunday after the challenge. Past that, every day page swaps to a "this replay has closed" state that still offers the Playbook and the Summit link.

Client side this is presentation only. **WordPress has to stop serving the videos at the same moment**, or the URLs still work for anyone who kept them.

## Quest submissions

The non-Facebook path posts to an Apps Script web app that writes into the **Raffle Tickets Tracker**. Script and setup steps are in `apps-script/quest-submission.gs`.

The tracker is a matrix, not a log: one row per registrant, one column per Quest. So the script finds the person by email and ticks their Day column rather than appending. Anyone it cannot match goes to an "Unmatched" tab so the Concierge can reconcile, instead of a lead silently losing a ticket.

If the endpoint is unreachable the Quest still counts locally and the person is told to text their Concierge. Nobody gets stranded mid-Quest.

## Before launch

1. **Delete the review tools.** Remove the `<div id="rev">` block, its CSS section, and the review-tools script section at the bottom. All three are clearly marked. They sit in a collapsed panel in the bottom-right corner, not at the top of the page.
2. **Supply the Facebook Group URL.** The `FBGROUP` constant is a placeholder; the field is blank in both the Aug 17-23 and Sept 7-13 Notebooks.
3. **Swap the video placeholders** for the real embeds. Use Fathom immediately after each session rather than waiting for the Zoom render.
4. **Replace the Quest post URLs** with the direct Facebook post URLs if we want the "ugly" URLs Sharla asked for. The pretty URLs work today.
5. **Wire the login** to real registrant data. `REGISTERED` is a demo allowlist.
6. **Point the submission form** at a real endpoint.
7. Sharla to approve the Summit block wording. Price and scholarship framing are deliberately absent.

`noindex,nofollow` is set, matching C3.
