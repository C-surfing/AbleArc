# Usage

AbleArc has two first-class ways to use the same Learning Runtime:

```text
A. your own Agent + AbleArc skill
B. AbleArc Web + your own model API (BYOM)
```

They share the same learner-state and Runtime authority model, but they test different parts of the system.

- **Agent mode** primarily exercises the AbleArc Learning Engine / Runtime. Your Agent already supplies the model, so AbleArc does not need a separate Provider API key.
- **Web mode** exercises the first-party Learning OS path (`Entry → Today → DailyContext → Focus`). The Web needs a server-side Provider configuration so it can assess a saved learner response and propose the next move.

For the current pre-Phase-4 product pilot, use [`../evaluation/FIRST-PILOT.md`](../evaluation/FIRST-PILOT.md). A pure Agent session is still real learning evidence, but it does not by itself validate the Web product surfaces tracked in Issue #43.

---

## A. Use AbleArc with your own Agent

This is the simplest path when you already use an Agent such as a coding/research assistant that can read files and run commands.

### 1. Work from an AbleArc checkout

```bash
git clone https://github.com/C-surfing/AbleArc.git
cd AbleArc
python tools/learning.py doctor
python tools/runtime.py --repo . verify
```

The Agent should operate with the repository root as its working directory so it can use `skills/`, `tools/`, `.learning/`, and the Runtime together.

### 2. If the Agent supports skills

Expose or install:

```text
skills/teach/
skills/study/
```

according to that Agent's skill conventions.

Then invoke naturally, for example:

```text
Use the AbleArc Teach skill.
I want to become able to explain why nonlinear hidden representations make an MLP able to separate patterns that a single linear layer cannot.
```

or:

```text
Use the AbleArc Study skill and continue from my current learning state.
Do not reteach material I can retrieve.
```

### 3. If the Agent does not support skills

Ask it to read the bootstrap prompt:

```text
Read prompts/bootstrap.md and skills/teach/SKILL.md, then enter AbleArc mode in this repository.
I want to become able to <capability>.
```

`prompts/bootstrap.md` resolves workspace-v0.2 first. It uses the supported helpers to identify the selected Project/Mission and checks for a pending Workspace response before asking you to repeat anything.

### 4. Creating the first Project

The Agent may create the Project through the supported helper after you state a capability-oriented goal. You can also initialize it explicitly:

```bash
printf '%s' '{"title":"MLP representations","goal":"Explain and reason about how nonlinear hidden representations change what an MLP can express"}' \
  | python tools/learning.py create-project -
```

This creates a workspace-v0.2 Project/Mission and a conservative representative-attempt Decision. It does **not** invent mastery, misconceptions, or a domain map.

For a non-ASCII Project title in Agent mode, pass a readable portable
`project_id` explicitly instead of relying on the hash fallback. For example:

```bash
printf '%s' '{"title":"双向链表","project_id":"shuang-xiang-lian-biao","goal":"理解双向链表并能独立写出正确的插入、删除与边界处理代码"}' \
  | python tools/learning.py create-project -
```

The title remains learner-facing Unicode; the ID is a stable local path/receipt
identifier. A language-aware Agent should choose the transliteration or semantic
ASCII slug rather than asking the learner to manage internal IDs.

Useful inspection commands are:

```bash
python tools/learning.py projects
python tools/learning.py brief
python tools/learning.py map
python tools/runtime.py --repo . pending
```

Do not hand-edit Runtime receipts or canonical map revisions as a shortcut.

### 5. What Agent mode means architecturally

```text
your Agent/model
      ↓
AbleArc Teach / Study skill
      ↓
AbleArc Learning Runtime
      ↓
.learning/ learner state
```

There is no second AbleArc model call in this mode. Your Agent performs the teaching/assessment reasoning and commits through the Runtime boundary.

---

## B. Use AbleArc through the Web

The Web path is the current first-party Learning OS experience:

```text
Entry
  ↓
Today + DailyContext
  ↓
Focus Session
  ↓
learner response
  ↓
BYOM assessment
  ↓
next Runtime Decision
```

### 1. Install the Workspace

From the repository root:

```bash
python tools/learning.py doctor
python tools/runtime.py --repo . verify
```

Then:

```bash
cd apps/workspace
npm install
cp .env.example .env.local
```

### 2. Configure your own model

Edit `apps/workspace/.env.local`.

For a Provider that supports strict JSON Schema on OpenAI-compatible Chat Completions:

```bash
ABLEARC_PROVIDER_API_KEY=<your key>
ABLEARC_PROVIDER_MODEL=<model id>
ABLEARC_PROVIDER_BASE_URL=<provider base URL>
ABLEARC_PROVIDER_STRUCTURED_OUTPUT=json_schema
ABLEARC_PROVIDER_TIMEOUT_MS=45000
```

For DeepSeek Chat Completions, use JSON Object mode:

```bash
ABLEARC_PROVIDER_API_KEY=<your DeepSeek API key>
ABLEARC_PROVIDER_MODEL=deepseek-flash
ABLEARC_PROVIDER_BASE_URL=https://api.deepseek.com
ABLEARC_PROVIDER_STRUCTURED_OUTPUT=json_object
ABLEARC_PROVIDER_TIMEOUT_MS=45000
```

The current pilot reads credentials only on the local server. Do **not** use `NEXT_PUBLIC_` variables and do not commit `.env.local`.

A learner-facing Provider Settings screen is not implemented yet; during the current local pilot BYOM is configured through `.env.local`. See [`AGENT-ADAPTER.md`](AGENT-ADAPTER.md).

### 3. Start the Web product

```bash
npm run dev
```

Open the local Next.js URL and start at `/`.

If there is no learner state, AbleArc shows Entry and asks what you want to become able to do. Returning use goes through Today. Evidence-bearing recommendations enter `/focus`.

### 4. Use it as a learner, not as a test script

For a real session:

1. state a capability you genuinely care about;
2. use Today and optionally set DailyContext;
3. enter Focus from the primary action;
4. reveal scaffolds only when you actually need them;
5. submit your real reasoning;
6. let the configured Provider assess that response;
7. continue when the next Runtime Decision appears.

The Provider only proposes the assessment and next move. Runtime validation remains the learner-truth boundary.

---

## Real dogfooding / evaluation

If you are intentionally using AbleArc to guide product development, start a private arc from the repository root before or around the real session:

```bash
python tools/learning.py start-arc conceptual mlp-representation-learning
```

Available domains:

```text
probability
mathematics
paper-reading
programming-agent
conceptual
procedural
```

This creates a Git-ignored `.dogfooding/<arc>/` directory with `sessions/001.md`.

For another meaningful session:

```bash
python tools/learning.py new-session <arc>
```

After a Web pilot session, create the product observation checkpoint:

```bash
python tools/vnext_product_dogfood.py --repo . start <arc> --entry-mode workspace
python tools/vnext_product_dogfood.py --repo . status <arc>
python tools/vnext_product_dogfood.py --repo . validate <arc>
python tools/vnext_product_dogfood.py --repo . summary <arc>
```

Use [`../evaluation/FIRST-PILOT.md`](../evaluation/FIRST-PILOT.md) for the exact first Web pilot procedure. Use [`../evaluation/RUNBOOK.md`](../evaluation/RUNBOOK.md) for longitudinal Runtime evidence. Keep private learner evidence local according to [`../evaluation/PRIVACY.md`](../evaluation/PRIVACY.md).

Agent-mode sessions can contribute genuine longitudinal Runtime evidence. However, Agent mode does not observe whether Entry, Today, DailyContext, Focus chrome, Web scaffolds, or the Web response-to-assessment flow are good product interactions; those require Web dogfooding.

---

## Teaching behavior

A good first-session interaction often looks like:

```text
learner goal
→ small orientation
→ one discriminative probe
→ first useful cognitive move
→ learner action
→ evidence
→ repair or advance
```

The agent/product should avoid a long intake form. If the mission is ambiguous in a way that materially changes the route, ask one concrete question rather than a questionnaire.

### Example: learning Bayes

Initial learner intent:

```text
Teach me Bayes theorem. I have basic probability but it has never felt intuitive.
```

A useful opening is closer to:

```text
Probability → Conditional probability → Bayes → Bayesian inference
                                  ↑
                             current target

The formula is short; the hard part is why reversing a condition changes the answer so much. Before I give you the formula: a disease affects 1% of people, and a test catches 99% of sick people. If you test positive, does 99% feel like a plausible probability that you are sick, or should it be much lower?
```

The answer is diagnostic. The next move depends on the learner's model rather than a fixed lesson script.

### Study after teaching

```text
Study Bayes with me. Don't reteach it unless I fail to retrieve something.
```

Study mode should begin with retrieval/application rather than a summary.

---

## Recommended domain workflows

For a course, use one Project per sufficiently coherent capability line and let the map mirror conceptual dependencies rather than blindly mirror the textbook table of contents.

For a book or paper, keep the source as evidence but let the learning route follow the conceptual structure required by the learner's goal.

For programming, give the Agent access to a runnable environment when possible, but do not execute by reflex. Prefer prediction and reasoning first; run/build/test when concrete behavior, learner code, or environment effects can change the teaching decision. For learning a language, data structure, algorithm, or other productive skill from scratch, use the `procedural` dogfood arc rather than `programming-agent`, which is for understanding/debugging an existing system.

For mathematics, state the desired rigor. The map may distinguish intuition, definitions, propositions, proof dependencies, techniques, and transfer problems when those distinctions matter.

For exam preparation, store the exam scope/constraints in the Mission. Use Teach to repair models and Study to strengthen retrieval, discrimination, and representative application.

## What should be visible to the learner?

Usually visible:

- compact local structure when orientation helps;
- the current idea/challenge;
- one clear learner action;
- meaningful feedback;
- relevant sources when useful;
- concise uncertainty / next-step context.

Usually hidden:

- receipt mechanics;
- repeated internal phase labels;
- raw learner-state bookkeeping;
- long diagnostic plans;
- mechanical mastery scores.

The learner should feel guided, not administered.
