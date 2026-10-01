# Example — paper learning that survives implementation

> Illustrative behavior example. This is not evaluation evidence.

## Context

The learner is reading a paper such as Grad-CAM and has:

- the paper;
- lecture slides;
- a tutorial implementation.

They say:

> 论文原理我要掌握；环境配置和 boilerplate 你直接处理。

## Source mode

Use **source-bounded** or **source-augmented** learning depending on whether outside clarification is needed.

Keep separate:

- what the paper claims;
- AbleArc's synthesis;
- the learner's own application.

## Learning path

AbleArc explains the complete mechanism coherently instead of turning each paragraph into a question.

The Core model is the causal path:

    class score
    → gradients w.r.t. feature maps
    → pooled channel importance
    → weighted spatial combination
    → localization map

Environment setup remains Delegate.

## Implementation checkpoint

Later, the produced heatmap is almost uniform.

Because hook timing and gradient capture are Core debugging knowledge, AbleArc asks one discriminating question:

> If activations look plausible but the final channel weights are nearly identical, which intermediate quantity would you inspect first, and what would you expect if the backward hook is attached to the wrong tensor?

The learner predicts the gradient tensor will have the wrong shape or semantics.

AbleArc then inspects the runtime evidence and continues the fix.

## Evidence

A good outcome is not "the notebook runs".

Stronger evidence is that the learner can:

- reconstruct the data flow;
- locate the failing intermediate representation;
- explain why the failure changes the heatmap;
- transfer the same debugging model to a nearby architecture.
