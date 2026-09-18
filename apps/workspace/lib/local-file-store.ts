import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function assertNotSymlink(targetPath: string, label: string): void {
  try {
    if (fs.lstatSync(targetPath).isSymbolicLink()) {
      throw new Error(label + " must not be a symbolic link");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export function withExclusiveFileLock<T>(
  lockPath: string,
  busyMessage: string,
  operation: () => T,
): T {
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(lockPath, "wx");
    fs.writeFileSync(descriptor, crypto.randomUUID() + "\n", "utf8");
    return operation();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(busyMessage);
    }
    throw error;
  } finally {
    if (descriptor !== undefined) {
      fs.closeSync(descriptor);
      try { fs.unlinkSync(lockPath); } catch {}
    }
  }
}

export function atomicWriteJson(
  targetPath: string,
  payload: unknown,
  options: {
    directoryLabel: string;
    targetLabel?: string;
    temporaryPrefix?: string;
    createOnly?: boolean;
    existsMessage?: string;
  },
): void {
  const root = path.dirname(targetPath);
  assertNotSymlink(root, options.directoryLabel);
  fs.mkdirSync(root, { recursive: true });
  assertNotSymlink(root, options.directoryLabel);
  assertNotSymlink(targetPath, options.targetLabel || "JSON target");

  if (options.createOnly && fs.existsSync(targetPath)) {
    throw new Error(options.existsMessage || "JSON target already exists");
  }

  const temporary = path.join(
    root,
    (options.temporaryPrefix || ".write") + "." + crypto.randomUUID() + ".tmp",
  );
  try {
    fs.writeFileSync(temporary, JSON.stringify(payload, null, 2) + "\n", "utf8");
    fs.renameSync(temporary, targetPath);
  } finally {
    try { fs.unlinkSync(temporary); } catch {}
  }
}
