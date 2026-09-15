# Workspace and project storage contract

This document defines the read boundary introduced before the runtime becomes
project-aware. It does not authorize a silent migration and does not change the
v0.1 receipt contract.

## Layout detection

`tools/project_store.py` recognizes three states:

```text
uninitialized
legacy-v0.1
workspace-v0.2
```

The rules are deterministic:

1. `.learning/workspace.json` selects `workspace-v0.2`.
2. Without that manifest, root v0.1 markers select `legacy-v0.1`.
3. Otherwise the workspace is uninitialized.

The workspace manifest is therefore the atomic source-of-truth switch. A later
migration may retain root v0.1 files as a recovery copy without causing them to
be read twice.

## Canonical v0.2 paths

```text
.learning/
├── workspace.json
├── LEARNER.md
└── projects/<project-id>/
    ├── project.json
    ├── missions/<mission-id>/
    │   ├── mission.json
    │   └── MISSION.md
    ├── map/
    │   ├── current.json
    │   └── ROADMAP.md
    ├── STATE.md
    ├── misconceptions.json
    ├── reviews.json
    ├── materials/
    ├── records/
    ├── references/
    ├── artifacts/
    └── runtime/
```

`LEARNER.md` is workspace-scoped. The remaining learner-state objects are
project-scoped. Mission manifests are nested beneath their owning project and
must repeat that `project_id` so a mismatched or moved manifest is rejected.

The published manifest schemas are:

- [`workspace-v0.2.json`](../schemas/workspace-v0.2.json)
- [`project-v0.2.json`](../schemas/project-v0.2.json)
- [`mission-v0.2.json`](../schemas/mission-v0.2.json)

## Read-only boundary

`resolve_project_context()` validates manifest identity and returns resolved
paths. It does not create directories, infer a Project from a Mission, migrate
files, or update an active selection.

The current runtime continues to operate on the legacy root layout. A later PR
will make runtime commands explicitly project-aware; a separate migration PR
will perform preflight, copy, verification, and atomic activation. Until then,
v0.2 manifests are a storage contract and resolver target, not permission to
partially move live learner data.

## Compatibility

The synthetic IDs `legacy-v0-1` and `legacy-mission` provide explicit adapter
scope for the old single-project layout. They are not written into old
receipts. The v0.1 ledger remains unmodified and continues to verify against
its published schema and root paths.

