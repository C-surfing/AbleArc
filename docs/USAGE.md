# Usage

`ai4learning` is intentionally usable without a dedicated app. The minimum unit is a skill file plus a small persistent learning workspace.

## Native skill loading

If your agent supports skills, copy or symlink:

```text
skills/teach/
skills/study/
```

into the agent's skill directory according to that agent's conventions.

Then invoke naturally:

```text
Teach me Bayes theorem.
```

```text
Help me really understand pointers in C.
```

```text
Continue my differential forms learning from where I left off.
```

```text
Study the probability material I learned this week.
```

The skill should read and maintain `.learning/` in the current project when persistence is useful.

## Agents without skill support

Paste or reference [`../prompts/bootstrap.md`](../prompts/bootstrap.md), then ask the agent to read the repository files.

A practical invocation is:

```text
Read prompts/bootstrap.md and enter ai4learning mode.
Teach me <topic>.
```

## First session

The agent should avoid a long intake form. It can create `.learning/` progressively.

A good first-session interaction often looks like:

```text
learner goal
→ tiny orientation map
→ one discriminative probe
→ first useful cognitive move
→ evidence
→ state update
```

If the learner's mission is ambiguous in a way that materially changes the route, ask one concrete mission question.

## Example: learning Bayes

Initial user message:

```text
Teach me Bayes theorem. I have basic probability but it has never felt intuitive.
```

A good opening is closer to:

```text
Probability → Conditional probability → Bayes → Bayesian inference
                                  ↑
                             current target

The formula is short; the hard part is why reversing a condition changes the answer so much. Before I give you the formula: a disease affects 1% of people, and a test catches 99% of sick people. If you test positive, does 99% feel like a plausible probability that you are sick, or should it be much lower?
```

The answer is diagnostic. The next turn depends on the learner's model rather than a fixed lesson script.

## Example: studying after teaching

User:

```text
Study Bayes with me. Don't reteach it unless I fail to retrieve something.
```

The study skill should begin with retrieval or application, not a summary.

For example:

```text
Without writing the formula, tell me what Bayes is correcting for when a positive test seems more convincing than it really is.
```

Then diagnose what failed.

## Persistent workspace setup

The recommended low-friction setup is:

```bash
python tools/learning.py init
```

This creates missing files from `templates/` under `.learning/` plus `records/` and `references/`. Existing learner state is never overwritten.

Manual setup remains valid:

```text
mkdir -p .learning/records .learning/references
cp templates/MISSION.md .learning/MISSION.md
cp templates/LEARNER.md .learning/LEARNER.md
cp templates/ROADMAP.md .learning/ROADMAP.md
cp templates/STATE.md .learning/STATE.md
```

Both approaches are optional. The agent can create files progressively when needed.

The Visual Workspace can also start from one learner-owned goal. Its API uses the same guarded local command:

```bash
printf '%s' '{"goal":"Read an empirical ML paper and challenge its causal claims"}' \
  | python tools/learning.py start-mission -
```

This succeeds only while `MISSION.md` is absent or still matches the untouched template. The Teach agent should consume the saved goal without asking the learner to repeat it, then create a small provisional map and first evidence-bearing Decision. Mission creation alone is not evidence of prior knowledge.

## Running a v0.2 longitudinal arc

Real evaluation evidence is local by default. Start an arc with:

```bash
python tools/learning.py start-arc probability bayes-base-rate
```

This creates a dated `.dogfooding/<arc>/` directory containing the selected domain brief, an arc record, and `sessions/001.md`. `.dogfooding/` is Git-ignored by default.

For the next meaningful session:

```bash
python tools/learning.py new-session <arc>
```

Inspect local scaffolding without printing learner evidence:

```bash
python tools/learning.py status
python tools/learning.py doctor
```

The helper does not choose teaching moves or infer mastery. Follow [`../evaluation/RUNBOOK.md`](../evaluation/RUNBOOK.md) for the actual evidence protocol and [`../evaluation/PRIVACY.md`](../evaluation/PRIVACY.md) before publishing any case derived from real learners.

## Recommended workflow

### For a course

Use one learning workspace per course or sufficiently coherent domain. Let the roadmap mirror conceptual dependencies rather than blindly mirror the textbook table of contents.

### For a book or paper

Keep the source as evidence, but let the agent build a roadmap around the conceptual structure required for your goal. A chapter order and a learning order are not always the same.

### For programming

Give the agent access to a runnable environment when possible. Prefer prediction, execution, inspection, modification, and explanation over passive code reading.

### For mathematics

Tell the agent your desired rigor. The roadmap should distinguish intuition, definitions, propositions, proof dependencies, techniques, and transfer problems when those distinctions matter.

### For exam preparation

State the exam scope and date in `MISSION.md`. Use Teach mode to repair models and Study mode to strengthen retrieval, discrimination, and representative application. Do not let exam preparation collapse entirely into recognition-style multiple choice unless the exam itself demands it.

## Commands are intentionally optional

The protocol is designed for natural language rather than a command-heavy interface. If your agent supports slash commands, these are enough conceptually:

```text
/teach <topic>
/study <topic>
/map
/state
/review
```

They should map to the same underlying state model; they are convenience interfaces, not separate systems.

The Python helper is likewise optional. It handles local files and evaluation scaffolding; it is not a user-facing teaching command language.

## What should be visible to the learner?

Usually visible:

- compact local roadmap when orientation helps;
- the current idea or challenge;
- meaningful feedback;
- relevant source links when useful;
- a concise note about what remains uncertain.

Usually hidden:

- repeated phase labels;
- raw learner-state bookkeeping;
- internal uncertainty calculations;
- long diagnostic plans;
- mechanical mastery scores.

The learner should feel guided, not administered.
