# First AbleArc Kernel v1 Pilot

Use this runbook for a real learner-facing AbleArc session during the active K8 longitudinal validation gate. It is intentionally operational: the goal is to run the product as a learner, preserve real evidence, and collect enough product observations to decide what should happen next.

This is **not** a synthetic acceptance test. Do not invent learner responses, successful assessments, feature needs, or capability change.

## What this pilot validates

Run the complete current product loop:

```text
Entry
  ↓
Today + DailyContext
  ↓
Focus Session
  ↓
learner response
  ↓
assessment
  ↓
next Runtime Decision
```

The pilot should answer two different questions without mixing them:

1. **Learning Runtime:** did the learner produce evidence and did the Runtime remain conservative about learner truth?
2. **Learning OS:** was Entry → Today → Focus understandable, focused, and continuous enough for daily use?

Use `sessions/NNN.md` for the first question and `product-observations/NNN.json` for the second.

## 0. Preconditions

Use a real learning goal you already care about. Do not choose a toy topic solely to make the product look successful.

The following commands are **developer/evaluator preflight for a source checkout**, not part of the learner interaction:

```bash
python tools/learning.py doctor
python tools/runtime.py --repo . verify
cd apps/workspace
npm install
npm run test
npm run typecheck
npm run dev
```

Open the local URL printed by Next.js. After the Web app is running, normal learning use is graphical; the learner should not need Python or AbleArc CLI commands.

### Provider setup in the Web UI

On first open, AbleArc shows **Model Setup** before Entry. Configure the Provider graphically:

- choose an OpenAI-compatible, DeepSeek-compatible, or custom compatible preset;
- enter the API key;
- enter the model ID;
- confirm the base URL;
- change structured-output compatibility only when the Provider requires it;
- choose **Save and enter AbleArc**.

The local key is stored in the Git-ignored `.ablearc-local/provider-settings.json`, outside learner state. Later changes go through **Settings** or `/settings`.

Environment variables remain an optional deployment/developer override and take precedence over Web settings; they are not required for the normal local learner flow.

If no Provider is configured, the learner response can still be recorded by the Workspace, but assessment must be completed through the existing Teach/Study agent bridge. Do not mark the evidence-turn surface as passed unless the turn actually reaches an assessed next Runtime Decision.

## 1. Start a private dogfooding arc

As the **evaluator**, choose the matching domain brief and create one local arc before or immediately after starting the real learning session. This bookkeeping stays outside the learner-facing Web flow:

```bash
python tools/learning.py start-arc <domain> <working-name>
```

Available domain values are:

```text
probability
mathematics
paper-reading
programming-agent
conceptual
```

The command creates a Git-ignored `.dogfooding/<arc>/` directory. Keep raw learner content and private materials local.

Record the returned arc directory name. You will use it throughout the pilot.

## 2. Enter through the learner-facing product

Do not initialize the Project through low-level Runtime commands for this pilot unless you are explicitly testing recovery.

Start at `/`.

For a new workspace:

1. read the Entry screen as a learner, without inspecting implementation details;
2. enter one capability-oriented goal;
3. confirm the resulting Project/Mission reflects that goal without inventing mastery or a LearningMap;
4. note approximately how long it took to understand what the product expected.

For an existing workspace, start on Today and continue the currently selected real Project.

Do not inspect receipts, state proposals, or internal graph controls unless the normal product path forces you to.

## 3. Use Today as the return surface

On Today:

1. identify whether one primary action is obvious within seconds;
2. note whether the Mission/frontier context is sufficient without becoming a dashboard;
3. save one realistic DailyContext;
4. inspect the session-shape rationale only if you would naturally want to know why the recommendation changed.

During the same pilot arc, use materially different DailyContext conditions in another session when possible. For example, compare a short/low-energy block with a longer/high-focus block.

The important invariant is:

> DailyContext may alter recommendation or session shape, but it must not create Evidence, change mastery, revise the Map, or satisfy Completion.

## 4. Complete one Focus Session turn

Enter `/focus` through the primary evidence-bearing Today action.

During the session:

- keep the current cognitive move central;
- use a typed representation/artifact if one is naturally available;
- optionally use the timer;
- reveal a scaffold only when you actually need it;
- answer as the learner, not as an evaluator trying to satisfy a test;
- submit one real learner response.

If anything unexpectedly interrupts the learning flow, forces context switching, creates uncertainty about what to do next, or makes you leave the current surface, note what happened in neutral behavioral terms. Do not decide during the session which feature should solve it.

If you reveal scaffolds, judge whether they helped expose structure without giving away the learner's important inference.

## 5. Complete assessment and reach the next move

The pilot is not complete after submitting a response.

Complete the response → assessment → next-decision loop and confirm:

- feedback is visible;
- the learner is not asked to repeat an already-saved response;
- a next Runtime Decision is available when justified;
- progressive scaffold reveal state does not leak into the next decision;
- no client interaction silently promotes mastery;
- the learner does not need to understand receipt mechanics to proceed.

If the Provider fails, record the failure. Retry only through the supported path; do not hand-edit Runtime receipts to manufacture a successful turn.

## 6. Record learning evidence

Complete the corresponding local session record:

```text
.dogfooding/<arc>/sessions/NNN.md
```

Record decisive evidence only:

- capability before;
- learner-model hypothesis that mattered;
- selected cognitive move;
- learner action;
- evidence level;
- capability after, if actually supported;
- remaining uncertainty;
- state/map consequences, if any;
- Runtime failure label when something broke.

`insufficient_evidence` is a valid result.

## 7. Record product observations

Create the product checkpoint for the same numbered session:

```bash
python tools/vnext_product_dogfood.py --repo . start <arc> --entry-mode workspace
```

If `status` later reveals an older real session without a checkpoint, backfill only the empty template for that existing session:

```bash
python tools/vnext_product_dogfood.py --repo . start <arc> --entry-mode workspace --session NNN
```

Backfill does not authorize reconstruction of observations from memory. Fill only behavior you genuinely observed or recorded contemporaneously.

Inspect coverage:

```bash
python tools/vnext_product_dogfood.py --repo . status <arc>
```

Edit `product-observations/NNN.json` and leave anything unobserved as `not_observed` / `null`.

The current checkpoint records neutral product behavior such as `continuity_friction`; it does not ask whether a preselected feature is needed. Use freeform notes for the smallest factual description of what happened, without jumping to a solution.

Then validate:

```bash
python tools/vnext_product_dogfood.py --repo . validate <arc>
python tools/vnext_product_dogfood.py --repo . summary <arc>
```

The summary is descriptive only. It cannot promote a feature.

## 8. Check lifecycle and narrow layout separately

Do not distort the main learning session just to hit every checkbox.

After the evidence-bearing turn, use a separate deliberate check for:

- paused Project read-only behavior;
- archived Project read-only behavior;
- archived `study_active` maintenance showing Study semantics;
- narrow/mobile layout keeping the learning canvas first.

Record `not_observed` for any condition you did not actually inspect.

## 9. Pilot completion criteria

One pilot session is complete when all of the following are true:

- one real capability-oriented Project/Mission was used;
- the learner entered through Entry or Today;
- DailyContext was used or deliberately left absent;
- one Focus Session learner response was recorded;
- that response was actually assessed;
- the next Runtime Decision or conservative stop state was reached;
- `sessions/NNN.md` contains real decisive evidence;
- `product-observations/NNN.json` contains only observed product behavior;
- `status` shows no accidental orphan checkpoint;
- `validate` passes.

A single pilot does **not** justify a general product or Runtime rule by itself.

## 10. What happens after the first pilot

Continue the same longitudinal arc rather than immediately redesigning the product.

A later session should depend on earlier evidence and, when appropriate, include retrieval, reduced scaffolding, representation/context perturbation, or transfer.

Only after observing real friction should you formulate a feature hypothesis. First describe the learner-visible problem, then ask whether it repeats or is structurally severe, and finally use `evaluation/PROMOTION.md` to test whether a proposed feature is the smallest sufficient fix. Do not preserve a discarded solution as a latent roadmap requirement; the former Capture Inbox hypothesis was explicitly not promoted after the first dogfooding correction.

For Runtime protocol changes, follow the same principle: classify the failure first, collect enough independent evidence, and promote the smallest sufficient change rather than patching one awkward interaction.
