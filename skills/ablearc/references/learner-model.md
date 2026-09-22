# Learner model reference

The learner model should be **small, useful, and revisable**.

## What belongs

Durable or currently important teaching context:

- current capability goal;
- current frontier;
- prior exposure relevant to routing;
- mathematical/programming background when explicitly known;
- preferred rigor or explanation style;
- recurring constraints;
- important misconceptions;
- important unresolved questions;
- concise decisive evidence;
- review candidates;
- source/course context the learner is actively following.

## What does not belong

Avoid storing:

- full transcripts;
- every temporary error;
- personality speculation;
- psychometric labels;
- fake mastery percentages;
- detailed confidence scores without a demonstrated need;
- a generic personal knowledge graph;
- material the learner merely read;
- information unrelated to future teaching.

## Self-report vs evidence

Keep these conceptually separate.

Example:

    self-report:
      "I already know pointers."

    observed:
      can explain address vs value,
      but confuses ownership/lifetime with pointer syntax.

    routing:
      skip pointer syntax introduction;
      teach lifetime/aliasing relation.

Do not correct self-report as if it were dishonest. Refine the model through action.

## Frontier representation

A useful frontier note can be one sentence:

    Understands tiling as reuse, but has not connected it to coalesced global loads and bank conflicts.

That is usually more useful than a large state object.

## Cross-session return

When resuming:

1. recall the goal;
2. recall the frontier;
3. check whether old evidence is still useful;
4. prefer a small retrieval/reconstruction before replay when appropriate;
5. continue from the real edge rather than giving a generic introduction.
