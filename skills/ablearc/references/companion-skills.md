# Companion skills

AbleArc is an orchestrator, not an all-in-one artifact engine.

Use a companion when it is the smallest way to improve the current learning move.

## General rule

Before delegating, ask:

1. What learning problem will this artifact solve?
2. Is the artifact better than a concise inline explanation?
3. Will the learner do something with it afterward?
4. Is the companion available in the current host?

If the answer to 1 or 2 is weak, do not delegate.

Companions are optional. Never block learning because one is unavailable.

## Archify

Source: https://github.com/tt-a1i/archify

Use when visual structure is the bottleneck:

- architecture;
- technical workflow;
- sequence;
- data flow;
- lifecycle/state;
- mechanism;
- compact learning map.

Examples:

- The learner keeps losing the order of an RSA + AES hybrid encryption flow. Ask Archify for a workflow.
- The learner understands individual attention equations but not the information path. Use a compact data-flow/mechanism diagram if prose has stopped helping.
- The learner asks for a map of a large topic. Use a bounded learning map, not a giant exhaustive graph.

Do not use Archify for decorative visuals.

After delivery, return to learning:

- ask the learner to trace the path;
- predict what changes if a node is removed;
- explain one dependency;
- reconstruct part of the flow.

## University Skill

Source: https://github.com/walkinglabs/university-skill

Available skills include:

- university-textbook — roughly 20-page focused textbook;
- university-coursebook — 40+ page systematic coursebook.

Use when the learner explicitly wants a substantial reusable artifact or when the topic is broad enough that a coherent reference will reduce future fragmentation.

Prefer university-textbook for fast structured entry, pre-reading, one bounded technical topic, or a compact reference to study alongside conversation.

Prefer university-coursebook for from-zero systematic study, a larger domain, deep prerequisite scaffolding, or a long-lived course artifact.

Do not generate 20–40 pages when a short explanation will solve the frontier.

After generation, AbleArc remains responsible for learning. Use the artifact to select a section, retrieve, predict, derive, or apply.

## Video lecture → learning material

Source: https://github.com/wdkns/wdkns-skills

Relevant skills:

- `youtube-render-pdf` — converts a YouTube lecture, tutorial, or technical talk into structured, figure-rich LaTeX course notes and a rendered PDF;
- `bilibili-render-pdf` — the Bilibili-oriented equivalent, including Bilibili metadata/parts handling and subtitle → Whisper → visual fallback when needed.

Use these when the learner provides a **specific video as a learning source** and converting it into a reusable artifact will reduce friction across later study.

Good cases:

- a 60-minute CUDA lecture the learner wants to study over several sessions;
- a Bilibili course episode containing diagrams, formulas, and code worth preserving;
- a tutorial where important frames and verbal explanation should be combined into one reference;
- a video series the learner is using as its primary course material.

Avoid a full render when:

- the learner only asks about one timestamp or one concept;
- the video is short enough to discuss directly;
- the artifact would be generated but not used;
- a topic-first textbook is more appropriate than a source-faithful video note.

Choose by source:

- YouTube URL → `youtube-render-pdf`;
- Bilibili/BV/b23 URL → `bilibili-render-pdf`.

Relationship to University Skill:

- **video render skills are source-first**: preserve and restructure what a particular lecture teaches;
- **University Skill is topic-first**: synthesize a coherent textbook/coursebook around a learning objective, potentially beyond any one source.

After rendering, AbleArc should treat the PDF as reference context. It can pick a section, connect it to the current frontier, ask the learner to reconstruct a mechanism, solve a related problem, or compare the video's explanation with another source.

The generated note is not mastery evidence.

## Programming learning-by-building

Source: https://github.com/iannbing/skills-for-learning

Relevant pattern:

- tutorial-style material gives theory, a minimal scaffold, and meaningful implementation milestones;
- guide-style support uses progressively stronger hints instead of immediately providing the full solution.

Use when the target capability is best learned by building, debugging, or extending a real software artifact.

Good cases:

- learn Rust ownership by completing a small program whose design forces ownership decisions;
- learn Redis by building against a concrete persistence/caching requirement;
- learn CUDA by implementing and iterating on a kernel rather than only reading explanations.

AbleArc remains the learning orchestrator. The project/tutorial is the practice environment.

Do not use a project merely because the topic is programming. A five-minute conceptual frontier may be better solved inline.

## Large source corpus → reusable knowledge skill

Source: https://github.com/nicholasswhite/corpus-to-skill

Use when a substantial stable corpus—books, documentation, papers, course notes, or a curated combination—will be revisited enough that converting it into a reusable knowledge skill meaningfully reduces navigation and synthesis overhead.

Useful outputs can preserve:

- frameworks and mental models;
- decision rules and trade-offs;
- patterns and anti-patterns;
- worked examples;
- failure modes;
- source disagreements.

Prefer deeper study-oriented extraction when the learner needs mechanisms, examples, and failure modes rather than a compact lookup reference.

Do not use this for one short document, ephemeral material, or as a replacement for learner action.

The resulting skill is knowledge context. It does not become the learner model and its existence is not evidence of mastery.

## Research/search

Use when:

- the claim is current;
- source fidelity matters;
- the learner is reading a paper or standard;
- competing explanations need comparison;
- an external fact is uncertain.

Research output is context, not learner evidence.

## Code execution

Use when:

- runtime behavior is the concept;
- a numeric result should be verified;
- the learner has made a testable prediction;
- debugging itself is the learning move.

Avoid execution when the model can explain the concept directly and running code adds no educational value.

## Document/PDF generation

Package a durable artifact only after its content and learning purpose are clear.

The existence of a polished document is never evidence that the learner can use the knowledge.


## Overlapping teaching Skills

Matt Pocock's `teach` Skill is a design influence, not a default runtime companion.

Source: https://github.com/mattpocock/skills/tree/main/skills/productivity/teach

Both `teach` and AbleArc make top-level teaching decisions. Running both as independent orchestrators can create conflicting mission/state/frontier policies.

AbleArc therefore adapts the useful mechanisms—mission grounding, ZPD, durable retrieval, trusted resources, compact learning records—inside its own policy. See `longitudinal-teaching.md`.

If a host explicitly chooses Matt's `teach` Skill instead of AbleArc, that is a valid alternate teaching workflow. Do not stack the two orchestrators by default.
