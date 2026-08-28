# Making hub.clientattractionsummit.com update itself

## Where it stands

`hub.clientattractionsummit.com` is currently serving a **hand-uploaded copy** of `index.html` plus the assets, sitting behind Cloudflare. It is a byte-for-byte match of commit `4ea6f55`, which means it froze the moment it was uploaded and every push since has gone nowhere near it.

It is not WordPress, despite what the page source suggests. The word only appears in this file's own code comments.

So nothing is wrong with it. It simply has no connection to the repo.

## The fix, in one sentence

Point the domain at GitHub Pages. Pages already rebuilds on every push to `main`, so the auto-update Mel wants is a DNS change, not a pipeline.

## Steps

**1. DNS (needs whoever holds Cloudflare).** Replace the current record for `hub` with:

```
Type: CNAME
Name: hub
Target: thriveacademy2026.github.io
Proxy: DNS only (grey cloud) until the certificate issues, then Proxied is fine
```

**2. Repo side.** Add a `CNAME` file containing `hub.clientattractionsummit.com`, or set the custom domain under Settings > Pages.

**Order matters.** Do DNS first. Setting the custom domain before DNS resolves makes `thriveacademy2026.github.io/challenge-hub-c4/` redirect to a domain that is not yet pointed at Pages, and both URLs break until it catches up.

**3. Enforce HTTPS** in Settings > Pages once the certificate has issued.

After that: push to `main`, wait about a minute, and the live site has it. No upload step, nothing to remember.

## If the domain has to stay where it is

Then it needs a deploy step rather than a DNS change: a GitHub Action on push that pushes the files to that host. That needs credentials for the host, which nobody should paste into a public repo. Use repository secrets.

Given the current host is only serving static files, moving to Pages is simpler and removes the credential problem entirely.

## Review tools no longer need remembering

They shipped to the live domain because deleting them was a manual step, and manual steps get missed. The page now decides for itself:

- Shown on `localhost`, `127.0.0.1`, `thriveacademy2026.github.io`, and any URL with `?review=1`
- Removed from the DOM everywhere else

So `hub.clientattractionsummit.com` will never show them again, and the team can still get at them on the review URL or by adding `?review=1`.

## Still not in the repo, by design

The Zoom link and the Quest endpoint. Both are injected by the host, see **WORDPRESS.md**. Whatever serves the domain needs those two lines before the Hub's script.
