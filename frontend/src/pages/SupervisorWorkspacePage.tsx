import { useState } from "react";
import { Link } from "react-router-dom";

import AppHeader from "../components/AppHeader";
import {
  clearSupervisorSession,
  initializeSupervisorSession,
  loadSupervisorSession,
  type SupervisorSession,
} from "../supervisor/supervisorStorage";
import "./SupervisorWorkspacePage.css";

function formatStartedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function SupervisorWorkspacePage() {
  const [session, setSession] = useState<SupervisorSession | null>(
    () => loadSupervisorSession(),
  );

  function handleInitialize(): void {
    setSession(initializeSupervisorSession());
  }

  function handleReset(): void {
    clearSupervisorSession();
    setSession(null);
  }

  return (
    <div className="supervisor-page">
      <AppHeader navigationLabel="Supervisor navigation">
        <Link to="/">
          Return to study home
        </Link>
      </AppHeader>

      <main className="supervisor-main">
        <section className="supervisor-status-banner" role="status">
          <strong>Protected supervisor workspace</strong>
          <span>
            Responses created here are excluded from research results.
          </span>
        </section>

        <section className="supervisor-hero">
          <p className="supervisor-eyebrow">
            Supervisor experience
          </p>

          <h1>
            Explore the study without affecting participant data.
          </h1>

          <p>
            Review the study experience in a controlled workspace that is
            fully separated from consent, participant registration, research
            sessions, API submissions, and PostgreSQL persistence.
          </p>
        </section>

        <section
          className="supervisor-feature-grid"
          aria-label="Supervisor workspace safeguards"
        >
          <article>
            <span aria-hidden="true">01</span>
            <h2>Independent session</h2>
            <p>
              Workspace state uses a dedicated browser-tab key and never
              reads the participant study-progress key.
            </p>
          </article>

          <article>
            <span aria-hidden="true">02</span>
            <h2>No backend writes</h2>
            <p>
              Opening this experience does not create a participant, study
              session, response, or completion record.
            </p>
          </article>

          <article>
            <span aria-hidden="true">03</span>
            <h2>Reset anytime</h2>
            <p>
              Closing the tab clears session-scoped workspace state.
              Supervisors can also reset the session immediately.
            </p>
          </article>
        </section>

        <section className="supervisor-boundary-card">
          <div>
            <p className="supervisor-eyebrow">Research-data boundary</p>
            <h2>Isolation is explicit and testable</h2>
          </div>

          <dl>
            <div>
              <dt>Participant record</dt>
              <dd>Never created</dd>
            </div>

            <div>
              <dt>API submission</dt>
              <dd>Disabled</dd>
            </div>

            <div>
              <dt>PostgreSQL write</dt>
              <dd>None</dd>
            </div>

            <div>
              <dt>Storage scope</dt>
              <dd>Current browser tab</dd>
            </div>
          </dl>
        </section>

        {session ? (
          <section
            className="supervisor-ready-card"
            aria-live="polite"
          >
            <div>
              <p className="supervisor-eyebrow">Workspace initialized</p>
              <h2>Supervisor workspace is ready</h2>
              <p>
                The isolated foundation is active. Interactive questions and
                comparative analytics can now be presented without changing
                the research workflow.
              </p>
            </div>

            <dl>
              <div>
                <dt>Session reference</dt>
                <dd>{session.sessionId.slice(0, 18)}</dd>
              </div>

              <div>
                <dt>Started</dt>
                <dd>{formatStartedAt(session.startedAt)}</dd>
              </div>
            </dl>

            <div className="supervisor-actions">
              <button
                type="button"
                className="supervisor-secondary-button"
                onClick={handleReset}
              >
                Reset session
              </button>

              <Link className="supervisor-secondary-button" to="/">
                Return home
              </Link>
            </div>
          </section>
        ) : (
          <section className="supervisor-launch-card">
            <div>
              <p className="supervisor-eyebrow">Secure local session</p>
              <h2>Start the supervisor experience</h2>
              <p>
                This creates only a temporary session marker in the current
                browser tab and performs no network request.
              </p>
            </div>

            <button
              type="button"
              className="supervisor-primary-button"
              onClick={handleInitialize}
            >
              Start supervisor session
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

export default SupervisorWorkspacePage;
