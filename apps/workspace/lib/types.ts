export type MasteryState =
  | "unknown"
  | "exposed"
  | "developing"
  | "stable"
  | "transferable";

export type EvidenceLevel =
  | "recognition"
  | "recall"
  | "explanation"
  | "application"
  | "transfer";

export interface RoadmapNode {
  id: string;
  label: string;
  state: MasteryState;
  dependsOn?: string;
  missionRelevance?: "core" | "supporting" | "optional";
  evidence?: string;
}

export interface EvidenceItem {
  task: string;
  level: EvidenceLevel;
  result: string;
  independence: string;
  implication: string;
}

export interface MisconceptionItem {
  belief: string;
  confidence: "low" | "medium" | "high";
  status: "active" | "testing" | "resolved";
  evidence?: string;
}

export interface ReviewCandidate {
  concept: string;
  reason: string;
  strength: "weak" | "medium" | "strong";
  form: string;
}

export interface SessionPoint {
  id: string;
  label: string;
  detail: string;
  kind: "frontier" | "evidence" | "repair" | "representation" | "transfer";
}

export interface DecisionTrace {
  id: string;
  target: string;
  move: string;
  rationale: string;
  learnerAction: string;
  uncertainty: "low" | "medium" | "high";
  representationKind: string;
  representationPurpose: string;
  artifactRef?: string;
  evidenceCount: number;
  expectedEvidence: string;
  falsificationSignal: string;
  hasLearnerResponse: boolean;
}

export interface FrequencyTreeArtifact {
  id: string;
  renderer: "frequency_tree_v1";
  title: string;
  conceptIds: string[];
  learningGoal: string;
  inferencePrompt: string;
  successEvidence: string;
  payload: {
    population: number;
    prevalence: number;
    sensitivity: number;
    falsePositiveRate: number;
    prevalenceMin: number;
    prevalenceMax: number;
    prevalenceStep: number;
    labels: {
      population: string;
      condition: string;
      complement: string;
      positive: string;
      falsePositive: string;
    };
  };
}

export type LearningArtifact = FrequencyTreeArtifact;

export interface StateDecisionTrace {
  id: string;
  concept: string;
  before: MasteryState;
  after: MasteryState;
  decision: "accepted" | "rejected";
  authority: string;
  reason: string;
  evidenceCount: number;
  policyOverridden: boolean;
}

export interface LearnerExchange {
  decisionId: string;
  observationId: string;
  response: string;
  status: "awaiting_assessment" | "assessed";
  feedback?: string;
  outcome?: "supports" | "contradicts" | "inconclusive";
  level?: EvidenceLevel;
  confidence?: "low" | "medium" | "high";
  supports: string[];
  contradicts: string[];
  nextDecisionId?: string;
}

export interface WorkspaceSnapshot {
  source: "local" | "demo";
  mission: string;
  learnerNote: string;
  frontier: string;
  frontierState: MasteryState;
  frontierReason: string;
  nextMove: string;
  expectedLearnerAction: string;
  nodes: RoadmapNode[];
  evidence: EvidenceItem[];
  misconceptions: MisconceptionItem[];
  reviewCandidates: ReviewCandidate[];
  sessions: SessionPoint[];
  activeArc?: string;
  runtimeRevision?: number;
  decision?: DecisionTrace;
  artifact?: LearningArtifact;
  latestExchange?: LearnerExchange;
  latestStateDecision?: StateDecisionTrace;
}
