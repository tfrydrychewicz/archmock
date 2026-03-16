import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { SessionPageClient } from "./SessionPageClient";
import { db } from "@/lib/db";
import { sessions, users, problems } from "@archmock/db";
import { eq, and } from "drizzle-orm";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;

  const [dbUser] = await db.select().from(users).where(eq(users.clerkId, userId));
  if (!dbUser) redirect("/sign-in");

  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, dbUser.id)));

  if (!session) notFound();

  const [problemRow] = await db
    .select({
      id: problems.id,
      title: problems.title,
      difficulty: problems.difficulty,
      timeLimit: problems.timeLimit,
      statement: problems.statement,
    })
    .from(problems)
    .where(eq(problems.id, session.problemId));

  const problem = problemRow
    ? {
        id: problemRow.id,
        title: problemRow.title,
        difficulty: problemRow.difficulty,
        timeLimit: problemRow.timeLimit ?? 45,
        statement: problemRow.statement ?? "",
      }
    : undefined;

  return (
    <SessionPageClient
      sessionId={id}
      problem={problem}
      status={session.status ?? "active"}
      currentPhase={(session.currentPhase ?? "clarification") as "clarification" | "high_level" | "deep_dive" | "wrap_up"}
      startedAt={session.startedAt?.toISOString() ?? new Date().toISOString()}
      diagramDocument={session.diagramDocument ?? undefined}
    />
  );
}
