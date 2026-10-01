# Contributing to AbleArc

AbleArc should become **thinner and more evidence-driven** as foundation models improve.

Before adding a rule, file, subsystem, or integration, ask:

1. What repeated learner-visible failure does this solve?
2. Is the failure about learner modeling, learning-opportunity detection, capability evidence, or capability routing?
3. Can a strong host model already solve it without AbleArc-specific machinery?
4. Can an existing reference or Learning Capability solve it?
5. What behavior scenario or real-session evidence would distinguish improvement from added ceremony?

## Contribution categories

### Core policy

Changes to `skills/ablearc/SKILL.md` need a strong reason.

A core rule should usually address a repeated, high-consequence failure and should be accompanied by a distinguishing scenario in `tests/SKILL-BEHAVIOR.md`.

### References

Prefer references for detailed pedagogy, source handling, research practice, evidence policy, and specialized routing.

Keep each reference focused so agents load only what they need.

### Host adapters

Host-specific files should remain thin. Do not duplicate the entire Skill inside an adapter.

### Learning Capabilities

Prefer routing to a strong external capability over reimplementing it inside AbleArc.

### Evaluation

New evaluation material should separate:

- observation;
- hypothesis;
- prediction;
- experiment;
- update.

A generated artifact or passing test is not learner-outcome evidence by itself.

## Pull-request checklist

- [ ] Normal AI use remains the default.
- [ ] Delegate work is not turned into tutoring.
- [ ] Core ownership remains small.
- [ ] New policy is justified by evidence or a clear structural failure.
- [ ] `skills-ref validate skills/ablearc` passes.
- [ ] Repository CI passes.
- [ ] Local Markdown links resolve.
- [ ] No retired Web / Runtime / provider architecture is reintroduced.
- [ ] Documentation matches the current learning-control-layer architecture.

## Development principle

> **Prefer clearer policy over more infrastructure.**

If a change makes AbleArc more visible but not more useful, it is probably the wrong change.
