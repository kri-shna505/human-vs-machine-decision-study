import { SUPERVISOR_QUESTIONS } from "./supervisorQuestions";

export const SUPERVISOR_SESSION_STORAGE_KEY =
  "decision-study.supervisor-workspace.v2";

const LEGACY_SUPERVISOR_SESSION_STORAGE_KEY =
  "decision-study.supervisor-workspace.v1";

export type SupervisorSessionPhase =
  | "ready"
  | "questions"
  | "complete";

export interface SupervisorAnswer {
  questionId: string;
  optionId: string;
  confidence: number;
  answeredAt: string;
}

export interface SupervisorSession {
  version: 2;
  sessionId: string;
  startedAt: string;
  phase: SupervisorSessionPhase;
  currentQuestionIndex: number;
  answers: SupervisorAnswer[];
  completedAt?: string;
  storage: "session";
  affectsResearchData: false;
}

interface SupervisorSessionOverrides {
  sessionId?: string;
  startedAt?: string;
}

interface SaveSupervisorAnswerInput {
  questionId: string;
  optionId: string;
  confidence: number;
  answeredAt?: string;
}

function createSessionId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `supervisor-${globalThis.crypto.randomUUID()}`;
  }

  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.getRandomValues === "function"
  ) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(
      bytes,
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");

    const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
      12,
      16,
    )}-${hex.slice(16, 20)}-${hex.slice(20)}`;

    return `supervisor-${uuid}`;
  }

  throw new Error("Secure random number generation is not available.");
}

function isValidAnswer(value: unknown): value is SupervisorAnswer {
  if (!value || typeof value !== "object") {
    return false;
  }

  const answer = value as Partial<SupervisorAnswer>;
  const question = SUPERVISOR_QUESTIONS.find(
    (candidate) => candidate.id === answer.questionId,
  );

  if (!question) {
    return false;
  }

  const optionExists = question.options.some(
    (option) => option.id === answer.optionId,
  );

  return (
    optionExists &&
    Number.isInteger(answer.confidence) &&
    typeof answer.confidence === "number" &&
    answer.confidence >= 0 &&
    answer.confidence <= 100 &&
    typeof answer.answeredAt === "string"
  );
}

function isSupervisorSession(
  value: unknown,
): value is SupervisorSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<SupervisorSession>;
  const validPhase =
    session.phase === "ready" ||
    session.phase === "questions" ||
    session.phase === "complete";

  const validIndex =
    Number.isInteger(session.currentQuestionIndex) &&
    typeof session.currentQuestionIndex === "number" &&
    session.currentQuestionIndex >= 0 &&
    session.currentQuestionIndex < SUPERVISOR_QUESTIONS.length;

  const validAnswers =
    Array.isArray(session.answers) &&
    session.answers.every(isValidAnswer) &&
    new Set(
      session.answers.map((answer) => answer.questionId),
    ).size === session.answers.length;

  const validCompletion =
    session.phase !== "complete" ||
    (session.answers?.length === SUPERVISOR_QUESTIONS.length &&
      typeof session.completedAt === "string");

  return (
    session.version === 2 &&
    typeof session.sessionId === "string" &&
    session.sessionId.startsWith("supervisor-") &&
    typeof session.startedAt === "string" &&
    validPhase &&
    validIndex &&
    validAnswers &&
    validCompletion &&
    session.storage === "session" &&
    session.affectsResearchData === false
  );
}

function persistSupervisorSession(
  session: SupervisorSession,
): SupervisorSession {
  sessionStorage.setItem(
    SUPERVISOR_SESSION_STORAGE_KEY,
    JSON.stringify(session),
  );

  return session;
}

function removeLegacySession(): void {
  sessionStorage.removeItem(LEGACY_SUPERVISOR_SESSION_STORAGE_KEY);
}

export function initializeSupervisorSession(
  overrides: SupervisorSessionOverrides = {},
): SupervisorSession {
  removeLegacySession();

  return persistSupervisorSession({
    version: 2,
    sessionId: overrides.sessionId ?? createSessionId(),
    startedAt: overrides.startedAt ?? new Date().toISOString(),
    phase: "ready",
    currentQuestionIndex: 0,
    answers: [],
    storage: "session",
    affectsResearchData: false,
  });
}

export function startSupervisorQuestions(
  session: SupervisorSession,
): SupervisorSession {
  return persistSupervisorSession({
    ...session,
    phase: "questions",
    currentQuestionIndex: 0,
    completedAt: undefined,
  });
}

export function saveSupervisorAnswer(
  session: SupervisorSession,
  input: SaveSupervisorAnswerInput,
): SupervisorSession {
  const questionIndex = SUPERVISOR_QUESTIONS.findIndex(
    (question) => question.id === input.questionId,
  );

  if (questionIndex < 0) {
    throw new Error("Unknown supervisor question.");
  }

  const question = SUPERVISOR_QUESTIONS[questionIndex];
  const optionExists = question.options.some(
    (option) => option.id === input.optionId,
  );

  if (!optionExists) {
    throw new Error("Unknown supervisor response option.");
  }

  if (
    !Number.isInteger(input.confidence) ||
    input.confidence < 0 ||
    input.confidence > 100
  ) {
    throw new Error("Confidence must be an integer from 0 to 100.");
  }

  const answer: SupervisorAnswer = {
    questionId: input.questionId,
    optionId: input.optionId,
    confidence: input.confidence,
    answeredAt: input.answeredAt ?? new Date().toISOString(),
  };

  const answers = [
    ...session.answers.filter(
      (existingAnswer) =>
        existingAnswer.questionId !== input.questionId,
    ),
    answer,
  ];

  const isLastQuestion =
    questionIndex === SUPERVISOR_QUESTIONS.length - 1;

  return persistSupervisorSession({
    ...session,
    phase: isLastQuestion ? "complete" : "questions",
    currentQuestionIndex: isLastQuestion
      ? questionIndex
      : questionIndex + 1,
    answers,
    completedAt: isLastQuestion
      ? new Date().toISOString()
      : undefined,
  });
}

export function setSupervisorQuestionIndex(
  session: SupervisorSession,
  questionIndex: number,
): SupervisorSession {
  if (
    !Number.isInteger(questionIndex) ||
    questionIndex < 0 ||
    questionIndex >= SUPERVISOR_QUESTIONS.length
  ) {
    throw new Error("Supervisor question index is out of range.");
  }

  return persistSupervisorSession({
    ...session,
    phase: "questions",
    currentQuestionIndex: questionIndex,
    completedAt: undefined,
  });
}

export function restartSupervisorQuestions(
  session: SupervisorSession,
): SupervisorSession {
  return persistSupervisorSession({
    ...session,
    phase: "questions",
    currentQuestionIndex: 0,
    answers: [],
    completedAt: undefined,
  });
}

export function loadSupervisorSession(): SupervisorSession | null {
  removeLegacySession();

  const storedValue = sessionStorage.getItem(
    SUPERVISOR_SESSION_STORAGE_KEY,
  );

  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);

    if (!isSupervisorSession(parsedValue)) {
      sessionStorage.removeItem(SUPERVISOR_SESSION_STORAGE_KEY);
      return null;
    }

    return parsedValue;
  } catch {
    sessionStorage.removeItem(SUPERVISOR_SESSION_STORAGE_KEY);
    return null;
  }
}

export function clearSupervisorSession(): void {
  removeLegacySession();
  sessionStorage.removeItem(SUPERVISOR_SESSION_STORAGE_KEY);
}
