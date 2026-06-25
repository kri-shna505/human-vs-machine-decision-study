import type {
  CompletedStudySession,
  HumanResponse,
  Participant,
  Scenario,
  StudySession,
} from "../types/study";

import { apiRequest } from "./client";


export interface CreateParticipantPayload {
  consent: boolean;
}

export interface CreateStudySessionPayload {
  participant_id: string;
}

export interface CreateHumanResponsePayload {
  scenario_id: string;
  selected_option_id: string;
  confidence: number;
  response_time_ms: number;
}

export type StudySessionDetail = StudySession & {
  responses: HumanResponse[];
};


/**
 * Retrieve all active study scenarios.
 */
export function getScenarios(
  signal?: AbortSignal,
): Promise<Scenario[]> {
  return apiRequest<Scenario[]>("/api/v1/scenarios", {
    method: "GET",
    signal,
  });
}


/**
 * Register one anonymous participant after explicit consent.
 */
export function createParticipant(
  payload: CreateParticipantPayload,
  signal?: AbortSignal,
): Promise<Participant> {
  return apiRequest<Participant>("/api/v1/participants", {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });
}


/**
 * Start a study session for an existing participant.
 */
export function createStudySession(
  payload: CreateStudySessionPayload,
  signal?: AbortSignal,
): Promise<StudySession> {
  return apiRequest<StudySession>("/api/v1/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });
}


/**
 * Retrieve one study session and its submitted responses.
 */
export function getStudySession(
  sessionId: string,
  signal?: AbortSignal,
): Promise<StudySessionDetail> {
  return apiRequest<StudySessionDetail>(
    `/api/v1/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "GET",
      signal,
    },
  );
}


/**
 * Submit one human response for a study scenario.
 */
export function submitHumanResponse(
  sessionId: string,
  payload: CreateHumanResponsePayload,
  signal?: AbortSignal,
): Promise<HumanResponse> {
  return apiRequest<HumanResponse>(
    `/api/v1/sessions/${encodeURIComponent(sessionId)}/responses`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      signal,
    },
  );
}


/**
 * Mark a fully answered study session as completed.
 */
export function completeStudySession(
  sessionId: string,
  signal?: AbortSignal,
): Promise<CompletedStudySession> {
  return apiRequest<CompletedStudySession>(
    `/api/v1/sessions/${encodeURIComponent(sessionId)}/complete`,
    {
      method: "POST",
      signal,
    },
  );
}