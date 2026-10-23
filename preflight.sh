#!/usr/bin/env bash
# Refuses a deploy that would destroy work, and says why.
# Run from the repo root:  ./preflight.sh
#
# Written after 19 Oct 2026, when a deploy from this repo wiped Philippe's
# GTM and consent gate because they lived on the server and not in here.
# Same mechanism had already deleted 11 assets in September, including the
# masthead logo, which was broken in front of leads for 27 hours.
#
# Every check below is a thing that actually went wrong. Nothing here is
# hypothetical.

set -uo pipefail
LIVE="https://hub.clientattractionsummit.com/"
DEPLOY_BRANCH="deploy-c1"
DEPLOY_REMOTE="fork"
FAIL=0
say(){ printf '%s\n' "$*"; }
bad(){ printf '  FAIL  %s\n' "$*"; FAIL=1; }
ok(){  printf '  ok    %s\n' "$*"; }

say ""; say "PRE-FLIGHT"; say "=========="

# 1. Right branch. I have pushed the wrong branch three times.
B=$(git branch --show-current)
[ "$B" = "$DEPLOY_BRANCH" ] && ok "on $DEPLOY_BRANCH" || bad "on '$B', not $DEPLOY_BRANCH"

# 2. Nothing uncommitted, so what is tested is what ships.
[ -z "$(git status --porcelain)" ] && ok "working tree clean" \
  || bad "uncommitted changes: $(git status --porcelain | wc -l | tr -d ' ') file(s)"

# 3. No deletions. rsync runs with --delete; a dropped file dies on the server.
git fetch -q "$DEPLOY_REMOTE" 2>/dev/null
DEL=$(git diff --diff-filter=D --name-only "$DEPLOY_REMOTE/main" HEAD | wc -l | tr -d ' ')
[ "$DEL" = "0" ] && ok "deletes nothing" || {
  bad "$DEL file(s) would be DELETED from the server:"
  git diff --diff-filter=D --name-only "$DEPLOY_REMOTE/main" HEAD | sed 's/^/          /'; }

# 4. THE BIG ONE. Anything live has that this commit does not is work by
#    someone who did not go through this repo. Deploying destroys it.
TMP=$(mktemp -d)
curl -fsS "${LIVE}?preflight=$RANDOM" > "$TMP/live.html" 2>/dev/null || { bad "cannot reach the live site"; }
if [ -s "$TMP/live.html" ]; then
  git show HEAD:index.html > "$TMP/repo.html"
  # strip the two things Cloudflare injects at serve time, so they are not
  # mistaken for someone's work
  sed -E 's|<script data-cfasync="false" src="/cdn-cgi[^<]*</script>||g' "$TMP/live.html" > "$TMP/live.clean"
  LOST=0
  for MARK in GTM- gtag dataLayer fbq thriveHubMarketingConsent thriveHubAnalyticsConsent \
              thriveHubClaimMetaLead thriveHubClaimGa4Signup googletagmanager \
              CAS_ORIGIN challenge-hub/session challenge-hub/login logo-navy; do
    L=$(grep -c -- "$MARK" "$TMP/live.clean" 2>/dev/null); L=${L:-0}
    R=$(grep -c -- "$MARK" "$TMP/repo.html"  2>/dev/null); R=${R:-0}
    if [ "$L" -gt 0 ] && [ "$R" -eq 0 ]; then
      bad "live has '$MARK' and this commit does NOT. Deploying erases it."
      LOST=1
    fi
  done
  [ "$LOST" = "0" ] && ok "nothing on live would be erased"

  # a crude size guard: a big shrink usually means something was dropped
  LB=$(wc -c < "$TMP/live.clean"); RB=$(wc -c < "$TMP/repo.html")
  SHRINK=$(( (LB - RB) * 100 / (LB>0?LB:1) ))
  [ "$SHRINK" -lt 10 ] && ok "size within 10% of live (${RB}B vs ${LB}B)" \
    || bad "this commit is ${SHRINK}% SMALLER than live. Check what went missing."
fi

# 5. Every asset the page asks for must exist, or it 404s in front of a lead.
MISS=0
grep -oE '(src|href)="[^"#?:]+\.(js|css|png|jpg|jpeg|mp4|ico|svg|webp)"' "$TMP/repo.html" 2>/dev/null \
 | sed -E 's/.*="//;s/"//' | sort -u | while read -r f; do
     [ -f "$f" ] || echo "          missing: $f"
   done > "$TMP/miss.txt"
[ -s "$TMP/miss.txt" ] && { bad "assets referenced but not in the repo:"; cat "$TMP/miss.txt"; } \
                       || ok "every referenced asset exists"

# 6. The page's own JavaScript must parse.
python3 - "$TMP/repo.html" "$TMP/page.js" <<'PY' 2>/dev/null
import re,sys
s=open(sys.argv[1],encoding="utf-8").read()
open(sys.argv[2],"w").write("\n;\n".join(
  re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", s, re.S)))
PY
if command -v node >/dev/null && [ -s "$TMP/page.js" ]; then
  node --check "$TMP/page.js" >/dev/null 2>&1 && ok "JavaScript parses" || bad "JavaScript does NOT parse"
fi

rm -rf "$TMP"
say ""
[ "$FAIL" = "0" ] && { say "PASS. Safe to push."; exit 0; }
say "BLOCKED. Fix the FAIL lines above. Do not push."; exit 1
