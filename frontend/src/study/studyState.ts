export const STUDY_PHASES = [
  "landing",
  "consent",
  "starting",
  "question",
  "submitting",
  "completing",
  "completed",
  "error",
] as const;

export type StudyPhase =
  (typeof STUDY_PHASES)[number];

export function isStudyPhase(
  value: unknown,
): value is StudyPhase {
  return (
    typeof value === "string" &&
    STUDY_PHASES.some(
      (phase) => phase === value,
    )
  );
}
