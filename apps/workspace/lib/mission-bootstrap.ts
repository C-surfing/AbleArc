export interface MissionCompletionCriterion {
  id: string;
  capability: string;
  kind: "feynman" | "application";
  required: boolean;
  minimum_level: "explanation" | "application";
  max_scaffolding: "light";
  minimum_context: "same" | "varied";
  minimum_delay: "immediate";
  minimum_independence: "independent";
  minimum_evidence: 1;
  artifact_forms: string[];
  evidence_ids: string[];
}

function boundedCapability(prefix: string, goal: string): string {
  const normalized = goal.replace(/\s+/g, " ").trim();
  const maximumGoalLength = Math.max(1, 500 - prefix.length - 2);
  const shortened = normalized.length <= maximumGoalLength
    ? normalized
    : `${normalized.slice(0, Math.max(1, maximumGoalLength - 1)).trimEnd()}…`;
  return `${prefix}: ${shortened}`;
}

/**
 * Seed a conservative completion contract for Web-created Missions.
 *
 * These criteria define what success must eventually look like; they do not
 * claim that the learner has satisfied either criterion. Evidence links start
 * empty and the normal Completion Gate remains the only completion authority.
 */
export function initialMissionCompletionCriteria(goal: string): MissionCompletionCriterion[] {
  return [
    {
      id: "mission-reconstruction",
      capability: boundedCapability(
        "Reconstruct the core mechanism needed for this Mission in your own words",
        goal,
      ),
      kind: "feynman",
      required: true,
      minimum_level: "explanation",
      max_scaffolding: "light",
      minimum_context: "same",
      minimum_delay: "immediate",
      minimum_independence: "independent",
      minimum_evidence: 1,
      artifact_forms: [],
      evidence_ids: [],
    },
    {
      id: "mission-performance",
      capability: boundedCapability(
        "Apply the Mission capability independently in a representative case",
        goal,
      ),
      kind: "application",
      required: true,
      minimum_level: "application",
      max_scaffolding: "light",
      minimum_context: "varied",
      minimum_delay: "immediate",
      minimum_independence: "independent",
      minimum_evidence: 1,
      artifact_forms: [],
      evidence_ids: [],
    },
  ];
}
