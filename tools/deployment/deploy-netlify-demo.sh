#!/usr/bin/env bash
#
# tools/deployment/deploy-netlify-demo.sh
#
# Bundles the full demo-publish sequence into one command:
#   1. Safety checks    — must be on main, working tree must be clean.
#   2. Pull latest      — so a just-merged PR is actually reflected locally.
#   3. Rebuild + audit  — prepare-netlify-demo.js, then audit-public-demo.js.
#   4. Count            — how many company configs are about to go out.
#   5. Draft deploy      — netlify deploy (no --prod), operator reviews the
#                          preview URL and must explicitly type "yes" to continue.
#   6. Production deploy — only after explicit confirmation.
#
# Stops immediately (non-zero exit) on the first failing step. Never
# auto-switches branches, never deploys to production without a human typing
# "yes" after seeing the draft preview URL.
#
# Usage:
#   ./tools/deployment/deploy-netlify-demo.sh

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo ""
  echo "ERROR: $1" >&2
  exit 1
}

extract_url() {
  local log="$1"
  local url
  url="$(grep -E '^(Website Draft URL|Website URL):' "$log" | sed -E 's/^[^:]+:[[:space:]]*//' | tail -1)"
  if [ -z "$url" ]; then
    url="$(grep -Eo 'https://[A-Za-z0-9._/-]+' "$log" | tail -1)"
  fi
  echo "$url"
}

# ── 1. Safety checks ────────────────────────────────────────────────────

echo "=== Step 1/6: Safety checks ==="

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "main" ]; then
  fail "Current branch is '$CURRENT_BRANCH', not 'main'. Switch to main first (git checkout main) and re-run this script."
fi
echo "  On branch main."

if [ -n "$(git status --porcelain)" ]; then
  echo ""
  git status --short
  fail "Uncommitted local changes detected (see above). Commit or stash them before deploying."
fi
echo "  Working tree is clean."

# ── 2. Pull latest ───────────────────────────────────────────────────────

echo ""
echo "=== Step 2/6: Pulling latest from origin/main ==="

BEFORE_HEAD="$(git rev-parse HEAD)"
if ! git pull; then
  fail "git pull failed. Resolve the issue above before deploying — do not deploy stale local state."
fi
AFTER_HEAD="$(git rev-parse HEAD)"

if [ "$BEFORE_HEAD" = "$AFTER_HEAD" ]; then
  echo "  Already up to date — no new commits pulled."
else
  NEW_COMMITS="$(git rev-list --count "$BEFORE_HEAD..$AFTER_HEAD")"
  CHANGED_FILES="$(git diff --name-only "$BEFORE_HEAD" "$AFTER_HEAD" | wc -l | tr -d ' ')"
  ADDED_FILES="$(git diff --name-status "$BEFORE_HEAD" "$AFTER_HEAD" | awk '$1=="A"' | wc -l | tr -d ' ')"
  echo "  Pulled $NEW_COMMITS new commit(s): $CHANGED_FILES file(s) changed, $ADDED_FILES new file(s) added."
fi

# ── 3. Rebuild + audit ───────────────────────────────────────────────────

echo ""
echo "=== Step 3/6: Rebuilding packaged output ==="

echo "  Running prepare-netlify-demo.js..."
if ! node tools/deployment/prepare-netlify-demo.js; then
  fail "prepare-netlify-demo.js failed (see output above). Deploy stopped."
fi

echo ""
echo "  Running audit-public-demo.js..."
if ! node tools/deployment/audit-public-demo.js; then
  fail "audit-public-demo.js reported failures (see output above). Deploy stopped — nothing was pushed to Netlify."
fi

# ── 4. Count and report ──────────────────────────────────────────────────

echo ""
echo "=== Step 4/6: Company count ==="

COMPANIES_DIR="$ROOT_DIR/public-demo/companies"
if [ -d "$COMPANIES_DIR" ]; then
  COMPANY_COUNT="$(find "$COMPANIES_DIR" -maxdepth 1 -name '*.json' | wc -l | tr -d ' ')"
else
  COMPANY_COUNT=0
fi
echo "  $COMPANY_COUNT company config(s) in public-demo/companies/ — sanity-check this against what you expect before continuing."

# ── 5. Draft deploy, always first ────────────────────────────────────────

echo ""
echo "=== Step 5/6: Draft deploy ==="

DRAFT_LOG="$(mktemp)"
if ! netlify deploy --dir=public-demo 2>&1 | tee "$DRAFT_LOG"; then
  rm -f "$DRAFT_LOG"
  fail "netlify deploy (draft) failed (see output above). Deploy stopped — production was not touched."
fi

PREVIEW_URL="$(extract_url "$DRAFT_LOG")"
rm -f "$DRAFT_LOG"

echo ""
if [ -n "$PREVIEW_URL" ]; then
  echo "  Preview URL: $PREVIEW_URL"
else
  echo "  Could not automatically extract a preview URL — check the netlify deploy output above."
fi

echo ""
echo "Check this preview URL before continuing. Type 'yes' to deploy to production, anything else to stop here."
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo ""
  echo "Stopping here — nothing was pushed to production. The preview deploy above remains available for review."
  exit 0
fi

# ── 6. Production deploy + summary ───────────────────────────────────────

echo ""
echo "=== Step 6/6: Production deploy ==="

PROD_LOG="$(mktemp)"
if ! netlify deploy --prod --dir=public-demo 2>&1 | tee "$PROD_LOG"; then
  rm -f "$PROD_LOG"
  fail "netlify deploy --prod failed (see output above)."
fi

PROD_URL="$(extract_url "$PROD_LOG")"
rm -f "$PROD_LOG"

echo ""
echo "=== Deploy Summary ==="
echo "  Production URL : ${PROD_URL:-(see netlify output above)}"
echo "  Companies live : $COMPANY_COUNT"
echo "  Deployed at    : $(date '+%Y-%m-%d %H:%M:%S %Z')"
