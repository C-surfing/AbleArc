import { spawn } from "node:child_process";
import path from "node:path";
import { runtimeAdvancePayload, type PendingLearningTurn, type TeachingAdvance } from "./learning-orchestrator.ts";

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
): Promise<Record<string, unknown>> {
  const value = await runRuntime(
    repoRoot,
    ["advance", decisionId, "-"],
    runtimeAdvancePayload(advance),
  );
  return record(value, "Runtime advance result");
}
