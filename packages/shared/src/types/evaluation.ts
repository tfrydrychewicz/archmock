export interface DimensionScore {
  score: number;
  rationale: string;
  examples: string[];
}

export interface Evaluation {
  overall: {
    score: number;
    label: "No Hire" | "Lean No" | "Lean Yes" | "Strong Yes";
    summary: string;
  };
  dimensions: {
    requirementsGathering: DimensionScore;
    highLevelDesign: DimensionScore;
    componentDesign: DimensionScore;
    scalability: DimensionScore;
    tradeoffs: DimensionScore;
    communication: DimensionScore;
    technicalDepth: DimensionScore;
  };
  strengths: string[];
  areasForImprovement: string[];
  detailedFeedback: {
    diagramFeedback: string;
    missedConsiderations: string[];
    suggestedReadings: string[];
  };
}
