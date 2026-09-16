# Workspace and project storage contract

This document defines the validated read resolver, explicit write lifecycle,
and compatibility boundary for local Projects. Lifecycle commands never delete
archived learning state or silently rewrite immutable receipts.

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

## Read boundary

`resolve_project_context()` validates manifest identity and returns resolved
paths. It does not create directories, infer a Project from a Mission, migrate
files, or update an active selection.

Runtime and Workspace readers resolve the active Project's physical paths while
new receipts use the v0.2 scoped contract. The runtime assigns
`workspace_id`, `project_id`, and `mission_id` from the resolved context; agents
cannot override those fields. Migrated v0.1 receipts remain byte-for-byte
unchanged and readable as compatibility inputs inside the Project that contains
them.

## Project lifecycle

`tools/project_lifecycle.py` owns manifest mutations; the resolver remains
read-only. The supported transitions are:

| Current state | Command | Result | Runtime writes |
|---|---|---|---|
| no workspace / workspace-v0.2 | `create-project` | new active Project and Mission | allowed |
| active | `pause-project` | paused | blocked |
| paused | `resume-project` | active and selected | allowed |
| active or paused | `archive-project` | archived + maintenance scheduled | blocked |
| archived | `maintenance-due` | maintenance due | blocked |
| archived | `maintenance-start` | temporary `study_active` | allowed |
| archived + `study_active` | `maintenance-finish` | scheduled or due | blocked |

Archive means the main learning line is complete; it is not deletion. Mission
manifests, maps, materials, artifacts, evidence, and Runtime receipts stay in
place. A maintenance study appends new scoped receipts to the retained Project
and does not change its archived status. `archive-project` is the storage
transition only: it does not itself prove mastery or satisfy a Mission
Completion Gate. Teaching policy must establish that evidence before choosing
to archive a completed learning line.

Creating a Project uses a hidden staging directory, initializes its Runtime,
selects it through an atomic workspace manifest update, and verifies the result.
Failed creations are moved under `.learning/lifecycle/failed/`; the previous
active selection and learner profile are restored.

The CLI surface is:

```bash
python tools/learning.py create-project project.json
python tools/learning.py projects
python tools/learning.py switch-project <project-id>
python tools/learning.py pause-project <project-id>
python tools/learning.py resume-project <project-id>
python tools/learning.py archive-project <project-id>
python tools/learning.py maintenance-due <project-id>
python tools/learning.py maintenance-start <project-id>
python tools/learning.py maintenance-finish <project-id> retention_confirmed
```

The `create-project` JSON requires `title` and `goal`. Optional fields are
`why`, `project_id`, `mission_id`, and `source`. Creating the first
Project initializes workspace-v0.2 directly. A legacy-v0.1 workspace must use
`migrate-workspace` first so existing evidence is not orphaned.

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
