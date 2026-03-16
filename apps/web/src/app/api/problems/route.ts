import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { problems } from "@archmock/db";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const list = await db
      .select({
        id: problems.id,
        title: problems.title,
        difficulty: problems.difficulty,
        category: problems.category,
        companies: problems.companies,
        timeLimit: problems.timeLimit,
      })
      .from(problems)
      .where(eq(problems.isPublished, true))
      .orderBy(problems.title);

    return NextResponse.json(list);
  } catch (err) {
    console.error("Problems fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch problems" },
      { status: 500 }
    );
  }
}
