# AbleArc Agent UI Checklist

Read this before modifying any learner-facing Web surface.

Canonical visual direction: [PLAYFUL-FOCUS-V0.1.md](PLAYFUL-FOCUS-V0.1.md).

## Before coding

1. Read the existing component and its tests.
2. Identify all user-visible functions on the surface.
3. List which functions must remain reachable after the redesign.
4. Identify the Runtime/Host boundary. Do not move learner truth into React.
5. Choose at most 2–3 reference products for the specific problem; state what is borrowed and what is not.

## Implementation definition of done

A redesign is **not complete** if it only changes color, radius, or typography.

For the changed surface verify:
- information hierarchy changed intentionally;
- normal, empty, loading/pending, error, read-only, and long-content states remain understandable;
- Chinese and English strings do not break the layout;
- keyboard focus is visible;
- mobile does not turn into a squeezed desktop grid;
- learner-authored text remains visually distinct from AI/Runtime/source content;
- no existing primary route or action disappeared without an explicit product decision;
- no new mastery or Evidence inference exists in UI code.

## Reference viewport checks

At minimum inspect:
- 1440 × 900
- 1280 × 800
- ~390 × 844

Check:
- first viewport hierarchy;
- long mission/frontier names;
- long learner answer;
- provider pending and recoverable failure;
- Project read-only / archived state;
- support panel open and closed;
- representation controls;
- map and evidence links.

## AbleArc-specific anti-patterns

Reject PRs that:
- reproduce Brilliant branding, green palette, mascots, or course marketplace structure;
- reproduce Linear's dark/gray visual identity;
- turn NotebookLM's three columns into a permanent three-column requirement;
- make every object a rounded card;
- replace learner text with a polished AI paraphrase;
- expose receipt IDs or Runtime implementation vocabulary as primary navigation;
- add XP, streak pressure, badges, or completion confetti;
- hide provider/assessment failure behind visual polish.

## PR description requirement

Every UI PR should contain:
- surfaces changed;
- functions explicitly preserved;
- reference principles used;
- states tested;
- screenshots or equivalent visual inspection notes;
- tests/typecheck/build result.
