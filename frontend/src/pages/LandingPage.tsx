import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getApiHealth } from "../api/health";
import AppHeader from "../components/AppHeader";
import "../App.css";
import "./LandingPage.css";

type ApiStatus = "checking" | "connected" | "unavailable";

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
      <AppHeader navigationLabel="Primary navigation">
        <a href="#results">Results</a>
        <a href="#researcher-access">Researcher Access</a>
        <Link to="/supervisor">Supervisor Experience</Link>
      </AppHeader>

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

          <Link className="secondary-button" to="/supervisor">
            Open supervisor experience
          </Link>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;
