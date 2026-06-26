import {
  type FormEvent,
  useState,
} from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  createParticipant,
  createStudySession,
  getScenarios,
} from "../api/study";
import {
  clearStudyProgress,
  saveStudyProgress,
} from "../study/studyStorage";
import type { Scenario } from "../types/study";

interface StudyRouteState {
  scenarios: Scenario[];
}

function getErrorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    error.message.trim().length > 0
  ) {
    return error.message;
  }

  return "The study could not be started. Please try again.";
}

function ConsentPage() {
  const navigate = useNavigate();

  const [hasConsented, setHasConsented] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!hasConsented || isStarting) {
      return;
    }

    setIsStarting(true);
    setErrorMessage("");
    clearStudyProgress();

    try {
      setStatusMessage(
        "Registering anonymous participant...",
      );

      const participant = await createParticipant({
        consent: true,
      });

      setStatusMessage("Creating study session...");

      const studySession = await createStudySession({
        participant_id: participant.id,
      });

      setStatusMessage("Loading study scenarios...");

      const scenarios = await getScenarios();

      if (scenarios.length === 0) {
        throw new Error(
          "No active study scenarios are currently available.",
        );
      }

      saveStudyProgress({
        version: 1,
        participantId: participant.id,
        sessionId: studySession.id,
        phase: "question",
        currentScenarioIndex: 0,
        submittedScenarioIds: [],
      });

      const routeState: StudyRouteState = {
        scenarios,
      };

      navigate("/study", {
        replace: true,
        state: routeState,
      });
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
      setStatusMessage("");
      setIsStarting(false);
    }
  }

  return (
    <div className="participant-page">
      <main className="consent-layout">
        <section
          className="consent-card"
          aria-labelledby="consent-heading"
        >
          <p className="eyebrow">
            Participant consent
          </p>

          <h1 id="consent-heading">
            Before you begin
          </h1>

          <p className="consent-introduction">
            Please read the following information before
            deciding whether to participate.
          </p>

          <div className="consent-information">
            <h2>About this study</h2>

            <p>
              This university research experiment examines
              how human decisions compare with computational
              models under conditions of uncertainty.
            </p>

            <h2>What participation involves</h2>

            <p>
              You will answer three decision-making questions
              and report how confident you are in each answer.
            </p>

            <h2>Voluntary participation</h2>

            <p>
              Participation is voluntary. You may stop before
              completing the study by closing this page.
            </p>

            <h2>Anonymous data</h2>

            <p>
              The application creates an anonymous participant
              code. Do not enter your name, email address,
              telephone number, or other identifying
              information.
            </p>
          </div>

          <form
            className="consent-form"
            onSubmit={handleSubmit}
          >
            <label className="consent-checkbox">
              <input
                type="checkbox"
                checked={hasConsented}
                disabled={isStarting}
                onChange={(event) => {
                  setHasConsented(event.target.checked);
                  setErrorMessage("");
                }}
              />

              <span>
                I have read the information above, I am
                participating voluntarily, and I consent to
                take part in this study.
              </span>
            </label>

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

            <div className="consent-actions">
              <Link
                className="secondary-button"
                to="/"
                aria-disabled={isStarting}
                onClick={(event) => {
                  if (isStarting) {
                    event.preventDefault();
                  }
                }}
              >
                Return home
              </Link>

              <button
                type="submit"
                className="primary-button"
                disabled={!hasConsented || isStarting}
              >
                {isStarting
                  ? "Starting study..."
                  : "Consent and continue"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

export default ConsentPage;
