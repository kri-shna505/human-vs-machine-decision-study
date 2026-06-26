# Supervisor workspace

The supervisor experience is available at `/supervisor`.

The presentation-only comparative dashboard is available at
`/supervisor/analysis` after all guided questions are complete.

## Data-isolation contract

The workspace and comparative dashboard must never:

- create a consent record
- create a participant
- create a research study session
- submit a human response to the research API
- complete a research session
- query live participant results
- read a research export
- write supervisor answers to PostgreSQL
- reuse the participant study-progress storage key

Supervisor state is stored only in `sessionStorage`. It is scoped to the
current browser tab and is removed when the tab closes or the supervisor
selects **Reset session**.

## Guided questions

The workspace contains three local decision scenarios:

1. Conjunction Fallacy
2. Framing Effect
3. Risk Preference

Each question records:

- the selected local option
- a confidence value from 0 to 100
- a local answer timestamp

The guided experience supports:

- previous-question navigation
- same-tab refresh recovery
- completion review
- question restart
- complete session reset

No guided-question action performs a `fetch` request.

## Presentation-only comparative analysis

Step 11.3 adds a responsive dashboard that combines:

- the completed browser-local supervisor session
- a fixed, versioned illustrative dataset
- human and model comparison cards
- scenario-level alignment charts
- confidence comparison
- local confidence and consensus summaries
- explicit data-integrity disclosures

The fixed dataset is defined in:

```text
frontend/src/supervisor/presentationAnalysis.ts
```

The dashboard is intentionally deterministic. It does not query the API,
PostgreSQL, participant records, live research results, or exports.

The dashboard route redirects to `/supervisor` unless a completed local
supervisor session exists.

## Verification

Unit tests verify:

- the presentation dataset is explicit and bounded
- every guided question has a matching chart scenario
- average calculations are deterministic
- the dashboard redirects without a completed session
- comparison cards and charts render
- local confidence and consensus summaries are correct
- no live-data request is made
- navigation back to the workspace exists

Playwright verifies:

- all guided questions can be completed
- the comparative dashboard can be opened
- presentation-data labeling is visible
- both charts render
- no `/api/` request is made
- refresh recovery and session reset continue to work
