"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMessage, ServerMessage } from "@archmock/shared";

const PING_INTERVAL_MS = 30_000;
const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

export type WSStatus = "connecting" | "connected" | "disconnected" | "error";

export function useSessionWebSocket(
  sessionId: string | null,
  getToken: () => Promise<string | null>,
  onMessage: (msg: ServerMessage) => void
) {
  const [status, setStatus] = useState<WSStatus>("disconnected");
  const [lastError, setLastError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(async () => {
    if (!sessionId) return;

    const token = await getToken();
    if (!token) return;

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000";
    const url = `${wsUrl}/ws?token=${encodeURIComponent(token)}&sessionId=${encodeURIComponent(sessionId)}`;

    setStatus("connecting");
    setLastError(null);

    const ws = new WebSocket(url);

    ws.onopen = () => {
      setStatus("connected");
      reconnectAttemptRef.current = 0;
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" } satisfies ClientMessage));
        }
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string) as ServerMessage;
        onMessageRef.current(msg);
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
      wsRef.current = null;
      setStatus("disconnected");

      if (sessionId && reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptRef.current += 1;
        setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      setLastError("WebSocket error");
      setStatus("error");
    };

    wsRef.current = ws;
  }, [sessionId, getToken]);

  const disconnect = useCallback(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    reconnectAttemptRef.current = MAX_RECONNECT_ATTEMPTS;
    setStatus("disconnected");
  }, []);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      connect();
    }
    return () => disconnect();
  }, [sessionId, connect, disconnect]);

  return { status, lastError, send, reconnect: connect };
}
