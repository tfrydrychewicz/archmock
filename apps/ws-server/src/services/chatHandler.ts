import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { sessions, messages, problems } from "@archmock/db";
import type { SDProblem, DiagramGraph } from "@archmock/shared";
import { buildInterviewerSystemPrompt } from "./prompts";
import { detectPhaseFromTime } from "./phase";
import { streamChatResponse } from "./aiProvider";

const EMPTY_DIAGRAM: DiagramGraph = {
  nodes: [],
  edges: [],
  zones: [],
};

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

export async function handleChatSend(
  sessionId: string,
  userContent: string,
  sendToClient: (msg: object) => void
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
  const timeLimit = problem.timeLimit;
  const startedAt = session.startedAt ? new Date(session.startedAt) : new Date();
  const elapsedMs = Date.now() - startedAt.getTime();
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);
  const phase = detectPhaseFromTime(elapsedMinutes, timeLimit);

  const diagram =
    (session.diagramGraph as DiagramGraph | null) ?? EMPTY_DIAGRAM;

  const history = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(messages.createdAt);

  const systemPrompt = buildInterviewerSystemPrompt(
    problem,
    phase,
    diagram,
    timeLimit,
    elapsedMinutes
  );

  const apiMessages = [
    ...history
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    { role: "user" as const, content: userContent },
  ];

  await db.insert(messages).values({
    sessionId,
    role: "user",
    content: userContent,
    source: "chat",
  });

  const messageId = crypto.randomUUID();

  try {
    const fullContent = await streamChatResponse(
      systemPrompt,
      apiMessages,
      {
        onDelta: (delta) => sendToClient({ type: "chat.stream", delta, messageId }),
      }
    );

    await db.insert(messages).values({
      sessionId,
      role: "assistant",
      content: fullContent,
      source: "chat",
    });

    sendToClient({ type: "chat.done", messageId, content: fullContent });
  } catch (err) {
    console.error("AI stream error:", err);
    sendToClient({
      type: "error",
      code: "AI_ERROR",
      message: err instanceof Error ? err.message : "AI request failed",
    });
  }
}
