import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { sessions, messages, problems } from "@archmock/db";
import type { SDProblem, DiagramGraph } from "@archmock/shared";
import { buildVoiceInterviewerSystemPrompt } from "./voicePrompts";
import { detectPhaseFromTime } from "./phase";
import { getVoiceInterviewerResponse } from "./aiProvider";
import {
  speechToText,
  textToSpeechStream,
  isVoiceEnabled,
} from "./voice/elevenlabs";

const EMPTY_DIAGRAM: DiagramGraph = {
  nodes: [],
  edges: [],
  zones: [],
};

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

export async function handleVoiceAudio(
  sessionId: string,
  audioBase64: string,
  sendToClient: SendFn
): Promise<void> {
  if (!isVoiceEnabled()) {
    sendToClient({
      type: "error",
      code: "VOICE_DISABLED",
      message: "Voice mode requires ELEVENLABS_API_KEY",
    });
    return;
  }

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) {
    sendToClient({
      type: "error",
      code: "SESSION_NOT_FOUND",
      message: "Session not found",
    });
    return;
  }

  const [problemRow] = await db
    .select()
    .from(problems)
    .where(eq(problems.id, session.problemId))
    .limit(1);

  if (!problemRow) {
    sendToClient({
      type: "error",
      code: "PROBLEM_NOT_FOUND",
      message: "Problem not found",
    });
    return;
  }

  let transcript: string;
  try {
    const audioBuffer = Buffer.from(audioBase64, "base64");
    transcript = await speechToText(audioBuffer);
  } catch (err) {
    console.error("STT error:", err);
    sendToClient({
      type: "error",
      code: "STT_ERROR",
      message: err instanceof Error ? err.message : "Speech recognition failed",
    });
    return;
  }

  if (!transcript.trim()) return;

  await processVoiceTranscript(sessionId, transcript, sendToClient);
}

export async function handleVoiceTranscript(
  sessionId: string,
  transcript: string,
  sendToClient: SendFn
): Promise<void> {
  if (!isVoiceEnabled()) {
    sendToClient({
      type: "error",
      code: "VOICE_DISABLED",
      message: "Voice mode requires ELEVENLABS_API_KEY",
    });
    return;
  }

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) {
    sendToClient({
      type: "error",
      code: "SESSION_NOT_FOUND",
      message: "Session not found",
    });
    return;
  }

  if (!transcript.trim()) {
    return;
  }

  await processVoiceTranscript(sessionId, transcript, sendToClient);
}

async function processVoiceTranscript(
  sessionId: string,
  transcript: string,
  sendToClient: SendFn
): Promise<void> {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) return;

  const [problemRow] = await db
    .select()
    .from(problems)
    .where(eq(problems.id, session.problemId))
    .limit(1);

  if (!problemRow) {
    sendToClient({
      type: "error",
      code: "PROBLEM_NOT_FOUND",
      message: "Problem not found",
    });
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

  await db.insert(messages).values({
    sessionId,
    role: "user",
    content: transcript,
    source: "voice_transcript",
  });

  const history = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(messages.createdAt);

  const systemPrompt = buildVoiceInterviewerSystemPrompt(
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
    { role: "user" as const, content: transcript },
  ];

  const messageId = crypto.randomUUID();

  try {
    const { speech, chatSummary } = await getVoiceInterviewerResponse(
      systemPrompt,
      apiMessages
    );

    await db.insert(messages).values({
      sessionId,
      role: "assistant",
      content: speech,
      source: "chat",
    });

    sendToClient({ type: "voice.chat_info", summary: chatSummary });
    sendToClient({ type: "voice.audio_start", messageId });

    for await (const chunk of textToSpeechStream(speech)) {
      sendToClient({
        type: "voice.audio_chunk",
        chunk: chunk.toString("base64"),
      });
    }

    sendToClient({ type: "voice.audio_done", messageId, content: chatSummary });
  } catch (err) {
    console.error("Voice handler error:", err);
    sendToClient({
      type: "error",
      code: "AI_ERROR",
      message: err instanceof Error ? err.message : "AI request failed",
    });
  }
}
