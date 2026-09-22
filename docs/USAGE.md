# Using AbleArc

AbleArc is a lightweight Agent Skill. The normal path does not require a Web app, MCP server, Provider configuration, database, or Runtime ledger.

## Install

Install or copy:

    skills/ablearc/

into the Skill directory used by your agent.

A generic manual install looks like:

    cp -R skills/ablearc ~/.agents/skills/ablearc

Use the equivalent Skill directory for your host.

If the host does not automatically load Skills, ask it to read:

    prompts/bootstrap.md

## Use it naturally

Examples:

    Use AbleArc to help me understand CUDA shared memory.
    I know gradient descent; my weak point is representation collapse.
    Help me learn from this paper. Only introduce prerequisites when they become necessary.
    Review attention with me, but do not reteach what I can retrieve.
    I am following this YouTube lecture; turn it into study material and then teach me from it.

AbleArc should answer genuine questions directly, locate the current learning frontier, and choose one useful cognitive move at a time.

## Optional companion Skills

AbleArc can compose with other Skills when they are installed.

### Archify

https://github.com/tt-a1i/archify

Use for mechanisms, workflows, architecture, sequence/data flow, state/lifecycle diagrams, and bounded learning maps.

### University Skill

https://github.com/walkinglabs/university-skill

Use topic-first material generation:

- university-textbook — focused reusable textbook;
- university-coursebook — deeper systematic coursebook.

### wdkns video render Skills

https://github.com/wdkns/wdkns-skills

Use source-first material generation:

- youtube-render-pdf — turn a specific YouTube lecture/tutorial into structured notes and PDF;
- bilibili-render-pdf — turn a specific Bilibili lecture/tutorial into structured notes and PDF.

A generated artifact is a reference, not proof that the learner understands it. AbleArc should return to retrieval, explanation, application, comparison, or transfer afterward.

## Optional persistence

AbleArc must work without persistence.

When the host can retain useful state, keep it small:

- current goal;
- current frontier;
- durable learning preferences;
- important misconceptions or uncertainties;
- concise decisive evidence;
- review candidates.

Do not store a full transcript merely because storage is available.

## Development

The canonical behavior specification is:

    skills/ablearc/SKILL.md

Behavior acceptance scenarios are:

    tests/SKILL-BEHAVIOR.md

Real-session validation is tracked through the Skill-first dogfood process described in evaluation/.

The retired deterministic Runtime, schemas, and project-state utilities now live only in Git history. The current repository is intentionally Skill-first.


## Teaching lineage

AbleArc also adapts several mechanisms from Matt Pocock's `teach` Skill: mission grounding, teaching near the learner's zone of proximal development, distinguishing immediate fluency from durable access, high-trust source curation, and compact decision-grade learning records.

AbleArc keeps these mechanisms inside its lighter Goal → Model → Frontier → Move loop rather than reproducing the original HTML lesson/workspace architecture.
