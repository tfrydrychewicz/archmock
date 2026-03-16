import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { load } from "js-yaml";
import { problems } from "./schema";
import type { SDProblem } from "@archmock/shared";

// problems/ is at monorepo root; seed runs from packages/db
const PROBLEMS_DIR = join(process.cwd(), "..", "..", "problems");

async function loadProblems(): Promise<SDProblem[]> {
  try {
    const files = await readdir(PROBLEMS_DIR);
    const yamlFiles = files.filter(
      (f: string) => f.endsWith(".yaml") || f.endsWith(".yml")
    );
    const loaded: SDProblem[] = [];

    const defaultEvalGuide = {
      expectedComponents: [] as string[],
      scalingConcerns: [] as string[],
      commonMistakes: [] as string[],
      deepDiveTopics: [] as string[],
      followUpConstraints: [] as string[],
      exampleGoodQuestions: [] as string[],
    };

    for (const file of yamlFiles) {
      const content = await readFile(join(PROBLEMS_DIR, file), "utf-8");
      const data = load(content) as Record<string, unknown>;
      if (data?.id && data?.title) {
        const evalGuide = data.evaluationGuide as Record<string, unknown> | undefined;
        loaded.push({
          id: String(data.id),
          title: String(data.title),
          difficulty: (data.difficulty as SDProblem["difficulty"]) ?? "mid",
          category: Array.isArray(data.category) ? data.category as string[] : [],
          companies: Array.isArray(data.companies) ? data.companies as string[] : [],
          timeLimit: typeof data.timeLimit === "number" ? data.timeLimit : 45,
          statement: String(data.statement ?? ""),
          clarifications: Array.isArray(data.clarifications)
            ? (data.clarifications as SDProblem["clarifications"])
            : [],
          evaluationGuide: evalGuide
            ? {
                expectedComponents: Array.isArray(evalGuide.expectedComponents)
                  ? (evalGuide.expectedComponents as string[])
                  : defaultEvalGuide.expectedComponents,
                scalingConcerns: Array.isArray(evalGuide.scalingConcerns)
                  ? (evalGuide.scalingConcerns as string[])
                  : defaultEvalGuide.scalingConcerns,
                commonMistakes: Array.isArray(evalGuide.commonMistakes)
                  ? (evalGuide.commonMistakes as string[])
                  : defaultEvalGuide.commonMistakes,
                deepDiveTopics: Array.isArray(evalGuide.deepDiveTopics)
                  ? (evalGuide.deepDiveTopics as string[])
                  : defaultEvalGuide.deepDiveTopics,
                followUpConstraints: Array.isArray(evalGuide.followUpConstraints)
                  ? (evalGuide.followUpConstraints as string[])
                  : defaultEvalGuide.followUpConstraints,
                exampleGoodQuestions: Array.isArray(evalGuide.exampleGoodQuestions)
                  ? (evalGuide.exampleGoodQuestions as string[])
                  : defaultEvalGuide.exampleGoodQuestions,
              }
            : defaultEvalGuide,
          referenceDesign: data.referenceDesign as SDProblem["referenceDesign"],
        });
      }
    }
    return loaded;
  } catch (err) {
    console.warn("Could not load problems from", PROBLEMS_DIR, err);
    return [];
  }
}

async function seed() {
  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://archmock:archmock_dev@localhost:5432/archmock";

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  const problemsData = await loadProblems();
  if (problemsData.length === 0) {
    console.log("No problem files found in problems/. Skipping seed.");
    await client.end();
    return;
  }

  for (const p of problemsData) {
    await db
      .insert(problems)
      .values({
        id: p.id,
        title: p.title,
        difficulty: p.difficulty,
        category: p.category,
        companies: p.companies,
        timeLimit: p.timeLimit,
        statement: p.statement,
        clarifications: p.clarifications as object[],
        evaluationGuide: p.evaluationGuide as object,
        referenceDesign: p.referenceDesign as object | null,
        isPublished: true,
      })
      .onConflictDoUpdate({
        target: problems.id,
        set: {
          title: p.title,
          difficulty: p.difficulty,
          category: p.category,
          companies: p.companies,
          timeLimit: p.timeLimit,
          statement: p.statement,
          clarifications: p.clarifications as object[],
          evaluationGuide: p.evaluationGuide as object,
          referenceDesign: p.referenceDesign as object | null,
        },
      });
    console.log("  Seeded problem:", p.id);
  }

  console.log(`Seeded ${problemsData.length} problem(s).`);
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
