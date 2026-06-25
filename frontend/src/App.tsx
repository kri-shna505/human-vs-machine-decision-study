import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import CompletionPage from "./pages/CompletionPage";
import ConsentPage from "./pages/ConsentPage";
import LandingPage from "./pages/LandingPage";
import StudyPage from "./pages/StudyPage";
import { loadStudyProgress } from "./study/studyStorage";
import "./App.css";

/**
 * Prevent access to the study unless a valid participant session
 * has already been created and stored.
 */
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

/**
 * Prevent access to the completion page until the stored study
 * progress confirms that the session has been completed.
 */
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

/**
 * Application route configuration.
 */
function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<LandingPage />}
      />

      <Route
        path="/consent"
        element={<ConsentPage />}
      />

      <Route
        path="/study"
        element={<ProtectedStudyRoute />}
      />

      <Route
        path="/complete"
        element={<ProtectedCompletionRoute />}
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default App;