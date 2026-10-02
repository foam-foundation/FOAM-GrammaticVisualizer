# ui-statechart: why it is built this way

The skill makes a screen's design start with a states × events table, continue through a throwaway page the user clicks, and end with every decision written into a spec. This page records why. `skills/ui-statechart/SKILL.md` says what to do.

## The problem it solves

Screens with real interaction (a player, a wizard, a canvas tool) were designed well only when one session happened to improvise a good loop: a throwaway page, the user testing by eye, every round written down. Without the loop, two things went wrong:

- **Decisions made by clicking were forgotten.** Nobody wrote down why a button moved.
- **Interaction states were never listed up front.** "What does Play do when the trace has finished?" was found by clicking, not by design, and showed up later as a bug.

## Decisions

| Decision | Why |
|---|---|
| A process skill, not a code generator | The value is the order of the steps and the list of traps. The code differs every time. |
| The table is the source; the diagram is derived | A table forces every (state, event) cell to be decided. A diagram lets an arrow be forgotten. The diagram is generated from the table, never drawn by hand, so the two cannot disagree. |
| `foam.FSM` once a widget has 3 or more states | Below that, the table is enough. Above it, the FSM gives a machine check and a live diagram for free. `foam.FSM` lives in foam3, so the skill only needs to know where its pom is (`references/fsm-pom.js`). |
| The page is throwaway; the spec is the product | Pages live in `ignored/spikes/<name>/`, outside the build. The spec holds the decisions, so the page can be deleted when the design settles. |
| The user tests by eye; Claude hands over a click list | The person who owns the design judges it. Claude drives a browser only for a regression check the user asked for. |
| Design rules are in the checklist | Never colour alone, a legend on the page from round one, the Okabe-Ito palette, presets that carry their sample data, and `prefers-reduced-motion` respected. A rule in the checklist is applied every round; a rule in someone's head is not. |
| One spec, one addendum per round | Earlier addenda are never rewritten. The log of what was asked, tried and kept is the value. |
| Assumptions are tagged, never silent | Anything neither the user nor the code settles gets an id and a row in an "Ask the domain expert" table. A design is not settled while a row is open. |
| Plain words for readers | Readers see "brief", "moves table", "situation" and "action". "Frame", "statechart", "state" and "event" stay in the code and the spec. |

## The loop

```
1. Brief        what the widget does, who uses it, what "done" looks like (3 lines)
2. Moves table  states × events table  →  diagram generated from it  →  foam.FSM (3+ states)
3. Page         ignored/spikes/<name>/index.html + one view file; serve; hard-reload
4. Round        user clicks  →  one-line feedback  →  fix  →  one addendum in the spec
5. Exit         the spec holds every decision; the page is deleted or left in ignored/; "plan it"
```

Each round ends with a short "done, and what next" note, so the user can stop and come back between rounds.

## What the table must satisfy

- Every state is reachable from the initial state.
- Every cell is decided. `—` (ignored on purpose) is a decision; a blank is not.
- No impossible combination hides in two booleans. A cell marked `✗` becomes a guard or one enum, never two flags.
- Events that change data but not the state (typing, choosing a preset) are listed under the table, apart from the transitions.
- Motion, if any, is listed per transition and switched off under `prefers-reduced-motion`.

## Limits of `foam.FSM`, stated instead of fought

- States are flat: no nesting and no parallel regions.
- Transitions are named by their target state, not by the event, so the states × events table stays the design document.
- Every transition is asynchronous and may consult permissions.

When a widget needs nested or parallel state, keep it in the table and compose it by hand.

## Out of scope

- A canvas editor for statecharts (drag states, draw arrows, export a `foam.FSM`).
- Turning a page into the real view automatically. The real view is written from the spec, through a normal plan.
