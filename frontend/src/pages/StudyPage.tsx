import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { ApiRequestError } from "../api/client";
import {
  completeStudySession,
  getScenarios,
  getStudySession,
  submitHumanResponse,
} from "../api/study";
import {
  loadStudyProgress,
  saveStudyProgress,
  type StoredStudyProgress,
} from "../study/studyStorage";
import type {
  Scenario,
  StudySessionDetail,
} from "../types/study";

interface StudyRouteState {
  scenarios?: Scenario[];
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    error.name === "AbortError"
  );
}

function getErrorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    error.message.trim().length > 0
  ) {
    return error.message;
  }

  return "The request could not be completed. Please try again.";
}

function getSubmittedScenarioIds(
  session: StudySessionDetail,
): string[] {
  return [
    ...new Set(
      session.responses.map(
        (response) => response.scenario_id,
      ),
    ),
  ];
}

function getNextScenarioIndex(
  scenarios: Scenario[],
  submittedScenarioIds: string[],
): number {
  const submittedIds = new Set(
    submittedScenarioIds,
  );

  return scenarios.findIndex(
    (scenario) => !submittedIds.has(scenario.id),
  );
}

function sessionIsCompleted(
  session: StudySessionDetail,
): boolean {
  return session.completed_at !== null;
}

function StudyPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [initialProgress] =
    useState<StoredStudyProgress | null>(
      () => loadStudyProgress(),
    );

  const [initialScenarios] =
    useState<Scenario[]>(
      () =>
        (
          location.state as StudyRouteState | null
        )?.scenarios ?? [],
    );

  const [scenarios, setScenarios] =
    useState<Scenario[]>(initialScenarios);

  const [
    submittedScenarioIds,
    setSubmittedScenarioIds,
  ] = useState<string[]>(
    initialProgress?.submittedScenarioIds ?? [],
  );

  const [
    currentScenarioIndex,
    setCurrentScenarioIndex,
  ] = useState(
    initialProgress?.currentScenarioIndex ?? 0,
  );

  const [selectedOptionId, setSelectedOptionId] =
    useState("");

  const [confidenceInput, setConfidenceInput] =
    useState("");

  const [isBootstrapping, setIsBootstrapping] =
    useState(true);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [statusMessage, setStatusMessage] =
    useState("");

  const scenarioStartedAtRef = useRef(0);

  const currentScenario =
    scenarios[currentScenarioIndex];

  useEffect(() => {
    const progress = initialProgress;

    if (!progress) {
      navigate("/consent", {
        replace: true,
      });

      return;
    }

    const activeProgress: StoredStudyProgress = progress;
    const controller = new AbortController();
    let isMounted = true;

    async function bootstrapStudy(): Promise<void> {
      try {
        const scenariosPromise =
          initialScenarios.length > 0
            ? Promise.resolve(
                initialScenarios,
              )
            : getScenarios(controller.signal);

        const [loadedScenarios, session] =
          await Promise.all([
            scenariosPromise,
            getStudySession(
              activeProgress.sessionId,
              controller.signal,
            ),
          ]);

        if (!isMounted) {
          return;
        }

        if (loadedScenarios.length === 0) {
          throw new Error(
            "No active study scenarios are currently available.",
          );
        }

        const synchronizedSubmittedIds =
          getSubmittedScenarioIds(session);

        if (sessionIsCompleted(session)) {
          saveStudyProgress({
            ...activeProgress,
            phase: "completed",
            currentScenarioIndex:
              loadedScenarios.length,
            submittedScenarioIds:
              synchronizedSubmittedIds,
          });

          navigate("/complete", {
            replace: true,
          });

          return;
        }

        const nextScenarioIndex =
          getNextScenarioIndex(
            loadedScenarios,
            synchronizedSubmittedIds,
          );

        if (nextScenarioIndex === -1) {
          await completeStudySession(
            activeProgress.sessionId,
            controller.signal,
          );

          if (!isMounted) {
            return;
          }

          saveStudyProgress({
            ...activeProgress,
            phase: "completed",
            currentScenarioIndex:
              loadedScenarios.length,
            submittedScenarioIds:
              synchronizedSubmittedIds,
          });

          navigate("/complete", {
            replace: true,
          });

          return;
        }

        setScenarios(loadedScenarios);
        setSubmittedScenarioIds(
          synchronizedSubmittedIds,
        );
        setCurrentScenarioIndex(
          nextScenarioIndex,
        );

        scenarioStartedAtRef.current =
          performance.now();

        saveStudyProgress({
          ...activeProgress,
          phase: "question",
          currentScenarioIndex:
            nextScenarioIndex,
          submittedScenarioIds:
            synchronizedSubmittedIds,
        });
      } catch (error: unknown) {
        if (
          !isMounted ||
          isAbortError(error)
        ) {
          return;
        }

        setErrorMessage(
          getErrorMessage(error),
        );
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrapStudy();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [initialProgress, initialScenarios, navigate]);



  async function finalizeSession(
    progress: StoredStudyProgress,
    completedScenarioIds: string[],
  ): Promise<void> {
    saveStudyProgress({
      ...progress,
      phase: "completing",
      currentScenarioIndex: scenarios.length,
      submittedScenarioIds:
        completedScenarioIds,
    });

    try {
      await completeStudySession(
        progress.sessionId,
      );
    } catch (error: unknown) {
      if (
        !(
          error instanceof ApiRequestError &&
          error.status === 409
        )
      ) {
        throw error;
      }

      const synchronizedSession =
        await getStudySession(
          progress.sessionId,
        );

      if (!sessionIsCompleted(synchronizedSession)) {
        throw error;
      }
    }

    saveStudyProgress({
      ...progress,
      phase: "completed",
      currentScenarioIndex: scenarios.length,
      submittedScenarioIds:
        completedScenarioIds,
    });

    navigate("/complete", {
      replace: true,
    });
  }

  async function synchronizeAfterDuplicate(
    progress: StoredStudyProgress,
  ): Promise<void> {
    const synchronizedSession =
      await getStudySession(progress.sessionId);

    const synchronizedSubmittedIds =
      getSubmittedScenarioIds(
        synchronizedSession,
      );

    setSubmittedScenarioIds(
      synchronizedSubmittedIds,
    );

    if (sessionIsCompleted(synchronizedSession)) {
      saveStudyProgress({
        ...progress,
        phase: "completed",
        currentScenarioIndex: scenarios.length,
        submittedScenarioIds:
          synchronizedSubmittedIds,
      });

      navigate("/complete", {
        replace: true,
      });

      return;
    }

    const nextScenarioIndex =
      getNextScenarioIndex(
        scenarios,
        synchronizedSubmittedIds,
      );

    if (nextScenarioIndex === -1) {
      await finalizeSession(
        progress,
        synchronizedSubmittedIds,
      );

      return;
    }

    saveStudyProgress({
      ...progress,
      phase: "question",
      currentScenarioIndex:
        nextScenarioIndex,
      submittedScenarioIds:
        synchronizedSubmittedIds,
    });

    setSelectedOptionId("");
    setConfidenceInput("");
    setErrorMessage("");
    setStatusMessage(
      "Your saved responses were synchronized.",
    );

    scenarioStartedAtRef.current =
      performance.now();

    setCurrentScenarioIndex(
      nextScenarioIndex,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const progress = loadStudyProgress();

    if (!progress || !currentScenario) {
      setErrorMessage(
        "The active study session could not be found.",
      );

      return;
    }

    if (!selectedOptionId) {
      setErrorMessage(
        "Select one answer before continuing.",
      );

      return;
    }

    const normalizedConfidence =
      confidenceInput.trim();

    const confidence = Number(
      normalizedConfidence,
    );

    const confidenceIsValid =
      normalizedConfidence.length > 0 &&
      Number.isInteger(confidence) &&
      confidence >= 0 &&
      confidence <= 100;

    if (!confidenceIsValid) {
      setErrorMessage(
        "Enter confidence as a whole number from 0 to 100.",
      );

      return;
    }

    const responseTimeMs = Math.max(
      0,
      Math.round(
        performance.now() -
          scenarioStartedAtRef.current,
      ),
    );

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("Recording response...");

    saveStudyProgress({
      ...progress,
      phase: "submitting",
      currentScenarioIndex,
      submittedScenarioIds,
    });

    try {
      await submitHumanResponse(
        progress.sessionId,
        {
          scenario_id: currentScenario.id,
          selected_option_id:
            selectedOptionId,
          confidence,
          response_time_ms:
            responseTimeMs,
        },
      );

      const updatedSubmittedIds = [
        ...new Set([
          ...submittedScenarioIds,
          currentScenario.id,
        ]),
      ];

      setSubmittedScenarioIds(
        updatedSubmittedIds,
      );

      const nextScenarioIndex =
        getNextScenarioIndex(
          scenarios,
          updatedSubmittedIds,
        );

      if (nextScenarioIndex === -1) {
        setStatusMessage(
          "All responses recorded. Completing study...",
        );

        await finalizeSession(
          progress,
          updatedSubmittedIds,
        );

        return;
      }

      saveStudyProgress({
        ...progress,
        phase: "question",
        currentScenarioIndex:
          nextScenarioIndex,
        submittedScenarioIds:
          updatedSubmittedIds,
      });

      setSelectedOptionId("");
      setConfidenceInput("");
      setErrorMessage("");
      setStatusMessage("");

      scenarioStartedAtRef.current =
        performance.now();

      setCurrentScenarioIndex(
        nextScenarioIndex,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error: unknown) {
      if (
        error instanceof ApiRequestError &&
        error.status === 409
      ) {
        try {
          await synchronizeAfterDuplicate(
            progress,
          );
        } catch (
          synchronizationError: unknown
        ) {
          setErrorMessage(
            getErrorMessage(
              synchronizationError,
            ),
          );
        }

        return;
      }

      saveStudyProgress({
        ...progress,
        phase: "error",
        currentScenarioIndex,
        submittedScenarioIds,
      });

      setErrorMessage(
        getErrorMessage(error),
      );
      setStatusMessage("");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isBootstrapping) {
    return (
      <main className="study-bootstrap">
        <p
          className="eyebrow"
          role="status"
          aria-live="polite"
        >
          Loading study
        </p>

        <h1>Preparing your next question</h1>

        <p>
          Your session and previous responses are being
          synchronized.
        </p>
      </main>
    );
  }

  if (errorMessage && scenarios.length === 0) {
    return (
      <main className="study-bootstrap">
        <p className="eyebrow">
          Decision study
        </p>

        <h1>Unable to load the study</h1>

        <p role="alert">
          {errorMessage}
        </p>

        <div className="study-error-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              window.location.reload();
            }}
          >
            Try again
          </button>

          <Link
            className="secondary-button"
            to="/consent"
          >
            Return to consent
          </Link>
        </div>
      </main>
    );
  }

  if (!currentScenario) {
    return (
      <main className="study-bootstrap">
        <h1>Scenario unavailable</h1>

        <p role="alert">
          The active study scenario could not be found.
        </p>
      </main>
    );
  }

  const sortedOptions = [
    ...currentScenario.options,
  ].sort(
    (leftOption, rightOption) =>
      leftOption.display_order -
      rightOption.display_order,
  );

  const questionNumber =
    submittedScenarioIds.length + 1;

  const completionPercentage =
    scenarios.length > 0
      ? Math.round(
          (submittedScenarioIds.length /
            scenarios.length) *
            100,
        )
      : 0;

  return (
    <main className="question-page">
      <section
        className="question-card"
        aria-labelledby="scenario-heading"
      >
        <header className="question-header">
          <div>
            <p className="eyebrow">
              Decision study
            </p>

            <p className="question-progress-label">
              Question {questionNumber} of{" "}
              {scenarios.length}
            </p>
          </div>

          <span className="question-category">
            {currentScenario.category}
          </span>
        </header>

        <div
          className="question-progress-track"
          aria-label={`${completionPercentage}% completed`}
        >
          <div
            className="question-progress-value"
            style={{
              width: `${completionPercentage}%`,
            }}
          />
        </div>

        <div className="question-content">
          <h1 id="scenario-heading">
            {currentScenario.title}
          </h1>

          <p className="question-prompt">
            {currentScenario.prompt}
          </p>
        </div>

        <form
          className="response-form"
          onSubmit={handleSubmit}
        >
          <fieldset
            className="option-fieldset"
            disabled={isSubmitting}
          >
            <legend>Select one answer</legend>

            <div className="option-list">
              {sortedOptions.map((option) => {
                const isSelected =
                  selectedOptionId === option.id;

                return (
                  <label
                    className={
                      isSelected
                        ? "option-card option-card--selected"
                        : "option-card"
                    }
                    key={option.id}
                  >
                    <input
                      type="radio"
                      name="scenario-option"
                      value={option.id}
                      checked={isSelected}
                      onChange={() => {
                        setSelectedOptionId(
                          option.id,
                        );
                        setErrorMessage("");
                      }}
                    />

                    <span className="option-code">
                      {option.code}
                    </span>

                    <span className="option-label">
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="confidence-field">
            <label htmlFor="confidence">
              Confidence in your answer
            </label>

            <p>
              Enter a whole number from 0 to 100.
            </p>

            <div className="confidence-control">
              <input
                id="confidence"
                type="number"
                min="0"
                max="100"
                step="1"
                inputMode="numeric"
                value={confidenceInput}
                disabled={isSubmitting}
                onChange={(event) => {
                  setConfidenceInput(
                    event.target.value,
                  );
                  setErrorMessage("");
                }}
              />

              <span aria-hidden="true">%</span>
            </div>

            <span className="field-help">
              0 means no confidence. 100 means complete
              confidence.
            </span>
          </div>

          {errorMessage && (
            <p
              className="form-error"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          {statusMessage && (
            <p
              className="form-status"
              role="status"
              aria-live="polite"
            >
              {statusMessage}
            </p>
          )}

          <footer className="response-actions">
            <p>
              Submitted answers cannot be changed.
            </p>

            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Submitting..."
                : questionNumber === scenarios.length
                  ? "Submit final response"
                  : "Submit and continue"}
            </button>
          </footer>
        </form>
      </section>
    </main>
  );
}

export default StudyPage;
