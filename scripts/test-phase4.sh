#!/usr/bin/env bash
# Phase 4 — real auth/session end-to-end smoke test.
#
# Verifies that ProductContext is resolved from the server-side session
# (User + WorkspaceMember) instead of the seeded DEFAULT_PRODUCT_CONTEXT.
#
# Usage:
#   BASE_URL=http://localhost:3001 scripts/test-phase4.sh
#
# Requires: curl, grep, awk. The app dev server must be running (npm run dev).

set -u

BASE="${BASE_URL:-http://localhost:3001}"
PASS=0
FAIL=0

check() { # name exit_code
  if [ "$2" = "0" ]; then
    echo "✅ $1"
    PASS=$((PASS + 1))
  else
    echo "❌ $1"
    FAIL=$((FAIL + 1))
  fi
}

echo "== Phase 4 auth/session test → $BASE =="
echo

# 1. Anonymous mutation must be blocked by the proxy session gate.
code=$(curl -s -o /tmp/p4_gate.json -w '%{http_code}' -X POST "$BASE/api/v1/payouts" \
  -H 'Content-Type: application/json' -d '{}')
check "A) anonymous mutation blocked (401)" "$([ "$code" = "401" ]; echo $?)"
grep -q '"error":"AUTH_REQUIRED"' /tmp/p4_gate.json
check "   error body is AUTH_REQUIRED" "$?"

# 2. Owner sign-in (Google-style session issued with a seeded email).
curl -s -c /tmp/p4_owner.jar -X POST "$BASE/api/v1/auth/google" \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@settleflow.local","sub":"seed-owner","name":"Demo Owner"}' > /dev/null
owner_json=$(curl -s -b /tmp/p4_owner.jar "$BASE/api/payouts")
owner_count=$(echo "$owner_json" | grep -o '"id"' | wc -l)
check "B) owner session sees the full payout list (>0)" "$([ "$owner_count" -gt 0 ]; echo $?)"

# 3. Contributor sign-in (Nora / user-contrib) must be scoped to her own payouts.
curl -s -c /tmp/p4_nora.jar -X POST "$BASE/api/v1/auth/google" \
  -H 'Content-Type: application/json' \
  -d '{"email":"nora@settleflow.local","sub":"seed-contrib","name":"Nora Kim"}' > /dev/null
nora_json=$(curl -s -b /tmp/p4_nora.jar "$BASE/api/payouts")
nora_count=$(echo "$nora_json" | grep -o '"id"' | wc -l)
nora_contrib=$(echo "$nora_json" | grep -o '"contributorId":"contrib-3"' | wc -l)
check "C) contributor session is scoped (fewer than owner)" "$([ "$nora_count" -lt "$owner_count" ]; echo $?)"
check "D) contributor sees ONLY contrib-3 payouts" "$([ "$nora_contrib" = "$nora_count" ]; echo $?)"

# 4. A mutation with a valid session passes the gate (non-401).
code=$(curl -s -o /tmp/p4_mut.json -w '%{http_code}' -b /tmp/p4_owner.jar \
  -X POST "$BASE/api/v1/payouts" -H 'Content-Type: application/json' -d '{}')
check "E) owner mutation passes gate (not 401)" "$([ "$code" != "401" ]; echo $?)"

# 5. Logout clears the session cookie.
curl -s -b /tmp/p4_owner.jar -c /tmp/p4_owner_after.jar \
  -X POST "$BASE/api/v1/auth/logout" > /dev/null
left=$(grep -c sf_session /tmp/p4_owner_after.jar || true)
check "F) logout clears sf_session" "$([ "$left" = "0" ]; echo $?)"

echo
echo "Passed: $PASS   Failed: $FAIL"
if [ "$FAIL" = "0" ]; then
  echo "✅ ALL PHASE 4 CHECKS PASSED"
else
  echo "❌ SOME CHECKS FAILED"
fi
