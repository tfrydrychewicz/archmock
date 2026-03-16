import type { Phase } from "../types/session";

export const PHASE_LABELS: Record<Phase, string> = {
  clarification: "Clarification",
  high_level: "High-Level Design",
  deep_dive: "Deep Dive",
  wrap_up: "Wrap Up",
};
