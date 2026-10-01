# AbleArc

**AbleArc is a lightweight learning control layer for AI-assisted work.**

It helps you use powerful AI without silently outsourcing the reasoning you want to keep.

> **Delegate execution. Preserve judgment. Build mental models. Accumulate capability.**

AbleArc does **not** compete with ChatGPT, Claude, or other conversation products. Those hosts already provide the fastest interaction surface, files, tools, search, and often project/session continuity.

AbleArc adds three things that a good one-off prompt does not reliably provide across time:

1. **Longitudinal learner model** — what you can actually explain, apply, debug, transfer, and retrieve later.
2. **Learning opportunity detection** — when AI should simply do the work, and when one short cognitive intervention is worth the interruption.
3. **Capability evidence & trajectory** — whether your capability is actually growing across sessions and projects.

## Why this exists

A stronger foundation model makes ordinary tutoring prompts less differentiated.

That is intentional.

AbleArc should not try to beat the model at explaining concepts. Its value should survive stronger models by focusing on a different problem:

    AI capability ↑
          ↓
    execution becomes cheaper
          ↓
    risk of outsourcing human judgment ↑
          ↓
    AbleArc protects the few cognitive moves worth retaining

A good prompt can improve **this turn**.

AbleArc is for improving the **capability trajectory**.

## Product boundary

    ChatGPT / Claude / other host
       conversation · files · tools · search · memory
                         │
                         ▼
                 AbleArc control layer
                 observe · decide · remember
                         │
               learning opportunity?
                 ├─ no  → continue normally
                 └─ yes → one useful intervention
                         │
                         ▼
                 Learning Capabilities
          material · representation · practice · evidence

The most common AbleArc action is **continue normally**.

There is no requirement to create a dedicated Web app, MCP server, runtime ledger, database, or visible learning state machine.

## Work × Learn

AbleArc uses a simple ownership model:

- **Core** — worth mastering deeply: explain, modify, debug, eventually redesign.
- **Review** — worth understanding well enough to judge.
- **Delegate** — low-value mechanical execution that AI should simply handle.

Usually only 1–3 items in a project phase should be Core.

Useful learning interventions include prediction, debugging hypotheses, Feynman reconstruction, perturbation, transfer, and delayed retrieval—but only when they create meaningful capability.

See skills/ablearc/SKILL.md.

## Learning Capabilities

AbleArc retains the strong learning-material and representation ecosystem already selected in this repository.

| Capability | Best use |
| --- | --- |
| [Archify](https://github.com/tt-a1i/archify) | architecture, mechanism, data flow, lifecycle, sequence, bounded learning maps |
| [University Skill](https://github.com/walkinglabs/university-skill) | substantial topic-first textbook/coursebook material |
| [wdkns-skills](https://github.com/wdkns/wdkns-skills) · youtube-render-pdf | turn a YouTube lecture into durable structured notes/PDF |
| [wdkns-skills](https://github.com/wdkns/wdkns-skills) · bilibili-render-pdf | Bilibili-oriented source-first lecture notes/PDF |
| [skills-for-learning](https://github.com/iannbing/skills-for-learning) | programming learning-by-building with meaningful milestones and progressive hints |
| [corpus-to-skill](https://github.com/nicholasswhite/corpus-to-skill) | reusable knowledge context from a substantial stable corpus |
| research/search | source verification, current facts, paper/resource comparison |
| code execution | experiments, runtime behavior, debugging, prediction tests |
| document/PDF tools | package material after the learning purpose is clear |

Artifacts are references. They are not mastery evidence.

Detailed routing remains in skills/ablearc/references/companion-skills.md.

## ChatGPT Projects

The preferred ChatGPT workflow is **one project per meaningful learning/work arc**, not one giant global AbleArc project.

Examples:

    AbleArc · Grad-CAM
    AbleArc · CUDA
    AbleArc · Research
    AbleArc · Embedded

Each project can contain its own papers, slides, code, generated material, chats, and a compact learner-state file when useful.

Copy:

    adapters/chatgpt-project/PROJECT_INSTRUCTIONS.md

into the project's instructions.

This gives you AbleArc behavior without installing a separate learning UI.

## Generic hosts

For hosts without Agent Skill support, use:

    adapters/generic/SYSTEM_PROMPT.md

For Skill-compatible hosts, install:

    skills/ablearc/

The Skill remains the canonical detailed behavior specification.

## Persistence

Host history answers:

> What happened?

AbleArc learner state answers:

> What do those events imply about my capability?

When explicit state helps, use:

    skills/ablearc/templates/learning-state.md

Keep it compact: mission, Core targets, frontier, decisive evidence, misconceptions, understanding debt, and review/transfer candidates.

Do not duplicate the transcript.

## Repository direction

The previous Web / Learning OS / deterministic Runtime work remains useful historical exploration, but it is not the canonical product path.

The current direction is:

- conversation-host native;
- prompt-friendly;
- Skill-compatible;
- longitudinal rather than ceremony-heavy;
- capability-focused rather than artifact-focused;
- strong-model compatible;
- specialized learning tools retained as optional capabilities.

See docs/adr/0013-learning-control-layer.md and ROADMAP.md.
