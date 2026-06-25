import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getApiHealth } from "../api/health";
import "../App.css";

type ApiStatus = "checking" | "connected" | "unavailable";

/**
 * Decorative brain logo displayed in the website header.
 */
function BrainLogo() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg
        className="brand-logo-icon"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20.5 9.5c-4.4-3.6-10.5-.3-10.1 5.2-4.1 1.1-5.3 6.4-2.1 9.1-2.2 3.7.1 8.6 4.5 8.8.9 4.2 6.2 5.3 8.9 2.1V13.2c0-1.5-.4-2.8-1.2-3.7Z"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M27.5 9.5c4.4-3.6 10.5-.3 10.1 5.2 4.1 1.1 5.3 6.4 2.1 9.1 2.2 3.7-.1 8.6-4.5 8.8-.9 4.2-6.2 5.3-8.9 2.1V13.2c0-1.5.4-2.8 1.2-3.7Z"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M14 18h6M12 25h8M16 32h4M34 18h-6M36 25h-8M32 32h-4"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/**
 * Main public landing page.
 */
function LandingPage() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");

  useEffect(() => {
    let isMounted = true;

    async function checkApiHealth() {
      try {
        const health = await getApiHealth();

        if (!isMounted) {
          return;
        }

        const backendIsHealthy =
          health.status === "healthy" && health.service === "api";

        setApiStatus(backendIsHealthy ? "connected" : "unavailable");
      } catch {
        if (isMounted) {
          setApiStatus("unavailable");
        }
      }
    }

    void checkApiHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="app" id="top">
      <header className="site-header">
        <div className="header-content">
          <Link
            className="brand"
            to="/"
            aria-label="Decision Study home"
          >
            <BrainLogo />

            <span className="brand-text">
              <span className="brand-title">Decision Study</span>
              <span className="brand-subtitle">Human vs Machine</span>
            </span>
          </Link>

          <nav aria-label="Primary navigation">
            <a href="#results">Results</a>
            <a href="#researcher-access">Researcher Access</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">University research experiment</p>

          <h1>
            Human vs Machine
            <span>Decision Study</span>
          </h1>

          <p className="hero-description">
            Investigating how human reasoning compares with computational
            models under conditions of uncertainty.
          </p>

          <Link className="primary-button" to="/consent">
            Begin Study
          </Link>

          {apiStatus === "unavailable" && (
            <p
              className="api-status api-status--unavailable"
              role="alert"
            >
              <span className="api-status-dot" aria-hidden="true" />
              Service temporarily unavailable
            </p>
          )}
        </section>

        <section
          className="study-topics"
          id="results"
          aria-labelledby="topics-heading"
        >
          <h2 id="topics-heading">Decision-making scenarios</h2>

          <div className="topic-grid">
            <article className="topic-card">
              <h3>Conjunction Fallacy</h3>
              <p className="topic-label">Probability estimation</p>
              <p>
                Explore whether detailed scenarios are incorrectly judged as
                more probable than broader events.
              </p>
            </article>

            <article className="topic-card">
              <h3>Framing Effect</h3>
              <p className="topic-label">Contextual bias</p>
              <p>
                Examine how presenting equivalent information as gains or
                losses changes decisions.
              </p>
            </article>

            <article className="topic-card">
              <h3>Risk Preference</h3>
              <p className="topic-label">Expected value</p>
              <p>
                Compare subjective risk tolerance with mathematically optimal
                decision strategies.
              </p>
            </article>
          </div>
        </section>

        <section
          className="researcher-access"
          id="researcher-access"
          aria-labelledby="researcher-heading"
        >
          <h2 id="researcher-heading">Researcher Access</h2>

          <p>
            Authorized researchers will be able to review study progress,
            comparative results, and model-analysis outputs.
          </p>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;