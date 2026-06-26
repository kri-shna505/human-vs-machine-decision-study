# Supervisor workspace

The supervisor experience is available at `/supervisor`.

## Data-isolation contract

The workspace must never:

- create a consent record
- create a participant
- create a research study session
- submit a human response to the research API
- complete a research session
- write supervisor answers to PostgreSQL
- reuse the participant study-progress storage key

Supervisor state is stored only in `sessionStorage`. It is scoped to the
current browser tab and is removed when the tab closes or the supervisor
selects **Reset session**.

## Guided questions

Step 11.2 adds three local decision scenarios:

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

## Verification

Unit tests verify:

- question data integrity
- secure session creation and validation
- answer persistence and progression
- completion state
- navigation and restart behavior
- malformed-state removal
- no local-storage participant state is created
- no network request occurs during initialization

Playwright verifies:

- all three questions can be completed
- no `/api/` request is made
- question progress survives a page refresh
- the session can be reset

## Next substep

Step 11.3 will add comparative analysis and charts using presentation-only
sample data. Those visualizations must remain clearly separated from the
research-result pipeline.
