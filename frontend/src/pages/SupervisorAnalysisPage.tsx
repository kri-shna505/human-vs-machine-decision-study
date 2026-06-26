import { Link, Navigate } from "react-router-dom";

import AppHeader from "../components/AppHeader";
import {
  calculateRoundedAverage,
  getPresentationScenario,
  PRESENTATION_DATA_NOTICE,
  PRESENTATION_DATASET_ID,
  PRESENTATION_SCENARIOS,
  PRESENTATION_SERIES,
  type PresentationComparisonSeries,
} from "../supervisor/presentationAnalysis";
import { SUPERVISOR_QUESTIONS } from "../supervisor/supervisorQuestions";
import {
  loadSupervisorSession,
  type SupervisorSession,
} from "../supervisor/supervisorStorage";
import "./SupervisorAnalysisPage.css";

interface MetricBarProps {
  label: string;
  value: number;
  emphasis?: boolean;
}

function MetricBar({
  label,
  value,
  emphasis = false,
}: MetricBarProps) {
  return (
    <div className="analysis-metric-row">
      <div className="analysis-metric-label">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>

      <div
        className="analysis-metric-track"
        role="progressbar"
        aria-label={`${label}: ${value}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <span
          className={emphasis ? "analysis-metric-fill--emphasis" : ""}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function getSessionAverageConfidence(
  session: SupervisorSession,
): number {
  return calculateRoundedAverage(
    session.answers.map((answer) => answer.confidence),
  );
}

function getConsensusCount(
  session: SupervisorSession,
): number {
  return session.answers.filter((answer) => {
    const scenario = getPresentationScenario(answer.questionId);

    return scenario?.consensusOptionId === answer.optionId;
  }).length;
}

function getSelectedOptionLabel(
  session: SupervisorSession,
  questionId: string,
): string {
  const question = SUPERVISOR_QUESTIONS.find(
    (candidate) => candidate.id === questionId,
  );

  const answer = session.answers.find(
    (candidate) => candidate.questionId === questionId,
  );

  return (
    question?.options.find(
      (option) => option.id === answer?.optionId,
    )?.label ?? "No local response"
  );
}

function ComparisonCard({
  series,
}: {
  series: PresentationComparisonSeries;
}) {
  return (
    <article className="analysis-comparison-card">
      <p>{series.category}</p>
      <h2>{series.label}</h2>
      <span className="analysis-card-score">
        {series.alignment}%
      </span>
      <small>Overall alignment</small>

      <dl>
        <div>
          <dt>Confidence</dt>
          <dd>{series.confidence}%</dd>
        </div>
        <div>
          <dt>Consistency</dt>
          <dd>{series.consistency}%</dd>
        </div>
      </dl>

      <p className="analysis-card-summary">{series.summary}</p>
    </article>
  );
}

function SupervisorAnalysisPage() {
  const session = loadSupervisorSession();

  if (!session || session.phase !== "complete") {
    return <Navigate to="/supervisor" replace />;
  }

  const averageConfidence = getSessionAverageConfidence(session);
  const consensusCount = getConsensusCount(session);

  const confidenceSeries = [
    {
      id: "local-session",
      label: "Your local session",
      value: averageConfidence,
      emphasis: true,
    },
    ...PRESENTATION_SERIES.map((series) => ({
      id: series.id,
      label: series.label,
      value: series.confidence,
      emphasis: false,
    })),
  ];

  return (
    <div className="analysis-page">
      <AppHeader navigationLabel="Comparative analysis navigation">
        <Link to="/supervisor">
          Return to supervisor workspace
        </Link>
      </AppHeader>

      <main className="analysis-main">
        <section className="analysis-data-banner" role="status">
          <div>
            <strong>Presentation data</strong>
            <span>{PRESENTATION_DATA_NOTICE}</span>
          </div>

          <code>{PRESENTATION_DATASET_ID}</code>
        </section>

        <section className="analysis-hero">
          <p className="analysis-eyebrow">
            Comparative analysis
          </p>
          <h1>
            Human and model decision patterns, presented side by side.
          </h1>
          <p>
            This dashboard combines your browser-local supervisor responses
            with a fixed illustrative dataset. It never reads participant
            records, research exports, API results, or PostgreSQL.
          </p>
        </section>

        <section
          className="analysis-summary-grid"
          aria-label="Comparative analysis summary"
        >
          <article>
            <span>Scenarios reviewed</span>
            <strong>{session.answers.length}</strong>
            <p>All guided decision scenarios completed locally.</p>
          </article>

          <article>
            <span>Local confidence</span>
            <strong>{averageConfidence}%</strong>
            <p>Average confidence across your current browser-tab session.</p>
          </article>

          <article>
            <span>Consensus alignment</span>
            <strong>
              {consensusCount}/{PRESENTATION_SCENARIOS.length}
            </strong>
            <p>Local choices matching the illustrative consensus profile.</p>
          </article>

          <article>
            <span>Research writes</span>
            <strong>0</strong>
            <p>No API submission, participant record, or database write.</p>
          </article>
        </section>

        <section
          className="analysis-section"
          aria-labelledby="comparison-cards-heading"
        >
          <div className="analysis-section-heading">
            <div>
              <p className="analysis-eyebrow">
                Comparison cards
              </p>
              <h2 id="comparison-cards-heading">
                Human and model profiles
              </h2>
            </div>

            <p>
              Fixed presentation profiles make the visual comparison
              reproducible during every supervisor session.
            </p>
          </div>

          <div className="analysis-comparison-grid">
            {PRESENTATION_SERIES.map((series) => (
              <ComparisonCard key={series.id} series={series} />
            ))}
          </div>
        </section>

        <section
          className="analysis-section analysis-chart-card"
          aria-labelledby="scenario-chart-heading"
        >
          <div className="analysis-section-heading">
            <div>
              <p className="analysis-eyebrow">
                Scenario-level chart
              </p>
              <h2 id="scenario-chart-heading">
                Alignment by decision scenario
              </h2>
            </div>

            <p>
              Higher values indicate closer agreement with each scenario&apos;s
              illustrative analytical benchmark.
            </p>
          </div>

          <div
            className="analysis-scenario-chart"
            role="img"
            aria-label="Scenario alignment comparison chart"
          >
            {PRESENTATION_SCENARIOS.map((scenario) => (
              <article
                className="analysis-scenario-group"
                key={scenario.questionId}
              >
                <header>
                  <div>
                    <span>{scenario.category}</span>
                    <h3>{scenario.title}</h3>
                  </div>

                  <strong>
                    {getSelectedOptionLabel(
                      session,
                      scenario.questionId,
                    )}
                  </strong>
                </header>

                <div className="analysis-scenario-bars">
                  {PRESENTATION_SERIES.map((series) => (
                    <MetricBar
                      key={series.id}
                      label={series.label}
                      value={scenario.alignment[series.id]}
                    />
                  ))}
                </div>

                <p>{scenario.insight}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="analysis-section analysis-chart-card"
          aria-labelledby="confidence-chart-heading"
        >
          <div className="analysis-section-heading">
            <div>
              <p className="analysis-eyebrow">
                Confidence comparison
              </p>
              <h2 id="confidence-chart-heading">
                Reported confidence across profiles
              </h2>
            </div>

            <p>
              Your value comes only from this browser tab. Every other value
              comes from the fixed presentation dataset.
            </p>
          </div>

          <div
            className="analysis-confidence-chart"
            role="img"
            aria-label="Confidence comparison chart"
          >
            {confidenceSeries.map((series) => (
              <MetricBar
                key={series.id}
                label={series.label}
                value={series.value}
                emphasis={series.emphasis}
              />
            ))}
          </div>
        </section>

        <section className="analysis-integrity-card">
          <div>
            <p className="analysis-eyebrow">
              Data integrity
            </p>
            <h2>Presentation insight without research contamination</h2>
            <p>
              The dashboard is deterministic, browser-local, and safe to use
              during customer or supervisor presentations.
            </p>
          </div>

          <dl>
            <div>
              <dt>Live participant query</dt>
              <dd>Never</dd>
            </div>
            <div>
              <dt>API request</dt>
              <dd>None</dd>
            </div>
            <div>
              <dt>PostgreSQL write</dt>
              <dd>None</dd>
            </div>
            <div>
              <dt>Local session source</dt>
              <dd>sessionStorage</dd>
            </div>
          </dl>
        </section>

        <div className="analysis-actions">
          <Link
            className="analysis-primary-button"
            to="/supervisor"
          >
            Return to supervisor workspace
          </Link>

          <Link
            className="analysis-secondary-button"
            to="/"
          >
            Return to study home
          </Link>
        </div>
      </main>
    </div>
  );
}

export default SupervisorAnalysisPage;
