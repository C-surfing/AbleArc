import { spawn } from "node:child_process";
import path from "node:path";

const MAX_STDOUT_BYTES = 512 * 1024;
const MAX_STDERR_BYTES = 64 * 1024;

export function runLocalLearningTool(
  repoRoot: string,
  args: string[],
  input?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const python = process.env.AI4LEARNING_PYTHON
    || (process.platform === "win32" ? "python" : "python3");
  const script = path.join(repoRoot, "tools", "learning.py");

  return new Promise((resolve, reject) => {
    const child = spawn(
      /* turbopackIgnore: true */ python,
      [script, ...args],
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
    child.on("error", reject);
    child.on("close", (code) => {
      if (oversized) {
        reject(new Error("learning tool returned too much data"));
        return;
      }
      if (code !== 0) {
        reject(new Error(stderr.trim() || `learning tool exited with code ${code}`));
        return;
      }
      try {
        const value = JSON.parse(stdout) as unknown;
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          reject(new Error("learning tool returned a non-object JSON result"));
          return;
        }
        resolve(value as Record<string, unknown>);
      } catch {
        reject(new Error("learning tool returned invalid JSON"));
      }
    });
    child.stdin.end(input ? JSON.stringify(input) : undefined, "utf8");
  });
}
