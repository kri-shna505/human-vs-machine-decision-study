export const SUPERVISOR_SESSION_STORAGE_KEY =
  "decision-study.supervisor-workspace.v1";

export interface SupervisorSession {
  version: 1;
  sessionId: string;
  startedAt: string;
  status: "ready";
  storage: "session";
  affectsResearchData: false;
}

interface SupervisorSessionOverrides {
  sessionId?: string;
  startedAt?: string;
}

function createSessionId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `supervisor-${globalThis.crypto.randomUUID()}`;
  }

  return `supervisor-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function isSupervisorSession(
  value: unknown,
): value is SupervisorSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<SupervisorSession>;

  return (
    session.version === 1 &&
    typeof session.sessionId === "string" &&
    session.sessionId.startsWith("supervisor-") &&
    typeof session.startedAt === "string" &&
    session.status === "ready" &&
    session.storage === "session" &&
    session.affectsResearchData === false
  );
}

export function initializeSupervisorSession(
  overrides: SupervisorSessionOverrides = {},
): SupervisorSession {
  const session: SupervisorSession = {
    version: 1,
    sessionId: overrides.sessionId ?? createSessionId(),
    startedAt: overrides.startedAt ?? new Date().toISOString(),
    status: "ready",
    storage: "session",
    affectsResearchData: false,
  };

  sessionStorage.setItem(
    SUPERVISOR_SESSION_STORAGE_KEY,
    JSON.stringify(session),
  );

  return session;
}

export function loadSupervisorSession(): SupervisorSession | null {
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
  sessionStorage.removeItem(SUPERVISOR_SESSION_STORAGE_KEY);
}
