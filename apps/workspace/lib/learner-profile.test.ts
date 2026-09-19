import assert from "node:assert/strict";
import test from "node:test";
import {
  parseLearnerProfile,
  updateLearnerProfileMarkdown,
} from "./learner-profile.ts";

const template = `# Learner Model — Durable Profile

## Language and communication

- Preferred language:
- Desired level of detail:
- Preferred balance of intuition / formalism:

## Learning preferences

- Socratic tolerance:
- Preferred pace:

## Background

- Relevant prior knowledge:
- Programming / technical background:

## Stable reasoning / learning patterns

| Pattern | Teaching implication | Evidence | Confidence |
|---|---|---|---|
| mechanism first | explain mechanism before notation | repeated | high |
`;

test("learner profile parser reads only durable self-report fields", () => {
  const parsed = parseLearnerProfile(template.replace(
    "- Preferred language:",
    "- Preferred language: Chinese",
  ).replace(
    "- Relevant prior knowledge:",
    "- Relevant prior knowledge: linear algebra course completed",
  ));
  assert.equal(parsed.revision, 0);
  assert.equal(parsed.preferredLanguage, "Chinese");
  assert.equal(parsed.priorExposure, "linear algebra course completed");
});

test("learner profile update preserves unrelated durable observations and uses optimistic revisions", () => {
  const updated = updateLearnerProfileMarkdown(template, {
    preferredLanguage: "Chinese",
    detailLevel: "concise unless derivation matters",
    intuitionFormalism: "intuition first, then formal derivation",
    socraticTolerance: "moderate",
    preferredPace: "fast on familiar prerequisites",
    priorExposure: "linear algebra and calculus",
    reportedStrengths: "matrix multiplication",
    reportedWeaknesses: "eigenvalues",
    longTermGoals: "build stronger mathematical foundations for ML",
    sourceContext: "following a university MLP course",
    technicalBackground: "software engineering",
    toolsAndLanguages: "Python, C++, CUDA",
    typicalSessionLength: "30–60 minutes",
    recurringConstraints: "avoid repetitive setup questions",
  }, 0, "2026-09-19T00:00:00Z");

  assert.equal(updated.profile.revision, 1);
  assert.equal(updated.profile.reportedWeaknesses, "eigenvalues");
  assert.match(updated.markdown, /mechanism first/);
  assert.match(updated.markdown, /profile_revision: 1/);
  assert.match(updated.markdown, /Self-reported weaknesses: eigenvalues/);

  assert.throws(
    () => updateLearnerProfileMarkdown(updated.markdown, {}, 0),
    /changed/,
  );
});

test("learner profile update rejects transcript-like multiline blobs", () => {
  assert.throws(
    () => updateLearnerProfileMarkdown(template, {
      priorExposure: "first line\nsecond line",
    }, 0),
    /single line/,
  );
});
