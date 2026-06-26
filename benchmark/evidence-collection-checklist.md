# Benchmark evidence-collection checklist

Use one copy of this checklist for each application.

## Frozen identifiers

- Protocol ID: `human-vs-machine-four-application-protocol-v1`
- Protocol version: `1.0.0`
- Prompt SHA-256: `f04d46fc421e27062c92590351b096277dc0be07d8c32ae5e5355652a3f4c6c0`
- Protocol SHA-256: `15e199eef2fc1227a94093e99219366db7f710eb03c524217cde3405658590cb`
- Rubric SHA-256: `5e3c012005a5162d54465bb51b0605977b58d03dafbee8a1ee76c4ac05726a75`

## Before the timer

- [ ] Application ID recorded
- [ ] Tool/version/plan recorded
- [ ] Frozen source snapshot preserved
- [ ] Snapshot SHA-256 or commit recorded
- [ ] Deployed URL recorded when supported
- [ ] Evaluator recorded
- [ ] UTC clock synchronized
- [ ] Empty run directory created
- [ ] Prompt and protocol hashes copied into `run.json`
- [ ] No source edits made after snapshot

## Timing

- [ ] Setup-grace start recorded
- [ ] Evaluation start recorded
- [ ] Evaluation finish recorded
- [ ] Retry start and cause recorded, if used
- [ ] Total evaluator time is no more than 120 minutes
- [ ] Generation time recorded separately when available
- [ ] Manual-edit time recorded separately when available

## Functional evidence

- [ ] Consent and participant creation
- [ ] All three scenario submissions
- [ ] Confidence collection
- [ ] Completion route
- [ ] Refresh recovery
- [ ] Duplicate-response protection
- [ ] Route protection
- [ ] Recoverable API failure
- [ ] Three persisted responses verified in the relational database

## Supervisor isolation

- [ ] Supervisor workspace opens without participant creation
- [ ] Guided questions complete locally
- [ ] Refresh recovery works
- [ ] Reset clears only supervisor state
- [ ] Comparative analysis opens
- [ ] Network log proves zero research API submissions
- [ ] Database evidence proves zero supervisor research writes
- [ ] Illustrative data is visibly labeled

## Accessibility

- [ ] Keyboard-only core journey
- [ ] Visible focus captured
- [ ] Form labels and heading structure reviewed
- [ ] Desktop automated accessibility report preserved
- [ ] Mobile automated accessibility report preserved
- [ ] Violations and severity recorded without hiding failures

## Security

- [ ] Dependency scan preserved
- [ ] Source-code scan preserved
- [ ] Secret scan preserved
- [ ] Environment example contains no live credentials
- [ ] Browser identifiers use secure randomness where applicable
- [ ] Security failures preserved in raw form

## Deployment

- [ ] Clean dependency installation
- [ ] Production build
- [ ] Database startup
- [ ] Migration execution
- [ ] Seed execution
- [ ] Application and database health
- [ ] Complete-stack public-frontend smoke test
- [ ] Deployment logs preserved

## Required screenshots

- [ ] `01-desktop-landing.png`
- [ ] `02-desktop-consent.png`
- [ ] `03-desktop-participant-question.png`
- [ ] `04-desktop-completion.png`
- [ ] `05-desktop-supervisor.png`
- [ ] `06-desktop-analysis.png`
- [ ] `07-mobile-landing.png`
- [ ] `08-mobile-participant-question.png`
- [ ] `09-mobile-analysis.png`

## Scoring closeout

- [ ] Every non-zero score cites evidence
- [ ] Every score of 4 cites strong evidence
- [ ] Scores were assigned before viewing other totals
- [ ] Missing evidence is not described as a pass
- [ ] Evaluator rationale recorded
- [ ] Protocol conformance marked complete
- [ ] Validator passes
