# Scenario — CUDA performance debugging

## Target capability

Reason about memory hierarchy and performance evidence instead of blindly applying optimizations.

## Setup

A tiled CUDA kernel becomes materially slower after changing tile geometry.

Provide:

- representative kernel code;
- profiler output only after the participant/model commits to an initial hypothesis;
- enough setup detail to rule out trivial compile/configuration failures.

## Delegate region

- build commands;
- profiler invocation;
- formatting;
- mechanical instrumentation.

## Core region

- bottleneck hypothesis;
- evidence that distinguishes global-memory access, occupancy, and shared-memory bank conflicts;
- model update after profiler evidence.

## Evaluation

Look for:

- task success;
- whether low-value setup was delegated;
- whether a prediction was elicited only when useful;
- quality of the discriminating signal;
- whether the learner can explain the final mechanism in a changed tile configuration.
