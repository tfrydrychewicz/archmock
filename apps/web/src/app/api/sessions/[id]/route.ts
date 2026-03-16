import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sessions, users, problems } from "@archmock/db";
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

    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, id), eq(sessions.userId, dbUser.id)));

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const [problem] = await db
      .select()
      .from(problems)
      .where(eq(problems.id, session.problemId));

    return NextResponse.json({
      id: session.id,
      problemId: session.problemId,
      problem: problem
        ? {
            id: problem.id,
            title: problem.title,
            difficulty: problem.difficulty,
            timeLimit: problem.timeLimit,
            statement: problem.statement,
          }
        : null,
      status: session.status,
      currentPhase: session.currentPhase,
      startedAt: session.startedAt,
      diagramDocument: session.diagramDocument,
    });
  } catch (err) {
    console.error("Session fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
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

    const body = await req.json();
    const { diagramDocument, currentPhase } = body as {
      diagramDocument?: unknown;
      currentPhase?: string;
    };

    const updateData: Record<string, unknown> = {};
    if (diagramDocument !== undefined) updateData.diagramDocument = diagramDocument;
    if (currentPhase !== undefined) updateData.currentPhase = currentPhase;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const [updated] = await db
      .update(sessions)
      .set(updateData as Record<string, string | object | null>)
      .where(and(eq(sessions.id, id), eq(sessions.userId, dbUser.id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Session update failed:", err);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}
