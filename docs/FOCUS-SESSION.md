# Focus Session

Status: **Phase 3 product surface**

Focus Session is AbleArc's reduced-chrome surface for completing one evidence-bearing learning turn. It does not introduce a second teaching runtime. It reuses the existing LearningCanvas and the established response → assessment → next-decision flow.

## Product path

```text
Today recommendation
      ↓
/focus
      ↓
current Runtime Decision
      ↓
representation / artifact
      ↓
learner response
      ↓
/api/learning/respond
      ↓
/api/learning/advance or external Agent
      ↓
Runtime Evidence + next Decision
```

The full Runtime-oriented Workspace remains available at `/workspace` for inspection, Project lifecycle operations, map/evidence controls, and development workflows.

## Focus surface

Focus intentionally reduces navigation and keeps the current cognitive move central. The shell adds only session-support controls around the existing evidence-bearing canvas:

- Today/back navigation;
- optional timer;
- context-derived session shape;
- progressive scaffold pathway;
- Workspace escape hatch;
- lifecycle/readiness warnings.

Representation and LearningArtifact rendering are reused from `LearningCanvas`; Focus does not create an alternate renderer stack.

## Timer boundary

The timer is ephemeral UI state. It is not persisted, does not create an Observation, and does not count as learning Evidence. Reaching zero changes no learner state.

If DailyContext contains `availableMinutes`, Focus uses it as the initial timer duration, bounded for the Focus UI. The timer remains opt-in and starts paused.

## Scaffold pathway

The first scaffold levels reuse fields already present in the Runtime Decision:

1. expected Evidence target;
2. falsification/self-check signal;
3. a generic representation or uncertainty-exposure prompt.

The pathway deliberately does not fabricate a domain answer, mark a hint as Evidence, or mutate mastery. Its purpose is to reduce unnecessary answer revelation while letting the learner request progressively more structure.

Later scaffold generation may involve the Teacher/Provider, but it must remain a learning-move support capability and must not bypass the Runtime authority boundary.

## Lifecycle safety

Focus uses the same lifecycle semantics as the existing composer:

- active Project → writable;
- paused Project → read-only;
- archived Project → read-only;
- archived Project with `study_active` maintenance → writable within that maintenance flow.

If no structured Runtime Decision exists, Focus can render context but directs the learner back to Workspace rather than pretending an evidence-bearing turn is ready.

## Mobile behavior

The canvas is first in document and visual order on narrow screens. The support rail moves below it. Provider/source chrome is reduced further on mobile so the learner action, representation, and response composer remain the dominant surface.

## Authority invariant

Focus adds no new learner-truth write path. Only the existing Runtime-mediated response and advance paths can turn learner action into accepted Evidence. Timer use, opening a scaffold, navigation, and representation switching do not themselves alter mastery, Map, Review state, or Mission Completion.
