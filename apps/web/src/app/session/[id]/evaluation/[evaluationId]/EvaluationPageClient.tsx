"use client";

import { useCallback } from "react";
import Link from "next/link";
import { jsPDF } from "jspdf";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const DIMENSION_LABELS: Record<string, string> = {
  requirementsGathering: "Requirements",
  highLevelDesign: "High-Level Design",
  componentDesign: "Component Design",
  scalability: "Scalability",
  tradeoffs: "Trade-offs",
  communication: "Communication",
  technicalDepth: "Technical Depth",
};

const SCORE_COLORS: Record<number, string> = {
  1: "text-red-600 dark:text-red-400",
  2: "text-amber-600 dark:text-amber-400",
  3: "text-lime-600 dark:text-lime-400",
  4: "text-emerald-600 dark:text-emerald-400",
};

type EvaluationData = {
  id: string;
  sessionId: string;
  overall: { score: number; label: string; summary: string };
  dimensions: Record<string, { score: number; rationale: string; examples: string[] }>;
  strengths: string[];
  areasForImprovement: string[];
  detailedFeedback: {
    diagramFeedback: string;
    missedConsiderations: string[];
    suggestedReadings: string[];
  };
};

export function EvaluationPageClient({
  evaluation,
  sessionId,
}: {
  evaluation: EvaluationData;
  sessionId: string;
}) {
  const handleExportPdf = useCallback(() => {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.text("Session Evaluation", 20, y);
    y += 15;

    doc.setFontSize(12);
    doc.text(`Overall: ${evaluation.overall.score}/4 - ${evaluation.overall.label}`, 20, y);
    y += 8;

    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(evaluation.overall.summary, 170);
    doc.text(summaryLines, 20, y);
    y += summaryLines.length * 6 + 10;

    doc.setFontSize(14);
    doc.text("Dimension Scores", 20, y);
    y += 10;

    doc.setFontSize(10);
    for (const [key, d] of Object.entries(evaluation.dimensions)) {
      const label = DIMENSION_LABELS[key] ?? key;
      doc.text(`${label}: ${d.score}/4`, 20, y);
      y += 6;
    }
    y += 10;

    doc.setFontSize(14);
    doc.text("Strengths", 20, y);
    y += 8;

    doc.setFontSize(10);
    for (const s of evaluation.strengths) {
      const lines = doc.splitTextToSize(`• ${s}`, 170);
      doc.text(lines, 20, y);
      y += lines.length * 6;
    }
    y += 10;

    doc.setFontSize(14);
    doc.text("Areas for Improvement", 20, y);
    y += 8;

    doc.setFontSize(10);
    for (const s of evaluation.areasForImprovement) {
      const lines = doc.splitTextToSize(`• ${s}`, 170);
      doc.text(lines, 20, y);
      y += lines.length * 6;
    }

    if (evaluation.detailedFeedback?.diagramFeedback) {
      y += 10;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.text("Diagram Feedback", 20, y);
      y += 8;
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(evaluation.detailedFeedback.diagramFeedback, 170);
      doc.text(lines, 20, y);
      y += lines.length * 6;
    }

    doc.save(`evaluation-${sessionId}.pdf`);
  }, [evaluation, sessionId]);

  const radarData = Object.entries(evaluation.dimensions).map(([key, d]) => ({
    dimension: DIMENSION_LABELS[key] ?? key,
    score: d.score,
    fullMark: 4,
  }));

  const scoreColor = SCORE_COLORS[evaluation.overall.score] ?? "text-muted-foreground";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Dashboard
          </Link>
          <h1 className="font-semibold">Session Evaluation</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Overall Result</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div
              className={`text-4xl font-bold ${scoreColor}`}
              title={`Score: ${evaluation.overall.score}/4`}
            >
              {evaluation.overall.score}/4
            </div>
            <div className="rounded-md border px-3 py-1.5 font-medium">
              {evaluation.overall.label}
            </div>
          </div>
          <p className="mt-4 text-muted-foreground">{evaluation.overall.summary}</p>
        </div>

        {radarData.length > 0 && (
          <div className="mb-8 rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Dimension Breakdown</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis
                    dataKey="dimension"
                    tick={{ fontSize: 11 }}
                  />
                  <PolarRadiusAxis angle={90} domain={[0, 4]} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                    strokeWidth={2}
                  />
                  <Tooltip />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              Strengths
            </h2>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
              {evaluation.strengths.length > 0 ? (
                evaluation.strengths.map((s, i) => (
                  <li key={i} className="text-foreground">
                    {s}
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground">No strengths recorded</li>
              )}
            </ul>
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-amber-600 dark:text-amber-400">
              Areas for Improvement
            </h2>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
              {evaluation.areasForImprovement.length > 0 ? (
                evaluation.areasForImprovement.map((s, i) => (
                  <li key={i} className="text-foreground">
                    {s}
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground">No improvements recorded</li>
              )}
            </ul>
          </div>
        </div>

        <div className="mb-8 space-y-6">
          {Object.entries(evaluation.dimensions).map(([key, d]) => (
            <div
              key={key}
              className="rounded-lg border bg-card p-6 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">
                  {DIMENSION_LABELS[key] ?? key}
                </h3>
                <span className="rounded bg-muted px-2 py-0.5 text-sm font-medium">
                  {d.score}/4
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{d.rationale}</p>
              {d.examples && d.examples.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                  {d.examples.map((ex, i) => (
                    <li key={i}>{ex}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {evaluation.detailedFeedback && (
          <div className="mb-8 space-y-6">
            {evaluation.detailedFeedback.diagramFeedback && (
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold">Diagram Feedback</h2>
                <p className="text-sm text-muted-foreground">
                  {evaluation.detailedFeedback.diagramFeedback}
                </p>
              </div>
            )}
            {evaluation.detailedFeedback.missedConsiderations?.length > 0 && (
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold">Missed Considerations</h2>
                <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
                  {evaluation.detailedFeedback.missedConsiderations.map((m, i) => (
                    <li key={i} className="text-foreground">
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {evaluation.detailedFeedback.suggestedReadings?.length > 0 && (
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold">Suggested Readings</h2>
                <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
                  {evaluation.detailedFeedback.suggestedReadings.map((r, i) => (
                    <li key={i} className="text-foreground">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={handleExportPdf}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Export PDF
          </button>
          <Link
            href={`/session/${sessionId}`}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            View Session
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
