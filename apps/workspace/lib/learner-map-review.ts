import type { LearningMapView, MasteryState, ReviewCandidate } from "./types";

export interface LearnerMapSummary {
  frontier: string[];
  stable: string[];
  developing: string[];
  blockers: string[];
  nextDirections: string[];
}

function labelsForState(map: LearningMapView, states: MasteryState[]): string[] {
  return map.nodes
    .filter((node) => states.includes(node.state))
    .map((node) => node.label);
}

export function deriveLearnerMapSummary(map: LearningMapView): LearnerMapSummary {
  const nodeById = new Map(map.nodes.map((node) => [node.id, node]));
  const frontier = map.frontier
    .map((id) => nodeById.get(id)?.label)
    .filter((value): value is string => Boolean(value));

  const blockers = map.edges
    .filter((edge) => edge.relation === "prerequisite" && map.frontier.includes(edge.target))
    .map((edge) => nodeById.get(edge.source))
    .filter((node): node is NonNullable<typeof node> => Boolean(node))
    .filter((node) => node.state === "unknown" || node.state === "exposed" || node.state === "developing")
    .map((node) => node.label);

  const nextDirections = map.edges
    .filter((edge) => map.frontier.includes(edge.source))
    .map((edge) => nodeById.get(edge.target))
    .filter((node): node is NonNullable<typeof node> => Boolean(node))
    .filter((node) => node.state !== "stable" && node.state !== "transferable")
    .map((node) => node.label);

  return {
    frontier,
    stable: labelsForState(map, ["stable", "transferable"]),
    developing: labelsForState(map, ["exposed", "developing"]),
    blockers: [...new Set(blockers)],
    nextDirections: [...new Set(nextDirections)],
  };
}

export interface ReviewSuggestion {
  id: string;
  concept: string;
  message: string;
  retrievalPrompt: string;
  reason: string;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "review";
}

export function deriveReviewSuggestions(
  candidates: ReviewCandidate[],
  map: LearningMapView,
): ReviewSuggestion[] {
  const stateByLabel = new Map(map.nodes.map((node) => [node.label.toLowerCase(), node.state]));
  return candidates.slice(0, 5).map((candidate) => {
    const state = stateByLabel.get(candidate.concept.toLowerCase());
    const statePhrase = state === "stable" || state === "transferable"
      ? "This looked solid before; a short retrieval check can test whether it still comes back independently."
      : "This is still worth strengthening; a short retrieval attempt can expose what needs repair.";
    return {
      id: `review-${slug(candidate.concept)}`,
      concept: candidate.concept,
      message: statePhrase,
      retrievalPrompt: `Without opening notes, explain ${candidate.concept} in your own words, then give one example or use case. If you get stuck, identify exactly where.`,
      reason: candidate.reason,
    };
  });
}
