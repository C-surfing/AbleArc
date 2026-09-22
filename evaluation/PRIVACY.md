# Learner evidence privacy

Real learning can reveal sensitive educational and personal context. Public repository evidence should be minimized.

## Local/private by default

If using files:

- .learning/ may contain optional learner state;
- .dogfooding/ may contain private evaluation notes.

Both are Git-ignored by default.

## Do not publish by default

Avoid committing:

- learner identity/account details;
- raw transcripts;
- grades tied to a person;
- private course material;
- unpublished source text without permission;
- credentials/tokens;
- proprietary code;
- unrelated personal details;
- speculative learner profiles.

## Minimize

A public failure report normally needs only:

- the relevant learner action in abstract/minimized form;
- AbleArc's decision;
- why that decision was wrong or useful;
- failure category;
- smallest proposed change;
- uncertainty.

Synthetic tests are useful for regression but do not count as evidence that a real learner improved.
