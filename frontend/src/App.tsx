import type { ReactNode } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import AppHeader from "./components/AppHeader";
import CompletionPage from "./pages/CompletionPage";
import ConsentPage from "./pages/ConsentPage";
import LandingPage from "./pages/LandingPage";
import StudyPage from "./pages/StudyPage";
import SupervisorAnalysisPage from "./pages/SupervisorAnalysisPage";
import SupervisorWorkspacePage from "./pages/SupervisorWorkspacePage";
import { loadStudyProgress } from "./study/studyStorage";
import "./App.css";

interface BrandedPageProps {
  children: ReactNode;
  headerContent?: ReactNode;
  navigationLabel?: string;
}

function BrandedPage({
  children,
  headerContent,
  navigationLabel,
}: BrandedPageProps) {
  return (
    <>
      <AppHeader navigationLabel={navigationLabel}>
        {headerContent}
      </AppHeader>

      {children}
    </>
  );
}

function ProtectedStudyRoute() {
  const storedProgress = loadStudyProgress();

  if (!storedProgress) {
    return <Navigate to="/consent" replace />;
  }

  if (storedProgress.phase === "completed") {
    return <Navigate to="/complete" replace />;
  }

  return <StudyPage />;
}

function ProtectedCompletionRoute() {
  const storedProgress = loadStudyProgress();

  if (
    !storedProgress ||
    storedProgress.phase !== "completed"
  ) {
    return <Navigate to="/consent" replace />;
  }

  return <CompletionPage />;
}

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<LandingPage />}
      />

      <Route
        path="/consent"
        element={
          <BrandedPage
            navigationLabel="Consent navigation"
            headerContent={
              <Link to="/">
                Return to study home
              </Link>
            }
          >
            <ConsentPage />
          </BrandedPage>
        }
      />

      <Route
        path="/study"
        element={
          <BrandedPage
            navigationLabel="Study status"
            headerContent={
              <span className="app-header-context">
                Participant session
              </span>
            }
          >
            <ProtectedStudyRoute />
          </BrandedPage>
        }
      />

      <Route
        path="/complete"
        element={
          <BrandedPage
            navigationLabel="Completion navigation"
            headerContent={
              <Link to="/">
                Return to study home
              </Link>
            }
          >
            <ProtectedCompletionRoute />
          </BrandedPage>
        }
      />

      <Route
        path="/supervisor"
        element={<SupervisorWorkspacePage />}
      />

      <Route
        path="/supervisor/analysis"
        element={<SupervisorAnalysisPage />}
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default App;
