import type { DiagramGraph } from "./diagram";

export interface SDProblem {
  id: string;
  title: string;
  difficulty: "junior" | "mid" | "senior" | "staff";
  category: string[];
  companies: string[];
  timeLimit: number;

  statement: string;
  clarifications: {
    question: string;
    answer: string;
    keywords: string[];
  }[];

  evaluationGuide: {
    expectedComponents: string[];
    scalingConcerns: string[];
    commonMistakes: string[];
    deepDiveTopics: string[];
    followUpConstraints: string[];
    exampleGoodQuestions: string[];
  };

  referenceDesign?: DiagramGraph;
}
