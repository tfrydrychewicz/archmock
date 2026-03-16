"use client";

import { createContext, useCallback, useContext, useRef } from "react";
import { useSessionWebSocket, type WSStatus } from "@/hooks/useSessionWebSocket";
import type { ClientMessage, ServerMessage } from "@archmock/shared";

type MessageHandler = (msg: ServerMessage) => void;

const SessionWebSocketContext = createContext<{
  send: (msg: ClientMessage) => void;
  status: WSStatus;
  registerHandler: (handler: MessageHandler) => () => void;
} | null>(null);

export function SessionWebSocketProvider({
  sessionId,
  getToken,
  children,
}: {
  sessionId: string;
  getToken: () => Promise<string | null>;
  children: React.ReactNode;
}) {
  const handlersRef = useRef<Set<MessageHandler>>(new Set());

  const handleMessage = useCallback((msg: ServerMessage) => {
    handlersRef.current.forEach((h) => {
      try {
        h(msg);
      } catch (e) {
        console.error("WS message handler error:", e);
      }
    });
  }, []);

  const registerHandler = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const { status, send } = useSessionWebSocket(
    sessionId,
    getToken,
    handleMessage
  );

  return (
    <SessionWebSocketContext.Provider
      value={{ send, status, registerHandler }}
    >
      {children}
    </SessionWebSocketContext.Provider>
  );
}

export function useSessionWebSocketContext() {
  const ctx = useContext(SessionWebSocketContext);
  if (!ctx) {
    throw new Error(
      "useSessionWebSocketContext must be used within SessionWebSocketProvider"
    );
  }
  return ctx;
}
