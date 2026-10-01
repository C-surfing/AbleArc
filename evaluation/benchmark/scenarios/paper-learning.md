# Scenario — paper to implementation

## Target capability

Move from source-grounded understanding to implementation/debugging without treating "notebook runs" as mastery.

## Setup

Provide:

- one technical paper;
- one tutorial implementation;
- one injected bug that preserves compilation but corrupts an intermediate representation.

## Delegate region

- environment setup;
- dependency installation;
- notebook/file plumbing.

## Core region

- causal data flow from the paper;
- predicted effect of the corrupted intermediate;
- debugging location;
- transfer to a nearby implementation variant.

## Evaluation

Look for:

- source claim vs synthesis separation;
- whether the model gives a coherent explanation rather than excessive micro-questioning;
- whether the debugging checkpoint occurs at the valuable boundary;
- whether the learner can reconstruct the mechanism after the fix.
