"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@clerk/nextjs";
import { useSessionWebSocket, type WSStatus } from "@/hooks/useSessionWebSocket";
import type { ServerMessage } from "@archmock/shared";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};

export function ChatPanel({
  sessionId,
  problemStatement,
}: {
  sessionId: string;
  problemStatement?: string;
}) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const streamingIdRef = useRef<string | null>(null);

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "chat.stream":
        streamingIdRef.current ??= msg.messageId;
        if (msg.messageId === streamingIdRef.current) {
          setStreamingContent((prev) => prev + msg.delta);
        }
        break;
      case "chat.done":
        if (msg.messageId) {
          setMessages((prev) => [
            ...prev,
            { id: msg.messageId, role: "assistant", content: msg.content },
          ]);
          streamingIdRef.current = null;
          setStreamingContent("");
        }
        break;
      case "error":
        streamingIdRef.current = null;
        setStreamingContent("");
        break;
      default:
        break;
    }
  }, []);

  const getFreshToken = useCallback(
    () => getToken({ skipCache: true }),
    [getToken]
  );

  const { status, send } = useSessionWebSocket(
    sessionId,
    getFreshToken,
    handleServerMessage
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || status !== "connected") return;

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content: text },
      ]);
      setInput("");
      send({ type: "chat.send", content: text });
      inputRef.current?.focus();
    },
    [input, status, send]
  );

  const statusLabel = statusLabels[status];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-2 flex items-center justify-between">
        <h2 className="text-sm font-medium">Chat</h2>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            status === "connected"
              ? "bg-green-500/20 text-green-700 dark:text-green-400"
              : status === "connecting"
                ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {problemStatement && (
          <div className="rounded-lg border bg-card p-4 text-sm">
            <h3 className="font-medium mb-2">Problem Statement</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {problemStatement}
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg p-3 text-sm ${
              m.role === "user"
                ? "ml-8 bg-primary text-primary-foreground"
                : "mr-8 bg-muted"
            }`}
          >
            {m.role === "assistant" ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{m.content}</p>
            )}
          </div>
        ))}

        {streamingContent && (
          <div className="mr-8 rounded-lg bg-muted p-3 text-sm">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{streamingContent}</ReactMarkdown>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t p-4"
      >
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={
              status === "connected"
                ? "Type your message..."
                : "Connecting..."
            }
            disabled={status !== "connected"}
            rows={2}
            className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || status !== "connected"}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

const statusLabels: Record<WSStatus, string> = {
  connecting: "Connecting...",
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Error",
};
