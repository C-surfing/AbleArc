# Using AbleArc

AbleArc is designed to live inside the AI conversation environment you already prefer.

The fastest path is not to launch a separate learning product. Use ChatGPT, Claude, or another capable host normally and add AbleArc as a control layer.

## ChatGPT Project — recommended

For a meaningful learning/work arc, create a dedicated Project such as:

    AbleArc · Grad-CAM
    AbleArc · CUDA
    AbleArc · Research
    AbleArc · Embedded

Put the relevant papers, slides, notes, code, and generated learning materials in that project.

Copy the contents of:

    adapters/chatgpt-project/PROJECT_INSTRUCTIONS.md

into the Project Instructions.

Then work normally:

    Help me run this Grad-CAM experiment.
    Explain this equation.
    推进，把环境问题直接解决。
    这个 CUDA memory hierarchy 是我要掌握的。
    带我学这一段。
    复盘刚刚为什么这个 bug 会发生。
    检查我是不是真的懂 bank conflict。

The project itself is the UI and working context.

## Skill-compatible hosts

Install or copy:

    skills/ablearc/

into the host's Skill directory.

The canonical behavior specification is:

    skills/ablearc/SKILL.md

## Generic hosts

If a host supports custom/system instructions but not Agent Skills, use:

    adapters/generic/SYSTEM_PROMPT.md

## Core / Review / Delegate

You do not need to label everything.

Use these categories only when ownership matters:

- Core — capability you want to retain deeply;
- Review — capability you need to judge but not rebuild;
- Delegate — work AI should simply execute.

AbleArc should usually keep only 1–3 Core items active.

## Optional explicit learner state

Project/chat history is useful context, but history and capability state are different.

When continuity benefits from explicit compression, create a small LEARNING_STATE.md from:

    skills/ablearc/templates/learning-state.md

Keep only decision-relevant state. Do not copy the transcript into it.

## Learning Capabilities

AbleArc preserves and routes to the strong learning tools already selected by this repository.

### Archify

https://github.com/tt-a1i/archify

Use when structural understanding is blocked by prose: mechanisms, architecture, sequence, data flow, state/lifecycle, bounded learning maps.

### University Skill

https://github.com/walkinglabs/university-skill

Use when a substantial reusable topic-first textbook or coursebook is justified.

### wdkns video render Skills

https://github.com/wdkns/wdkns-skills

Use when a specific lecture video should become durable source-faithful study material:

- youtube-render-pdf;
- bilibili-render-pdf.

### Programming learning-by-building

https://github.com/iannbing/skills-for-learning

Use when the target capability is best learned through a real implementation with minimal scaffolding and progressive hints.

### Large corpus → reusable knowledge context

https://github.com/nicholasswhite/corpus-to-skill

Use for substantial stable corpora that will be revisited enough to justify reusable extraction.

### Research and execution

Use search/research when freshness, attribution, or source verification matters.

Run code when execution tests a prediction, resolves runtime uncertainty, or creates useful debugging evidence.

## Important boundary

Generated artifacts are learning resources, not proof of learning.

A PDF, diagram, passing test suite, or completed project can coexist with weak human understanding.

AbleArc exists to notice that distinction without turning every task into a quiz.

## Development

Behavior acceptance scenarios:

    tests/SKILL-BEHAVIOR.md

Architecture:

    docs/SKILL-FIRST-ARCHITECTURE.md

Current decision:

    docs/adr/0013-learning-control-layer.md

Dogfood/evaluation:

    evaluation/

The old Web, MCP, runtime-ledger, and product-shell experiments remain available in Git history but are not required for current use.
