# Human vs Machine Decision Study — frozen benchmark prompt

Protocol status: **FROZEN**

Prompt ID: `decision-study-product-brief-v1`

Prompt version: `1.0.0`

Freeze date: `2026-06-26`

Use the following requirements without adding vendor-specific shortcuts,
removing difficult requirements, or substituting mock persistence for the
required relational database.

---

Build a production-ready web application named **Human vs Machine Decision
Study**.

The application evaluates how people respond to three decision-making
scenarios and provides a separate supervisor presentation experience. The
participant research flow and supervisor presentation flow must be isolated
from one another.

## 1. Participant experience

Create a responsive landing page with a clear study title, a concise
description, and a primary action to begin.

Before participation, show an informed-consent page that explains:

- participation is voluntary
- responses are anonymous
- the participant may stop before submission
- responses will be used for research analysis
- no directly identifying personal information is required

After consent, create an anonymous participant record and a study session.

Present exactly these three scenarios, one at a time.

### Scenario 1 — Conjunction Fallacy

Context:

> Linda is 31 years old, single, outspoken, and very bright. She majored in
> philosophy. As a student, she was deeply concerned with discrimination and
> social justice and participated in anti-nuclear demonstrations.

Question:

> Which option is more probable?

Options:

1. Linda is a bank teller.
2. Linda is a bank teller and is active in the feminist movement.

### Scenario 2 — Framing Effect

Context:

> Imagine that the country is preparing for the outbreak of an unusual disease
> expected to kill 600 people.

Question:

> Which program would you choose?

Options:

1. Program A: 200 people will be saved.
2. Program B: There is a one-third chance that all 600 people will be saved and
   a two-thirds chance that nobody will be saved.

### Scenario 3 — Risk Preference

Question:

> Which option would you choose?

Options:

1. Receive $500 with certainty.
2. A 50% chance to receive $1,100 and a 50% chance to receive $0.

For every scenario:

- require one selected option
- collect confidence from 0 through 100
- prevent accidental duplicate submission
- persist the submitted response
- recover the next unanswered scenario after refresh
- show a recoverable error when submission fails

After all three scenarios, show a completion page and prevent the participant
from re-entering an incomplete or already completed route incorrectly.

## 2. Backend and persistence

Provide a real backend API and a persistent relational database.

The data model must separate at least:

- participants
- study sessions
- scenarios
- human responses

Provide database migrations and deterministic seed data for the three
scenarios.

Provide health endpoints for:

- application health
- database reachability

Do not commit secrets or private environment files. Provide an example
environment configuration.

## 3. Supervisor presentation experience

Provide a customer-facing supervisor workspace that uses the same application
branding.

Do not display the word **demo** in customer-facing navigation, headings,
buttons, or explanatory copy.

The supervisor experience must:

- be separate from consent and participant registration
- avoid creating participant or research-session records
- avoid submitting responses to the research API
- avoid writing to the relational database
- use browser-tab-scoped storage only
- support reset without affecting participant data
- include the same three guided questions
- collect local option and confidence selections
- recover local progress after refresh
- show a review screen after completion

Provide a comparative-analysis page containing:

- human and model comparison cards
- scenario-level charts
- alignment summaries
- confidence comparison
- clear labeling when values are illustrative presentation data
- a visible statement that presentation values are not live research results
- explicit confirmation that no research write occurred

Never present invented values as measured research results.

## 4. User interface and accessibility

Use one consistent visual identity across all screens.

The interface must:

- be responsive at desktop and mobile widths
- have visible keyboard focus
- use semantic headings, labels, buttons, links, and form controls
- support keyboard-only completion of the core participant journey
- avoid horizontal overflow at the required mobile viewport
- provide readable contrast and clear validation messages

## 5. Reliability, security, and quality

Include automated verification for the critical behavior.

At minimum, provide:

- unit tests for core state and validation logic
- browser tests for the participant journey
- browser tests for refresh recovery
- browser tests for route protection
- browser tests for recoverable API failures
- tests proving the supervisor journey generates no research API traffic
- tests proving supervisor reset is isolated
- linting and type checking where supported
- dependency and source-code security scanning where supported

Use secure random identifiers where identifiers are generated in the browser.
Do not use hard-coded production credentials.

## 6. Deployment and operations

Provide reproducible instructions to run the complete application.

Include:

- dependency installation
- database startup
- migrations
- seed execution
- backend startup
- frontend startup
- test commands
- production build commands

Prefer containerized release assets. A release-grade submission should include:

- backend container definition
- frontend container definition
- reverse-proxy or static-server configuration
- multi-service orchestration
- health checks
- migration execution
- deterministic seed execution
- a smoke test through the public frontend

## 7. Deliverables

Return or preserve:

- complete source code
- dependency manifests and lock files
- database schema and migrations
- automated tests
- setup and deployment documentation
- example environment configuration
- an immutable source snapshot or repository commit
- a runnable or deployed application when the platform supports it

Do not replace required behavior with screenshots, static mockups, or claims
that cannot be reproduced.
