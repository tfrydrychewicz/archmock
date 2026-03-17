import type { DiagramGraph, SDProblem } from "@archmock/shared";
import { computeChanges } from "./diagram/differ";
import { runStaticAnalysis } from "./diagram/analyzer";
import {
  analyzeDiagramWithAI,
  type ObservationResult,
} from "./aiProvider";

export type { ObservationResult };

const COOLDOWN_MS = 90_000;

export class DiagramObserver {
  private lastObservationAt = 0;
  private observationQueue: ObservationResult[] = [];

  constructor(private problem: SDProblem) {}

  async analyze(
    currentGraph: DiagramGraph,
    previousGraph: DiagramGraph | null,
    conversationSummary: string,
    phase: string,
    notesDocument?: string
  ): Promise<ObservationResult | null> {
    const staticIssues = runStaticAnalysis(currentGraph);
    const changes = computeChanges(currentGraph, previousGraph);

    if (changes.length === 0 && staticIssues.length === 0) return null;

    const result = await analyzeDiagramWithAI(
      this.problem,
      currentGraph,
      changes,
      staticIssues,
      phase,
      conversationSummary,
      notesDocument ?? ""
    );

    if (!result) return null;

    const now = Date.now();
    if (result.shouldInterject && result.priority !== "critical") {
      if (now - this.lastObservationAt < COOLDOWN_MS) {
        this.observationQueue.push(result);
        return null;
      }
    }

    if (result.shouldInterject) {
      this.lastObservationAt = now;
    }

    return result;
  }
}
