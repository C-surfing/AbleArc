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

export type LearningNodeKind = "concept" | "procedure" | "strategy";

export type LearningEdgeRelation =
  | "prerequisite"
  | "component"
  | "prepares"
  | "contrast"
  | "transfer";

export interface RoadmapNode {
  id: string;
  label: string;
  kind: LearningNodeKind;
  state: MasteryState;
  missionRelevance: "core" | "supporting" | "optional";
  evidence?: string;
}

export interface RoadmapEdge {
  id: string;
  source: string;
  target: string;
  relation: LearningEdgeRelation;
  confidence: "low" | "medium" | "high";
}

export interface LearningMapView {
  source: "structured" | "markdown" | "empty";
  revision?: number;
  rationale?: string;
  frontier: string[];
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
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
  prediction: {
    prompt: string;
    options: Array<{ id: string; label: string }>;
  };
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

export interface ArtifactInteraction {
  artifactId: string;
  predictionId: string;
  initialPrevalence: number;
  finalPrevalence: number;
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

export type ProjectStatus = "active" | "paused" | "archived";

export type MaintenanceStatus = "none" | "scheduled" | "due" | "study_active";

export interface ProjectSummary {
  id: string;
  title: string;
  status: ProjectStatus;
  maintenanceStatus: MaintenanceStatus;
  missionId?: string;
  selected: boolean;
}

export interface LearningBrief {
  label: string;
  title: string;
  detail: string;
}

export type LearningMaterialType =
  | "concept_note"
  | "derivation"
  | "worked_example"
  | "formula_sheet"
  | "code_artifact"
  | "diagram"
  | "misconception_note"
  | "source_note"
  | "feynman_explanation";

export interface LearningMaterialSummary {
  id: string;
  missionId: string;
  materialType: LearningMaterialType;
  title: string;
  summary: string;
  whyReturn: string;
  conceptIds: string[];
  evidenceCount: number;
  sourceCount: number;
  createdAt: string;
}

export interface AgentProviderStatus {
  configured: boolean;
  adapter: "openai-compatible";
  model?: string;
  error?: string;
}

export interface WorkspaceSnapshot {
  agent: AgentProviderStatus;
  source: "local" | "demo";
  hasMission: boolean;
  mission: string;
  learnerNote: string;
  frontier: string;
  frontierState: MasteryState;
  frontierReason: string;
  nextMove: string;
  expectedLearnerAction: string;
  map: LearningMapView;
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
  projectId?: string;
  projectTitle?: string;
  projectStatus?: ProjectStatus;
  maintenanceStatus?: MaintenanceStatus;
  projects: ProjectSummary[];
  materials: LearningMaterialSummary[];
  sessionBrief?: LearningBrief;
}
