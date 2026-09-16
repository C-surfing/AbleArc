import fs from "node:fs";
import path from "node:path";
import { listProjectSummaries, resolveProjectReadContext } from "./project-store";
import type {
  DecisionTrace,
  EvidenceItem,
  LearningArtifact,
  LearnerExchange,
  MasteryState,
  MisconceptionItem,
  ReviewCandidate,
  RoadmapNode,
  SessionPoint,
  StateDecisionTrace,
  WorkspaceSnapshot,
} from "./types";

interface RuntimeState {
  revision: number;
  concepts: Record<string, {
    label: string;
    state: MasteryState;
    evidence_ids: string[];
    proposal_id: string;
    decision_id: string;
  }>;
}

interface RuntimeReceipt {
  id: string;
  kind: string;
  created_at: string;
  [key: string]: unknown;
}

const DEMO: WorkspaceSnapshot = {
  source: "demo",
  hasMission: false,
  mission: "Build an intuitive, transferable understanding of Bayes rather than memorizing the formula.",
  learnerNote: "Basic conditional probability is usable; inverse-condition reasoning is still representation-dependent.",
  frontier: "Bayes / inverse conditional reasoning",
  frontierState: "developing",
  frontierReason: "Frequency reasoning works, but symbolic reversal has not yet survived an independent context switch.",
  nextMove: "Switch from a frequency tree to conditional notation and ask the learner to reconstruct the same inference.",
  expectedLearnerAction: "Translate the tree into P(A|B) / P(B|A) and explain why the denominator changes.",
  nodes: [
    { id: "sample-space", label: "Sample space", state: "stable", missionRelevance: "supporting" },
    { id: "conditional", label: "Conditional probability", state: "stable", dependsOn: "sample-space", missionRelevance: "core" },
    { id: "bayes", label: "Bayes reasoning", state: "developing", dependsOn: "conditional", missionRelevance: "core", evidence: "frequency-tree application" },
    { id: "bayesian", label: "Bayesian inference", state: "unknown", dependsOn: "bayes", missionRelevance: "core" },
  ],
  evidence: [
    {
      task: "Medical-test frequency tree",
      level: "application",
      result: "Independent numerical inference",
      independence: "new-form",
      implication: "Mechanism is usable when frequencies are explicit.",
    },
    {
      task: "Explain condition reversal",
      level: "explanation",
      result: "Mostly correct with one prompt",
      independence: "same-form",
      implication: "Symbolic model is not yet independently stable.",
    },
  ],
  misconceptions: [
    {
      belief: "A highly accurate positive test should imply an equally high posterior probability.",
      confidence: "medium",
      status: "testing",
      evidence: "Initial answer over-weighted sensitivity and under-weighted the base rate.",
    },
  ],
  reviewCandidates: [
    {
      concept: "Condition direction",
      reason: "Critical dependency for Bayes transfer",
      strength: "medium",
      form: "retrieve from a non-medical scenario",
    },
  ],
  projects: [],
  sessions: [
    { id: "s1", label: "S1 · Frontier", detail: "Inverse-condition confusion located", kind: "frontier" },
    { id: "s2", label: "S2 · Representation", detail: "Frequency tree supported correct inference", kind: "representation" },
    { id: "s3", label: "Next · Transfer", detail: "Switch context and remove tree scaffold", kind: "transfer" },
  ],
  activeArc: "Probability · Bayes intuition",
  artifact: {
    id: "art_demo_bayes_frequency_tree",
    renderer: "frequency_tree_v1",
    title: "How the base rate changes a positive result",
    conceptIds: ["bayes"],
    learningGoal: "See why a rarer condition lowers the posterior even when the test remains accurate.",
    inferencePrompt: "Move prevalence down. Which positive branch changes enough to move the posterior?",
    successEvidence: "Explain the posterior using both true positives and false positives.",
    prediction: {
      prompt: "Before revealing the counts: if prevalence falls while the test stays the same, what happens to the posterior after a positive result?",
      options: [
        { id: "falls", label: "It falls" },
        { id: "stays", label: "It stays the same" },
        { id: "rises", label: "It rises" },
      ],
    },
    payload: {
      population: 10000,
      prevalence: 0.01,
      sensitivity: 0.99,
      falsePositiveRate: 0.05,
      prevalenceMin: 0.001,
      prevalenceMax: 0.1,
      prevalenceStep: 0.001,
      labels: {
        population: "people",
        condition: "condition present",
        complement: "condition absent",
        positive: "true positive",
        falsePositive: "false positive",
      },
    },
  },
};

export function findRepoRoot(): string {
  let current = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    if (fs.existsSync(path.join(current, "skills", "teach", "SKILL.md"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(process.cwd(), "../..");
}

function readOptional(filePath: string): string | undefined {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return undefined;
  }
}

function readJsonOptional<T>(filePath: string): T | undefined {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return undefined;
  }
}

function readReceiptDirectory(runtimeRoot: string, directory: string): RuntimeReceipt[] {
  const root = path.join(runtimeRoot, "receipts", directory);
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .filter((name) => name.endsWith(".json"))
    .map((name) => readJsonOptional<RuntimeReceipt>(path.join(root, name)))
    .filter((item): item is RuntimeReceipt => Boolean(item?.id && item?.created_at))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function runtimeEvidence(runtimeRoot: string): EvidenceItem[] {
  const observations = new Map(
    readReceiptDirectory(runtimeRoot, "observations").map((item) => [item.id, item]),
  );
  return readReceiptDirectory(runtimeRoot, "evidence")
    .map((item) => {
      const observation = observations.get(String(item.observation_id));
      const concepts = Array.isArray(item.concept_ids) ? item.concept_ids.join(", ") : "Learning evidence";
      const qualifiers = [
        item.independence,
        item.delay,
        item.context,
        item.scaffolding ? `${item.scaffolding}-scaffold` : undefined,
      ]
        .filter(Boolean)
        .join(" · ");
      const implications = item.outcome === "inconclusive"
        ? "Inconclusive; preserve the current learner-model uncertainty."
        : `${item.outcome === "supports" ? "Supports" : "Contradicts"}: ${[
            ...(Array.isArray(item.supports) ? item.supports : []),
            ...(Array.isArray(item.contradicts) ? item.contradicts : []),
          ].join(", ") || "current learner-model hypothesis"}`;
      return {
        task: String(observation?.learner_action || concepts),
        level: (["recognition", "recall", "explanation", "application", "transfer"].includes(String(item.level))
          ? item.level
          : "recognition") as EvidenceItem["level"],
        result: String(item.result_summary || observation?.observed_result || "Observed"),
        independence: qualifiers || "unspecified",
        implication: implications,
      };
    })
    .reverse();
}

function runtimeDecision(runtimeRoot: string): DecisionTrace | undefined {
  const item = readReceiptDirectory(runtimeRoot, "decisions").at(-1);
  if (!item) return undefined;
  const representation = (item.representation || {}) as Record<string, unknown>;
  const hasLearnerResponse = readReceiptDirectory(runtimeRoot, "observations")
    .some((observation) => observation.decision_id === item.id && observation.source === "learner");
  return {
    id: item.id,
    target: String(item.target || "Current frontier"),
    move: String(item.move || "probe"),
    rationale: String(item.rationale || "No rationale recorded."),
    learnerAction: String(item.learner_action || "Learner action not recorded."),
    uncertainty: (["low", "medium", "high"].includes(String(item.uncertainty))
      ? item.uncertainty
      : "medium") as DecisionTrace["uncertainty"],
    representationKind: String(representation.kind || "conversation"),
    representationPurpose: String(representation.purpose || "Support the current cognitive move."),
    artifactRef: typeof representation.artifact_ref === "string" ? representation.artifact_ref : undefined,
    evidenceCount: Array.isArray(item.evidence_used) ? item.evidence_used.length : 0,
    expectedEvidence: String(item.expected_evidence || "Evidence expectation not recorded."),
    falsificationSignal: String(item.falsification_signal || "Falsification signal not recorded."),
    hasLearnerResponse,
  };
}

function runtimeArtifact(artifactRoot: string, artifactRef: string | undefined): LearningArtifact | undefined {
  if (!artifactRef?.startsWith(".learning/artifacts/")) return undefined;
  const artifactPath = path.resolve(artifactRoot, path.basename(artifactRef));
  if (path.dirname(artifactPath) !== artifactRoot || !/^art_[A-Za-z0-9][A-Za-z0-9_-]{2,127}\.json$/.test(path.basename(artifactPath))) {
    return undefined;
  }
  const item = readJsonOptional<RuntimeReceipt>(artifactPath);
  if (!item || item.kind !== "learning-artifact" || item.renderer !== "frequency_tree_v1") return undefined;
  const payload = item.payload as Record<string, unknown> | undefined;
  const labels = payload?.labels as Record<string, unknown> | undefined;
  const legacyPrediction = {
    prompt: "Before revealing the counts: if prevalence falls while the test stays the same, what happens to the posterior after a positive result?",
    options: [
      { id: "falls", label: "It falls" },
      { id: "stays", label: "It stays the same" },
      { id: "rises", label: "It rises" },
    ],
  };
  const prediction = (item.prediction || (item.schema_version === "0.1" ? legacyPrediction : undefined)) as Record<string, unknown> | undefined;
  const options = Array.isArray(prediction?.options) ? prediction.options : [];
  const numbers = [
    payload?.population,
    payload?.prevalence,
    payload?.sensitivity,
    payload?.false_positive_rate,
    payload?.prevalence_min,
    payload?.prevalence_max,
    payload?.prevalence_step,
  ];
  if (
    !payload
    || !labels
    || typeof prediction?.prompt !== "string"
    || options.length < 2
    || options.length > 5
    || options.some((option) => {
      const value = option as Record<string, unknown>;
      return typeof value.id !== "string" || typeof value.label !== "string";
    })
    || numbers.some((value) => typeof value !== "number")
  ) return undefined;
  const population = Number(payload.population);
  const prevalence = Number(payload.prevalence);
  const sensitivity = Number(payload.sensitivity);
  const falsePositiveRate = Number(payload.false_positive_rate);
  const prevalenceMin = Number(payload.prevalence_min);
  const prevalenceMax = Number(payload.prevalence_max);
  const prevalenceStep = Number(payload.prevalence_step);
  const probabilities = [prevalence, sensitivity, falsePositiveRate, prevalenceMin, prevalenceMax, prevalenceStep];
  if (
    !Number.isInteger(population)
    || population < 100
    || population > 1_000_000
    || probabilities.some((value) => value < 0 || value > 1)
    || prevalenceMin >= prevalenceMax
    || prevalence < prevalenceMin
    || prevalence > prevalenceMax
    || prevalenceStep <= 0
    || prevalenceStep > prevalenceMax - prevalenceMin
  ) return undefined;
  return {
    id: item.id,
    renderer: "frequency_tree_v1",
    title: String(item.title || "Interactive frequency tree"),
    conceptIds: Array.isArray(item.concept_ids) ? item.concept_ids.map(String) : [],
    learningGoal: String(item.learning_goal || "Inspect how the populations change."),
    inferencePrompt: String(item.inference_prompt || "Change one variable and explain what follows."),
    successEvidence: String(item.success_evidence || "Explain the observed relationship."),
    prediction: {
      prompt: prediction.prompt,
      options: options.map((option) => {
        const value = option as Record<string, unknown>;
        return { id: String(value.id), label: String(value.label) };
      }),
    },
    payload: {
      population,
      prevalence,
      sensitivity,
      falsePositiveRate,
      prevalenceMin,
      prevalenceMax,
      prevalenceStep,
      labels: {
        population: String(labels.population || "population"),
        condition: String(labels.condition || "condition present"),
        complement: String(labels.complement || "condition absent"),
        positive: String(labels.positive || "true positive"),
        falsePositive: String(labels.false_positive || "false positive"),
      },
    },
  };
}

function runtimeLearnerExchange(runtimeRoot: string): LearnerExchange | undefined {
  const observations = readReceiptDirectory(runtimeRoot, "observations");
  const observation = observations.filter((item) => item.source === "learner").at(-1);
  if (!observation) return undefined;

  const evidence = readReceiptDirectory(runtimeRoot, "evidence")
    .filter((item) => item.observation_id === observation.id)
    .at(-1);
  const nextDecision = evidence
    ? readReceiptDirectory(runtimeRoot, "decisions").find((item) => (
        Array.isArray(item.evidence_used) && item.evidence_used.includes(evidence.id)
      ))
    : undefined;
  const validLevel = ["recognition", "recall", "explanation", "application", "transfer"];
  const validOutcome = ["supports", "contradicts", "inconclusive"];
  const validConfidence = ["low", "medium", "high"];

  return {
    decisionId: String(observation.decision_id),
    observationId: observation.id,
    response: String(observation.observed_result || ""),
    status: evidence ? "assessed" : "awaiting_assessment",
    feedback: evidence ? String(evidence.result_summary || "Assessment recorded.") : undefined,
    outcome: evidence && validOutcome.includes(String(evidence.outcome))
      ? evidence.outcome as LearnerExchange["outcome"]
      : undefined,
    level: evidence && validLevel.includes(String(evidence.level))
      ? evidence.level as LearnerExchange["level"]
      : undefined,
    confidence: evidence && validConfidence.includes(String(evidence.confidence))
      ? evidence.confidence as LearnerExchange["confidence"]
      : undefined,
    supports: evidence && Array.isArray(evidence.supports) ? evidence.supports.map(String) : [],
    contradicts: evidence && Array.isArray(evidence.contradicts) ? evidence.contradicts.map(String) : [],
    nextDecisionId: nextDecision?.id,
  };
}

function runtimeStateDecision(runtimeRoot: string): StateDecisionTrace | undefined {
  const decision = readReceiptDirectory(runtimeRoot, "state-decisions").at(-1);
  if (!decision) return undefined;
  const proposals = new Map(
    readReceiptDirectory(runtimeRoot, "state-proposals").map((item) => [item.id, item]),
  );
  const proposal = proposals.get(String(decision.proposal_id));
  if (!proposal) return undefined;
  const authority = (decision.authority || {}) as Record<string, unknown>;
  return {
    id: decision.id,
    concept: String(proposal.concept_label || proposal.concept_id || "Concept"),
    before: normalizeState(String(proposal.before)),
    after: normalizeState(String(proposal.after)),
    decision: decision.decision === "rejected" ? "rejected" : "accepted",
    authority: `${String(authority.type || "unknown")}:${String(authority.id || "unknown")}`,
    reason: String(decision.reason || "No authority rationale recorded."),
    evidenceCount: Array.isArray(proposal.evidence_ids) ? proposal.evidence_ids.length : 0,
    policyOverridden: decision.policy_overridden === true,
  };
}

function applyRuntimeState(nodes: RoadmapNode[], runtimeState: RuntimeState | undefined): RoadmapNode[] {
  if (!runtimeState) return nodes;
  const result = nodes.map((node) => {
    const concept = runtimeState.concepts[node.id]
      || Object.values(runtimeState.concepts).find((item) => item.label.toLowerCase() === node.label.toLowerCase());
    return concept ? { ...node, state: concept.state, evidence: `${concept.evidence_ids.length} accepted receipt(s)` } : node;
  });
  const known = new Set(result.map((node) => node.id));
  for (const [id, concept] of Object.entries(runtimeState.concepts)) {
    if (!known.has(id)) {
      result.push({ id, label: concept.label, state: concept.state, evidence: `${concept.evidence_ids.length} accepted receipt(s)` });
    }
  }
  return result;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function field(markdown: string | undefined, label: string): string | undefined {
  if (!markdown) return undefined;
  const pattern = new RegExp(`^-\\s*${escapeRegExp(label)}:\\s*(.+)$`, "im");
  const match = markdown.match(pattern);
  const value = match?.[1]?.trim();
  return value && value !== "-" ? value : undefined;
}

function section(markdown: string | undefined, heading: string): string {
  if (!markdown) return "";
  const lines = markdown.split(/\r?\n/);
  const index = lines.findIndex((line) => line.trim().toLowerCase() === `## ${heading.toLowerCase()}`);
  if (index < 0) return "";
  const body: string[] = [];
  for (let i = index + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.join("\n");
}

function firstMeaningfulLine(markdown: string | undefined, fallback: string): string {
  if (!markdown) return fallback;
  const line = markdown
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find(
      (value) =>
        value &&
        !value.startsWith("#") &&
        !value.startsWith("<!--") &&
        !value.startsWith("```") &&
        !value.startsWith("|") &&
        !value.startsWith(">"),
    );
  return line?.replace(/^[-*]\s*/, "") || fallback;
}

function tableRows(body: string): string[][] {
  return body
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("|") && !/^\|\s*-+/.test(line.trim()))
    .slice(1)
    .map((line) =>
      line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim()),
    )
    .filter((cells) => cells.some(Boolean));
}

function normalizeState(value: string | undefined): MasteryState {
  const text = (value || "").toLowerCase();
  if (text.includes("transfer") || text.includes("◆")) return "transferable";
  if (text.includes("stable") || text.includes("●")) return "stable";
  if (text.includes("develop") || text.includes("◐")) return "developing";
  if (text.includes("exposed") || text.includes("◔")) return "exposed";
  return "unknown";
}

function slug(value: string, fallback: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || fallback;
}

function parseRoadmap(markdown: string | undefined): RoadmapNode[] {
  const rows = tableRows(section(markdown, "Nodes"));
  const nodes = rows
    .filter((cells) => cells[0])
    .map((cells, index) => ({
      id: slug(cells[0], `node-${index + 1}`),
      label: cells[0],
      state: normalizeState(cells[1]),
      dependsOn: cells[2] ? slug(cells[2], "") : undefined,
      missionRelevance: ["core", "supporting", "optional"].includes(cells[4])
        ? (cells[4] as RoadmapNode["missionRelevance"])
        : undefined,
      evidence: cells[5] || undefined,
    }));
  return nodes;
}

function parseEvidence(markdown: string | undefined): EvidenceItem[] {
  return tableRows(section(markdown, "Recent decisive evidence"))
    .filter((cells) => cells[0])
    .map((cells) => ({
      task: cells[0],
      level: (["recognition", "recall", "explanation", "application", "transfer"].includes(cells[1])
        ? cells[1]
        : "recognition") as EvidenceItem["level"],
      result: cells[2] || "Observed",
      independence: cells[3] || "unspecified",
      implication: cells[4] || "Evidence recorded",
    }));
}

function parseMisconceptions(markdown: string | undefined): MisconceptionItem[] {
  return tableRows(section(markdown, "Active misconceptions"))
    .filter((cells) => cells[0])
    .map((cells) => ({
      belief: cells[0],
      confidence: (["low", "medium", "high"].includes(cells[1]) ? cells[1] : "medium") as MisconceptionItem["confidence"],
      evidence: cells[2] || undefined,
      status: (["active", "testing", "resolved"].includes(cells[3]) ? cells[3] : "active") as MisconceptionItem["status"],
    }));
}

function parseReview(markdown: string | undefined): ReviewCandidate[] {
  return tableRows(section(markdown, "Review candidates"))
    .filter((cells) => cells[0])
    .map((cells) => ({
      concept: cells[0],
      reason: cells[1] || "Review candidate",
      strength: (["weak", "medium", "strong"].includes(cells[2]) ? cells[2] : "medium") as ReviewCandidate["strength"],
      form: cells[3] || "retrieval",
    }));
}

function localTimeline(repoRoot: string): { sessions: SessionPoint[]; activeArc?: string } {
  const root = path.join(repoRoot, ".dogfooding");
  if (!fs.existsSync(root)) return { sessions: [] };
  const arcs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const activeArc = arcs.at(-1);
  if (!activeArc) return { sessions: [] };
  const sessionsDir = path.join(root, activeArc, "sessions");
  if (!fs.existsSync(sessionsDir)) return { sessions: [], activeArc };
  const files = fs
    .readdirSync(sessionsDir)
    .filter((name) => /^\d+\.md$/.test(name))
    .sort();
  return {
    activeArc,
    sessions: files.map((name, index) => ({
      id: `${activeArc}-${name}`,
      label: `S${index + 1}`,
      detail: "Local evidence record",
      kind: index === 0 ? "frontier" : "evidence",
    })),
  };
}

function runtimeTimeline(runtimeRoot: string): SessionPoint[] {
  return readReceiptDirectory(runtimeRoot, "turns").map((item, index) => {
    const artifacts = Array.isArray(item.artifact_refs) ? item.artifact_refs : [];
    const decisions = Array.isArray(item.state_decision_ids) ? item.state_decision_ids : [];
    const outcome = String(item.outcome || "completed");
    const kind: SessionPoint["kind"] = outcome === "awaiting_evidence"
      ? "frontier"
      : decisions.length > 0
        ? "evidence"
        : artifacts.length > 0
          ? "representation"
          : "repair";
    return {
      id: item.id,
      label: `T${index + 1} · ${outcome.replaceAll("_", " ")}`,
      detail: String(item.summary || "Structured learning turn"),
      kind,
    };
  });
}

export function loadWorkspaceSnapshot(): WorkspaceSnapshot {
  const repoRoot = findRepoRoot();
  const context = resolveProjectReadContext(repoRoot);
  if (!context) return DEMO;
  const projects = context.layout === "workspace-v0.2"
    ? listProjectSummaries(repoRoot)
    : [];
  const state = readOptional(context.statePath);
  const roadmap = readOptional(context.roadmapMarkdownPath);
  const mission = context.missionMarkdownPath ? readOptional(context.missionMarkdownPath) : undefined;
  const learner = readOptional(context.learnerPath);

  const runtimeRoot = context.runtimeRoot;
  const structuredState = readJsonOptional<RuntimeState>(path.join(runtimeRoot, "state.json"));
  const structuredEvidence = runtimeEvidence(runtimeRoot);
  const decision = runtimeDecision(runtimeRoot);
  const artifact = runtimeArtifact(path.resolve(context.artifactsRoot), decision?.artifactRef);
  const latestExchange = runtimeLearnerExchange(runtimeRoot);
  const latestStateDecision = runtimeStateDecision(runtimeRoot);
  const structuredTimeline = runtimeTimeline(runtimeRoot);

  if (!state && !roadmap && !mission && !learner && !structuredState) return DEMO;

  const missionGoal = field(mission, "Goal");
  const hasMission = Boolean(missionGoal);
  if (!hasMission && !decision && Object.keys(structuredState?.concepts || {}).length === 0) return DEMO;

  const recordedFrontier = field(state, "Concept / capability");
  const awaitingFirstDecision = hasMission && !recordedFrontier && !decision;
  const frontier = recordedFrontier || decision?.target || (awaitingFirstDecision ? "Mission saved" : "Current learning frontier");
  const markdownFrontierState = normalizeState(field(state, "State"));
  const structuredFrontier = structuredState?.concepts[slug(frontier, "frontier")]
    || Object.values(structuredState?.concepts || {}).find((item) => item.label.toLowerCase() === frontier.toLowerCase());
  const frontierState = structuredFrontier?.state || markdownFrontierState;
  const timeline = localTimeline(repoRoot);
  const evidence = structuredEvidence.length > 0 ? structuredEvidence : parseEvidence(state);
  const misconceptions = parseMisconceptions(state);
  const reviewCandidates = parseReview(state);
  const dueReviews = projects.filter((project) => project.maintenanceStatus === "due").length;
  const projectCountLabel = `${projects.length} ${projects.length === 1 ? "PROJECT" : "PROJECTS"}`;
  const sessionBrief = context.projectStatus === "paused"
    ? {
        label: `SESSION BRIEF · ${projectCountLabel}`,
        title: `${context.projectTitle} is paused`,
        detail: "The retained state is readable, but new learning evidence is blocked until you resume this Project.",
      }
    : context.projectStatus === "archived" && context.maintenanceStatus === "study_active"
      ? {
          label: `MAINTENANCE · ${projectCountLabel}`,
          title: `Reviewing ${context.projectTitle}`,
          detail: `Use one short retrieval or transfer check at ${frontier}; finish maintenance only after recording the result.`,
        }
      : context.projectStatus === "archived"
        ? {
            label: `ARCHIVED · ${dueReviews} DUE`,
            title: `${context.projectTitle} remains available`,
            detail: context.maintenanceStatus === "due"
              ? "A maintenance retrieval is due. Start a short review when you are ready."
              : "The main learning line is complete; retained evidence and future maintenance remain available.",
          }
        : latestExchange?.status === "awaiting_assessment"
          ? {
              label: `SESSION BRIEF · ${projectCountLabel}`,
              title: "Your response is saved",
              detail: "The connected Teach/Study agent should assess it before asking you to repeat the attempt.",
            }
          : {
              label: `SESSION BRIEF · ${projectCountLabel}${dueReviews ? ` · ${dueReviews} REVIEW DUE` : ""}`,
              title: `${frontier} · ${frontierState}`,
              detail: decision?.learnerAction || "Continue from the current frontier instead of restarting the topic.",
            };

  return {
    source: "local",
    hasMission,
    mission: missionGoal || firstMeaningfulLine(mission, "Learning mission is being established."),
    learnerNote: firstMeaningfulLine(learner, "Learner profile is intentionally sparse until evidence accumulates."),
    frontier,
    frontierState,
    frontierReason: field(state, "Why this is the frontier") || (awaitingFirstDecision
      ? "No learner model has been inferred. The first Teach turn should locate the nearest useful frontier."
      : "The current state file marks this as the active frontier."),
    nextMove: decision?.rationale || field(state, "Move") || (awaitingFirstDecision
      ? "Let the Teach agent turn this mission into one short, decision-relevant first move."
      : "Use the Teach/Study runtime to choose the next evidence-bearing cognitive move."),
    expectedLearnerAction: decision?.learnerAction || field(state, "Learner action expected") || (awaitingFirstDecision
      ? "Continue with a Teach agent that can read this workspace; it should not ask you to restate the goal."
      : "Learner action has not been specified yet."),
    nodes: awaitingFirstDecision
      ? []
      : applyRuntimeState(parseRoadmap(roadmap), structuredState),
    evidence,
    misconceptions,
    reviewCandidates,
    sessions: [...timeline.sessions, ...structuredTimeline],
    activeArc: context.projectTitle || timeline.activeArc,
    runtimeRevision: structuredState?.revision,
    decision,
    artifact,
    latestExchange,
    latestStateDecision,
    projectId: context.layout === "workspace-v0.2" ? context.projectId : undefined,
    projectTitle: context.projectTitle,
    projectStatus: context.projectStatus,
    maintenanceStatus: context.maintenanceStatus,
    projects,
    sessionBrief,
  };
}
