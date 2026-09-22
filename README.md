# AbleArc

**AbleArc is a lightweight adaptive learning skill.**

It helps an AI decide **what is worth learning next, how to teach it, and when the learner should think instead of being told the answer**.

The objective is simple: capability_after - capability_before.

AbleArc is no longer developed as a first-party Web learning product or a Learning OS. The canonical product surface is the conversation the learner is already using. AbleArc supplies the learning policy; specialized companion skills may supply diagrams, textbooks, research, code execution, or other artifacts when those materially improve learning.

> Keep the map in view. Teach at the frontier. Make the learner perform the important cognitive move.

## Core model

AbleArc intentionally keeps only four first-class learning concepts:

- **GOAL** — What capability is the learner trying to build?
- **MODEL** — What does current interaction suggest the learner can and cannot do?
- **FRONTIER** — What is the highest-value uncertainty or dependency to work on now?
- **MOVE** — What is the next bounded cognitive action?

Default loop:

    goal
      ↓
    understand learner
      ↓
    locate frontier
      ↓
    choose one move
      ↓
    teach / ask / show / generate / practice
      ↓
    observe learner
      ↓
    update model
      ↓
    continue, review, or stop

The learner should experience a natural conversation, not a visible state machine.

## Teaching principles

- Answer genuine questions before trying to assess.
- Diagnose before reteaching.
- Test lightly, not constantly.
- Never steal the learner's moment of discovery.
- Use direct explanation when direct explanation is the best move.
- Prefer retrieval before replay after a meaningful delay.
- Treat self-report as routing context, not proof of mastery.
- Use generated material as a learning aid, not as evidence that learning happened.
- Expand the learner's horizon selectively, not as automatic topic sprawl.

The canonical policy is in skills/ablearc/SKILL.md.

## Companion skills

AbleArc does not try to become a diagram engine, textbook generator, research framework, code runner, and document system at the same time.

Instead it may compose with specialized skills when available:

| Companion | Best use |
| --- | --- |
| [Archify](https://github.com/tt-a1i/archify) | mechanisms, workflows, state/lifecycle diagrams, architecture and learning maps |
| [University Skill](https://github.com/walkinglabs/university-skill) | structured textbook/coursebook generation when a substantial reusable learning artifact is justified |
| [wdkns-skills](https://github.com/wdkns/wdkns-skills) · `youtube-render-pdf` | turn a YouTube lecture/tutorial into structured, figure-rich course notes and PDF |
| [wdkns-skills](https://github.com/wdkns/wdkns-skills) · `bilibili-render-pdf` | turn a Bilibili lecture/tutorial into structured Chinese course notes and PDF, with subtitle/Whisper fallback |
| research/search tools | source verification, recent facts, paper/resource comparison |
| code execution | only when running code resolves uncertainty or creates useful learning evidence |
| document/PDF tools | packaging an artifact after the content itself is worth keeping |

These are optional capabilities, not hard dependencies. If a companion is unavailable, AbleArc falls back to the smallest useful inline representation.

See skills/ablearc/references/companion-skills.md.

## Install

For skill-compatible agents, install or copy the canonical directory:

    skills/ablearc/

For example:

    cp -R skills/ablearc ~/.agents/skills/ablearc

Then ask naturally:

    Use AbleArc to help me learn CUDA shared memory.
    I want to understand this paper, but teach the prerequisites only when needed.
    Review the MLP material I studied last week.
    I think I understand attention; test the weak part rather than restarting from zero.

No Web app, MCP server, provider setup, or runtime ledger is required for the canonical experience.

## Persistence

Persistence is optional and deliberately small. When the host can preserve useful state—or when a lightweight file is useful—AbleArc may retain:

- current learning goal;
- a compact learner model;
- the current frontier;
- durable teaching preferences;
- important misconceptions or uncertainties;
- a short evidence summary;
- review candidates.

Do not persist a transcript merely because storage is available. A compact optional template lives at `skills/ablearc/templates/learning-state.md`.

## Repository transition

Git history contains substantial earlier work on a Learning Runtime, Web workspace, MCP/plugin hosts, typed materials, and deterministic authority receipts. Those experiments informed the current teaching policy, but they are no longer carried in the default repository architecture.

The accepted reset is documented in:

- docs/SKILL-FIRST-ARCHITECTURE.md
- docs/adr/0012-skill-first-reset.md
- ROADMAP.md

The retired Web/MCP/plugin product shell and legacy Teach/Study Skill entries have been removed from the current tree. Git history preserves them. New behavior targets skills/ablearc.

## What AbleArc is not

AbleArc is not a learning dashboard, second-brain database, course platform, transcript-memory system, deterministic tutoring state machine, generic agent framework, or textbook generator by itself.

It is the **learning orchestrator** that chooses the next useful cognitive action and composes specialized capabilities only when they improve learning.
