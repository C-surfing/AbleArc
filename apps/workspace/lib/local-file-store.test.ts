import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assertNotSymlink,
  atomicWriteJson,
  withExclusiveFileLock,
} from "./local-file-store.ts";

test("atomicWriteJson writes formatted JSON without leaving temporary files", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ablearc-store-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const target = path.join(root, "nested", "value.json");

  atomicWriteJson(target, { ok: true }, {
    directoryLabel: "test directory",
    temporaryPrefix: ".test",
  });

  assert.deepEqual(JSON.parse(fs.readFileSync(target, "utf8")), { ok: true });
  assert.deepEqual(fs.readdirSync(path.dirname(target)), ["value.json"]);
});

test("exclusive file lock rejects concurrent writers and cleans up", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ablearc-lock-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const lockPath = path.join(root, ".write.lock");

  withExclusiveFileLock(lockPath, "busy", () => {
    assert.equal(fs.existsSync(lockPath), true);
    assert.throws(
      () => withExclusiveFileLock(lockPath, "busy", () => undefined),
      /busy/,
    );
  });
  assert.equal(fs.existsSync(lockPath), false);
});

test("symlink guard rejects symbolic links", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ablearc-link-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const target = path.join(root, "target");
  const link = path.join(root, "link");
  fs.mkdirSync(target);
  fs.symlinkSync(target, link, "dir");

  assert.throws(() => assertNotSymlink(link, "test path"), /must not be a symbolic link/);
});
