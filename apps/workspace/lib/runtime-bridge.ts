import { spawn } from "node:child_process";
import path from "node:path";
import { runtimeAdvancePayload, type PendingLearningTurn, type TeachingAdvance } from "./learning-orchestrator.ts";
import type { ProviderTurnTelemetry } from "./provider-turn-telemetry.ts";

const MAX_STDOUT_BYTES = 2 * 1024 * 1024;
const MAX_STDERR_BYTES = 32 * 1024;

export class RuntimeBridgeError extends Error {
  constructor(message: string, readonly kind: "conflict" | "execution" | "invalid_output") {
    super(message);
    this.name = "RuntimeBridgeError";
  }
}

function runRuntime(
  repoRoot: string,
  args: string[],
  input?: unknown,
): Promise<unknown> {
  const python = process.env.AI4LEARNING_PYTHON
    || (process.platform === "win32" ? "python" : "python3");
  const script = path.join(repoRoot, "tools", "runtime.py");
  return new Promise((resolve, reject) => {
    const child = spawn(
      /* turbopackIgnore: true */ python,
      [script, "--repo", repoRoot, ...args],
      { cwd: repoRoot, stdio: ["pipe", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    let oversized = false;
    child.stdout.on("data", (chunk: Buffer) => {
      if (oversized) return;
      stdout += chunk.toString("utf8");
      if (Buffer.byteLength(stdout, "utf8") > MAX_STDOUT_BYTES) {
        oversized = true;
        child.kill();
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (Buffer.byteLength(stderr, "utf8") < MAX_STDERR_BYTES) {
        stderr += chunk.toString("utf8");
      }
    });
    child.on("error", () => {
      reject(new RuntimeBridgeError("The local Runtime could not start.", "execution"));
    });
    child.on("close", (code) => {
      if (oversized) {
        reject(new RuntimeBridgeError("The local Runtime returned too much data.", "invalid_output"));
        return;
      }
      if (code !== 0) {
        const conflict = stderr.includes("already has an assessment")
          || stderr.includes("does not match")
          || stderr.includes("no learner response");
        reject(new RuntimeBridgeError(
          conflict
            ? "The pending learning turn changed before it could be advanced."
            : "The local Runtime rejected the generated learning turn.",
          conflict ? "conflict" : "execution",
        ));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new RuntimeBridgeError("The local Runtime returned invalid JSON.", "invalid_output"));
      }
    });
    child.stdin.end(input ? JSON.stringify(input) : undefined, "utf8");
  });
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RuntimeBridgeError(`${label} is missing from the Runtime.`, "invalid_output");
  }
  return value as Record<string, unknown>;
}

export async function readPendingLearningTurn(repoRoot: string): Promise<PendingLearningTurn | null> {
  const value = await runRuntime(repoRoot, ["pending"]);
  if (value === null) return null;
  const pending = record(value, "Pending learning turn");
  return {
    mission: pending.mission === null ? null : record(pending.mission, "Mission"),
    decision: record(pending.decision, "Decision"),
    observation: record(pending.observation, "Observation"),
    learner_state: record(pending.learner_state, "Learner state"),
  };
}

export async function advancePendingLearningTurn(
  repoRoot: string,
  decisionId: string,
  advance: TeachingAdvance,
  transport?: ProviderTurnTelemetry,
): Promise<Record<string, unknown>> {
  const value = await runRuntime(
    repoRoot,
    ["advance", decisionId, "-"],
    {
      ...runtimeAdvancePayload(advance),
      state_candidate_policy: "evidence-conservative-v0.1",
      ...(transport ? { transport } : {}),
    },
  );
  return record(value, "Runtime advance result");
}

const MAX_MAP_PROPOSAL_STDOUT_BYTES = 512 * 1024;

export type MapProposalDeriveOutcome =
  | { status: "proposed"; proposal: Record<string, unknown> }
  | { status: "no_change" }
  | { status: "unavailable"; reason: string };

/**
 * The topology proposal CLI exits 2 with one of these on stderr when there is simply
 * nothing to derive. Asking after every turn makes them routine, so they must not be
 * reported as failures — but they are matched by message, not by exit code, so a real
 * rejection is never silently swallowed.
 */
const MAP_DERIVE_NO_OP_MESSAGES = [
  "no evidence-grounded Runtime decision is available to derive a topology proposal",
  "LearningMap already represents the evidence-grounded Runtime concepts and frontier",
] as const;

export function classifyMapProposalDerive(
  code: number | null,
  stdout: string,
  stderr: string,
): MapProposalDeriveOutcome {
  if (code === 0) {
    try {
      const value = JSON.parse(stdout);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return { status: "proposed", proposal: value as Record<string, unknown> };
      }
      return {
        status: "unavailable",
        reason: "The topology proposal runtime returned an unexpected value.",
      };
    } catch {
      return { status: "unavailable", reason: "The topology proposal runtime returned invalid JSON." };
    }
  }
  if (MAP_DERIVE_NO_OP_MESSAGES.some((message) => stderr.includes(message))) {
    return { status: "no_change" };
  }
  const detail = stderr.trim().split("\n").pop()?.trim().slice(0, 300) ?? "";
  return {
    status: "unavailable",
    reason: detail || `The topology proposal runtime exited with code ${code ?? "unknown"}.`,
  };
}

function runMapProposalDerive(repoRoot: string): Promise<MapProposalDeriveOutcome> {
  const python = process.env.AI4LEARNING_PYTHON
    || (process.platform === "win32" ? "python" : "python3");
  const script = path.join(repoRoot, "tools", "learning_map_proposals.py");
  return new Promise((resolve, reject) => {
    const child = spawn(
      /* turbopackIgnore: true */ python,
      [script, "--repo", repoRoot, "derive"],
      { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    let oversized = false;
    child.stdout.on("data", (chunk: Buffer) => {
      if (oversized) return;
      stdout += chunk.toString("utf8");
      if (Buffer.byteLength(stdout, "utf8") > MAX_MAP_PROPOSAL_STDOUT_BYTES) {
        oversized = true;
        child.kill();
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (Buffer.byteLength(stderr, "utf8") < MAX_STDERR_BYTES) {
        stderr += chunk.toString("utf8");
      }
    });
    child.on("error", () => {
      resolve({ status: "unavailable", reason: "The topology proposal runtime could not start." });
    });
    child.on("close", (code) => {
      if (oversized) {
        resolve({
          status: "unavailable",
          reason: "The topology proposal runtime returned too much data.",
        });
        return;
      }
      resolve(classifyMapProposalDerive(code, stdout, stderr));
    });
    // stdin is deliberately "ignore": `derive` takes no input, so there is no stream to end.
  });
}

/**
 * Ask the Runtime whether Evidence-grounded Decisions have outgrown the reviewed
 * LearningMap, and record one immutable proposal if they have (ADR 0007).
 *
 * This is the Web half of the documented "common Agent path": the BYOM adapter is a
 * Teach agent, so it proposes and leaves accept/reject authority to the learner review
 * surface. It never writes `map/current.json`, never accepts its own proposal, and is
 * idempotent at the same frontier.
 *
 * Deliberately never throws and never rejects: it runs after a completed learning turn,
 * so a broken proposal runtime must not turn a successful turn into a failure. Callers
 * should surface `unavailable` as a diagnostic, not as a learner-facing error.
 *
 * `--proposed-by` is left at the CLI default on purpose: a Web-derived and a CLI-derived
 * proposal at the same frontier then stay byte-identical (hence idempotent) instead of
 * colliding on proposal-id reuse with different content.
 */
export async function deriveLearningMapProposal(repoRoot: string): Promise<MapProposalDeriveOutcome> {
  try {
    return await runMapProposalDerive(repoRoot);
  } catch {
    return { status: "unavailable", reason: "The topology proposal runtime could not start." };
  }
}
