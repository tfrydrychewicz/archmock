"use client";

import Link from "next/link";
import { SessionWhiteboard } from "@/components/session/SessionWhiteboard";
import { SessionTimer } from "@/components/session/SessionTimer";

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
}: {
  sessionId: string;
  problem?: Problem;
  status: string;
  currentPhase: string;
  startedAt: string;
  diagramDocument: unknown;
}) {
  const handleSaveDiagram = async (snapshot: unknown) => {
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagramDocument: snapshot }),
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
        <SessionTimer
          timeLimitMinutes={problem?.timeLimit ?? 45}
          startedAt={startedAt}
          currentPhase={currentPhase as "clarification" | "high_level" | "deep_dive" | "wrap_up"}
        />
      </header>

      <div className="flex flex-1 min-h-0">
        <div className="w-[70%] border-r">
          <SessionWhiteboard
            sessionId={sessionId}
            initialSnapshot={diagramDocument}
            onSave={handleSaveDiagram}
          />
        </div>
        <div className="w-[30%] flex flex-col bg-muted/20">
          <div className="border-b px-4 py-2">
            <h2 className="text-sm font-medium">Chat</h2>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {problem?.statement && (
              <div className="mb-4 rounded-lg border bg-card p-4 text-sm">
                <h3 className="font-medium mb-2">Problem Statement</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {problem.statement}
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Chat with AI interviewer coming in Sprint 3.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
