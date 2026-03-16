"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatMessageContent } from "./ChatMessageContent";
import { useSessionWebSocketContext } from "@/contexts/SessionWebSocketContext";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useVoiceScribe } from "@/hooks/useVoiceScribe";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import type { WSStatus } from "@/hooks/useSessionWebSocket";
import type { ServerMessage } from "@archmock/shared";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};

export type VoiceMode = "chat" | "voice";

export function ChatPanel({
  sessionId,
  problemStatement,
  currentPhase,
}: {
  sessionId: string;
  problemStatement?: string;
  currentPhase?: string;
}) {
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [chatSummaries, setChatSummaries] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const streamingIdRef = useRef<string | null>(null);

  const { status, send, registerHandler } = useSessionWebSocketContext();

  const { playChunk, playAll } = useAudioPlayback(() => setIsPlayingAudio(false));

  const handleAudioReady = useCallback(
    (audioBase64: string) => {
      if (status === "connected") {
        send({ type: "voice.audio", audioBase64 });
      }
    },
    [send, status]
  );

  const { isRecording, startRecording, stopRecording } =
    useVoiceRecorder(handleAudioReady);

  const handleScribeTranscript = useCallback(
    (text: string) => {
      if (status === "connected") {
        send({ type: "voice.transcript", content: text });
      }
    },
    [send, status]
  );

  const { isConnected, isTranscribing, connect, disconnect, tokenError } =
    useVoiceScribe(handleScribeTranscript);

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
      case "observation.interjection":
        setMessages((prev) => [
          ...prev,
          { id: msg.messageId, role: "assistant", content: msg.content },
        ]);
        break;
      case "voice.chat_info":
        setChatSummaries((prev) => [...prev, msg.summary]);
        break;
      case "voice.audio_start":
        setIsPlayingAudio(true);
        break;
      case "voice.audio_chunk":
        playChunk(msg.chunk);
        break;
      case "voice.audio_done":
        playAll();
        break;
      case "error":
        streamingIdRef.current = null;
        setStreamingContent("");
        break;
      default:
        break;
    }
  }, [playChunk, playAll]);

  useEffect(() => {
    return registerHandler(handleServerMessage);
  }, [registerHandler, handleServerMessage]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, chatSummaries, scrollToBottom]);

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
      <div className="border-b px-4 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">
            {voiceMode === "voice" ? "Voice Interview" : "Chat"}
          </h2>
          <button
            type="button"
            onClick={() => setVoiceMode((m) => (m === "chat" ? "voice" : "chat"))}
            className="text-xs px-2 py-1 rounded border bg-muted/50 hover:bg-muted transition-colors"
            title={voiceMode === "chat" ? "Switch to voice mode" : "Switch to chat mode"}
          >
            {voiceMode === "chat" ? "🎤 Voice" : "💬 Chat"}
          </button>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
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

        {voiceMode === "voice" ? (
        <VoiceModeContent
          currentPhase={currentPhase}
          chatSummaries={chatSummaries}
          isListening={isConnected && isTranscribing}
          isPlayingAudio={isPlayingAudio}
          onStartListening={connect}
          onStopListening={disconnect}
          status={status}
          tokenError={tokenError}
        />
        ) : (
          <ChatModeContent
            messages={messages}
            streamingContent={streamingContent}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {voiceMode === "chat" && (
        <form onSubmit={handleSubmit} className="border-t p-4">
          <div className="flex gap-2 items-end">
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
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={status !== "connected" || isPlayingAudio}
              title={isRecording ? "Stop recording" : "Record voice message"}
              className={`rounded-lg p-2.5 transition-colors ${
                isRecording
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <MicIcon isRecording={isRecording} />
            </button>
            <button
              type="submit"
              disabled={!input.trim() || status !== "connected"}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>
      )}

      {voiceMode === "voice" && (
        <div className="border-t p-4 flex flex-col items-center gap-2">
          {tokenError && (
            <p className="text-sm text-destructive">{tokenError}</p>
          )}
          <VoiceMicButton
            isListening={isConnected}
            isPlayingAudio={isPlayingAudio}
            onStart={connect}
            onStop={disconnect}
            disabled={status !== "connected"}
          />
        </div>
      )}
    </div>
  );
}

function VoiceModeContent({
  currentPhase,
  chatSummaries,
  isListening,
  isPlayingAudio,
  onStartListening,
  onStopListening,
  status,
  tokenError,
}: {
  currentPhase?: string;
  chatSummaries: string[];
  isListening: boolean;
  isPlayingAudio: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  status: WSStatus;
  tokenError?: string | null;
}) {
  return (
    <div className="space-y-4">
      {currentPhase && (
        <div className="rounded-lg border bg-muted/30 px-4 py-2 text-sm">
          <span className="text-muted-foreground">Phase: </span>
          <span className="font-medium capitalize">
            {currentPhase.replace("_", " ")}
          </span>
        </div>
      )}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-medium mb-2">Key Info</h3>
        {chatSummaries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isListening
              ? "Listening... (ElevenLabs will detect when you finish speaking)"
              : isPlayingAudio
                ? "Interviewer speaking..."
                : status === "connected"
                  ? "Click the mic to start. Speak naturally — ElevenLabs detects when you're done."
                  : "Connecting..."}
          </p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {chatSummaries.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function VoiceMicButton({
  isListening,
  isPlayingAudio,
  onStart,
  onStop,
  disabled,
}: {
  isListening: boolean;
  isPlayingAudio: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={isListening ? onStop : onStart}
      disabled={disabled || isPlayingAudio}
      className={`rounded-full p-6 transition-all ${
        isListening
          ? "bg-red-500 text-white animate-pulse scale-110"
          : "bg-primary text-primary-foreground hover:bg-primary/90"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      title={isListening ? "Stop listening" : "Start speaking (ElevenLabs detects when you finish)"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="23" />
      </svg>
    </button>
  );
}

function ChatModeContent({
  messages,
  streamingContent,
}: {
  messages: ChatMessage[];
  streamingContent: string;
}) {
  return (
    <>
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
            <ChatMessageContent content={m.content} />
          ) : (
            <p className="whitespace-pre-wrap">{m.content}</p>
          )}
        </div>
      ))}
      {streamingContent && (
        <div className="mr-8 rounded-lg bg-muted p-3 text-sm">
          <ChatMessageContent content={streamingContent} />
        </div>
      )}
    </>
  );
}

function MicIcon({ isRecording }: { isRecording: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {isRecording ? (
        <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
      ) : (
        <>
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="23" />
        </>
      )}
    </svg>
  );
}

const statusLabels: Record<WSStatus, string> = {
  connecting: "Connecting...",
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Error",
};
