#!/bin/sh
# Installs the repo's git hooks into .git/hooks.
#
# .git/hooks is not version-controlled, so a hook written there protects one
# machine and silently does nothing for anyone else — including CI, and
# including this machine after a fresh clone. Keeping the hook body here and
# copying it in makes the wiring reviewable and reproducible.
#
# Run after cloning:  sh scripts/install-hooks.sh
#
# Existing hooks are appended to rather than replaced, so this does not clobber
# the tests/secret-scanning pre-commit that may already be in place.

set -e

HOOK_DIR=".git/hooks"
PRE_COMMIT="$HOOK_DIR/pre-commit"

if [ ! -d "$HOOK_DIR" ]; then
  echo "❌ No $HOOK_DIR — run this from the repository root."
  exit 1
fi

DISCLOSURE_CALL='node scripts/check-disclosure.mjs "$1" || exit 1'

if [ -f "$PRE_COMMIT" ] && grep -q "check-disclosure.mjs" "$PRE_COMMIT"; then
  echo "✅ pre-commit already runs the disclosure check."
else
  if [ ! -f "$PRE_COMMIT" ]; then
    printf '#!/bin/sh\n' > "$PRE_COMMIT"
  fi
  # Prepended rather than appended: this check is fast and its failure is a
  # rewrite, so there is no point spending minutes on tests and scanners first.
  TMP=$(mktemp)
  {
    head -n 1 "$PRE_COMMIT"
    printf '\n# Disclosure check — see scripts/check-disclosure.mjs\n'
    printf 'echo "🔎 Checking for security-detail disclosure..."\n'
    printf '%s\n' "$DISCLOSURE_CALL"
    printf 'echo "✅ No weakness narration in staged changes."\n\n'
    tail -n +2 "$PRE_COMMIT"
  } > "$TMP"
  mv "$TMP" "$PRE_COMMIT"
  chmod +x "$PRE_COMMIT"
  echo "✅ Added the disclosure check to pre-commit."
fi

echo ""
echo "Note: the disclosure check inspects staged additions, the commit message,"
echo "and the branch name. It blocks wording that describes a weakness rather"
echo "than what the code guarantees. Bypass for a genuine case with the"
echo "'disclosure-ok' marker, or --no-verify in an emergency."
