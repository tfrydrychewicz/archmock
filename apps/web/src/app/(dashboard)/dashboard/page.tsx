"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

type Problem = {
  id: string;
  title: string;
  difficulty: string;
  category: string[];
  companies: string[];
  timeLimit: number;
};

const DIFFICULTY_LABELS: Record<string, string> = {
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  staff: "Staff",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  junior: "bg-green-500/20 text-green-600 border-green-500/50",
  mid: "bg-amber-500/20 text-amber-600 border-amber-500/50",
  senior: "bg-orange-500/20 text-orange-600 border-orange-500/50",
  staff: "bg-red-500/20 text-red-600 border-red-500/50",
};

export default function DashboardPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/problems")
      .then((r) => r.json())
      .then((data) => {
        setProblems(Array.isArray(data) ? data : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleStartSession = async (problemId: string) => {
    setCreating(problemId);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create session");
      window.location.href = `/session/${data.id}`;
    } catch (err) {
      console.error(err);
      setCreating(null);
    }
  };

  const filtered =
    filter === "all"
      ? problems
      : problems.filter((p) =>
          p.difficulty === filter || p.category?.includes(filter)
        );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Practice System Design</h2>
        <UserButton afterSignOutUrl="/" />
      </div>
      <p className="text-muted-foreground mb-6">
        Select a problem to start an interview session. You&apos;ll have a
        whiteboard and chat panel.
      </p>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          All
        </button>
        {["junior", "mid", "senior", "staff"].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setFilter(d)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === d ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
            }`}
          >
            {DIFFICULTY_LABELS[d] ?? d}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 rounded-lg border bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No problems found. Run <code className="bg-muted px-1 rounded">pnpm db:seed</code> to load problems.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold">{p.title}</h3>
                <span
                  className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${
                    DIFFICULTY_COLORS[p.difficulty] ?? "bg-muted"
                  }`}
                >
                  {DIFFICULTY_LABELS[p.difficulty] ?? p.difficulty}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {p.category?.slice(0, 3).map((c) => (
                  <span
                    key={c}
                    className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {c}
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {p.timeLimit} min
              </p>
              <button
                type="button"
                onClick={() => handleStartSession(p.id)}
                disabled={creating !== null}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {creating === p.id ? "Starting..." : "Start Session"}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/whiteboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Try Whiteboard (no session) →
        </Link>
      </div>
    </div>
  );
}
