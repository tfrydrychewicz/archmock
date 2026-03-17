import { eq, asc, desc } from "drizzle-orm";
import { db } from "../lib/db";
import {
  sessions,
  messages,
  problems,
  observations,
  diagramSnapshots,
  evaluations,
} from "@archmock/db";
import { runEvaluation, type EvaluationInput } from "./evaluator";
import type { DiagramGraph, SDProblem, Evaluation } from "@archmock/shared";

type SendFn = (msg: object) => void;

function dbProblemToSDProblem(row: typeof problems.$inferSelect): SDProblem {
  const eg = row.evaluationGuide as {
    expectedComponents?: string[];
    scalingConcerns?: string[];
    commonMistakes?: string[];
    deepDiveTopics?: string[];
    followUpConstraints?: string[];
    exampleGoodQuestions?: string[];
  };
  return {
    id: row.id,
    title: row.title,
    difficulty: row.difficulty ?? "mid",
    category: (row.category as string[]) ?? [],
    companies: (row.companies as string[]) ?? [],
    timeLimit: row.timeLimit ?? 45,
    statement: row.statement,
    clarifications: (row.clarifications as SDProblem["clarifications"]) ?? [],
    evaluationGuide: {
      expectedComponents: eg?.expectedComponents ?? [],
      scalingConcerns: eg?.scalingConcerns ?? [],
      commonMistakes: eg?.commonMistakes ?? [],
      deepDiveTopics: eg?.deepDiveTopics ?? [],
      followUpConstraints: eg?.followUpConstraints ?? [],
      exampleGoodQuestions: eg?.exampleGoodQuestions ?? [],
    },
    referenceDesign: row.referenceDesign as DiagramGraph | undefined,
  };
}

function evaluationToDbRow(evalResult: Evaluation) {
  return {
    overallScore: evalResult.overall.score,
    summary: evalResult.overall.summary,
    dimensions: evalResult.dimensions as object,
    strengths: evalResult.strengths as object,
    improvements: evalResult.areasForImprovement as object,
    detailed: evalResult.detailedFeedback as object,
  };
}

export async function handleSessionEnd(
  sessionId: string,
  finalDiagram: DiagramGraph | null,
  sendToClient: SendFn
): Promise<void> {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) {
    sendToClient({ type: "error", code: "SESSION_NOT_FOUND", message: "Session not found" });
    return;
  }

  if (session.status === "completed") {
    const [existing] = await db
      .select({ id: evaluations.id })
      .from(evaluations)
      .where(eq(evaluations.sessionId, sessionId))
      .limit(1);
    if (existing) {
      sendToClient({ type: "session.evaluation_ready", evaluationId: existing.id });
    } else {
      sendToClient({
        type: "error",
        code: "SESSION_ALREADY_ENDED",
        message: "Session already ended",
      });
    }
    return;
  }

  const diagramGraph = (finalDiagram ?? session.diagramGraph) as DiagramGraph | null;
  const graph = diagramGraph ?? { nodes: [], edges: [], zones: [] };

  const startedAt = session.startedAt ? new Date(session.startedAt) : new Date();
  const endedAt = new Date();
  const durationSec = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);
  const sessionDurationMin = Math.round(durationSec / 60) || 1;

  await db
    .update(sessions)
    .set({
      status: "completed",
      endedAt,
      durationSec,
      diagramGraph: graph as object,
    })
    .where(eq(sessions.id, sessionId));

  await db.insert(diagramSnapshots).values({
    sessionId,
    graphJson: graph as object,
    trigger: "session_end",
  });

  const [problemRow] = await db
    .select()
    .from(problems)
    .where(eq(problems.id, session.problemId))
    .limit(1);

  if (!problemRow) {
    sendToClient({ type: "error", code: "PROBLEM_NOT_FOUND", message: "Problem not found" });
    return;
  }

  const problem = dbProblemToSDProblem(problemRow);

  const msgRows = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt));

  const conversationTranscript = msgRows
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role === "user" ? "Candidate" : "Interviewer"}: ${m.content ?? ""}`)
    .join("\n\n");

  const snapshotRows = await db
    .select({ graphJson: diagramSnapshots.graphJson, createdAt: diagramSnapshots.createdAt })
    .from(diagramSnapshots)
    .where(eq(diagramSnapshots.sessionId, sessionId))
    .orderBy(asc(diagramSnapshots.createdAt));

  const diagramHistory = snapshotRows.map((s) => ({
    graph: s.graphJson as DiagramGraph,
    timestamp: s.createdAt?.toISOString() ?? "",
  }));

  const obsRows = await db
    .select({
      observation: observations.observation,
      category: observations.category,
      actionTaken: observations.actionTaken,
    })
    .from(observations)
    .where(eq(observations.sessionId, sessionId))
    .orderBy(asc(observations.createdAt));

  const observationsList = obsRows.map((o) => ({
    observation: o.observation ?? "",
    category: o.category ?? "",
    actionTaken: o.actionTaken ?? "",
  }));

  sendToClient({ type: "session.evaluation_progress", step: "Analyzing conversation..." });

  const input: EvaluationInput = {
    problem,
    finalDiagram: graph,
    diagramHistory,
    conversationTranscript: conversationTranscript || "(No conversation recorded)",
    observations: observationsList,
    sessionDurationMin,
  };

  sendToClient({ type: "session.evaluation_progress", step: "Evaluating diagram..." });

  let evalResult: Evaluation;
  try {
    evalResult = await runEvaluation(input);
  } catch (err) {
    console.error("Evaluation failed:", err);
    sendToClient({
      type: "error",
      code: "EVALUATION_FAILED",
      message: err instanceof Error ? err.message : "Evaluation failed",
    });
    return;
  }

  sendToClient({ type: "session.evaluation_progress", step: "Generating feedback..." });

  const [inserted] = await db
    .insert(evaluations)
    .values({
      sessionId,
      ...evaluationToDbRow(evalResult),
    })
    .returning({ id: evaluations.id });

  if (inserted) {
    sendToClient({
      type: "session.evaluation_ready",
      evaluationId: inserted.id,
    });
  }
}
