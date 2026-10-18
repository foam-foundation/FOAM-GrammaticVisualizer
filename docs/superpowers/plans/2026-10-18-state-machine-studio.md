# State Machine Studio (version 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An app screen where a user draws a flat state machine on a canvas, edits it as XState JSON (both ways), steps through it on a real `foam.FSM`, sees checks, and exports JSON, Mermaid and `foam.FSM` code.

**Architecture:** The machine is a plain XState-shaped JS object, stored as JSON text on a `Machine` record in `machineDAO`. Pure helpers (`MachineCodec` for formats and checks, `MachineOps` for edits) work on that object. `MachineRunner` turns it into a runtime `foam.FSM` class (with an app-side events refinement) and steps it. `MachineCanvas` draws it as SVG. `StateMachineStudioView` is the screen that ties them together.

**Tech Stack:** FOAM3 (foam.CLASS, u2 views, actions, `foam.FSM`, EasyDAO, journals), SVG, FOAM `JSTest`.

**Spec:** `docs/superpowers/specs/2026-10-18-state-machine-studio-design.md`

## Global Constraints

- Package: `com.foamdev.grammaticvisualizer.fsm`; files under `src/com/foamdev/grammaticvisualizer/fsm/`. Tests in `src/com/foamdev/grammaticvisualizer/test/`, registered in that folder's `pom.js` (`flags: 'js&test|java&test'`) and `tests.jrl`.
- No change inside `foam3/`. foam3 shortfalls become app-side refinements or entries in `docs/foam3-design-system-gaps.md`.
- u2 rules: every button is an `actions:` entry, every control a property with a `view:`, rendered in `startContext({ data: this })`. No raw `<button>/<input>/<select>/<textarea>` in our views. No inline colours; colours and sizes from `$tokens` in `css:`. `./build.sh -Ngvtest2 -W8096 server-tests:CSSAuditTest` must stay at 0 failures.
- Light and dark mode both readable (tokens only, so both follow the theme).
- Machine JSON subset: `id`, `initial`, `states`, `description` (machine and state), per state `on: { EVENT: "target" }` and `type: "final"`. Unknown keys are kept and written back unchanged.
- Canvas positions live in `Machine.layout`, never inside the machine JSON.
- Naming habit in examples: states lowercase, events UPPERCASE.
- `foam.FSM` export: value `name` is UPPER_SNAKE of the state name, `label` is the original state name, `transitions` the distinct targets, `on` keeps event names, `isInitial: true` on the initial state, final state `transitions: []`.
- `foam.FSM` import: state name = `label` if set, else `name`; arrows with no `on` event get `TO_<TARGET VALUE NAME>`; first `isInitial` wins (note if more than one, note if none); every state with no transitions becomes `type: "final"` (note with the count).
- Builds and tests never use ports 8080, 8083, 8091 or 8094 (the user's servers). Tests: `./build.sh -Ngvtest2 -W8096 client-tests:<Ids>`. Live checks: `./build.sh -Jdemo -Ngvtest -W8095`.
- Commit messages: plain, imperative, no attribution trailers.

## Review Focus

1. A state renamed to a name that already exists: the rename is refused with a message; the machine is not corrupted (no merged states, no dangling arrows).
2. JSON typed half-way (invalid, or valid JSON that is not a machine, e.g. `[]` or `{"states": 5}`): the canvas keeps the last good machine, the error shows, nothing throws.
3. A state name that is not a JS identifier (`"loading data"`, `"2fa"`, `"é"`): the `foam.FSM` class still builds (UPPER_SNAKE sanitised), stepping works, and the label round-trips the original name.
4. Editing the machine while it is mid-step (the runner is rebuilt): stepping restarts from the initial state; no step lands on a stale class.
5. Deleting a state that is the initial state or the target of arrows: those arrows go too, `initial` is cleared, and the checks then report "no initial state".

Each is pinned by a test in the task that owns the code (Tasks 2, 3, 4, 5).

---

### Task 1: Events refinement for `foam.FSM`

**Files:**
- Create: `src/com/foamdev/grammaticvisualizer/fsm/FSMEvents.js`
- Create: `src/com/foamdev/grammaticvisualizer/fsm/pom.js`
- Modify: `src/com/foamdev/grammaticvisualizer/pom.js` (add `{ name: 'fsm/pom' }` to `projects`, before the test pom)
- Test: `src/com/foamdev/grammaticvisualizer/test/FSMEventsTest.js` (+ `test/pom.js`, `test/tests.jrl`)

**Interfaces:**
- Produces:
  - `foam.lang.StateMachineEnum` gains `on`: a plain object map, event name → target value name. `factory: {}`, `generateJava: false`, `transient: true`.
  - Any class with a `StateMachine` property `<name>` gets `async send<Name>(event, opt_note) -> this`. It reads `this[<name>].on[event]`; if missing it throws `Error('Event "' + event + '" is not handled in state ' + state.name)`; if the target is not in `transitions` it throws `Error('Event "' + event + '" goes to ' + target + ', which is not in transitions of ' + state.name)`; otherwise it calls `this['transition' + Name + 'To'](target, opt_note === undefined ? event : opt_note)` (so history notes record the event).

- [ ] **Step 1: Write the failing test.** `FSMEventsTest` (extends `foam.core.test.JSTest`, same try/catch wrapper as `ThemeDetailViewTest`). In `runTest_`, define with `foam.FSM` a class `com.foamdev.grammaticvisualizer.test.EventsTestFSM`: `CLEAN` (isInitial, transitions `['DIRTY']`, on `{ EDIT: 'DIRTY' }`), `DIRTY` (transitions `['SAVING','CLEAN']`, on `{ SAVE: 'SAVING', DISCARD: 'CLEAN' }`), `SAVING` (transitions `[]`), `BROKEN` (transitions `[]`, on `{ GO: 'CLEAN' }`). And a holder class with `{ class: 'StateMachine', of: '...EventsTestFSM', name: 'status' }`. Assert:
  - `EventsTestFSM.DIRTY.on.SAVE === 'SAVING'`
  - `typeof holder.sendStatus === 'function'`
  - after `await h.sendStatus('EDIT')`: `h.status === EventsTestFSM.DIRTY`, and `h.statusHistory[0].note === 'EDIT'`
  - `await h.sendStatus('NOPE')` rejects with a message containing `"NOPE" is not handled in state DIRTY`
  - a holder set to `BROKEN`: `sendStatus('GO')` rejects with a message containing `not in transitions of BROKEN`
- [ ] **Step 2: Register and run; expect FAIL** (`on` is not a property, `sendStatus` undefined). Run: `./build.sh -Ngvtest2 -W8096 client-tests:FSMEventsTest`.
- [ ] **Step 3: Implement** two `foam.CLASS({ refines: ... })` blocks in `FSMEvents.js`: one adds the `on` property to `foam.lang.StateMachineEnum`; one refines `foam.lang.StateMachine` with `installInProto(proto)` that calls `this.SUPER(proto)` then defines `send<Name>` with `Object.defineProperty` (same shape as foam3's `transition<Name>To` in `foam3/src/foam/lang/FSM.js:166`). `fsm/pom.js` lists `FSMEvents` with `flags: 'js'`, first in the file list.
- [ ] **Step 4: Run; expect PASS.** If `SUPER` in a refined `installInProto` does not reach the original, log it as a gap and wrap the original method by hand instead.
- [ ] **Step 5: Commit** `FSM events: an on map per state and send<Name>(event), app-side refinement of foam.FSM`.

### Task 2: `MachineCodec` (parse, checks, Mermaid) and `MachineOps` (edits)

**Files:**
- Create: `src/com/foamdev/grammaticvisualizer/fsm/MachineCodec.js`, `src/com/foamdev/grammaticvisualizer/fsm/MachineOps.js`
- Test: `src/com/foamdev/grammaticvisualizer/test/MachineCodecTest.js`

**Interfaces:** both are `foam.CLASS`es with no state; create once and call methods. Machine objects are never mutated; every op returns a new object (deep copy via `JSON.parse(JSON.stringify(m))`), keeping unknown keys.
- `MachineCodec`:
  - `parse(text: String) -> { machine: Object|null, error: String }`. Error when JSON is invalid (the JSON error message), when the value is not an object, or when `states` is missing or not an object (`'"states" must be an object'`). An empty `states` object is valid.
  - `stringify(machine) -> String` — `JSON.stringify(machine, null, 2)`.
  - `stateNames(machine) -> [String]`, `events(machine) -> [String]` (distinct, in first-seen order), `arrows(machine) -> [{ from, event, to }]`.
  - `check(machine) -> [{ kind, message, state?, event?, blocking: Boolean }]`. Kinds and messages:
    - `no-initial` (blocking): `No initial state.`
    - `unknown-initial` (blocking): `Initial state "<x>" does not exist.`
    - `unknown-target` (blocking): `<from> on <EVENT> goes to "<to>", which does not exist.`
    - `case-clash` (blocking): `States "<a>" and "<b>" differ only by case.` — also fires when two names give the same UPPER_SNAKE.
    - `unreachable`: `"<s>" can never be reached from the initial state.`
    - `dead-end`: `"<s>" has no way out and is not marked final.`
    - `event-case-clash`: `Events "<A>" and "<a>" differ only by case.`
  - `upperSnake(name) -> String`: split camelCase, replace every non `[A-Za-z0-9]` run with `_`, trim `_`, upper-case; prefix `S_` if it starts with a digit; `STATE` if empty.
  - `toMermaid(machine) -> String`: `stateDiagram-v2`, then `  [*] --> <initial>`, one `  <from> --> <to> : <EVENT>` per arrow, `  <s> --> [*]` per final state. A state name not matching `/^[A-Za-z_]\w*$/` is declared first as `  state "<name>" as s<index>` and referenced by that id.
- `MachineOps` (each returns `{ machine, error }`; `error` is `''` on success and `machine` is then the new object; on error `machine` is the input unchanged):
  - `addState(m, name?)` — name defaults to the first free `state1`, `state2`…; the first state added to an empty machine becomes `initial`.
  - `renameState(m, from, to)` — refuses an empty or existing name (`A state named "<to>" already exists.`); rewrites `initial` and every target.
  - `deleteState(m, name)` — removes the state, every arrow into it, and `initial` if it was the initial.
  - `setInitial(m, name)`, `setFinal(m, name, isFinal)` — final removes `on`; not-final removes `type`.
  - `addArrow(m, from, event, to)` — event defaults to the first free `EVENT1`… in that state; refuses a duplicate event in that state.
  - `renameEvent(m, from, oldEvent, newEvent)`, `retarget(m, from, event, to)`, `deleteArrow(m, from, event)`.
  - `renameLayoutKey(layout, from, to) -> Object`, `dropLayoutKey(layout, name) -> Object` for the positions map.

- [ ] **Step 1: Write failing tests** with the Save button machine from the spec as the fixture:
  - `parse` of the fixture text gives no error and 4 states; `parse('{')` gives an error and `machine === null`; `parse('[]')` and `parse('{"states":5}')` give `'"states" must be an object'`.
  - Unknown keys survive: `stringify(parse('{"initial":"a","states":{"a":{"x":1}},"meta":{"k":2}}').machine)` still contains `"meta"` and `"x"`.
  - `check(fixture)` returns `[]`.
  - Each check kind fires on a minimal machine built for it, with `blocking` as listed and the exact message text.
  - `upperSnake`: `saving→SAVING`, `loadingData→LOADING_DATA`, `loading data→LOADING_DATA`, `2fa→S_2FA`, `é→STATE`.
  - `toMermaid(fixture)` equals the exact expected text (write it out in the test; arrows in state order then event order).
  - `toMermaid` of `{"initial":"loading data","states":{"loading data":{"type":"final"}}}` contains `state "loading data" as s0` and `[*] --> s0`.
  - Review Focus 1: `renameState(fixture, 'dirty', 'clean').error === 'A state named "clean" already exists.'` and the returned machine equals the input.
  - Review Focus 5: `deleteState(fixture, 'clean')` removes `clean`, the `DISCARD` and `SUCCESS` arrows, and `initial`; `check` then contains `no-initial`.
  - `renameState(fixture, 'saving', 'busy')` rewrites `dirty.on.SAVE` and `error.on.RETRY` to `busy`.
  - `addArrow(fixture, 'clean', 'EDIT', 'error').error` is set (duplicate event); `addArrow(fixture, 'clean', undefined, 'error').machine.states.clean.on.EVENT1 === 'error'`.
- [ ] **Step 2: Register `MachineCodecTest`, run, expect FAIL.**
- [ ] **Step 3: Implement both classes.** Reachability is a breadth-first walk from `initial` over `on` targets.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `State machine studio: machine JSON codec, checks, Mermaid, and edit operations`.

### Task 3: `foam.FSM` export and import, and the example FSM classes

**Files:**
- Modify: `src/com/foamdev/grammaticvisualizer/fsm/MachineCodec.js`
- Create: `src/com/foamdev/grammaticvisualizer/fsm/examples/SaveButton.js`, `src/com/foamdev/grammaticvisualizer/fsm/examples/LoginForm.js` (add to `fsm/pom.js`, `flags: 'js'`)
- Test: `src/com/foamdev/grammaticvisualizer/test/MachineCodecTest.js` (extend)

**Interfaces:**
- Consumes: Task 1 (`on`), Task 2 (`upperSnake`, `arrows`).
- Produces on `MachineCodec`:
  - `toFoamFSMSpec(machine, pkg: String, name: String) -> Object` — the object to pass to `foam.FSM(...)`: `{ package, name, documentation: machine.description || '', values: [...] }` following the Global Constraints export rules; values in state order.
  - `toFoamFSMSource(machine, pkg, name) -> String` — `'foam.FSM(' + <spec as readable JS, 2-space indent, single quotes> + ');\n'`.
  - `fromFoamFSM(cls) -> { machine, notes: [String] }` — `machine.id` is `cls.model_.name` with a lowercase first letter; follows the Global Constraints import rules. Notes: `More than one initial state; using "<x>".`, `No initial state.`, `<n> states with no way out are marked final.`
- Example classes (package `com.foamdev.grammaticvisualizer.fsm.examples`), using `on` and `label`:
  - `SaveButton`: the spec's Save button (clean, dirty, saving, error; EDIT, SAVE, DISCARD, SUCCESS, FAIL, RETRY).
  - `LoginForm`: `start` (initial; SUBMIT→loading), `loading` (RESOLVE→success, REJECT→error), `error` (SUBMIT→loading), `success` (final).

- [ ] **Step 1: Write failing tests:**
  - `toFoamFSMSpec(saveFixture, 'p', 'X').values[1]` deep-equals `{ name: 'DIRTY', label: 'dirty', transitions: ['SAVING', 'CLEAN'], on: { SAVE: 'SAVING', DISCARD: 'CLEAN' } }`; `values[0].isInitial === true`.
  - `toFoamFSMSource(...)` starts with `foam.FSM({` and, evaluated with `eval`, defines a class whose `CLEAN.on.EDIT === 'DIRTY'`. Use a fresh class name per test run (counter) so reruns do not clash.
  - Round trip: `fromFoamFSM(foam.lookup(<class built from saveFixture>)).machine` deep-equals `saveFixture` (with `id` aside) and `notes` is `[]`.
  - Review Focus 3: a machine with states `"loading data"` (initial) and `"2fa"` builds a class (`foam.FSM(toFoamFSMSpec(...))` does not throw), and the round trip gives the names `"loading data"` and `"2fa"` back.
  - `fromFoamFSM(foam.lang.test.TestStateMachine)` gives `initial === 'New'`, an arrow `New --TO_ACTIVE--> Active`, `Done` with `type: 'final'`, and the note `1 states with no way out are marked final.` (`TestStateMachine` is loaded in test builds.)
  - `fromFoamFSM(SaveButton)` and `fromFoamFSM(LoginForm)` give machines with `check(...)` equal to `[]`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** Write the example classes.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `State machine studio: foam.FSM export and import; Save button and login form as foam.FSM examples`.

### Task 4: `MachineRunner` — step on a real `foam.FSM`

**Files:**
- Create: `src/com/foamdev/grammaticvisualizer/fsm/MachineRunner.js` (add to `fsm/pom.js`, `flags: 'js'`)
- Test: `src/com/foamdev/grammaticvisualizer/test/MachineRunnerTest.js`

**Interfaces:**
- Consumes: Task 1 (`send<Name>`), Task 3 (`toFoamFSMSpec`).
- Produces `MachineRunner` (a `foam.CLASS`):
  - Properties: `machine` (Object), `current` (String, the state name; `''` before `start`), `history` (Array of `{ from, event, to }`), `busy` (Boolean), `error` (String), `finished` (Boolean, expression: current state has `type: 'final'`).
  - `start()` — builds a fresh `foam.FSM` class `com.foamdev.grammaticvisualizer.fsm.run.Machine<N>` and holder `...run.Holder<N>` (`N` a module-level counter), creates the holder at the initial state, sets `current`, clears `history` and `error`. If the machine has a blocking check, sets `error` to the first blocking message and `current` to `''`.
  - `handles(event) -> Boolean` — true when not busy, not finished, and `machine.states[current].on[event]` exists.
  - `async send(event)` — sets `busy`, calls `holder.sendStatus(event)`, appends `{ from, event, to }` (state names, read from the enum value `label`), sets `current`; on rejection sets `error` to the message. Always clears `busy`. A `send` started before a later `start()` must not write its result (compare a run token).
  - Setting `machine` calls `start()` (a `postSet`).

- [ ] **Step 1: Write failing tests** (Save button fixture):
  - after `machine = fixture`: `current === 'clean'`, `handles('EDIT') === true`, `handles('SAVE') === false`.
  - `await send('EDIT')`, `await send('SAVE')`, `await send('FAIL')`, `await send('RETRY')`, `await send('SUCCESS')` → `current === 'clean'`, `history.length === 5`, `history[2]` deep-equals `{ from: 'saving', event: 'FAIL', to: 'error' }`.
  - a machine whose `done` state is final: after reaching it `finished === true` and `handles(<any>) === false`.
  - a machine with `initial` missing: `error === 'No initial state.'` and `current === ''`.
  - Review Focus 4: start `send('EDIT')` without awaiting, set `machine` to a new machine at once, then await the send: `current` is the new machine's initial and `history` is `[]`.
  - Review Focus 3: states `"loading data"` → `"2fa"` on `GO`: `send('GO')` gives `current === '2fa'`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `State machine studio: step a machine on a runtime foam.FSM class`.

### Task 5: `MachineCanvas` — draw, select, drag, connect

**Files:**
- Create: `src/com/foamdev/grammaticvisualizer/fsm/MachineCanvas.js` (`flags: 'web'`)
- Test: `src/com/foamdev/grammaticvisualizer/test/MachineCanvasTest.js`

**Interfaces:**
- Consumes: Task 2 (`arrows`, `stateNames`).
- Produces `MachineCanvas extends foam.u2.View`:
  - Properties: `machine` (Object), `layout` (Object, state name → `{ x, y }`), `current` (String), `selection` (Object: `{ kind: 'state', state }` | `{ kind: 'arrow', from, event }` | `null`), `connectFrom` (String; `''` when not connecting), `problems` (Array of check results, to outline states named in them).
  - `autoLayout(machine, layout) -> Object` — keeps existing positions; places missing states in a grid of rows, breadth-first from `initial` (columns 200px apart, rows 120px apart, origin 40,40).
  - Renders one `<svg>` built with DOM calls (as `RailScene` does). Each state is `<g class="state" data-state="<name>">` with a rounded `rect` and a `text`; classes `initial`, `final`, `current`, `selected`, `problem`. The initial state has a small start dot and arrow. A final state has a double border. Each arrow is `<g class="arrow" data-from data-event>` with a path, an arrowhead and a label `text` with the event; a self-loop draws as a loop above the state; two arrows between the same pair in opposite directions curve apart.
  - Redraws when `machine`, `layout`, `current`, `selection`, `problems` change.
  - Pointer: click a state selects it; click an arrow label selects the arrow; click empty space clears selection; drag a state moves it (updates `layout` with a new object at pointer-up); when `connectFrom` is set, the next click on a state fires `pub('connect', connectFrom, target)` and clears `connectFrom`.
  - Colours only through `css:` with `$tokens` (state fill, text, stroke, current highlight, selected, problem). The current state is shown by stroke width and fill, not hue alone.

- [ ] **Step 1: Write failing tests** (render into the test page with the Save button fixture and an empty layout):
  - 4 `g.state` and 6 `g.arrow`; arrow labels include `SAVE` and `RETRY`.
  - `current = 'dirty'` → exactly one `g.state.current`, `data-state="dirty"`.
  - autoLayout gives all 4 states distinct positions; passing `{ clean: { x: 500, y: 500 } }` keeps that one.
  - Dispatching `pointerdown`/`pointerup` on the `clean` group sets `selection` to `{ kind: 'state', state: 'clean' }`.
  - `pointerdown` on `clean`, `pointermove` +50/+30, `pointerup` → `layout.clean` moved by 50,30.
  - `connectFrom = 'error'`, click `clean` → a `connect` event with `('error', 'clean')`, then `connectFrom === ''`.
  - `problems = [{ kind: 'dead-end', state: 'error' }]` → `g.state.problem[data-state="error"]` exists.
  - No element in the view has a `style` attribute that contains a colour (`#`, `rgb`, `hsl`).
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS; run `server-tests:CSSAuditTest`, expect 0 failures.**
- [ ] **Step 5: Commit** `State machine studio: SVG canvas with select, drag and connect`.

### Task 6: `Machine` model and `StateMachineStudioView` (the screen)

**Files:**
- Create: `src/com/foamdev/grammaticvisualizer/fsm/Machine.js` (`flags: 'js|java'`), `src/com/foamdev/grammaticvisualizer/fsm/StateMachineStudioView.js` (`flags: 'web'`)
- Test: `src/com/foamdev/grammaticvisualizer/test/StateMachineStudioViewTest.js`

**Interfaces:**
- Consumes: Tasks 2–5.
- Produces:
  - `Machine`: `id` (Long), `name` (String, required), `description` (String), `definition` (String, the machine JSON text, `view: { class: 'foam.u2.tag.TextArea', rows: 16 }`), `layout` (String, JSON text of positions, hidden). `tableColumns: ['id', 'name', 'description']`.
  - `StateMachineStudioView extends foam.u2.View`, imports `machineDAO`, layout per the spec (option C): left panel and right canvas.
    - Left panel, top to bottom: the machine picker (`machineId` property, a `ChoiceView` over `machineDAO` showing `name`), actions `newMachine`, `saveMachine`, `deleteMachine`; `name` and `description` fields; tabs (foam's `Tabs`) **JSON** (editable `definitionText`), **Code** (`foam.FSM` source and Mermaid, read-only, with a `foamPackage` field defaulting to `com.example` and class name from the machine name in UpperCamel), **Checks (n)** (one row per check; clicking a row sets the canvas selection), **Steps** (history rows `from → EVENT → to`), and **Import** (a `foamClassId` field with a choice of the two example classes plus free text, action `openFoamFSM`; a `FileUploadTextField`-style import of a `.json` file, or paste into JSON; action `exportJSON` downloads `<id>.json`).
    - Right: an inspector strip for the selection (state: `stateName` field, actions `makeInitial`, `toggleFinal`, `addArrow` (sets `canvas.connectFrom`), `deleteState`; arrow: `eventName` field, `deleteArrow`), action `addState`, then the canvas, then the Step row.
    - Step row: one action button per event (`events(machine)`), each enabled when `runner.handles(event)`, with tooltip `"<EVENT>" is not handled in <current>` when disabled; action `resetSteps`; a status line `Finished` when `runner.finished`, or the runner `error`. Build the per-event buttons as `foam.lang.Action` objects rendered with `foam.u2.ActionView`; if that cannot be done cleanly, log a gap and say what was used.
    - Two-way sync: `definitionText` change → `codec.parse`; on success set `machine` (canvas, runner, checks, code tabs follow); on failure keep `machine` and show `parseError` under the JSON. Every canvas/inspector edit goes through `MachineOps`, sets `machine`, and writes `definitionText = codec.stringify(machine)`. A refused op shows its `error` in the inspector.
    - `saveMachine` puts `{ name, description, definition: definitionText, layout: JSON.stringify(layout) }` to `machineDAO` and selects the stored id. Switching machines loads `definition` and `layout`.

- [ ] **Step 1: Write failing tests** (context with `machineDAO: MDAO of Machine` seeded with the Save button, `controllerMode: EDIT`, stubs for `auth`/`ctrl` as in `ThemeDetailViewTest`):
  - after loading the seed: 4 `g.state` on the canvas, the Code tab text contains `on: { EDIT: 'DIRTY' }` and `stateDiagram-v2`.
  - JSON → canvas: set `definitionText` to the machine plus a state `extra` → 5 `g.state` (wait with `until`).
  - Review Focus 2: set `definitionText` to `'{'` → canvas still 5 states, `parseError` is not empty, no throw; then `'{"states":5}'` → same.
  - canvas → JSON: select `clean`, set `stateName` to `start` → `definitionText` contains `"start"` and `"initial": "start"`.
  - Review Focus 1: renaming `start` to `dirty` leaves the machine unchanged and the inspector shows `A state named "dirty" already exists.`
  - Step row: the `SAVE` button is disabled and `EDIT` enabled at `clean`/`start`; after clicking `EDIT`, the Steps tab has one row and `SAVE` is enabled.
  - Checks tab: deleting the initial state makes the tab label `Checks (1)` or more and a row with `No initial state.`
  - `saveMachine` → `machineDAO` has the changed `definition`.
  - The view contains no raw `button`, `input`, `select` or `textarea` outside foam views (same check as `RailDiagramViewTest`: elements without a `foam-u2-` class ancestor within 2 levels).
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** `Machine` and the view. Read `foam3/.claude/skills/foam-view-builder` first.
- [ ] **Step 4: Run, expect PASS; CSSAuditTest 0.**
- [ ] **Step 5: Commit** `State machine studio: Machine model and the studio screen`.

### Task 7: App wiring — DAO, seeds, menu, permissions, live check

**Files:**
- Modify: `journals/services.jrl` (add `machineDAO`, EasyDAO like `sentenceDAO`, `.setJournalName("machines")`, `of: com.foamdev.grammaticvisualizer.fsm.Machine`)
- Create: `journals/machines.jrl` (seed rows 1 Save button, 2 Login form; `definition` is the JSON text, `layout` `""`)
- Modify: `journals/menus.jrl` (one line: id `grammaticVisualizer.stateMachines`, label `State Machines`, `ViewMenu` with `StateMachineStudioView`, keywords `state machine`, `fsm`, `statechart`)
- Modify: `journals/groupPermissionJunctions.jrl` (`service.machineDAO`, `service.read.machineDAO`, `machine.create`, `machine.read.*`, `machine.update.*`, `machine.delete.*`, `menu.read.grammaticVisualizer.stateMachines`)
- Modify: `journals/pom.js` only if journals must be listed there (check how `sentences.jrl` is picked up first).

- [ ] **Step 1:** Make the edits.
- [ ] **Step 2: Build and run on the test deploy:** `./build.sh -Jdemo -Ngvtest -W8095`. Expected: server starts, no journal errors for `machines`.
- [ ] **Step 3: Live check** at `http://localhost:8095` as `demo` / `demopassword`: the State Machines menu opens; both seeds load; step the Save button through EDIT, SAVE, FAIL, RETRY, SUCCESS; rename a state on the canvas and see the JSON change; edit the JSON and see the canvas change; save, reload, see it kept. Then switch the theme to dark and check it is readable. Take screenshots for the summary.
- [ ] **Step 4: Run every app client test together:** `./build.sh -Ngvtest2 -W8096 client-tests:FSMEventsTest,MachineCodecTest,MachineRunnerTest,MachineCanvasTest,StateMachineStudioViewTest,ThemeDetailViewTest` and `server-tests:CSSAuditTest,SentenceTest`. Expected: 0 failures.
- [ ] **Step 5: Commit** `State machine studio: machineDAO, seed machines, menu and demo permissions`.

### Task 8: Docs

**Files:**
- Modify: `docs/foam3-design-system-gaps.md` — new entries (next free numbers), each with what was missing, what the app did, and the proposed foam3 fix:
  - `foam.FSM` has no named events; the app's `FSMEvents.js` refinement is the proposed fix; the Java side (`StateMachineEnum.java`, `FSMDAO.java`) has neither `on` nor `send`.
  - Anything else hit during Tasks 1–7 (e.g. dynamic actions for the Step row, `FSMDiagramView` not reusable for editing, defining FSM classes at runtime).
- Modify: `docs/foam3-agent-experience.md` if anything slowed the build down.
- Modify: `CLAUDE.md` Layout table (a row for `src/com/foamdev/grammaticvisualizer/fsm/`) and `README.md` (the new menu and test ids).

- [ ] **Step 1:** Write the entries.
- [ ] **Step 2: Commit** `docs: state machine studio gaps, layout and test ids`.
