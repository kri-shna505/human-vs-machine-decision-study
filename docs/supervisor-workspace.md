# Supervisor workspace

The supervisor experience is available at `/supervisor`.

## Data-isolation contract

The workspace must never:

- create a consent record
- create a participant
- create a study session
- submit a human response
- complete a research session
- write supervisor-session answers to PostgreSQL
- reuse the participant study-progress storage key

Step 11.1 stores only a temporary supervisor-session marker in
`sessionStorage`. The marker is scoped to the current browser tab and is
deleted when the tab is closed or when the supervisor selects
**Reset session**.

## Verification

Unit tests verify:

- the workspace uses a dedicated key
- malformed state is discarded
- reset removes only the supervisor-session key
- no local-storage participant state is created
- initialization performs no `fetch` request

The Playwright test opens `/supervisor`, initializes the workspace, and
confirms no `/api/` request occurs.

## Next substep

Step 11.2 will add sample questions inside this isolated boundary.
Supervisor answers must remain client-side and must not call the research API.
