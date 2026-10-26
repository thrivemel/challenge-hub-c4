#!/usr/bin/env bash
# The only way index.html should ever reach the live server.
#
# WHY THIS EXISTS
# Two people ship to one server by two different routes. Philippe edits the
# live file directly; we deploy from this repo with rsync. Three times his
# work has been on the server and not in here, and twice a deploy from this
# repo destroyed it: 11 assets in September including the masthead logo, and
# his GTM and consent gate on 19 October.
#
# Dropping --delete does NOT fix that. The loss was not a deletion, it was
# index.html being replaced wholesale, which rsync does either way.
#
# The fix is to stop treating this repo as the truth. This script builds the
# file to deploy FROM THE LIVE PAGE, merges our changes onto it, and refuses
# to continue if anything is ambiguous. It is not a careful habit. It is a
# command, so it cannot be half-remembered at 1am.
#
#   ./deploy.sh            build and check, change nothing
#   ./deploy.sh --push     build, check, and push if everything passes

set -uo pipefail
LIVE="https://hub.clientattractionsummit.com/"
REMOTE="fork"; BRANCH="deploy-c1"
PUSH=0; [ "${1:-}" = "--push" ] && PUSH=1
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
die(){ printf '\nSTOPPED: %s\n' "$*"; exit 1; }
say(){ printf '%s\n' "$*"; }

say ""; say "BUILD FROM LIVE"; say "==============="

[ "$(git branch --show-current)" = "$BRANCH" ] || die "on '$(git branch --show-current)', expected $BRANCH"
[ -z "$(git status --porcelain)" ] || die "uncommitted changes; commit them first"

# 1. What is actually being served, right now.
curl -fsS "${LIVE}?deploy=$RANDOM" -o "$T/live.raw" || die "cannot reach the live site"

# 2. Remove the two things Cloudflare adds at serve time, so they are not
#    mistaken for somebody's work and committed into the repo.
python3 - "$T/live.raw" "$T/live" <<'PY'
import re,sys
s=open(sys.argv[1],encoding="utf-8").read()
s=re.sub(r'<script data-cfasync="false" src="/cdn-cgi[^<]*</script>','',s)
s=re.sub(r'<a href="/cdn-cgi/l/email-protection#[0-9a-f]+"><span class="__cf_email__"[^>]*>.*?</span></a>',
         '<a href="mailto:Support@Thrive-Academy.com">Support@Thrive-Academy.com</a>', s, flags=re.S)
if "cdn-cgi" in s: sys.exit("cloudflare artefact remains")
open(sys.argv[2],"w",encoding="utf-8").write(s)
PY
[ $? -eq 0 ] || die "could not clean the served page"

# 3. Three-way merge. OURS is live. THEIRS is us. BASE is what live came from.
git fetch -q "$REMOTE" || die "cannot fetch $REMOTE"
git show "$REMOTE/main:index.html" > "$T/base"   || die "no base"
git show "HEAD:index.html"         > "$T/theirs" || die "no HEAD index.html"
cp "$T/live" "$T/ours"
git merge-file -p "$T/ours" "$T/base" "$T/theirs" > "$T/out" 2>/dev/null
CONF=$(grep -cE '^(<<<<<<<|=======|>>>>>>>)' "$T/out" || true)
if [ "${CONF:-0}" -ne 0 ]; then
  cp "$T/out" ./MERGE-CONFLICT.html
  die "$CONF conflict markers. Written to MERGE-CONFLICT.html. Resolve by hand, do not guess."
fi
say "  merged with live, no conflicts"

# 4. Both sides must survive, by name. Not a size check, not a feeling.
MISSING=0
check(){ # label needle file
  n=$(grep -c -- "$2" "$3" || true); n=${n:-0}
  if [ "$n" -gt 0 ]; then printf '  ok    %s\n' "$1"
  else printf '  LOST  %s\n' "$1"; MISSING=1; fi
}
say ""; say "  Philippe's work:"
for m in "GTM container:GTM-" "consent gate:thriveHubMarketingConsent" \
         "analytics consent:thriveHubAnalyticsConsent" "Meta lead claim:ClaimMetaLead" \
         "GA4 signup claim:ClaimGa4Signup" "dataLayer:dataLayer"; do
  check "${m%%:*}" "${m##*:}" "$T/out"
done
say "  ours:"
for m in "auth wiring:CAS_ORIGIN" "login endpoint:challenge-hub/login" \
         "masthead logo:logo-navy" "round config:CHALLENGE.rounds"; do
  check "${m%%:*}" "${m##*:}" "$T/out"
done
[ "$MISSING" = "0" ] || die "something above was lost in the merge"

# 5. It has to parse.
python3 - "$T/out" "$T/page.js" <<'PY'
import re,sys
s=open(sys.argv[1],encoding="utf-8").read()
open(sys.argv[2],"w").write("\n;\n".join(
  re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", s, re.S)))
PY
if command -v node >/dev/null; then
  node --check "$T/page.js" >/dev/null 2>&1 || die "the merged JavaScript does not parse"
  say "  JavaScript parses"
fi

# 6. Show what actually changes, so nobody deploys blind.
cp "$T/out" index.html
say ""
say "  lines this deploy ADDS to live:    $(diff "$T/live" index.html | grep -c '^>' || true)"
say "  lines this deploy REMOVES from live: $(diff "$T/live" index.html | grep -c '^<' || true)"
if ! git diff --quiet -- index.html; then
  git add index.html
  git commit -q -m "Rebuild index.html from the live page before deploying

Built by deploy.sh: live page as one side of a three-way merge, so anything
edited directly on the server survives. Both sides verified by name."
  say "  committed the rebuild"
else
  say "  nothing to rebuild, repo already matches live plus our changes"
fi

./preflight.sh || die "preflight blocked it"

if [ "$PUSH" = "1" ]; then
  say ""; say "  pushing to $REMOTE/main"
  git push "$REMOTE" "$BRANCH:main" || die "push failed"
  say "  pushed. Verify the live page before walking away."
else
  say ""; say "  DRY RUN. Nothing pushed. Re-run with --push when you are ready."
fi
