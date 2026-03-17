import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { EvaluationPageClient } from "./EvaluationPageClient";
import { db } from "@/lib/db";
import { evaluations, sessions, users } from "@archmock/db";
import { eq, and } from "drizzle-orm";

export default async function EvaluationPage({
  params,
}: {
  params: Promise<{ id: string; evaluationId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id: sessionId, evaluationId } = await params;

  const [dbUser] = await db.select().from(users).where(eq(users.clerkId, userId));
  if (!dbUser) redirect("/sign-in");

  const [evaluation] = await db
    .select()
    .from(evaluations)
    .where(eq(evaluations.id, evaluationId))
    .limit(1);

  if (!evaluation || evaluation.sessionId !== sessionId) notFound();

  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, dbUser.id)));

  if (!session) notFound();

  const dimensions = evaluation.dimensions as Record<
    string,
    { score: number; rationale: string; examples: string[] }
  > | null;
  const strengths = evaluation.strengths as string[] | null;
  const improvements = evaluation.improvements as string[] | null;
  const detailed = evaluation.detailed as {
    diagramFeedback?: string;
    missedConsiderations?: string[];
    suggestedReadings?: string[];
  } | null;

  const scoreToLabel = (s: number) =>
    s === 1 ? "No Hire" : s === 2 ? "Lean No" : s === 3 ? "Lean Yes" : "Strong Yes";

  const data = {
    id: evaluation.id,
    sessionId: evaluation.sessionId,
    overall: {
      score: evaluation.overallScore ?? 0,
      label: scoreToLabel(evaluation.overallScore ?? 0),
      summary: evaluation.summary ?? "",
    },
    dimensions: dimensions ?? {},
    strengths: strengths ?? [],
    areasForImprovement: improvements ?? [],
    detailedFeedback: {
      diagramFeedback: detailed?.diagramFeedback ?? "",
      missedConsiderations: detailed?.missedConsiderations ?? [],
      suggestedReadings: detailed?.suggestedReadings ?? [],
    },
  };

  return <EvaluationPageClient evaluation={data} sessionId={sessionId} />;
}
