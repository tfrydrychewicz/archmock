"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { SessionTimer } from "@/components/session/SessionTimer";
import { SessionLayout } from "@/components/session/SessionLayout";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SessionWebSocketProvider, useSessionWebSocketContext } from "@/contexts/SessionWebSocketContext";
import type { DiagramGraph } from "@archmock/shared";

type Problem = {
  id: string;
  title: string;
  difficulty: string;
  timeLimit: number;
  statement: string;
};

function SessionContent({
  sessionId,
  problem,
  status,
  currentPhase,
  startedAt,
  diagramDocument,
  notesDocument,
  evaluationId,
  onSaveDiagram,
  onSaveNotes,
}: {
  sessionId: string;
  problem?: Problem;
  status: string;
  currentPhase: string;
  startedAt: string;
  diagramDocument: unknown;
  notesDocument: string;
  evaluationId?: string;
  onSaveDiagram: (snapshot: unknown) => Promise<void>;
  onSaveNotes: (notes: string) => Promise<void>;
}) {
  const router = useRouter();
  const { send, registerHandler } = useSessionWebSocketContext();
  const [isRestarting, setIsRestarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [evalProgress, setEvalProgress] = useState<string | null>(null);
  const latestGraphRef = useRef<DiagramGraph | null>(null);

  useEffect(() => {
    return registerHandler((msg) => {
      if (msg.type === "session.evaluation_ready") {
        setIsEnding(false);
        setEvalProgress(null);
        router.push(`/session/${sessionId}/evaluation/${msg.evaluationId}`);
      } else if (msg.type === "session.evaluation_progress") {
        setEvalProgress(msg.step);
      }
    });
  }, [registerHandler, router, sessionId]);

  const handleRestart = useCallback(async () => {
    if (isRestarting) return;
    if (!confirm("Restart this session? All messages, diagram, and notes will be cleared.")) return;
    setIsRestarting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/restart`, { method: "POST" });
      if (!res.ok) throw new Error("Restart failed");
      router.refresh();
    } catch (err) {
      console.error("Restart failed:", err);
      alert("Failed to restart session");
    } finally {
      setIsRestarting(false);
    }
  }, [sessionId, isRestarting, router]);

  const handleEndSession = useCallback(() => {
    if (isEnding || status === "completed") return;
    if (!confirm("End this session? You will receive an AI evaluation.")) return;
    setIsEnding(true);
    setEvalProgress("Ending session...");
    send({
      type: "session.end",
      diagram: latestGraphRef.current ?? undefined,
    });
  }, [send, isEnding, status]);

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Dashboard
          </Link>
          <h1 className="font-semibold">
            {problem?.title ?? "Session"}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {evalProgress && (
            <span className="text-sm text-muted-foreground">{evalProgress}</span>
          )}
          {status !== "completed" ? (
            <button
              type="button"
              onClick={handleEndSession}
              disabled={isEnding}
              className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              title="End session and get evaluation"
            >
              {isEnding ? "Ending…" : "End Session"}
            </button>
          ) : evaluationId ? (
            <Link
              href={`/session/${sessionId}/evaluation/${evaluationId}`}
              className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90"
            >
              View Evaluation
            </Link>
          ) : null}
          <button
            type="button"
            onClick={handleRestart}
            disabled={isRestarting}
            className="text-sm px-3 py-1.5 rounded border border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Restart session (clear messages, diagram, notes)"
          >
            {isRestarting ? "Restarting…" : "Restart Session"}
          </button>
          <SessionTimer
            timeLimitMinutes={problem?.timeLimit ?? 45}
            startedAt={startedAt}
            currentPhase={currentPhase as "clarification" | "high_level" | "deep_dive" | "wrap_up"}
          />
          <ThemeToggle />
        </div>
      </header>

      <SessionLayout
        key={startedAt}
        sessionId={sessionId}
        problem={problem}
        currentPhase={currentPhase}
        diagramDocument={diagramDocument}
        notesDocument={notesDocument}
        onSaveDiagram={onSaveDiagram}
        onSaveNotes={onSaveNotes}
        latestGraphRef={latestGraphRef}
        isSessionEnded={status === "completed"}
      />
    </div>
  );
}

export function SessionPageClient({
  sessionId,
  problem,
  status,
  currentPhase,
  startedAt,
  diagramDocument,
  notesDocument,
  evaluationId,
}: {
  sessionId: string;
  problem?: Problem;
  status: string;
  currentPhase: string;
  startedAt: string;
  diagramDocument: unknown;
  notesDocument: string;
  evaluationId?: string;
}) {
  const { getToken } = useAuth();
  const getFreshToken = useCallback(
    () => getToken({ skipCache: true }),
    [getToken]
  );

  const handleSaveDiagram = async (snapshot: unknown) => {
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagramDocument: snapshot }),
    });
  };

  const handleSaveNotes = async (notes: string) => {
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notesDocument: notes }),
    });
  };

  return (
    <SessionWebSocketProvider sessionId={sessionId} getToken={getFreshToken}>
      <SessionContent
        sessionId={sessionId}
        problem={problem}
        status={status}
        currentPhase={currentPhase}
        startedAt={startedAt}
        diagramDocument={diagramDocument}
        notesDocument={notesDocument}
        evaluationId={evaluationId}
        onSaveDiagram={handleSaveDiagram}
        onSaveNotes={handleSaveNotes}
      />
    </SessionWebSocketProvider>
  );
}
