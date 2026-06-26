# Four-application benchmark

Step 12.1 establishes an evidence-backed comparison framework for:

1. the Human vs Machine Decision Study
2. a Lovable-generated application
3. a Replit-generated application
4. a Bolt.new-generated application

## Non-negotiable rule

The repository must not publish a winner based on invented, remembered, or
marketing-derived scores.

A final ranking is allowed only when:

- all four applications use the same frozen product prompt
- the same time budget and manual-fix policy are applied
- every application snapshot is preserved
- every non-zero score cites evidence
- all required criteria are complete
- the benchmark validator succeeds with `--require-complete`

The benchmark describes captured application snapshots. It does not claim that
one vendor or platform is universally better than another.

## Weighted categories

| Category | Weight |
|---|---:|
| Functional completeness | 18 |
| UI quality | 10 |
| Accessibility | 10 |
| Security | 12 |
| Testing | 14 |
| Data isolation | 12 |
| Deployment readiness | 10 |
| Maintainability | 8 |
| Presentation quality | 6 |
| **Total** | **100** |

Each criterion is scored from 0 through 4:

- **0** — absent or contradicted
- **1** — claimed or minimally demonstrated
- **2** — partially implemented with limited evidence
- **3** — implemented with reproducible evidence
- **4** — comprehensive, automated, and independently reproducible

A score of 4 requires automated-test, CI, audit, or deployment evidence.

## Files

```text
benchmark/
  applications.json
  rubric.json
  shared-prompt.md
  evidence/
    our-application.json
    lovable.json
    replit.json
    bolt-new.json

scripts/
  benchmark_apps.py
  tests/test_benchmark_apps.py
```

## Current state

The company application has a provisional internal baseline scored from the
repository snapshot merged through PR #12.

Lovable, Replit, and Bolt.new remain **pending** because no preserved
application snapshots or evidence packages have been supplied. They are not
scored as zero. No ranking is permitted.

The provisional company score is not a final victory claim. It must be
re-evaluated under the same frozen prompt and evaluation conditions used for
the three external applications.

## Required evidence package per application

Record:

- application name and tool
- generation or evaluation date
- exact tool/version or plan where available
- source-code archive or immutable repository commit
- deployed URL where available
- exact shared-prompt SHA-256
- total generation time
- manual-edit time and a change log
- test commands and raw outputs
- screenshots at the required viewport sizes
- accessibility evidence
- security evidence
- deployment evidence
- criterion scores and notes

Accepted evidence types:

- `automated_test`
- `ci_run`
- `audit_report`
- `source_code`
- `manual_capture`
- `deployment`
- `documentation`

## Commands

Validate the framework and generate the report:

```powershell
python scripts/benchmark_apps.py `
  --output docs/application-benchmark-report.md
```

Run validator tests:

```powershell
python -m unittest discover `
  -s scripts/tests `
  -p "test_benchmark_apps.py"
```

Verify that the checked-in report is current:

```powershell
python scripts/benchmark_apps.py `
  --output artifacts/application-benchmark-report.md `
  --compare docs/application-benchmark-report.md
```

After all four evidence packages are complete:

```powershell
python scripts/benchmark_apps.py `
  --require-complete `
  --output docs/application-benchmark-report.md
```

`--require-complete` must fail until the comparison is genuinely complete.

## Evidence collection protocol

For each generated application:

1. Create it from the exact frozen prompt.
2. Start the timer before submitting the prompt.
3. Stop the generation timer when the first runnable result appears.
4. Apply only fixes allowed by the shared manual-fix policy.
5. Record every manual change and the time spent.
6. Preserve the final source snapshot.
7. Execute the same functional test script.
8. Execute the same accessibility checks.
9. Execute the same security and secret checks.
10. Execute the same build and deployment checks.
11. Capture the same desktop and mobile screens.
12. Score each criterion only after linking its evidence.
13. Run the validator.
14. Publish a ranking only when all four applications are complete.

## Known gap

Automated accessibility evidence is currently absent for the company
application. The rubric records that criterion as zero instead of pretending
that semantic markup alone proves accessibility compliance.
