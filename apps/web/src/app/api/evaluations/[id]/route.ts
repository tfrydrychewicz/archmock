import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { evaluations, sessions, users, problems } from "@archmock/db";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [dbUser] = await db.select().from(users).where(eq(users.clerkId, userId));
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [evaluation] = await db
      .select()
      .from(evaluations)
      .where(eq(evaluations.id, id))
      .limit(1);

    if (!evaluation) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }

    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, evaluation.sessionId),
          eq(sessions.userId, dbUser.id)
        )
      )
      .limit(1);

    if (!session) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }

    const [problem] = await db
      .select({ id: problems.id, title: problems.title })
      .from(problems)
      .where(eq(problems.id, session.problemId))
      .limit(1);

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

    return NextResponse.json({
      id: evaluation.id,
      sessionId: evaluation.sessionId,
      problemTitle: problem?.title ?? "Unknown",
      overall: {
        score: evaluation.overallScore ?? 0,
        label:
          evaluation.overallScore === 1
            ? "No Hire"
            : evaluation.overallScore === 2
              ? "Lean No"
              : evaluation.overallScore === 3
                ? "Lean Yes"
                : "Strong Yes",
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
      createdAt: evaluation.createdAt,
    });
  } catch (err) {
    console.error("Evaluation fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch evaluation" },
      { status: 500 }
    );
  }
}
