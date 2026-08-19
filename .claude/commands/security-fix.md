# Security-Fix — scan, fix, retest, sign off

Invoke with `/project:security-fix` any time a security vuln is found or suspected,
or after fixing a finding to confirm everything is clean.

Orchestrator (main Claude) runs all steps inline — no subagent needed unless fix
scope spans 3+ files.

---

## Step 1 — full scan (both tools, all severities)

Run Trivy and Semgrep in parallel:

```bash
# Terminal 1 (background)
trivy fs \
  --scanners vuln,secret,misconfig \
  --severity CRITICAL,HIGH,MEDIUM,LOW \
  --skip-dirs .pnpm-store,node_modules/.cache \
  . 2>&1 | tee /tmp/trivy-full.txt &

# Terminal 2 (background)
semgrep scan \
  --config=auto \
  --no-rewrite-rule-ids \
  . 2>&1 | tee /tmp/semgrep-full.txt &

wait
```

Or sequentially if parallel output would be confusing:

```bash
trivy fs --scanners vuln,secret,misconfig --severity CRITICAL,HIGH,MEDIUM,LOW \
  --skip-dirs .pnpm-store,node_modules/.cache . 2>&1

semgrep scan --config=auto --no-rewrite-rule-ids . 2>&1
```

---

## Step 2 — triage every finding

For each finding, classify before touching any code:

| Classification | Criteria | Action |
|---|---|---|
| **Real — fix now** | Attacker-controlled input reaches a sink, crypto weakness, secret in code, dep with known exploit | Fix in this session |
| **Real — track** | Low severity, no known exploit, no user-controlled path | Add to known-issues list, note in commit |
| **False positive** | Internal data only, test fixture, docs placeholder | Suppress with `# nosemgrep` or `.semgrepignore` entry + comment explaining why |

**Never suppress without a written reason.** The suppression comment must explain what makes it safe.

**Secret finding protocol:** if Trivy or Semgrep finds a secret (any severity):
1. Stop everything else.
2. Identify the file and line.
3. Alert the user: file, line, secret type.
4. Instruct user to cycle (revoke + regenerate) the credential immediately — assume compromised.
5. Do not continue until the secret is removed from file AND git history.

---

## Step 3 — fix real findings

Fix each real finding. Rules:
- Fix the root cause, not the symptom. Don't suppress a real finding.
- One logical fix per commit (crypto fix separate from dep upgrade separate from misconfig).
- For dep upgrades: run `pnpm install` after updating `package.json`, verify lockfile changed.
- For code fixes: read the full function before editing — understand context.
- For Dockerfile misconfiguration: fix the Dockerfile directly, don't add ignore rules.

---

## Step 4 — retest after every fix

After **each fix** (not just at the end):

```bash
pnpm test
```

All tests must pass before moving to the next finding. If a fix breaks a test:
- Understand why before proceeding
- Fix the test if the test was wrong (e.g. was asserting the broken behavior)
- Fix the code if the test was right

---

## Step 5 — rescan to confirm clean

After all fixes are applied:

```bash
# Both tools, same flags as Step 1
trivy fs --scanners vuln,secret,misconfig --severity CRITICAL,HIGH,MEDIUM,LOW \
  --skip-dirs .pnpm-store,node_modules/.cache . 2>&1

semgrep scan --config=auto --no-rewrite-rule-ids . 2>&1
```

Expected: zero findings (or only known-tracked / suppressed-with-reason items).

If new findings appear that weren't in Step 1 — stop, triage, fix before proceeding.

---

## Step 6 — commit

```bash
git add <changed files>
git commit -m "security: <what was fixed>

<root cause of each finding>
<why the fix addresses it>
<any suppressed findings and why they are safe>"
```

Commit message body must include:
- Root cause for every fixed finding
- Suppression justification for every nosemgrep / semgrepignore entry added

---

## Step 7 — sign-off block

Output this block when all findings are resolved and scans are clean:

```
SECURITY-FIX SIGN-OFF
=====================
Branch: <branch>
Scan tools: Trivy <version> + Semgrep <version>
Findings: <N total>
  Fixed:     <N> — <list with severity>
  Suppressed: <N> — <list with justification>
  Tracked:   <N> — <list with reason not fixed now>
pnpm test: PASS (<N> tests)
Trivy rescan: CLEAN
Semgrep rescan: CLEAN
Secrets found: YES (cycled) / NO
Orchestrator verdict: APPROVED ✅ / NEEDS REVISION ❌
```

If NEEDS REVISION — loop back to Step 3 with specific gaps listed.

---

## When to spawn a subagent

Spawn a subagent only if the fix touches 3+ unrelated files across different layers
(e.g. a dep upgrade + a crypto fix + a Dockerfile change all at once). Otherwise
fix inline. Subagent concurrency limit: max 4 (per AGENTS.md).
