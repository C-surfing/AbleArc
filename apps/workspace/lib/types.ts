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
  evidenceCount: number;
  expectedEvidence: string;
  falsificationSignal: string;
}

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
  latestStateDecision?: StateDecisionTrace;
}
