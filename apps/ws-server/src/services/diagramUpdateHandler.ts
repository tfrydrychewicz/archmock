import { eq, desc } from "drizzle-orm";
import { db } from "../lib/db";
import { sessions, messages, problems, observations } from "@archmock/db";
import { DiagramObserver } from "./observer";
import type { DiagramGraph, SDProblem } from "@archmock/shared";

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

export async function handleDiagramUpdate(
  sessionId: string,
  graph: DiagramGraph,
  previousGraph: DiagramGraph | null,
  sendToClient: SendFn
): Promise<DiagramGraph> {
  await db
    .update(sessions)
    .set({ diagramGraph: graph as object })
    .where(eq(sessions.id, sessionId));

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) return graph;

  const [problemRow] = await db
    .select()
    .from(problems)
    .where(eq(problems.id, session.problemId))
    .limit(1);

  if (!problemRow) return graph;

  const problem = dbProblemToSDProblem(problemRow);
  const phase = (session.currentPhase ?? "clarification") as string;

  const recentMessages = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(desc(messages.createdAt))
    .limit(10);

  const conversationSummary = recentMessages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role}: ${(m.content ?? "").slice(0, 100)}`)
    .join("; ");

  const notesDocument = (session.notesDocument as string | null) ?? "";
  const observer = new DiagramObserver(problem);
  const result = await observer.analyze(
    graph,
    previousGraph,
    conversationSummary,
    phase,
    notesDocument
  );

  if (result?.shouldInterject && result.suggestedQuestion) {
    const messageId = crypto.randomUUID();
    sendToClient({
      type: "observation.interjection",
      content: result.suggestedQuestion,
      messageId,
    });
    await db.insert(observations).values({
      sessionId,
      category: result.category,
      priority: result.priority,
      observation: result.observation,
      suggestedQuestion: result.suggestedQuestion,
      actionTaken: "interjection",
    });
  }

  return graph;
}
