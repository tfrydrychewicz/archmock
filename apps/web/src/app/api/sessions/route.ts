import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sessions, users, problems } from "@archmock/db";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { problemId } = body as { problemId?: string };
    if (!problemId || typeof problemId !== "string") {
      return NextResponse.json(
        { error: "problemId is required" },
        { status: 400 }
      );
    }

    const [dbUser] = await db.select().from(users).where(eq(users.clerkId, userId));
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [problem] = await db.select().from(problems).where(eq(problems.id, problemId));
    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    const [session] = await db
      .insert(sessions)
      .values({
        userId: dbUser.id,
        problemId: problem.id,
        difficulty: problem.difficulty,
      })
      .returning();

    return NextResponse.json({ id: session!.id });
  } catch (err) {
    console.error("Session creation failed:", err);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
