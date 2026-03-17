import { verifyToken } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { sessions, users } from "@archmock/db";
import { handleChatSend } from "../services/chatHandler";
import { handleDiagramUpdate } from "../services/diagramUpdateHandler";
import { handleVoiceAudio, handleVoiceTranscript, handleVoiceTranscriptCheck } from "../services/voiceHandler";
import type { ClientMessage, DiagramGraph } from "@archmock/shared";

type SendFn = (msg: object) => void;

export function createWSHandlers(
  token: string | null,
  sessionId: string | null
) {
  let boundSessionId: string | null = null;
  let sendFn: SendFn | null = null;
  let authPromise: Promise<void> | null = null;
  let previousGraph: DiagramGraph | null = null;

  const sendError = (code: string, message: string) => {
    sendFn?.({ type: "error", code, message });
  };

  return {
    async onOpen(_evt: unknown, ws: { send: (data: string) => void }) {
      sendFn = (m) => ws.send(JSON.stringify(m));

      authPromise = (async () => {
      if (!token || !sessionId) {
        sendError("AUTH_REQUIRED", "Missing token or sessionId");
        return;
      }

      try {
        const payload = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY!,
        });

        if (!payload?.sub) {
          sendError("AUTH_INVALID", "Invalid token");
          return;
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.clerkId, payload.sub))
          .limit(1);

        if (!user) {
          sendError("USER_NOT_FOUND", "User not found");
          return;
        }

        const [session] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, sessionId))
          .limit(1);

        if (!session || session.userId !== user.id) {
          sendError("SESSION_NOT_FOUND", "Session not found or access denied");
          return;
        }

        boundSessionId = sessionId;
      } catch (err) {
        console.error("WS auth error:", err);
        sendError("AUTH_ERROR", err instanceof Error ? err.message : "Authentication failed");
      }
    })();

      await authPromise;
    },

    async onMessage(evt: MessageEvent, ws: { send: (data: string) => void }) {
      await authPromise;
      const sid = boundSessionId;
      if (!sid || !sendFn) return;

      const sendToClient: SendFn = (m) => ws.send(JSON.stringify(m));

      try {
        const msg = JSON.parse(evt.data as string) as ClientMessage;

        switch (msg.type) {
          case "ping":
            sendToClient({ type: "pong" });
            break;
          case "chat.send":
            await handleChatSend(sid, msg.content, sendToClient);
            break;
          case "voice.audio":
            await handleVoiceAudio(sid, msg.audioBase64, sendToClient);
            break;
          case "voice.transcript":
            await handleVoiceTranscript(sid, msg.content, sendToClient);
            break;
          case "voice.transcript_check":
            await handleVoiceTranscriptCheck(sid, msg.content, sendToClient);
            break;
          case "diagram.update":
            handleDiagramUpdate(
              sid,
              msg.graph,
              previousGraph,
              sendToClient
            ).then((g) => {
              previousGraph = g;
            }).catch((err) => {
              console.error("Diagram update error:", err);
            });
            break;
          case "session.end":
            // TODO: end session
            break;
          case "session.request_evaluation":
            // TODO: trigger evaluation
            break;
          default:
            break;
        }
      } catch {
        sendError("INVALID_MESSAGE", "Invalid message format");
      }
    },

    onClose() {
      boundSessionId = null;
      previousGraph = null;
    },
  };
}
