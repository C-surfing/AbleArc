# AbleArc Web Visual QA — Playful Focus v0.1

This checklist is the merge gate for substantial learner-facing UI changes.

A successful build is necessary but not sufficient. The rendered product must preserve the learning loop and remain usable in all important Host states.

## Required viewports

Inspect at minimum:

- Desktop: 1440 × 900
- Compact desktop: 1280 × 800
- Mobile: approximately 390 × 844

Do not validate only the happy path or only the default English copy.

## Surface matrix

### Entry

- zero-state hierarchy leads with the learning intent;
- Model Settings remains reachable;
- Workspace escape hatch remains reachable;
- long capability goal does not overflow;
- Project optional name remains usable;
- busy / create failure state is legible;
- primary CTA is obvious without using a saturated accent.

### Today

- current Project and Project switcher remain visible;
- next useful move dominates the page;
- DailyContext remains optional and visibly separate from mastery;
- energy, minutes, focus, note, save, update states remain usable;
- Review suggestions remain available;
- Map summary remains readable with long frontier names;
- Paper / Reflection / Profile / Settings / Workspace remain reachable;
- mobile navigation is scrollable/readable rather than squeezed.

### Focus

Check both **Support closed** and **Support open**.

- default state is one primary learning column;
- current frontier / next move is not crowded by chrome;
- timer remains optional;
- lifecycle/read-only warning remains visible;
- no-decision warning remains visible;
- representation controls remain usable;
- learner response composer remains obvious;
- long learner answer wraps correctly;
- provider pending state is visible within one second;
- response-saved + assessment-failed state is unmistakable;
- Retry assessment remains available without retyping;
- Workspace escape hatch remains available;
- StateProposal review link remains available;
- Session Close remains reachable after assessment;
- support panel does not cover or squeeze the primary learning action;
- changing learning move resets support to closed.

### Paper

- source text input remains the dominant editable surface;
- study-order selector and source label remain available;
- build / rebuild action remains obvious;
- read-only Project warning remains visible;
- long paper excerpts remain usable;
- plan hierarchy reads as argument structure, not a dashboard card grid;
- first teaching move remains visually distinct;
- Continue in Focus remains reachable.

### Reflection

- learner-owned writing area is visually primary;
- recent reflection history remains reachable but secondary;
- long writing remains comfortable;
- optional context links remain optional;
- material links remain reachable;
- create / update / delete behaviors remain visible;
- provenance boundary remains clear: Reflection is not Evidence.

### Profile

- all current durable-context fields remain present;
- two-column desktop layout collapses cleanly on mobile;
- long values do not overlap;
- save state / error message remains visible;
- self-report boundary remains visible.

### Settings / Model Setup

- provider preset selection remains usable;
- API key / model / base URL fields remain present;
- Advanced compatibility remains discoverable;
- environment-managed read-only state remains visible;
- connection-check busy/error/success feedback remains visible;
- configured state remains visible;
- primary save action is not confused with learner-state authority.

### Session Close

- capability change is never implied when none was accepted;
- unresolved uncertainty remains legible;
- saved materials / pending proposal count remain legible;
- Tomorrow Seed remains visually distinct from mastery;
- close-session action remains obvious;
- mobile returns to a single reading column.

### Workspace / Map

- Teach / Study / Map / Review remain available;
- Project switcher remains available;
- map panel and learner-state panel remain readable;
- current frontier is distinguishable without relying on color alone;
- Completion Gate remains available;
- StateProposal / MapProposal review remains available;
- full map mode remains usable.

## Content stress cases

For every major surface use at least one stress case:

- long Project title;
- long frontier / next-move text;
- Chinese copy;
- English copy;
- mixed Chinese + technical English;
- long source/material title;
- long learner response;
- empty state;
- loading/pending state;
- recoverable error state;
- read-only Project.

## Accessibility

- keyboard focus is visible;
- controls retain semantic labels;
- color is not the only state signal;
- normal text meets readable contrast on its surface;
- layout works at 200% zoom for the primary learner action;
- reduced-motion preference does not remove required state feedback.

## Visual language rejection checks

Reject the rendered result if any of these are true:

- the page reads as generic gray/purple AI SaaS;
- semantic colors become neon or dominate the page;
- every object becomes a rounded card;
- Focus looks like a dashboard;
- learner-authored content and model/runtime content look interchangeable;
- Project / Runtime vocabulary becomes the main learner-facing hierarchy;
- Paper looks like a report generator rather than a study surface;
- Reflection looks like a system form rather than learner-owned writing;
- mobile is a compressed desktop layout.

## Evidence required in a UI PR

A major UI PR should record:

- viewport(s) inspected;
- surfaces inspected;
- state variants inspected;
- regressions found and fixed;
- any known visual limitation intentionally deferred.

Screenshots are preferred when the development environment supports them.
