import { spawn } from "node:child_process";
import path from "node:path";

const MAX_STDOUT_BYTES = 2 * 1024 * 1024;
const MAX_STDERR_BYTES = 64 * 1024;

export class PluginRuntimeError extends Error {
  constructor(message: string, readonly kind: "conflict" | "execution" | "invalid_output") {
    super(message);
    this.name = "PluginRuntimeError";
  }
}

export function recordAttributedLearnerResponse(
  repoRoot: string,
  decisionId: string,
  response: string,
): Promise<{ id: string }> {
  const python = process.env.AI4LEARNING_PYTHON
    || (process.platform === "win32" ? "python" : "python3");
  const script = path.join(repoRoot, "tools", "runtime.py");

  return new Promise((resolve, reject) => {
    const child = spawn(
      python,
      [
        script,
        "--repo",
        repoRoot,
        "respond",
        decisionId,
        "-",
        "--confirm-attribution",
      ],
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
      reject(new PluginRuntimeError("The AbleArc Runtime could not start.", "execution"));
    });

    child.on("close", (code) => {
      if (oversized) {
        reject(new PluginRuntimeError("The AbleArc Runtime returned too much data.", "invalid_output"));
        return;
      }
      if (code !== 0) {
        const conflict = /already has a learner response|does not match|no unanswered/i.test(stderr);
        reject(new PluginRuntimeError(
          conflict
            ? "The current learning move changed before the learner response could be recorded."
            : "The AbleArc Runtime rejected the learner response.",
          conflict ? "conflict" : "execution",
        ));
        return;
      }

      try {
        const value = JSON.parse(stdout) as unknown;
        if (
          !value
          || typeof value !== "object"
          || Array.isArray(value)
          || typeof (value as Record<string, unknown>).id !== "string"
        ) {
          reject(new PluginRuntimeError("The AbleArc Runtime returned an invalid Observation.", "invalid_output"));
          return;
        }
        resolve({ id: String((value as Record<string, unknown>).id) });
      } catch {
        reject(new PluginRuntimeError("The AbleArc Runtime returned invalid JSON.", "invalid_output"));
      }
    });

    child.stdin.end(response, "utf8");
  });
}
