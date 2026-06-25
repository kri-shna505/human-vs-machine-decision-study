import { Link } from "react-router-dom";

import {
  clearStudyProgress,
  loadStudyProgress,
} from "../study/studyStorage";

/**
 * Display the final study confirmation after the backend session
 * has been completed successfully.
 */
function CompletionPage() {
  const progress = loadStudyProgress();

  return (
    <main className="completion-page">
      <section
        className="completion-card"
        aria-labelledby="completion-heading"
      >
        <div
          className="completion-icon"
          aria-hidden="true"
        >
          ✓
        </div>

        <p className="eyebrow">
          Study completed
        </p>

        <h1 id="completion-heading">
          Thank you for participating
        </h1>

        <p>
          Your responses have been recorded successfully.
          No further action is required.
        </p>

        {progress && (
          <p className="completion-reference">
            Anonymous session reference:{" "}
            <strong>{progress.sessionId}</strong>
          </p>
        )}

        <Link
          className="primary-button"
          to="/"
          onClick={() => {
            clearStudyProgress();
          }}
        >
          Return to home
        </Link>
      </section>
    </main>
  );
}

export default CompletionPage;
