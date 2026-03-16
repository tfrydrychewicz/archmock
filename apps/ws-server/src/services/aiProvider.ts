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
