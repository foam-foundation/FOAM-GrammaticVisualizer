# State machine studio — design

Date: 2026-10-18. Status: draft for review.

A screen in the GrammaticVisualizer app for drawing state machines on a canvas, stepping through them, and getting code out of them. Later, an AI conversation drafts and changes machines.

Marked **(my call)**: decisions the assistant made that the user has not confirmed. Everything else the user decided or agreed to.

## Why

- **Modelling UI behaviour.** Plan how a screen or a whole flow behaves before writing views: a Save button, a user onboarding journey, every screen of a dispute system.
- **Teaching state machines.** Draw a machine, then step through it event by event, the way the grammar viewer replays a parse.
- **Replace the `ui-statechart` plugin (PR #2).** That plugin is a process for an agent to follow. If the same thing exists inside the app, with AI help, the plugin is not needed.
- **Learn where foam3 falls short** (the repo's first objective, see `CLAUDE.md`). `foam.FSM` has no named events, no editor and no way to share a machine outside FOAM. Every gap found goes in `docs/foam3-design-system-gaps.md`.

Prior art the user likes: XState and Stately (David Khourshid). His ideas this design follows:
- States and events first, the diagram before the screen.
- Decide what every event does in every state.
- Look for unreachable states and dead ends.
- With AI: the machine decides what may happen, the AI only proposes.

## Two versions, in this order

1. **Version 1: one machine, by hand.** The canvas, the JSON, stepping, checks, exports.
2. **Version 2: the AI conversation.** It writes into the version 1 pipeline. "Once this part is taken care of, AI just puts data in this pipeline."

Version 1 is the build target. Version 2 is described so version 1 does not block it.

## The machine format (source of truth)

A JSON object in the **XState machine config** shape, the flat subset only:

```json
{
  "id": "saveButton",
  "initial": "clean",
  "states": {
    "clean":  { "on": { "EDIT": "dirty" } },
    "dirty":  { "on": { "SAVE": "saving", "DISCARD": "clean" } },
    "saving": { "on": { "SUCCESS": "clean", "FAIL": "error" } },
    "error":  { "on": { "RETRY": "saving" } }
  }
}
```

Why this format: readable without FOAM, has named events, opens in Stately's editor, and pastes into chat, PRs and docs.

Supported in version 1:
- `id`, `initial`, `states`, and `description` on the machine and on each state.
- Per state: `on: { EVENT: "target" }` and `type: "final"`.
- A JSON file that also has keys outside this subset still imports. The studio keeps the unknown keys and writes them back unchanged; it shows a note that they are not drawn. **(my call)**

Not in version 1:
- Nested states and parallel states. `foam.FSM` has neither. **(my call)**
- Guards, actions, context, delays. **(my call)** A guard written in the JSON is kept as an unknown key.

Naming habit shown in the examples: states lowercase, events UPPERCASE.

Canvas positions are **not** stored inside the machine JSON, so the JSON stays plain XState. They are stored next to it. **(my call)**

## Version 1 — what the user can do

### The screen

- Its own menu entry in the app, next to the grammar viewer. The `demo` user can open it (menu and service permissions in `journals/groupPermissionJunctions.jrl`).
- Layout from the mockup the user picked (option C): a side panel on the left, the canvas on the right. In version 1 the left panel holds the machine list, the JSON, the checks and the step history. In version 2 the same panel holds the AI conversation. **(my call: what fills the left panel before the AI exists)**
- The code views (JSON, `foam.FSM`, Mermaid) are tabs, not always on screen.

### Drawing (two-way)

- Add, rename and delete states. Mark the initial state and final states.
- Draw an arrow between two states and name its event. Rename and delete arrows.
- Drag states to move them.
- Edit the JSON directly. The canvas updates.
- Edit the canvas. The JSON updates.
- JSON that does not parse: the canvas keeps the last good machine and the error shows next to the JSON.

### Stepping

- Stepping runs the real thing: the studio defines a `foam.FSM` class from the current machine (with the events refinement) and steps by calling `send`. This follows the repo rule "take the FOAM way". It also tests the refinement on every machine. A plain stepper over the JSON would be quicker. **(my call)**
  - Each redefinition needs a fresh class id (e.g. a counter suffix), so old classes in the registry do not clash.
  - `send` is async. Disable the Step row while a step is running.
- Start from the initial state. The current state is highlighted.
- A Step row under the canvas has one button per event in the machine.
  - Events the current state handles are active.
  - The others are visible but disabled, with a tooltip like "`SAVE` is not handled in `clean`". Seeing what is ignored is part of the teaching.
- A history list of the steps taken. Reset goes back to the initial state.
- A final state shows "finished" and disables every event.

### Checks (done by the app, on every change)

- No initial state, or `initial` names a state that does not exist.
- An arrow points at a state that does not exist.
- A state that can never be reached from the initial state.
- A dead end: a state that is not final and has no way out.
- Duplicate state or event names that differ only by case.

Each check names the state or arrow, and clicking it selects that thing on the canvas.

### Exports and imports

- **JSON:** export as a `.json` file, import from a file, or paste.
- **Mermaid:** a `stateDiagram-v2` text, to paste into GitHub, docs and markdown.
- **`foam.FSM` code:** text for a `foam.FSM({...})` declaration, using the events refinement below:
  - Each state becomes a value. `name` becomes UPPER_SNAKE (`saving` → `SAVING`). `label` keeps the original name (`saving`), so importing it back restores it. **(my call)**
  - `transitions` lists the distinct targets.
  - `on` keeps the event names.
  - `initial` becomes `isInitial: true`. A final state gets `transitions: []`.
- **From `foam.FSM`:** open a `foam.FSM` class as a machine. It does not change source files. **(my call)**
  - The picker lists the app's own example `foam.FSM` classes, plus a field to load any class by id. A normal app build loads no `foam.FSM` classes otherwise (foam3's are test-only).
  - The app ships the Save button and login form as `foam.FSM` classes too, so the picker is never empty.
  - When a class has no `on`, each arrow gets the generated event name `TO_<TARGET>`.

**How exact the round trip is (my call):** JSON → `foam.FSM` → JSON gives back the same states, arrows and event names (labels carry the names). Two known losses, each shown as a note on import:
- A state with no way out comes back as `type: "final"`, because `foam.FSM` treats every such state as terminal. The dead-end check catches these before export anyway.
- A `foam.FSM` class with more than one `isInitial` state: the first one becomes `initial`.

Round-trip tests cover this.

### Storage

- Each machine is a record in a DAO, the FOAM way: a declared model with the machine JSON, the canvas positions, a name and a description.
- It has a journal, so example machines ship as seed rows.
- **Shared, not per user (my call).** Every logged-in user, including `demo`, sees and can edit every machine, like the other app data. No owner property. The product is undecided (see `CLAUDE.md`), so per-user machines wait until it matters. A changed or deleted seed comes back by restoring its journal row.
- Seed examples: the Save button (above) and Khourshid's login form (`start`, `loading`, `success`, `error`; events `SUBMIT`, `RESOLVE`, `REJECT`).

## The events refinement (app side, not foam3)

`foam.FSM` moves by target (`obj.transitionStatusTo('SAVING')`). An arrow has no event name. Two events to the same target merge into one arrow.

The user wants the fix **in this app as a class refinement, not in foam3's code.**

- Refine `foam.lang.StateMachineEnum` with an `on` map: event name to target state name.
- Refine `foam.lang.StateMachine` (the property) so the record also gets `send<Name>(event, opt_note)`.
  - It looks up `on[event]` on the current state and calls foam3's own `transition<Name>To(target, opt_note)`.
  - So guards, permissions and history still apply.
  - An unknown event fails with a clear message that names the state and the event.
- A validation that every `on` target is also in `transitions`.
- **Browser only in version 1 (my call).** `foam.FSM` is JS-only in foam3's `pom.js`, and the studio runs in the browser. The Java side (`StateMachineEnum.java`, `FSMDAO.java`) has no `on` and no `send`. Mark the `on` property so it generates no Java, and log "events on the server" as part of the gap.
- **Risks to check first:**
  - The refinement must load before any `foam.FSM` class that uses `on` is defined.
  - A build with a `java`-flagged FSM class must still compile with the refinement present.
- Log the gap ("foam.FSM has no named events") in `docs/foam3-design-system-gaps.md`, pointing at this refinement as the proposed fix.

## Version 2 — the AI conversation (later)

- Left panel becomes a conversation. You describe a flow ("plan the screens of a dispute system").
- The AI asks a few questions before it draws.
- It writes machine JSON into the version 1 pipeline.
- **AI changes are proposals.** The canvas previews them: added parts green, removed parts red, with **Accept** and **Reject**. Nothing changes until Accept. Hand edits are never overwritten unseen.
- The app's checks run on every proposal, and the problems show in the conversation.
- The AI is Claude, called from the app's server so the API key never reaches the browser. **(my call)**
- Big flows (between screens, several people such as customer, merchant and agent) may need more than one machine or nested states. Decide when version 2 is designed.

## Goals

- A dev who does not know FOAM can read a machine (the JSON or the Mermaid) and understand it.
- A learner can draw a small machine and step through it in a few minutes.
- The same machine moves between canvas, JSON, `foam.FSM` and Mermaid without losing states, arrows or event names.

## Non-goals (version 1)

- AI of any kind.
- Nested states, parallel states, guards, actions, context, delays.
- Generating view code (u2 screens) from a machine.
- Editing `foam.FSM` source files on disk.
- Running a machine against a real record or server.

## Anti-goals (a failure even if it works)

- A machine only FOAM can read.
- Losing hand edits, now or when the AI arrives.
- An AI that changes the machine without the user seeing and accepting it.

## Constraints

- Build it the FOAM way: declared models, u2 views, every button an `actions:` entry, every control a property with a `view:`, colours and sizes from tokens. Follow the rules the rail viewer follows (see `CLAUDE.md`): no raw `<button>/<input>/<select>/<textarea>`, no inline colours, `CSSAuditTest` stays at 0. Read the foam3 skills before writing views.
- foam3 changes: none directly. Anything foam3 lacks is either built as an app-side refinement or logged as a gap. A foam3 fix only ever goes through its own branch and PR, with the user's approval.
- Light and dark mode both work.
- Branch `feature/fsm-studio`, based on `feature/theme-screen`. It becomes layer 5 of the GitHub stack (#4, #5, #6, #3). **(my call)**

## Left to the builder

- Package name (suggested `com.foamdev.grammaticvisualizer.fsm`) and class names.
- How the canvas is drawn: SVG like `RailScene`, `foam.graphics`, or reusing parts of foam3's `FSMDiagramView`. Log what was missing.
- Auto-layout for a machine with no stored positions (imported JSON or `foam.FSM`).
- Exact look of states, arrows, highlight and the Step row, within the token rules.
- Test layout, following the repo's `JSTest` pattern.

## Open after version 1

- What happens to PR #2 (`ui-statechart`): close it, or keep parts such as the two-party view. The user decides once version 1 works.
