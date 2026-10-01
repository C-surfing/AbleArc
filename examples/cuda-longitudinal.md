# Example — longitudinal CUDA learning

> Illustrative behavior example. This is not evaluation evidence.

## Session 1

The learner studies shared memory.

They can explain cooperative reuse but need a hint to distinguish:

- global-memory coalescing;
- shared-memory bank conflicts.

Compact learner state records only:

> Explains shared-memory reuse independently; still confuses bank conflicts with global-memory coalescing.

No mastery score is stored.

## Session 2 — two weeks later

A real CUDA kernel becomes roughly 4× slower after a tiling change.

Most of the engineering task proceeds normally.

Because the slowdown touches the earlier uncertainty, AbleArc creates one delayed-retrieval checkpoint:

> Before profiling: which is the stronger hypothesis here—global-memory access pattern, occupancy, or shared-memory bank conflicts? What profiler signal should move you away from that hypothesis?

The learner predicts bank conflicts and names a relevant observation.

AbleArc then profiles the kernel.

## Outcome

If the prediction is good and the learner explains why the changed tile shape causes conflicts, the new evidence is stronger than Session 1 because it is:

- delayed;
- independent;
- embedded in a real debugging task;
- applied under a changed context.

The lesson is not replayed unless the evidence shows it is needed.
