import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sessions, users, messages, observations, diagramSnapshots } from "@archmock/db";
import { eq, and } from "drizzle-orm";

export async function POST(
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

    await db.delete(messages).where(eq(messages.sessionId, id));
    await db.delete(observations).where(eq(observations.sessionId, id));
    await db.delete(diagramSnapshots).where(eq(diagramSnapshots.sessionId, id));

    const now = new Date();
    await db
      .update(sessions)
      .set({
        diagramDocument: null,
        diagramGraph: null,
        notesDocument: "",
        startedAt: now,
        currentPhase: "clarification",
      })
      .where(and(eq(sessions.id, id), eq(sessions.userId, dbUser.id)));

    return NextResponse.json({ ok: true, startedAt: now.toISOString() });
  } catch (err) {
    console.error("Session restart failed:", err);
    return NextResponse.json(
      { error: "Failed to restart session" },
      { status: 500 }
    );
  }
}
