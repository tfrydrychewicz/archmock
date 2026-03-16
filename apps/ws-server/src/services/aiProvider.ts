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
      const parsed = JSON.parse(text.trim()) as ObservationResult;
      return parsed;
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
      const parsed = JSON.parse(text) as ObservationResult;
      return parsed;
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
