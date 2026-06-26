import {
  type FormEvent,
  useState,
} from "react";
import { Link } from "react-router-dom";

import AppHeader from "../components/AppHeader";
import { SUPERVISOR_QUESTIONS } from "../supervisor/supervisorQuestions";
import {
  clearSupervisorSession,
  initializeSupervisorSession,
  loadSupervisorSession,
  restartSupervisorQuestions,
  saveSupervisorAnswer,
  setSupervisorQuestionIndex,
  startSupervisorQuestions,
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

interface SupervisorAnswerDraft {
  questionId: string;
  optionId: string;
  confidence: number;
}

function SupervisorWorkspacePage() {
  const [session, setSession] = useState<SupervisorSession | null>(
    () => loadSupervisorSession(),
  );

  const [answerDraft, setAnswerDraft] =
    useState<SupervisorAnswerDraft | null>(null);

  const currentQuestion =
    session?.phase === "questions"
      ? SUPERVISOR_QUESTIONS[session.currentQuestionIndex]
      : null;

  const existingAnswer =
    currentQuestion && session
      ? session.answers.find(
          (answer) => answer.questionId === currentQuestion.id,
        )
      : undefined;

  const currentAnswerDraft =
    answerDraft?.questionId === currentQuestion?.id
      ? answerDraft
      : null;

  const selectedOptionId =
    currentAnswerDraft?.optionId ?? existingAnswer?.optionId ?? "";

  const confidence =
    currentAnswerDraft?.confidence ?? existingAnswer?.confidence ?? 70;

  function handleInitialize(): void {
    setAnswerDraft(null);
    setSession(initializeSupervisorSession());
  }

  function handleBeginQuestions(): void {
    if (!session) {
      return;
    }

    setAnswerDraft(null);
    setSession(startSupervisorQuestions(session));
  }

  function handleReset(): void {
    clearSupervisorSession();
    setAnswerDraft(null);
    setSession(null);
  }

  function handleRestart(): void {
    if (!session) {
      return;
    }

    setAnswerDraft(null);
    setSession(restartSupervisorQuestions(session));
  }

  function handlePreviousQuestion(): void {
    if (
      !session ||
      session.phase !== "questions" ||
      session.currentQuestionIndex === 0
    ) {
      return;
    }

    setAnswerDraft(null);

    setSession(
      setSupervisorQuestionIndex(
        session,
        session.currentQuestionIndex - 1,
      ),
    );
  }

  function handleAnswerSubmit(
    event: FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    if (
      !session ||
      session.phase !== "questions" ||
      !currentQuestion ||
      selectedOptionId === ""
    ) {
      return;
    }

    setAnswerDraft(null);

    setSession(
      saveSupervisorAnswer(session, {
        questionId: currentQuestion.id,
        optionId: selectedOptionId,
        confidence,
      }),
    );
  }

  function renderQuestionnaire() {
    if (
      !session ||
      session.phase !== "questions" ||
      !currentQuestion
    ) {
      return null;
    }

    const questionNumber = session.currentQuestionIndex + 1;
    const isLastQuestion =
      questionNumber === SUPERVISOR_QUESTIONS.length;

    return (
      <section
        className="supervisor-question-card"
        aria-labelledby="supervisor-question-heading"
      >
        <div className="supervisor-question-progress">
          <div>
            <p className="supervisor-eyebrow">
              {currentQuestion.category}
            </p>

            <span>
              Question {questionNumber} of {SUPERVISOR_QUESTIONS.length}
            </span>
          </div>

          <div
            className="supervisor-progress-track"
            role="progressbar"
            aria-label="Supervisor question progress"
            aria-valuemin={1}
            aria-valuemax={SUPERVISOR_QUESTIONS.length}
            aria-valuenow={questionNumber}
          >
            <span
              style={{
                width: `${
                  (questionNumber / SUPERVISOR_QUESTIONS.length) * 100
                }%`,
              }}
            />
          </div>
        </div>

        <div className="supervisor-question-copy">
          <h1 id="supervisor-question-heading">
            {currentQuestion.title}
          </h1>

          <p>{currentQuestion.context}</p>
        </div>

        <form onSubmit={handleAnswerSubmit}>
          <fieldset className="supervisor-option-fieldset">
            <legend>{currentQuestion.prompt}</legend>

            <div className="supervisor-option-list">
              {currentQuestion.options.map((option) => (
                <label
                  className={[
                    "supervisor-option",
                    selectedOptionId === option.id
                      ? "supervisor-option--selected"
                      : "",
                  ].join(" ")}
                  key={option.id}
                >
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    value={option.id}
                    checked={selectedOptionId === option.id}
                    onChange={() =>
                      setAnswerDraft({
                        questionId: currentQuestion.id,
                        optionId: option.id,
                        confidence,
                      })
                    }
                  />

                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="supervisor-confidence">
            <div>
              <label htmlFor="supervisor-confidence">
                Confidence
              </label>

              <output htmlFor="supervisor-confidence">
                {confidence}%
              </output>
            </div>

            <input
              id="supervisor-confidence"
              type="range"
              min="0"
              max="100"
              step="1"
              value={confidence}
              onChange={(event) =>
                setAnswerDraft({
                  questionId: currentQuestion.id,
                  optionId: selectedOptionId,
                  confidence: Number(event.target.value),
                })
              }
            />

            <div className="supervisor-confidence-labels">
              <span>Unsure</span>
              <span>Very confident</span>
            </div>
          </div>

          <p className="supervisor-isolation-note">
            This response remains in the current browser tab and is never
            submitted to the research dataset.
          </p>

          <div className="supervisor-question-actions">
            <button
              type="button"
              className="supervisor-secondary-button"
              disabled={session.currentQuestionIndex === 0}
              onClick={handlePreviousQuestion}
            >
              Previous
            </button>

            <button
              type="submit"
              className="supervisor-primary-button"
              disabled={selectedOptionId === ""}
            >
              {isLastQuestion
                ? "Finish experience"
                : "Continue"}
            </button>
          </div>
        </form>
      </section>
    );
  }

  function renderCompletion() {
    if (!session || session.phase !== "complete") {
      return null;
    }

    return (
      <section
        className="supervisor-complete-card"
        aria-labelledby="supervisor-complete-heading"
      >
        <p className="supervisor-eyebrow">
          Guided questions complete
        </p>

        <h1 id="supervisor-complete-heading">
          Your responses are ready for review.
        </h1>

        <p className="supervisor-complete-introduction">
          These selections exist only in this browser tab. They are excluded
          from participant totals, research exports, and PostgreSQL.
        </p>

        <ol className="supervisor-answer-review">
          {SUPERVISOR_QUESTIONS.map((question) => {
            const answer = session.answers.find(
              (candidate) => candidate.questionId === question.id,
            );

            const selectedOption = question.options.find(
              (option) => option.id === answer?.optionId,
            );

            return (
              <li key={question.id}>
                <div>
                  <span>{question.category}</span>
                  <h2>{question.title}</h2>
                  <p>{selectedOption?.label ?? "No response recorded"}</p>
                </div>

                <strong>{answer?.confidence ?? 0}% confident</strong>
              </li>
            );
          })}
        </ol>

        <div className="supervisor-completion-actions">
          <Link
            className="supervisor-primary-button"
            to="/supervisor/analysis"
          >
            View comparative analysis
          </Link>

          <button
            type="button"
            className="supervisor-secondary-button"
            onClick={handleRestart}
          >
            Restart questions
          </button>

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
    );
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

        {!session && (
          <>
            <section className="supervisor-hero">
              <p className="supervisor-eyebrow">
                Supervisor experience
              </p>

              <h1>
                Explore the study without affecting participant data.
              </h1>

              <p>
                Review the study experience in a controlled workspace that is
                fully separated from consent, participant registration,
                research sessions, API submissions, and PostgreSQL
                persistence.
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
                  Opening this experience does not create a participant,
                  study session, response, or completion record.
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
                <p className="supervisor-eyebrow">
                  Research-data boundary
                </p>
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

            <section className="supervisor-launch-card">
              <div>
                <p className="supervisor-eyebrow">
                  Secure local session
                </p>
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
          </>
        )}

        {session?.phase === "ready" && (
          <section
            className="supervisor-ready-card"
            aria-live="polite"
          >
            <div>
              <p className="supervisor-eyebrow">
                Workspace initialized
              </p>
              <h1>Supervisor workspace is ready</h1>
              <p>
                Walk through three interactive decision scenarios. Every
                selection remains isolated from participant data.
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
                className="supervisor-primary-button"
                onClick={handleBeginQuestions}
              >
                Begin guided questions
              </button>

              <button
                type="button"
                className="supervisor-secondary-button"
                onClick={handleReset}
              >
                Reset session
              </button>
            </div>
          </section>
        )}

        {renderQuestionnaire()}
        {renderCompletion()}
      </main>
    </div>
  );
}

export default SupervisorWorkspacePage;
