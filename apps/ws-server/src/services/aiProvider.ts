import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

type Message = { role: "user" | "assistant"; content: string };

type StreamCallbacks = {
  onDelta: (delta: string) => void;
};

async function streamWithClaude(
  systemPrompt: string,
  messages: Message[],
  callbacks: StreamCallbacks
): Promise<string> {
  const anthropic = new Anthropic();
  const model = process.env.AI_MODEL_REALTIME ?? "claude-sonnet-4-6";
  let fullContent = "";

  const stream = await anthropic.messages.stream({
    model,
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      const delta = event.delta.text;
      fullContent += delta;
      callbacks.onDelta(delta);
    }
  }

  return fullContent;
}

async function streamWithOpenAI(
  systemPrompt: string,
  messages: Message[],
  callbacks: StreamCallbacks
): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL ?? "gpt-5.4";
  let fullContent = "";

  const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const stream = await openai.chat.completions.create({
    model,
    messages: apiMessages,
    max_completion_tokens: 1024,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      fullContent += delta;
      callbacks.onDelta(delta);
    }
  }

  return fullContent;
}

export async function streamChatResponse(
  systemPrompt: string,
  messages: Message[],
  callbacks: StreamCallbacks
): Promise<string> {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

  if (hasAnthropicKey) {
    try {
      return await streamWithClaude(systemPrompt, messages, callbacks);
    } catch (err) {
      console.warn("Claude failed, falling back to OpenAI:", err instanceof Error ? err.message : err);
    }
  }

  if (hasOpenAIKey) {
    return await streamWithOpenAI(systemPrompt, messages, callbacks);
  }

  throw new Error(
    "No AI provider available. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in .env.local"
  );
}

const READINESS_PROMPT = `You classify if a transcript is a complete thought that could require a response from the interviewer.

READY (ready: true): The user said something complete that makes sense and could warrant a response. This includes:
- Questions: "Can you explain how you'd handle scaling?" or "What database would you use?"
- Statements that invite follow-up: "I'm thinking of using Redis for caching" or "I'm not sure about the database choice" or "I'd add a load balancer here"

NOT READY (ready: false): Incomplete fragments that don't form a full thought: "Can you" or "How would" or "What about" or "I think" - phrases that start something but don't finish it.

Reply with ONLY this JSON, nothing else: {"ready": true} or {"ready": false}`;

export async function isTranscriptReadyForResponse(
  transcript: string
): Promise<boolean> {
  const text = transcript.trim();
  if (!text || text.length < 3) return false;

  if (text.endsWith("?") && text.length >= 15) {
    console.debug(`[Voice] Readiness bypass: ends with ? and len>=15`);
    return true;
  }
  if (text.length >= 40 && /[.!?]$/.test(text)) {
    console.debug(`[Voice] Readiness bypass: len>=40 and sentence end`);
    return true;
  }

  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  if (hasOpenAIKey) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const model = process.env.AI_MODEL_READINESS ?? "gpt-4o-mini";
      const t0 = Date.now();
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: READINESS_PROMPT },
          { role: "user", content: `Transcript: "${text}"` },
        ],
        max_completion_tokens: 10,
      });
      const raw = completion.choices[0]?.message?.content?.trim() ?? "";
      console.debug(
        `[Voice] Readiness (OpenAI ${model}): ${Date.now() - t0}ms, raw="${raw}"`
      );
      const ready = parseReadyFromResponse(raw);
      return ready;
    } catch (err) {
      console.warn("[Voice] Readiness check failed (OpenAI):", err);
    }
  }

  if (hasAnthropicKey) {
    try {
      const anthropic = new Anthropic();
      const model = process.env.AI_MODEL_READINESS ?? "claude-3-haiku-20240307";
      const t0 = Date.now();
      const response = await anthropic.messages.create({
        model,
        max_tokens: 10,
        messages: [
          { role: "user", content: `${READINESS_PROMPT}\n\nTranscript: "${text}"` },
        ],
      });
      const raw =
        response.content[0]?.type === "text"
          ? (response.content[0] as { text: string }).text
          : "";
      console.debug(
        `[Voice] Readiness (Anthropic ${model}): ${Date.now() - t0}ms, raw="${raw}"`
      );
      const ready = parseReadyFromResponse(raw);
      return ready;
    } catch (err) {
      console.warn("[Voice] Readiness check failed (Anthropic):", err);
    }
  }

  const fallback = text.endsWith("?") || (text.length > 25 && /[.!?]$/.test(text));
  console.debug(`[Voice] Readiness fallback: ${fallback} (no AI or failed)`);
  return fallback;
}

function parseReadyFromResponse(raw: string): boolean {
  if (!raw) return false;
  const jsonMatch = raw.match(/\{\s*"ready"\s*:\s*(true|false)\s*\}/);
  if (jsonMatch) return jsonMatch[1] === "true";
  if (/\btrue\b/.test(raw) && !/\bfalse\b/.test(raw)) return true;
  if (/\bfalse\b/.test(raw)) return false;
  try {
    const parsed = extractJson<{ ready?: boolean }>(raw);
    return !!parsed?.ready;
  } catch {
    return false;
  }
}

function extractJson<T>(text: string): T {
  let s = text.trim();
  const match = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) s = match[1].trim();
  return JSON.parse(s) as T;
}

export type ObservationResult = {
  shouldInterject: boolean;
  priority: "low" | "medium" | "high" | "critical";
  observation: string;
  suggestedQuestion: string;
  category: string;
};

export async function analyzeDiagramWithAI(
  problem: { title: string; evaluationGuide: { expectedComponents: string[] } },
  currentGraph: object,
  changes: string[],
  staticIssues: string[],
  phase: string,
  conversationSummary: string
): Promise<ObservationResult | null> {
  const prompt = `You are analyzing a system design diagram for: "${problem.title}"

Current diagram:
${JSON.stringify(currentGraph, null, 2)}

Recent changes: ${changes.join("; ") || "none"}
Static analysis issues: ${staticIssues.join("; ") || "none"}
Current phase: ${phase}
Recent conversation context: ${conversationSummary}

Expected components for a good solution: ${problem.evaluationGuide.expectedComponents.join(", ")}

Decide: should the interviewer interject right now?
Consider:
- Is there a significant issue worth addressing?
- Is this the right moment (not mid-thought)?
- Would a real interviewer comment on this?

Respond ONLY with valid JSON, no other text:
{
  "shouldInterject": boolean,
  "priority": "low" | "medium" | "high" | "critical",
  "observation": "what you noticed (internal, not shown to user)",
  "suggestedQuestion": "the question to ask the candidate (Socratic, not lecturing)",
  "category": "scaling" | "failure" | "trade-off" | "missing-component" | "architecture" | "data-model"
}`;

  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

  if (hasAnthropicKey) {
    try {
      const anthropic = new Anthropic();
      const model = process.env.AI_MODEL_REALTIME ?? "claude-sonnet-4-6";
      const response = await anthropic.messages.create({
        model,
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      });
      const text =
        response.content[0].type === "text"
          ? (response.content[0] as { text: string }).text
          : "";
      return extractJson<ObservationResult>(text);
    } catch (err) {
      console.warn("Claude diagram analysis failed:", err);
    }
  }

  if (hasOpenAIKey) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const model = process.env.OPENAI_MODEL ?? "gpt-4o";
      const completion = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 500,
      });
      const text = completion.choices[0]?.message?.content?.trim() ?? "";
      if (!text) return null;
      return extractJson<ObservationResult>(text);
    } catch (err) {
      console.warn("OpenAI diagram analysis failed:", err);
    }
  }

  return null;
}

export type VoiceResponse = {
  speech: string;
  chatSummary: string;
};

export type StreamVoiceCallbacks = {
  onSpeechChunk: (text: string) => void | Promise<void>;
  onSummary: (summary: string) => void;
};

async function streamVoiceWithClaude(
  systemPrompt: string,
  messages: Message[],
  callbacks: StreamVoiceCallbacks
): Promise<void> {
  const anthropic = new Anthropic();
  const model = process.env.AI_MODEL_REALTIME ?? "claude-sonnet-4-6";
  let buffer = "";
  const SUMMARY_MARKERS = ["\nSUMMARY: ", " SUMMARY: "] as const;

  const findSummaryMarker = (s: string) => {
    for (const m of SUMMARY_MARKERS) {
      const idx = s.indexOf(m);
      if (idx >= 0) return { idx, marker: m };
    }
    return null;
  };

  const stream = await anthropic.messages.stream({
    model,
    max_tokens: 512,
    system: systemPrompt,
    messages,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      const delta = event.delta.text;
      buffer += delta;

      const found = findSummaryMarker(buffer);
      if (found) {
        const { idx: markerIdx, marker } = found;
        const speechPart = buffer.slice(0, markerIdx);
        const sentenceEnd = speechPart.match(/[^.!?]*[.!?]\s*/g);
        if (sentenceEnd) {
          for (const m of sentenceEnd) {
            const sentence = m.trim();
            if (sentence) await callbacks.onSpeechChunk(sentence);
          }
        }
        buffer = marker + buffer.slice(markerIdx + marker.length);
      } else {
        const sentenceEnd = buffer.match(/[^.!?]*[.!?]\s*/g);
        if (sentenceEnd) {
          const lastMatch = sentenceEnd[sentenceEnd.length - 1];
          const endIdx = buffer.lastIndexOf(lastMatch!) + lastMatch!.length;
          const sentence = buffer.slice(0, endIdx).trim();
          buffer = buffer.slice(endIdx);
          if (sentence) await callbacks.onSpeechChunk(sentence);
        }
      }
    }
  }

  if (buffer.trim()) {
    const found = findSummaryMarker(buffer);
    if (found) {
      const { idx: markerIdx, marker } = found;
      const speech = buffer.slice(0, markerIdx).trim();
      const summary = buffer.slice(markerIdx + marker.length).trim();
      if (speech) await callbacks.onSpeechChunk(speech);
      callbacks.onSummary(summary);
    } else {
      await callbacks.onSpeechChunk(buffer.trim());
      callbacks.onSummary("");
    }
  } else {
    callbacks.onSummary("");
  }
}

async function streamVoiceWithOpenAI(
  systemPrompt: string,
  messages: Message[],
  callbacks: StreamVoiceCallbacks
): Promise<void> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o";
  let buffer = "";
  const SUMMARY_MARKERS = ["\nSUMMARY: ", " SUMMARY: "] as const;

  const findSummaryMarker = (s: string) => {
    for (const m of SUMMARY_MARKERS) {
      const idx = s.indexOf(m);
      if (idx >= 0) return { idx, marker: m };
    }
    return null;
  };

  const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const stream = await openai.chat.completions.create({
    model,
    messages: apiMessages,
    max_completion_tokens: 512,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      buffer += delta;

      const found = findSummaryMarker(buffer);
      if (found) {
        const { idx: markerIdx, marker } = found;
        const speechPart = buffer.slice(0, markerIdx);
        const sentenceEnd = speechPart.match(/[^.!?]*[.!?]\s*/g);
        if (sentenceEnd) {
          for (const m of sentenceEnd) {
            const sentence = m.trim();
            if (sentence) await callbacks.onSpeechChunk(sentence);
          }
        }
        buffer = marker + buffer.slice(markerIdx + marker.length);
      } else {
        const sentenceEnd = buffer.match(/[^.!?]*[.!?]\s*/g);
        if (sentenceEnd) {
          const lastMatch = sentenceEnd[sentenceEnd.length - 1];
          const endIdx = buffer.lastIndexOf(lastMatch!) + lastMatch!.length;
          const sentence = buffer.slice(0, endIdx).trim();
          buffer = buffer.slice(endIdx);
          if (sentence) await callbacks.onSpeechChunk(sentence);
        }
      }
    }
  }

  if (buffer.trim()) {
    const found = findSummaryMarker(buffer);
    if (found) {
      const { idx: markerIdx, marker } = found;
      const speech = buffer.slice(0, markerIdx).trim();
      const summary = buffer.slice(markerIdx + marker.length).trim();
      if (speech) await callbacks.onSpeechChunk(speech);
      callbacks.onSummary(summary);
    } else {
      await callbacks.onSpeechChunk(buffer.trim());
      callbacks.onSummary("");
    }
  } else {
    callbacks.onSummary("");
  }
}

export async function streamVoiceInterviewerResponse(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  callbacks: StreamVoiceCallbacks
): Promise<void> {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

  const apiMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  if (hasAnthropicKey) {
    try {
      await streamVoiceWithClaude(systemPrompt, apiMessages, callbacks);
      return;
    } catch (err) {
      console.warn("Claude voice stream failed:", err instanceof Error ? err.message : err);
    }
  }

  if (hasOpenAIKey) {
    try {
      await streamVoiceWithOpenAI(systemPrompt, apiMessages, callbacks);
      return;
    } catch (err) {
      console.warn("OpenAI voice stream failed:", err instanceof Error ? err.message : err);
    }
  }

  throw new Error("No AI provider available");
}

export async function getVoiceInterviewerResponse(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<VoiceResponse> {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

  const apiMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  if (hasAnthropicKey) {
    try {
      const anthropic = new Anthropic();
      const model = process.env.AI_MODEL_REALTIME ?? "claude-sonnet-4-6";
      const response = await anthropic.messages.create({
        model,
        max_tokens: 512,
        system: systemPrompt,
        messages: apiMessages,
      });
      const text =
        response.content[0].type === "text"
          ? (response.content[0] as { text: string }).text
          : "";
      const parsed = JSON.parse(text.trim()) as VoiceResponse;
      return {
        speech: parsed.speech ?? "",
        chatSummary: parsed.chatSummary ?? "",
      };
    } catch (err) {
      console.warn("Claude voice response failed:", err);
    }
  }

  if (hasOpenAIKey) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const model = process.env.OPENAI_MODEL ?? "gpt-4o";
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...apiMessages,
        ],
        max_completion_tokens: 512,
      });
      const text = completion.choices[0]?.message?.content?.trim() ?? "";
      if (!text) throw new Error("Empty response");
      const parsed = JSON.parse(text) as VoiceResponse;
      return {
        speech: parsed.speech ?? "",
        chatSummary: parsed.chatSummary ?? "",
      };
    } catch (err) {
      console.warn("OpenAI voice response failed:", err);
    }
  }

  throw new Error("No AI provider available");
}
