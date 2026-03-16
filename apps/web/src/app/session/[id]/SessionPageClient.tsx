"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { SessionTimer } from "@/components/session/SessionTimer";
import { SessionLayout } from "@/components/session/SessionLayout";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SessionWebSocketProvider } from "@/contexts/SessionWebSocketContext";

type Problem = {
  id: string;
  title: string;
  difficulty: string;
  timeLimit: number;
  statement: string;
};

export function SessionPageClient({
  sessionId,
  problem,
  status,
  currentPhase,
  startedAt,
  diagramDocument,
  notesDocument,
}: {
  sessionId: string;
  problem?: Problem;
  status: string;
  currentPhase: string;
  startedAt: string;
  diagramDocument: unknown;
  notesDocument: string;
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
          <SessionTimer
            timeLimitMinutes={problem?.timeLimit ?? 45}
            startedAt={startedAt}
            currentPhase={currentPhase as "clarification" | "high_level" | "deep_dive" | "wrap_up"}
          />
          <ThemeToggle />
        </div>
      </header>

      <SessionWebSocketProvider sessionId={sessionId} getToken={getFreshToken}>
        <SessionLayout
          sessionId={sessionId}
          problem={problem}
          currentPhase={currentPhase}
          diagramDocument={diagramDocument}
          notesDocument={notesDocument}
          onSaveDiagram={handleSaveDiagram}
          onSaveNotes={handleSaveNotes}
        />
      </SessionWebSocketProvider>
    </div>
  );
}
