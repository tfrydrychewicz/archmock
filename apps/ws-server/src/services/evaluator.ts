import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { SDProblem, DiagramGraph, Evaluation } from "@archmock/shared";

export type EvaluationInput = {
  problem: SDProblem;
  finalDiagram: DiagramGraph;
  diagramHistory: { graph: DiagramGraph; timestamp: string }[];
  conversationTranscript: string;
  notesDocument: string;
  observations: { observation: string; category: string; actionTaken: string }[];
  sessionDurationMin: number;
};

function extractJson<T>(text: string): T {
  let s = text.trim();
  const match = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) s = match[1].trim();
  return JSON.parse(s) as T;
}

export function buildEvaluationPrompt(input: EvaluationInput): string {
  const {
    problem,
    finalDiagram,
    diagramHistory,
    conversationTranscript,
    notesDocument,
    observations,
    sessionDurationMin,
  } = input;

  const eg = problem.evaluationGuide;
  const expectedComponents = eg?.expectedComponents ?? [];
  const commonMistakes = eg?.commonMistakes ?? [];

  const notesSection = notesDocument.trim()
    ? `

## Candidate's Notes / Requirements (from their left-side notes pane)
\`\`\`
${notesDocument.trim()}
\`\`\`
`
    : "";

  return `You are evaluating a system design interview session.

## Problem
Title: ${problem.title}
Statement: ${problem.statement}
Difficulty: ${problem.difficulty}
Time limit: ${problem.timeLimit ?? 45} min (actual: ${sessionDurationMin} min)

## Expected Solution Components
${expectedComponents.map((c) => `- ${c}`).join("\n")}

## Common Mistakes
${commonMistakes.map((m) => `- ${m}`).join("\n")}
${notesSection}
## Final Diagram
\`\`\`json
${JSON.stringify(finalDiagram, null, 2)}
\`\`\`

## Diagram Evolution (${diagramHistory.length} snapshots)
${diagramHistory
  .map(
    (s, i) =>
      `Snapshot ${i + 1} (${s.timestamp}): ${s.graph.nodes.length} nodes, ${s.graph.edges.length} edges`
  )
  .join("\n")}

## Full Conversation Transcript
${conversationTranscript}

## AI Observations During Session
${observations
  .map((o) => `[${o.category}] ${o.observation} → ${o.actionTaken}`)
  .join("\n")}

## Evaluation Instructions

Score on a 1-4 scale:
1 = No Hire (fundamental gaps, unable to make progress)
2 = Lean No (some understanding but significant weaknesses)
3 = Lean Yes (solid overall with minor gaps)
4 = Strong Yes (excellent across all dimensions)

Respond in JSON matching this exact schema:
{
  "overall": {
    "score": number,
    "label": "No Hire" | "Lean No" | "Lean Yes" | "Strong Yes",
    "summary": "2-3 sentence overall assessment"
  },
  "dimensions": {
    "requirementsGathering": {
      "score": number,
      "rationale": "string",
      "examples": ["specific moments from the session"]
    },
    "highLevelDesign": { "score": number, "rationale": "string", "examples": [] },
    "componentDesign": { "score": number, "rationale": "string", "examples": [] },
    "scalability": { "score": number, "rationale": "string", "examples": [] },
    "tradeoffs": { "score": number, "rationale": "string", "examples": [] },
    "communication": { "score": number, "rationale": "string", "examples": [] },
    "technicalDepth": { "score": number, "rationale": "string", "examples": [] }
  },
  "strengths": ["string"],
  "areasForImprovement": ["string"],
  "detailedFeedback": {
    "diagramFeedback": "specific comments on the final diagram",
    "missedConsiderations": ["things they didn't address"],
    "suggestedReadings": ["resources to study"]
  }
}

Be fair but rigorous. Reference specific moments from the transcript and specific
components from the diagram. Don't be generic.`;
}

async function runEvaluationWithClaude(prompt: string): Promise<Evaluation> {
  const anthropic = new Anthropic();
  const model = process.env.AI_MODEL_EVALUATION ?? "claude-sonnet-4-6";

  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0]?.type === "text"
      ? (response.content[0] as { text: string }).text
      : "";
  return extractJson<Evaluation>(text);
}

async function runEvaluationWithOpenAI(prompt: string): Promise<Evaluation> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o";

  const completion = await openai.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 4096,
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("Empty evaluation response");
  return extractJson<Evaluation>(text);
}

export async function runEvaluation(input: EvaluationInput): Promise<Evaluation> {
  const prompt = buildEvaluationPrompt(input);
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

  if (hasAnthropicKey) {
    try {
      return await runEvaluationWithClaude(prompt);
    } catch (err) {
      console.warn("Claude evaluation failed:", err);
      if (hasOpenAIKey) {
        return await runEvaluationWithOpenAI(prompt);
      }
      throw err;
    }
  }

  if (hasOpenAIKey) {
    return await runEvaluationWithOpenAI(prompt);
  }

  throw new Error(
    "No AI provider available for evaluation. Set ANTHROPIC_API_KEY or OPENAI_API_KEY."
  );
}
