import type { Phase } from "@archmock/shared";

const PHASES: Phase[] = [
  "clarification",
  "high_level",
  "deep_dive",
  "wrap_up",
];

export function detectPhaseFromTime(
  elapsedMinutes: number,
  timeLimitMinutes: number
): Phase {
  const ratio = elapsedMinutes / timeLimitMinutes;
  if (ratio < 0.11) return "clarification";
  if (ratio < 0.44) return "high_level";
  if (ratio < 0.89) return "deep_dive";
  return "wrap_up";
}

export function getNextPhase(current: Phase): Phase | null {
  const idx = PHASES.indexOf(current);
  if (idx < 0 || idx >= PHASES.length - 1) return null;
  return PHASES[idx + 1];
}
