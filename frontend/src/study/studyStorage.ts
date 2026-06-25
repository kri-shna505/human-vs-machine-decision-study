import type { StudyPhase } from "./studyState";

export const STUDY_STORAGE_KEY = "decision-study.session.v1";

export interface StoredStudyProgress {
  version: 1;
  participantId: string;
  sessionId: string;
  phase: StudyPhase;
  currentScenarioIndex: number;
  submittedScenarioIds: string[];
}

const VALID_PHASES = new Set<StudyPhase>([
  "landing",
  "consent",
  "starting",
  "question",
  "submitting",
  "completing",
  "completed",
  "error",
]);

function isStudyPhase(value: unknown): value is StudyPhase {
  return (
    typeof value === "string" &&
    VALID_PHASES.has(value as StudyPhase)
  );
}

function normalizeStringArray(value: string[]): string[] {
  return [
    ...new Set(
      value
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  ];
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string")
  );
}

function parseStudyProgress(
  value: unknown,
): StoredStudyProgress | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as {
    version?: unknown;
    participantId?: unknown;
    sessionId?: unknown;
    phase?: unknown;
    currentScenarioIndex?: unknown;
    submittedScenarioIds?: unknown;
  };

  const submittedScenarioIds =
    candidate.submittedScenarioIds === undefined
      ? []
      : candidate.submittedScenarioIds;

  if (
    candidate.version !== 1 ||
    typeof candidate.participantId !== "string" ||
    candidate.participantId.trim().length === 0 ||
    typeof candidate.sessionId !== "string" ||
    candidate.sessionId.trim().length === 0 ||
    !isStudyPhase(candidate.phase) ||
    typeof candidate.currentScenarioIndex !== "number" ||
    !Number.isInteger(candidate.currentScenarioIndex) ||
    candidate.currentScenarioIndex < 0 ||
    !isStringArray(submittedScenarioIds)
  ) {
    return null;
  }

  const normalizedSubmittedScenarioIds =
    normalizeStringArray(submittedScenarioIds);

  if (
    normalizedSubmittedScenarioIds.length !==
    submittedScenarioIds.filter(
      (item) => item.trim().length > 0,
    ).length
  ) {
    const containsInvalidEmptyValue =
      submittedScenarioIds.some(
        (item) => item.trim().length === 0,
      );

    if (containsInvalidEmptyValue) {
      return null;
    }
  }

  return {
    version: 1,
    participantId: candidate.participantId.trim(),
    sessionId: candidate.sessionId.trim(),
    phase: candidate.phase,
    currentScenarioIndex:
      candidate.currentScenarioIndex,
    submittedScenarioIds:
      normalizedSubmittedScenarioIds,
  };
}

export function loadStudyProgress(): StoredStudyProgress | null {
  try {
    const storedValue = localStorage.getItem(
      STUDY_STORAGE_KEY,
    );

    if (storedValue === null) {
      return null;
    }

    const parsedValue: unknown = JSON.parse(storedValue);
    const progress = parseStudyProgress(parsedValue);

    if (progress === null) {
      localStorage.removeItem(STUDY_STORAGE_KEY);
      return null;
    }

    return progress;
  } catch {
    localStorage.removeItem(STUDY_STORAGE_KEY);
    return null;
  }
}

export function saveStudyProgress(
  progress: StoredStudyProgress,
): void {
  const normalizedProgress = parseStudyProgress({
    ...progress,
    version: 1,
    participantId: progress.participantId.trim(),
    sessionId: progress.sessionId.trim(),
    currentScenarioIndex: Math.max(
      0,
      Math.trunc(progress.currentScenarioIndex),
    ),
    submittedScenarioIds: normalizeStringArray(
      progress.submittedScenarioIds,
    ),
  });

  if (normalizedProgress === null) {
    throw new TypeError(
      "Cannot save invalid study progress.",
    );
  }

  localStorage.setItem(
    STUDY_STORAGE_KEY,
    JSON.stringify(normalizedProgress),
  );
}

export function clearStudyProgress(): void {
  localStorage.removeItem(STUDY_STORAGE_KEY);
}
