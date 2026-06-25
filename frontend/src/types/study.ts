export interface ScenarioOption {
  id: string;
  scenario_id: string;
  code: string;
  label: string;
  display_order: number;
}

export interface Scenario {
  id: string;
  slug: string;
  version: number;
  title: string;
  category: string;
  prompt: string;
  is_active: boolean;
  options: ScenarioOption[];
  created_at?: string;
}

export interface Participant {
  id: string;
  participant_code: string;
  consented_at: string;
  created_at: string;
}

export type StudySessionStatus = "started" | "completed";

export interface StudySession {
  id: string;
  participant_id: string;
  randomization_seed: number;
  status: StudySessionStatus;
  started_at: string;
  completed_at: string | null;
}

export interface HumanResponse {
  id: string;
  session_id: string;
  scenario_id: string;
  selected_option_id: string;
  confidence: number;
  response_time_ms: number;
  answered_at: string;
}

export interface StudySessionDetail extends StudySession {
  responses: HumanResponse[];
}

export interface CompletedStudySession extends StudySession {
  response_count: number;
}