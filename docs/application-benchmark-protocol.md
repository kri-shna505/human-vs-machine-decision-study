# Frozen four-application benchmark protocol

Protocol ID: `human-vs-machine-four-application-protocol-v1`

Version: `1.0.0`

Status: **FROZEN**

Freeze date: **2026-06-26**

Prompt SHA-256: `f04d46fc421e27062c92590351b096277dc0be07d8c32ae5e5355652a3f4c6c0`

Protocol SHA-256: `15e199eef2fc1227a94093e99219366db7f710eb03c524217cde3405658590cb`

Rubric SHA-256: `5e3c012005a5162d54465bb51b0605977b58d03dafbee8a1ee76c4ac05726a75`

## Purpose

This protocol makes the four-application comparison reproducible and prevents
the evaluator from changing requirements, time limits, allowed fixes, test
cases, screenshots, or evidence standards after seeing an application's
results.

The primary output is a **product-quality score**. Generation time and manual
edit time are preserved as metadata but are not included in the 100-point
score because the company application and the three tool-generated
applications do not have equivalent creation histories.

## Frozen requirements

The exact prompt is stored at:

```text
benchmark/shared-prompt.md
```

External tools must receive that file verbatim. The company application is
evaluated against the same requirements using its immutable source snapshot.

Any prompt change requires:

1. a new prompt version
2. a new protocol version
3. new hashes
4. fresh evidence for every application

## Identical evaluation window

Each application receives:

- 15 minutes of setup grace
- 90 minutes of measured evaluation
- at most 15 minutes for one proven infrastructure retry
- 120 minutes maximum total evaluator time

The timer begins only after the frozen snapshot and required runtime
information are available.

## Allowed fixes

No application source-code change is permitted after evaluation begins.

Allowed evaluator actions are limited to:

- creating environment files from the submitted example
- generating evaluator-owned random secrets
- selecting unused ports without changing behavior
- installing dependencies from submitted lock files
- starting documented services
- normalizing line endings when required by the runtime
- retrying one proven infrastructure failure

Feature work, test weakening, mock substitution, database manipulation, and
accessibility or security fixes are prohibited during evaluation.

## Required screenshots

Capture every screenshot using the frozen viewports.

Desktop: **1440 × 900**

Mobile: **390 × 844**

Required files:

1. `01-desktop-landing.png`
2. `02-desktop-consent.png`
3. `03-desktop-participant-question.png`
4. `04-desktop-completion.png`
5. `05-desktop-supervisor.png`
6. `06-desktop-analysis.png`
7. `07-mobile-landing.png`
8. `08-mobile-participant-question.png`
9. `09-mobile-analysis.png`

Screenshots are evidence, not substitutes for executable tests.

## Required tests

Every application must be evaluated for:

- complete participant journey
- refresh recovery
- duplicate-response protection
- route protection
- recoverable API failure
- relational-database persistence
- supervisor flow with zero research submissions
- isolated supervisor reset
- keyboard completion of the core interaction
- automated accessibility scan
- dependency and source-security scans
- production build
- complete-stack release smoke test

A missing test is recorded as missing evidence. It is not silently treated as
a pass.

## Evidence package

Use this directory pattern:

```text
benchmark/runs/<application-id>/<run-id>/
```

Required contents:

```text
run.json
manual-fixes.md
commands.log
test-results/
screenshots/
security/
accessibility/
deployment/
```

Every artifact must identify:

- application ID
- run ID
- frozen prompt hash
- frozen protocol hash
- source snapshot
- evaluator
- timestamps
- command or capture method
- the claim supported by the artifact

Vendor marketing pages, remembered behavior, and unsupported narrative claims
are not valid product evidence.

## Scoring

Each application is scored independently before the evaluator sees the other
totals.

No score may be adjusted merely to create separation between applications.

A final ranking is blocked until:

- all four evidence files are complete
- all four runs conform to this protocol
- all required evidence packages are preserved
- benchmark validation passes
- prompt and protocol hashes match

Tie breaks use this order:

1. Testing
2. Data isolation
3. Security
4. Functional completeness
5. Deployment readiness
6. Accessibility
7. Maintainability
8. UI quality
9. Presentation quality

## Verification commands

```powershell
python -m unittest discover `
  -s scripts/tests `
  -p "test_benchmark_*.py"

python scripts/benchmark_protocol.py --check

python scripts/benchmark_apps.py `
  --output artifacts/application-benchmark-report.md `
  --compare docs/application-benchmark-report.md
```

The protocol validator must fail if the prompt, rubric, protocol, application
manifest, or evidence metadata drifts.
