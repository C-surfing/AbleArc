# Compatibility

AbleArc separates **format compatibility** from **real-host verification**.

Do not treat "this host probably reads SKILL.md" as evidence that the full workflow has been verified.

## Status vocabulary

- **CI-validated** — structure or metadata is checked automatically.
- **Adapter available** — AbleArc ships instructions for that host surface.
- **Dogfood pending** — expected to work, but repeated real use has not yet been recorded.
- **Dogfooded** — used in at least one real learning/work arc.
- **Verified** — repeated real use has not exposed a known blocking incompatibility.

## Current matrix

| Surface | Integration | Current status | Evidence |
| --- | --- | --- | --- |
| Agent Skills format | `skills/ablearc/` | **CI-validated** | official `skills-ref validate` plus repository policy checks |
| ChatGPT Projects | `adapters/chatgpt-project/PROJECT_INSTRUCTIONS.md` | **Adapter available / dogfood pending** | project-native instruction adapter exists |
| OpenAI/Codex-style Skill hosts | `skills/ablearc/` + `agents/openai.yaml` | **Packaged / dogfood pending** | canonical Skill + OpenAI metadata |
| Generic custom-instruction hosts | `adapters/generic/SYSTEM_PROMPT.md` | **Adapter available** | portable prompt adapter |
| Claude / other Agent-Skill clients | canonical Skill directory | **Spec-compatible in principle / not verified** | no AbleArc-specific host verification yet |

## Verification policy

Promote a host to **verified** only after repeated real use checks:

- Skill activation does not create intrusive tutoring;
- references load when needed;
- normal delivery remains fast;
- host-native memory/history does not conflict with explicit learner state;
- specialized Learning Capabilities remain optional;
- Core / Review / Delegate behavior survives host differences.

When a host requires a special installation path or metadata file, document that path here instead of changing AbleArc's core behavior.
