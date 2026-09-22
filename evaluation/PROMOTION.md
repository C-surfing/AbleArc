# Skill rule promotion record

Use this before adding a general rule to skills/ablearc/SKILL.md because of dogfooding evidence.

## Proposed change

- Proposed behavior:
- Scope: general / domain / representation-tooling / persistence / evaluation-only
- Current failure:

## Observed evidence

| Session/arc | Domain | Failure category | Observable consequence |
|---|---|---|---|
|  |  |  |  |

## Generality

- Independent observations:
- Domains represented:
- Does it survive wording/topic changes?
- Could this be learner-specific?
- Could a clearer existing instruction solve it?
- Could an existing companion Skill solve it?

## Smallest fix

Check the smallest sufficient layer:

- learner-model interpretation
- frontier selection
- cognitive-move selection
- conversational execution
- evidence interpretation
- domain strategy
- representation/tool choice
- persistence
- core Skill rule

## Regression scenario

Update tests/SKILL-BEHAVIOR.md so the old behavior has an identifiable failure and the new behavior repairs it.

## Decision

- promote_general_rule
- promote_domain_strategy
- update_reference_only
- collect_more_evidence
- no_change

Rationale:
