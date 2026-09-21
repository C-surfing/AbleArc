import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyMapProposalDerive } from "./runtime-bridge.ts";

const PROPOSAL = JSON.stringify({
  schema_version: "0.1",
  kind: "learning-map-proposal",
  id: "mp_runtime_r0_64bf7d87d2254baf",
  base_revision: 0,
});

test("a successful derive is reported as a proposal", () => {
  const outcome = classifyMapProposalDerive(0, PROPOSAL, "");
  assert.equal(outcome.status, "proposed");
  assert.equal(
    outcome.status === "proposed" ? outcome.proposal.id : undefined,
    "mp_runtime_r0_64bf7d87d2254baf",
  );
});

test("a non-object payload on exit 0 is not mistaken for a proposal", () => {
  for (const stdout of ["[]", "null", '"text"', "42"]) {
    const outcome = classifyMapProposalDerive(0, stdout, "");
    assert.equal(outcome.status, "unavailable", `stdout=${stdout}`);
  }
});

test("invalid JSON on exit 0 is not mistaken for a proposal", () => {
  const outcome = classifyMapProposalDerive(0, "{not json", "");
  assert.equal(outcome.status, "unavailable");
  assert.match(outcome.status === "unavailable" ? outcome.reason : "", /invalid JSON/);
});

test("the two documented no-op reasons are expected outcomes, not failures", () => {
  const noOps = [
    "error: no evidence-grounded Runtime decision is available to derive a topology proposal",
    "error: LearningMap already represents the evidence-grounded Runtime concepts and frontier",
  ];
  for (const stderr of noOps) {
    const outcome = classifyMapProposalDerive(2, "", `${stderr}\n`);
    assert.equal(outcome.status, "no_change", stderr);
  }
});

test("a real rejection keeps the runtime's own message and is never swallowed", () => {
  const outcome = classifyMapProposalDerive(
    2,
    "",
    "error: LearningMap proposal id was reused with different content\n",
  );
  assert.equal(outcome.status, "unavailable");
  assert.match(
    outcome.status === "unavailable" ? outcome.reason : "",
    /reused with different content/,
  );
});

test("a silent non-zero exit still produces a diagnosable reason", () => {
  const outcome = classifyMapProposalDerive(1, "", "");
  assert.equal(outcome.status, "unavailable");
  assert.match(outcome.status === "unavailable" ? outcome.reason : "", /code 1/);
});
