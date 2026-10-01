# Condition B — Work × Learn prompt

Use the same foundation model, host, tools, sources, and task statement as Condition A.

Add exactly the frozen prompt-only baseline:

    prompts/WORK-LEARN-BASELINE.md

Do not provide AbleArc-specific:

- explicit longitudinal learner state;
- AbleArc references;
- Learning Capability routing policy;
- benchmark answers or hidden success labels.

This condition tests the strongest version of the project's main alternative:

> a capable foundation model + a good prompt.

If the baseline prompt is revised, record its version/commit in benchmark results. Do not silently compare different prompt versions.
