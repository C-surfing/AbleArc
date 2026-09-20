import type { DailyContext } from "./daily-context";
import type { LearnerProfile } from "./learner-profile";
import type { PaperLearningPlan } from "./paper-learning";
import type { ReflectionRecord } from "./reflection";
import type { SessionCloseDraft } from "./session-close";
import type { WorkspaceSnapshot } from "./types";

export const VISUAL_DAILY_CONTEXT: DailyContext = {
  schemaVersion: "0.1",
  revision: 3,
  energy: 4,
  availableMinutes: 45,
  focus: 3,
  note: "Keep the session concrete. I want to connect the hardware path to the programming model.",
  updatedAt: "2026-09-20T12:00:00.000Z",
};

export const VISUAL_SNAPSHOT: WorkspaceSnapshot = {
  agent: {
    configured: true,
    adapter: "openai-compatible",
    model: "visual-qa-model",
    source: "web",
    baseUrl: "https://example.invalid/v1",
    structuredOutput: "json_schema",
  },
  source: "local",
  hasMission: true,
  mission: "Understand the CUDA memory hierarchy well enough to predict when shared memory helps, when cache behavior dominates, and how access patterns change performance.",
  learnerNote: "Software engineering background; comfortable with C/C++ and basic CUDA kernels, but hardware memory behavior is still fuzzy.",
  preferredLanguage: "English",
  frontier: "Cache miss path and shared-memory tradeoffs",
  frontierState: "developing",
  frontierReason: "You can name the memory levels, but the path after a cache miss and the reason shared memory can win are not yet stable across examples.",
  nextMove: "What actually happens when a cache misses?",
  expectedLearnerAction: "Explain the path in your own words, then contrast it with a kernel that stages the same data in shared memory.",
  map: {
    source: "structured",
    revision: 8,
    rationale: "The route separates the physical memory path from programmer-controlled reuse.",
    frontier: ["cache-miss", "shared-memory"],
    nodes: [
      { id: "threads", label: "Threads and warps", kind: "concept", state: "stable", missionRelevance: "supporting" },
      { id: "coalescing", label: "Coalesced global access", kind: "strategy", state: "stable", missionRelevance: "core" },
      { id: "cache-miss", label: "Cache miss path", kind: "procedure", state: "developing", missionRelevance: "core", evidence: "explanation still skips lower cache / DRAM path" },
      { id: "shared-memory", label: "Shared memory", kind: "concept", state: "developing", missionRelevance: "core", evidence: "can use syntax; performance model still partial" },
      { id: "tiling", label: "Tiled reuse", kind: "strategy", state: "exposed", missionRelevance: "core" },
    ],
    edges: [
      { id: "threads-coalescing", source: "threads", target: "coalescing", relation: "prerequisite", confidence: "high" },
      { id: "coalescing-cache", source: "coalescing", target: "cache-miss", relation: "prepares", confidence: "high" },
      { id: "cache-shared", source: "cache-miss", target: "shared-memory", relation: "contrast", confidence: "high" },
      { id: "shared-tiling", source: "shared-memory", target: "tiling", relation: "prepares", confidence: "high" },
    ],
  },
  evidence: [
    {
      task: "Trace a coalesced global load",
      level: "explanation",
      result: "Correctly described warp-level access grouping",
      independence: "new-form",
      implication: "The access-pattern layer is usable without a prompt.",
    },
    {
      task: "Explain why shared memory can help",
      level: "explanation",
      result: "Identified reuse but treated shared memory as an automatically faster cache",
      independence: "same-form",
      implication: "Programmer-controlled staging is understood; the tradeoff model is not yet stable.",
    },
  ],
  misconceptions: [
    {
      belief: "Shared memory is always faster than cache because it is explicitly managed.",
      confidence: "medium",
      status: "testing",
      evidence: "Learner explanation omitted staging cost and reuse threshold.",
    },
  ],
  reviewCandidates: [
    {
      concept: "Coalescing vs caching",
      reason: "The distinction determines which optimization is relevant.",
      strength: "medium",
      form: "contrast two memory-access traces",
    },
  ],
  sessions: [
    { id: "s1", label: "S1 · Access pattern", detail: "Coalescing became stable", kind: "evidence" },
    { id: "s2", label: "S2 · Frontier", detail: "Cache path uncertainty located", kind: "frontier" },
    { id: "s3", label: "Next · Contrast", detail: "Global cache path vs staged shared-memory reuse", kind: "transfer" },
  ],
  activeArc: "CUDA · Memory hierarchy",
  runtimeRevision: 12,
  decision: {
    id: "dec_visual_cache",
    target: "Cache miss path",
    move: "contrast",
    rationale: "A direct explanation exposes whether the learner has a physical path model before another optimization example is introduced.",
    learnerAction: "Trace one global load after an L1 miss, then explain what shared-memory staging changes and what cost it adds.",
    uncertainty: "medium",
    representationKind: "contrast",
    representationPurpose: "Separate automatic cache behavior from programmer-managed staging.",
    evidenceCount: 2,
    expectedEvidence: "A causal path from request to lower cache / DRAM plus a reuse-based explanation for shared-memory staging.",
    falsificationSignal: "Treating every cache miss as immediate DRAM access, or calling shared memory a universally faster cache.",
    hasLearnerResponse: false,
  },
  projectId: "prj_visual_cuda",
  projectTitle: "CUDA memory hierarchy",
  missionId: "msn_visual_cuda",
  projectStatus: "active",
  maintenanceStatus: "none",
  projects: [
    { id: "prj_visual_cuda", title: "CUDA memory hierarchy", status: "active", maintenanceStatus: "none", missionId: "msn_visual_cuda", selected: true },
    { id: "prj_visual_mlp", title: "MLP from first principles", status: "paused", maintenanceStatus: "none", missionId: "msn_visual_mlp", selected: false },
  ],
  materials: [
    {
      id: "mat_visual_cuda",
      missionId: "msn_visual_cuda",
      materialType: "source_note",
      title: "CUDA Programming Guide · memory hierarchy notes",
      summary: "Selected notes on global, cache, and shared memory.",
      whyReturn: "Use when reconciling the programming model with the hardware path.",
      conceptIds: ["cache-miss", "shared-memory"],
      evidenceIds: ["ev_visual_1"],
      evidenceCount: 1,
      sourceCount: 1,
      createdAt: "2026-09-20T11:00:00.000Z",
    },
  ],
  pendingStateProposalCount: 1,
  pendingMapProposalCount: 0,
  sessionBrief: {
    label: "Current session",
    title: "Build a causal memory-path model",
    detail: "One explanation, one contrast, then reassess.",
  },
};

export const VISUAL_ZH_SNAPSHOT: WorkspaceSnapshot = {
  ...VISUAL_SNAPSHOT,
  preferredLanguage: "Chinese",
  mission: "理解 CUDA 内存层级，能够判断 shared memory 什么时候真正有收益，以及 cache miss 后请求究竟会经过哪些层级。",
  learnerNote: "软件工程背景，已经会写基础 CUDA kernel，但对硬件内存路径以及复用阈值还不稳定。",
  frontier: "Cache miss 路径与 shared memory 的取舍",
  frontierReason: "你能说出主要内存层级，但还会把 cache miss 直接等同于访问 DRAM，也还没有稳定解释 shared memory 的 staging 成本。",
  nextMove: "一次 cache miss 之后，究竟发生了什么？",
  expectedLearnerAction: "用自己的话追踪一次 global load，然后对比把同一批数据提前放进 shared memory 会改变什么。",
  projectTitle: "CUDA 内存层级",
  activeArc: "CUDA · 内存层级",
};

export const VISUAL_ENTRY_SNAPSHOT: WorkspaceSnapshot = {
  ...VISUAL_SNAPSHOT,
  hasMission: false,
  projectId: undefined,
  projectTitle: undefined,
  missionId: undefined,
  decision: undefined,
  projectStatus: undefined,
  maintenanceStatus: undefined,
  projects: [],
};

export const VISUAL_REFLECTIONS: ReflectionRecord[] = [
  {
    schemaVersion: "0.1",
    id: "ref_visual_1",
    workspaceId: "ws_visual",
    projectId: "prj_visual_cuda",
    revision: 2,
    body: "I keep saying “shared memory is faster”, but the more accurate model seems to be that I pay an explicit staging cost so multiple accesses can reuse data with predictable locality. I still need to understand when the reuse is large enough to justify that cost.",
    links: {
      missionId: "msn_visual_cuda",
      decisionId: "dec_visual_cache",
      conceptIds: ["cache-miss", "shared-memory"],
      materialIds: ["mat_visual_cuda"],
    },
    createdAt: "2026-09-20T10:00:00.000Z",
    updatedAt: "2026-09-20T11:30:00.000Z",
  },
  {
    schemaVersion: "0.1",
    id: "ref_visual_2",
    workspaceId: "ws_visual",
    projectId: "prj_visual_cuda",
    revision: 1,
    body: "The key distinction I want to keep: coalescing changes how requests are grouped; caching changes whether a later request can be served from a closer level.",
    links: { conceptIds: ["coalescing", "cache-miss"], materialIds: [] },
    createdAt: "2026-09-19T12:00:00.000Z",
    updatedAt: "2026-09-19T12:00:00.000Z",
  },
];

export const VISUAL_PROFILE: LearnerProfile = {
  revision: 4,
  updatedAt: "2026-09-20T12:00:00.000Z",
  preferredLanguage: "Chinese with English technical terms",
  detailLevel: "Concise by default; detailed when a mechanism or derivation is the learning target.",
  intuitionFormalism: "Build intuition first, then connect it to formal notation and implementation details.",
  socraticTolerance: "Moderate to high when the question reveals a real misconception.",
  preferredPace: "Fast on familiar software concepts; slower on hardware, math, and proofs.",
  priorExposure: "Software engineering, data structures, basic machine learning, introductory CUDA.",
  reportedStrengths: "Programming, systems intuition, learning by implementing small experiments.",
  reportedWeaknesses: "Hardware memory hierarchy, low-level performance models, formal probability.",
  technicalBackground: "Software engineering student exploring agents, memory, RL, embedded systems, and CUDA.",
  toolsAndLanguages: "Python, C++, TypeScript, CUDA, STM32/GT32.",
  longTermGoals: "Build strong cross-layer engineering intuition and an AI learning system that can support durable mastery.",
  sourceContext: "University courses, official docs, papers, lecture slides, and self-directed projects.",
  typicalSessionLength: "30–60 minutes.",
  recurringConstraints: "Avoid redundant setup, preserve source notation, and do not execute code when explanation alone is sufficient.",
};

export const VISUAL_PAPER_PLAN: PaperLearningPlan = {
  studyMode: "understanding_first",
  sourceTitle: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness",
  researchProblem: "Exact attention moves too much data between GPU memory levels, so wall-clock performance can remain poor even when arithmetic complexity looks acceptable.",
  importance: "The paper reframes attention optimization around IO between HBM and on-chip SRAM rather than only counting FLOPs.",
  claims: [
    { id: "claim-io", statement: "Attention performance is strongly constrained by memory traffic.", sourceBasis: "The method analyzes reads and writes between HBM and SRAM." },
    { id: "claim-tiling", statement: "Tiling can reduce HBM accesses while preserving exact attention.", sourceBasis: "The algorithm stages blocks and recomputes selected intermediates instead of materializing the full matrix." },
  ],
  method: {
    summary: "Tile Q, K, and V blocks so useful work happens while data is resident in faster on-chip memory.",
    mechanismSteps: [
      "Load bounded blocks from HBM into SRAM.",
      "Compute partial attention statistics without materializing the full attention matrix.",
      "Accumulate normalized outputs and continue across tiles.",
    ],
  },
  evidence: [
    {
      claimIds: ["claim-io", "claim-tiling"],
      result: "Fewer HBM reads/writes and faster end-to-end attention on tested GPUs.",
      interpretation: "IO-aware algorithm design can dominate a nominally similar arithmetic workload.",
      limits: "Benefits depend on hardware, sequence dimensions, kernels, and implementation quality.",
    },
  ],
  limitations: [
    "The optimization is hardware-sensitive.",
    "Understanding the method requires a concrete memory-hierarchy model.",
  ],
  figuresEquations: [],
  prerequisites: [
    {
      id: "gpu-memory",
      label: "GPU memory hierarchy",
      whyNeeded: "The central argument is about moving data between HBM and SRAM.",
      confidence: "high",
      selfReportStatus: "reported_shaky",
    },
  ],
  onboardingQuestions: [
    {
      question: "Can you explain why fewer FLOPs do not necessarily mean a faster GPU kernel?",
      decisionValue: "Separates arithmetic complexity from IO cost.",
      prerequisiteIds: ["gpu-memory"],
    },
  ],
  initialPath: [
    { label: "Rebuild the memory hierarchy", purpose: "Make the IO argument concrete.", prerequisiteIds: ["gpu-memory"] },
    { label: "Trace naive attention traffic", purpose: "Locate the expensive materialization.", prerequisiteIds: ["gpu-memory"] },
    { label: "Introduce tiling", purpose: "See what is kept on chip and why.", prerequisiteIds: ["gpu-memory"] },
  ],
  firstMove: {
    kind: "probe",
    target: "Why can exact attention become faster without changing the mathematical result?",
    message: "Start from data movement rather than FLOPs. Trace which tensors must leave and re-enter HBM in a naive implementation.",
    learnerAction: "Sketch the naive memory traffic, then identify one intermediate you would try not to materialize.",
  },
  referencesUsed: ["paper-source"],
};

export const VISUAL_SESSION_CLOSE: SessionCloseDraft = {
  sourceDecisionId: "dec_visual_cache",
  sourceObservationId: "obs_visual_cache",
  sourceEvidenceId: "ev_visual_cache",
  evidenceSummary: "You correctly traced the lower-level lookup path and distinguished automatic cache behavior from explicit shared-memory staging. The remaining uncertainty is when reuse amortizes the staging and synchronization cost.",
  capabilityChange: {
    concept: "Cache miss path",
    before: "developing",
    after: "stable",
  },
  unresolved: {
    target: "Shared-memory reuse threshold",
    uncertainty: "medium",
    rationale: "The causal mechanism is sound, but the performance tradeoff has not survived a new kernel shape.",
  },
  materials: [
    { id: "mat_visual_cuda", title: "CUDA Programming Guide · memory hierarchy notes" },
  ],
  pendingProposalCount: 1,
  tomorrowSeed: {
    decisionId: "dec_visual_shared",
    target: "Shared-memory reuse threshold",
    action: "Compare two tiled kernels and predict when staging cost is repaid by reuse.",
  },
};
