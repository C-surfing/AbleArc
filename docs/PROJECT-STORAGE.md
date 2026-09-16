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

Runtime and Workspace readers resolve the active Project's physical paths while
new receipts use the v0.2 scoped contract. The runtime assigns
`workspace_id`, `project_id`, and `mission_id` from the resolved context; agents
cannot override those fields. Migrated v0.1 receipts remain byte-for-byte
unchanged and readable as compatibility inputs inside the Project that contains
them.

## Safe migration

```bash
python tools/learning.py migrate-workspace
```

The migration:

1. requires a legacy workspace with an explicit learner goal;
2. refuses symbolic links and unsafe caller-supplied IDs;
3. copies project-local files to a hidden staging directory;
4. verifies every copied file by SHA-256;
5. atomically renames the staged Project into place;
6. writes a migration report;
7. writes `workspace.json` last, activating the new resolver path;
8. verifies the copied runtime and resolved active Project.

Legacy root files are retained as a recovery source. If activation or runtime
verification fails, the new manifest and staged Project are moved under
`.learning/migrations/failed/`, leaving the legacy layout active and retryable.
Repeated invocation after success is a read-only `already_activated` result.

Unicode remains in display titles and Mission content. Filesystem IDs are
portable ASCII; a stable hash-based ID is derived when a title contains no
ASCII letters or numbers.

## Compatibility

The synthetic IDs `legacy-v0-1` and `legacy-mission` provide explicit adapter
scope for the old single-project layout. They are not written into old
receipts. The v0.1 ledger remains unmodified and continues to verify against
its published schema and root paths. A workspace-v0.2 Project may therefore
contain a mixed ledger: imported unscoped v0.1 history plus newly appended,
scoped v0.2 receipts. Direct cross-Project references are rejected. Receipts
that form one learner-action chain stay in one Mission, while Project-level
decisions may explicitly reuse evidence from an earlier Mission in that same
Project. Old receipts are never rewritten to manufacture provenance.
