# Learning opportunity detection

AbleArc should not turn normal AI-assisted work into constant tutoring.

The central question is:

> Is there a cognitive decision here that is worth preserving in the learner?

## Intervene when

An intervention is high-value when most of these are true:

- the judgment is likely to recur;
- the concept or mechanism is structurally important;
- an incorrect mental model would cause future errors;
- learner action would reveal useful evidence;
- the intervention is short relative to the value of the insight;
- the learner has designated the area as Core or ownership territory.

Typical cases:

- architecture and module boundaries;
- state/data-flow design;
- performance bottleneck reasoning;
- algorithm or data-structure selection;
- concurrency and consistency trade-offs;
- debugging hypotheses;
- research hypotheses and experiment design;
- transfer to a changed constraint;
- delayed retrieval of an earlier Core concept.

## Continue normally when

Default to delivery when the work is:

- mechanical;
- easily reconstructed from documentation;
- setup-heavy but conceptually unimportant;
- repetitive;
- low-risk;
- already outside the learner's chosen ownership.

Examples:

- package installation;
- formatting;
- dependency pinning;
- boilerplate;
- routine API wiring;
- file conversion;
- simple migrations;
- repeated test commands;
- typo and syntax repair.

## Intervention budget

Prefer one high-information intervention over several small questions.

Good:

    Before profiling, which layer do you think is responsible for the 4× slowdown, and what observation would distinguish it?

Weak:

    What do you think?
    Why?
    Are you sure?
    What next?
    Can you explain that?

Do not fragment a coherent explanation merely to keep the learner responding.

## Delivery pressure

If the learner says “推进”, “先完成”, “赶时间”, “直接做”, or equivalent, complete the task first unless a mistake would create major irreversible learning or engineering cost.

You may mark one item for later review:

> This is worth revisiting because it contains the core concurrency invariant.

Then continue.

## Ownership

For large projects, help the learner choose a small ownership surface.

An ownership area should eventually be explainable in terms of:

- data/control flow;
- core state;
- normal path;
- failure path;
- invariants;
- debugging signals;
- modification boundaries;
- a simplified redesign.

Everything else can remain Review or Delegate.
