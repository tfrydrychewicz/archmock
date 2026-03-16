import type { DiagramGraph } from "./diagram";
import type { Phase } from "./session";

export type ClientMessage =
  | { type: "chat.send"; content: string }
  | { type: "diagram.update"; graph: DiagramGraph }
  | { type: "session.end" }
  | { type: "session.request_evaluation" }
  | { type: "ping" };

export type ServerMessage =
  | { type: "chat.stream"; delta: string; messageId: string }
  | { type: "chat.done"; messageId: string; content: string }
  | { type: "observation.interjection"; content: string; messageId: string }
  | { type: "session.phase_change"; phase: Phase; message: string }
  | { type: "session.evaluation_ready"; evaluationId: string }
  | { type: "session.evaluation_progress"; step: string }
  | { type: "error"; code: string; message: string }
  | { type: "pong" };
