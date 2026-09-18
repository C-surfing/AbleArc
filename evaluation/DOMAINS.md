# Dogfooding Domains

The original five domains are deliberately different; procedural / skill-acquisition is a sixth extension added from real dogfooding evidence. The goal remains to expose failures that generalize across teaching contexts rather than tune the protocol to one subject.

## 1. Probability and statistics

Representative arc:

```text
conditional probability → Bayes theorem → Bayesian reasoning
```

Test:

- prerequisite detection;
- base-rate and inverse-probability misconceptions;
- intuition before formula when useful;
- derivation rather than formula recall;
- transfer to a structurally similar but surface-different problem.

Failure signals:

- formula appears before the learner has a reason for it;
- `P(A|B)` and `P(B|A)` confusion is corrected verbally but persists in use;
- one numerical success is treated as conceptual mastery.

## 2. Mathematics

Representative arcs:

- vectors → linear maps → eigenstructure;
- limit → derivative → local linearization;
- vector → covector → differential forms.

Test:

- roadmap as dependency hypothesis rather than chapter order;
- formalism / intuition calibration;
- hidden prerequisite discovery;
- proof or derivation evidence;
- transfer between representations.

Failure signals:

- terminology substitutes for mechanism;
- learner can manipulate symbols but cannot explain the invariant idea;
- roadmap remains unchanged after prerequisite evidence contradicts it.

## 3. Paper reading

Representative arc:

```text
problem → claim → method → evidence → limitation → research judgment
```

Test:

- distinguish summarization from understanding;
- reconstruct why the method is needed;
- map claims to evidence;
- identify assumptions and limitations;
- compare a result with an alternative explanation.

Failure signals:

- abstract restatement without argument reconstruction;
- paper terminology is repeated without causal understanding;
- the tutor critiques before the learner can reconstruct the authors' case.

## 4. Programming / Agent systems

Representative arcs:

- unfamiliar codebase → architecture model → targeted change;
- bug symptom → hypothesis → instrumentation → fix;
- Agent behavior → state / tool / control-loop diagnosis.

Test:

- learner acts rather than watches;
- debugging uses hypotheses and executable evidence;
- architecture explanations lead to implementation decisions;
- productive struggle is preserved while search / tooling friction is removed;
- transfer to a neighboring bug or design case.

Failure signals:

- tutor writes the solution before the learner forms a model;
- code is discussed without execution when execution is available;
- copied implementation is treated as capability.

## 5. Conceptual learning

Representative topics:

- blockchain and trust;
- distributed systems;
- attention / transformers;
- economic or philosophical mechanisms.

Test:

- causal mental-model construction;
- analogy use and eventual removal;
- discrimination between confusable models;
- explanation without borrowed vocabulary;
- transfer to a new scenario.

Failure signals:

- polished explanation creates recognition only;
- analogy becomes the learner's final model;
- Feynman check degenerates into generic "explain it in your own words".

## 6. Procedural / skill acquisition

Representative arcs:

- data structure → invariants → implementation → boundary transfer;
- language syntax → smallest runnable use → variation → independent production;
- algorithm/proof/tool procedure → essential steps → failure diagnosis → neighboring case.

Test:

- prediction before execution when it creates useful evidence;
- smallest viable performance rather than tutorial copying;
- distinction between semantic requirements and hygiene/convention;
- failure-mode diagnosis from violated structure;
- concrete artifact form when the Mission promises performance;
- transfer to a boundary or neighboring procedure.

Failure signals:

- prose explanation is accepted for a Mission that requires actual implementation;
- every code fragment is executed without a learning reason;
- the learner memorizes a canonical sequence but cannot explain which steps are essential;
- debugging becomes patch guessing rather than invariant diagnosis;
- the original example works but a small boundary change collapses performance.

## Cross-domain questions

For every arc, ask:

1. Did the runtime locate the right frontier?
2. Did it choose one high-value cognitive move rather than dump content?
3. Did learner action produce evidence that changed the next decision?
4. Did the learner model update conservatively?
5. Did the roadmap change when assumptions were falsified?
6. Did capability survive retrieval or transfer?
7. Did the learner become less dependent on the tutor?

## Sampling rule

Do not call a behavior a general protocol problem from one domain alone. Prefer evidence from at least two different arcs or domains before changing general teaching logic, unless the failure is clearly structural or safety-critical.
