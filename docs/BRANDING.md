# AbleArc branding and compatibility

Status: **accepted public product name**  
Decision date: 2026-09-17

The public product name is **AbleArc**.

The name expresses the product's primary outcome: a learner moves along a longitudinal learning arc from "I cannot do this independently" to "I am able to do this independently." That is the same capability-delta objective used by the Learning Runtime and evaluation layer.

## Product naming

Use these names in new learner-facing and technical documentation:

- **AbleArc** — the overall project and public product brand;
- **AbleArc Learning OS** — the first-party learner-facing Web/API product;
- **AbleArc Learning Runtime** — the evidence-driven authority layer;
- **AbleArc Learning Engine** — the embeddable Agent / Skill / CLI / API capability;
- **AbleArc Workspace** — the current first-party Web implementation while it migrates toward Entry / Today / Focus Session.

## Compatibility policy

Branding must not force destructive migration of learner data or stable technical contracts.

Therefore:

- `.learning/` remains the persisted learner-state directory;
- existing runtime and schema version identifiers remain unchanged unless a functional migration requires a new version;
- legacy `AI4LEARNING_PROVIDER_*` environment variables remain accepted as compatibility aliases;
- new configuration and documentation should prefer `ABLEARC_PROVIDER_*`;
- historical ADR text may retain the old project name when it is describing the state of the system at the time of that decision;
- internal package identifiers may be migrated separately when the benefit exceeds the compatibility cost.

## Repository slug

The repository rename is complete: the canonical GitHub repository is `C-surfing/AbleArc`.

The historical `C-surfing/ai4learning` URL may continue to resolve through GitHub redirects, but new clone examples, links, documentation, and integrations should use the canonical AbleArc repository name. The administrative rename does not require renaming persisted `.learning/` data, schema identifiers, compatibility environment variables, or internal package identifiers.
