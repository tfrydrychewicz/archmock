"use client";

import { useEffect, useState } from "react";
import { PHASE_LABELS } from "@archmock/shared";
import type { Phase } from "@archmock/shared";

export function SessionTimer({
  timeLimitMinutes,
  startedAt,
  currentPhase,
}: {
  timeLimitMinutes: number;
  startedAt: string;
  currentPhase: Phase;
}) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => {
      setElapsedSec(Math.floor((Date.now() - start) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const totalSec = timeLimitMinutes * 60;
  const remainingSec = Math.max(0, totalSec - elapsedSec);
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;

  return (
    <div className="flex items-center gap-4">
      <div className="rounded-md border bg-muted/50 px-3 py-1.5 font-mono text-sm">
        {mins}:{secs.toString().padStart(2, "0")}
      </div>
      <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
        {PHASE_LABELS[currentPhase] ?? currentPhase}
      </span>
    </div>
  );
}
