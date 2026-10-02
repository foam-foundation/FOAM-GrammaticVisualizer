---
name: ui-statechart
description: Use before writing any new FOAM screen, widget, or component with real interaction (a stepper, a player, a wizard, a canvas tool, anything with more than one state). Triggers on "design this screen/widget/component", "spike the UI", "prototype the interaction", "what states does this have", "statechart", "state machine for the view", "FSM for the view", "throwaway page". Makes the design start with a states × events table, continue through a throwaway foam.js page the user tests by eye, and end with every decision written into a spec. Not for CSS tweaks or one-line view fixes.
---

# ui-statechart — statechart first, throwaway page second, spec always

A **spike** is a throwaway page built to answer a design question. The page is scaffolding; the **spec** (the design document) is the product. This skill exists because interaction decisions made by clicking are forgotten, and interaction decisions never listed are discovered as bugs.

## When to use

- A new screen, widget, or component with more than one state (idle / loading / editing / finished, playing / paused, folded / unfolded).
- Before writing the real `foam.u2` or `foam.graphics` view.
- When the user says "design", "prototype", "spike", or asks what states something has.

Do **not** use for CSS-only changes, single-property view fixes, or when the real view already exists and only needs a bug fixed (use foam3's `foam-view-builder` skill, or debug the view directly).

## The loop (run every step, in this order)

1. **Frame** (say "the brief" to readers) — three lines: what the widget does, who uses it, what "done" looks like. Write them at the top of the spec section for this widget.
   Redesigning a screen that already exists? Ask what hurts today before anything else (one multiple-choice question), and list today's steps from the code with `file:line`. The pain decides the design; the list keeps it honest.
2. **Statechart** (say "the moves table" to readers: rows are situations the screen can be in, columns are actions, each cell says what the action does there) — states × events table, then the diagram generated from the table, then a `foam.FSM` declaration when the widget has 3+ states. Follow `references/statechart.md` exactly. Do not open an editor for the page before the table is complete.
   Redesigning an existing wizard: follow "Redesign an existing wizard" in `references/statechart.md` (user stages vs machine states, where a step boundary earns its place, the unlock rule, the page-state map).
3. **Spike page** — `ignored/spikes/<name>/index.html` from `references/index.template.html` plus one view file that mounts its design inside `fsmstudio.SpikeShell` (`references/spike-shell.js`). Serve it; hand the user the URL. The click checklist lives on the page (the shell's "Try this round" tab), not only in chat. Read `references/gotchas.md` before writing the view.
4. **Round** — for a round that changed layout, or when the user says it "feels off", first dispatch the visual critic subagent (`references/critic-prompt.md`), apply its fixes, re-check in Chrome. Then the user tests by eye and answers in one line or a screenshot. Fix, then append one addendum bullet to the spec: what was asked, what was tried, what stuck, why. Post a "done + what next" note and stop; the user decides when the next round starts.
5. **Exit** — when the user says the design is settled: the spec holds every decision, the page stays in `ignored/` or is deleted, and the next step is "plan it": an implementation plan for the real view.

## Rules that apply in every round

- **User tests visually.** After any layout or CSS change, post a checklist (what to click, what must be visible) and stop. Drive Chrome yourself only when the user asks, or for a regression check the user named. Recipe: `references/chrome-mcp-driving.md`.
- **Never color alone.** Every state on screen is carried by at least two of: hue, glyph, stroke weight, position. A legend sits on the page from round one. Palette: Okabe-Ito (`#0072B2` blue, `#D55E00` vermillion, `#E69F00` amber, `#009E73` green, `#CC79A7` pink).
- **Presets carry sample data.** Every example configuration ships with the input that makes it interesting; choosing one swaps both.
- **Motion is opt-in and gated.** Any animation is listed per transition in the statechart and disabled under `prefers-reduced-motion`.
- **Text never overflows the page.** Status lines get `white-space: pre-wrap; overflow-wrap: anywhere` and the column gets `min-width: 0`.
- **The tool follows the rules it teaches.** The spike page is designed like the designs it holds: the design gets the page; spike controls sit in one dark strip labelled "Spike controls" so nobody mistakes them for the design; everything else (round checklist, statechart, assumptions, legend, log) is a tab whose label carries its status ("Ask the expert · 4 open"). `SpikeShell` does all of this; never rebuild it per page.
- **Plain words on the page.** Readers see "brief", "moves table", "situation", "action"; the words frame, statechart, state and event stay in code and the spec.
- **Icons: the product's, never a library.** `fsmstudio.SpikeIcon` (in `spike-shell.js`) draws `name` from the tool's set (status: done / problem / waiting / todo / partial; tool: checklist, statechart, ask, legend, log, back, next, close, restart, edit, code, flag) or `src` an image file of your product (`/images/review.svg`, your own step icons), all in `currentColor` so dark mode and the `--sp-*` hues come free. An icon never carries meaning alone (pass `text`, or `label`), and the check means done only: a step not yet reached never shows it. `pack-spike.mjs` copies every `/images/…svg` a page names.
- **Build with u2 components** (`ChoiceView`, `RadioView`, `CheckBox`, `ActionView`, `Tabs`, `DateView`) so the spike looks like the product and ports to the real view; hand-build only where the u2 component is broken or missing, and say why in a comment (both u2 `TableView`s fail in a spike page, see gotchas).
- **One spec, addenda per round.** Never rewrite earlier addenda; add to them. The decision log is the value.
- **Assumptions are tagged, never silent.** Any decision that neither the user nor the code settles gets an id (A1, A2, …) and a row in the spec's "Ask the domain expert" table: the question, what the design assumes, what today's code does (cited). Check the code before asking: often it already answers half. Remind the user of open rows at every round's "done + what next" note.

## Statechart checklist (from `references/statechart.md`)

- [ ] every state is reachable from the initial state
- [ ] every (state, event) cell is decided: a next state, `—` (ignored), or `✗` (must be impossible)
- [ ] no impossible combination is hidden in two booleans; it is one enum or a guard
- [ ] data-changing events (edit text, choose preset) are listed under the table, not mixed into it
- [ ] motion per transition listed, reduced-motion noted
- [ ] mermaid diagram generated from the table, one arrow per non-`—` cell
- [ ] 3+ states: `foam.FSM` declared, `checkMachine()` (from `references/statechart.md`) returns `[]`, `FSMDiagramView` mounted on the page

## Spike page checklist

- [ ] page copied from `references/index.template.html`; `<meta charset="utf-8">` present
- [ ] `<title>`, `<meta name="description">` (one line, what question the page answers) and `<meta name="spec">` (what the page is based on: the spec section holding the decisions, or one plain sentence naming the source) filled in; the spikes index reads them
- [ ] `foam.js` tag carries `project=` listing foam3's `pom` FIRST (the attribute replaces the default) then the skill's `references/fsm-pom` (it loads `foam.FSM`), then any app poms the view needs
- [ ] served from the app checkout root: `python3 -m http.server 8765`; URL `http://127.0.0.1:8765/ignored/spikes/<name>/index.html`
- [ ] the checklist you hand the user starts with "hard-reload (Cmd+Shift+R)"
- [ ] every colour is a `--sp-*` token from `spike-shell.js` (light and dark values), never a hex: FOAM widgets follow the OS dark mode, so a hardcoded light page breaks
- [ ] `window.__spike = { view, hit(x, y) }` exposed so a later regression check can hit-test deterministically
- [ ] no `color()` method on a CView subclass (CView owns a `color` property); prefix domain methods
- [ ] variable-length child lists in a CView use `foam.lang.ArraySlot` plus an explicit `layout()`
- [ ] layout is not a dump: left rail = one dominant "you are here" card (title, code, badges, clamped description, the allowed moves as buttons, links as chips), then the walk as a breadcrumb trail; main = stepper (when there are steps) above the diagram; legend behind a `<details>` toggle; raw logs behind a toggle. Every clickable thing looks clickable (border, hover, cursor); disabled things look disabled (user feedback 2026-09-13: "feels like a dump of information, tedious to skim")

## Where the skill must sit

Spike pages load the shells by a path relative to the app checkout: `../../../.claude/skills/ui-statechart/references/…` from `ignored/spikes/<name>/`. So the skill folder must sit at `<app>/.claude/skills/ui-statechart/`, with a foam3 checkout at `<app>/foam3/`. If the skill was installed as a plugin (it then lives outside the app), copy its folder there once before the first page.

## Where `foam.FSM` lives

`foam.FSM` (with `StateMachineEnum` and `FSMDiagramView`) lives in foam3 at `src/foam/lang/` ("the FSM folder" in these docs), and foam3's own `pom` loads it. Only `references/fsm-pom.js` says where `foam.FSM` loads from: pages list it in `project=`, and `pack-spike.mjs` builds its bin from it. Its `projects` list is empty today because foam3's pom already carries the FSM; if the FSM ever loads from another pom, list that pom there and nothing else in the skill changes. File paths quoted in these docs (`FSM.js`, `StateMachineEnum.js:421`, `FSMDiagramView.js`) are inside the FSM folder.

## Files in this skill

- `references/statechart.md` — the table, the diagram, `foam.FSM`, the checker, links, two-party pattern.
- `references/index.template.html` — the page skeleton.
- `references/fsm-pom.js` — the one file that says where `foam.FSM` loads from (see "Where `foam.FSM` lives").
- `references/spike-shell.js` — `fsmstudio.SpikeShell`: title + the question the page answers + round tag, the dark "Spike controls" strip (`controls: [{ kind: 'choice'|'radio'|'check'|'action', … }]`), the design, then tabs: Try this round (tickable checklist, kept per browser), Statechart (`diagram()` returns `{ src, edges, opts }`; call `shell.redraw()` on change), Ask the expert (the spec's assumption rows), Legend, Log. Usage block at the top of the file.
- `references/spike-diagram.js` — mermaid source builder (group folding) + interactive rendering (hover neighbours, click, tooltip). Load from a spike page as `../../../.claude/skills/ui-statechart/references/spike-diagram.js`.
- `references/fsm-walker.template.js` — shell: walk live machines (config: `window.SPIKE_WALKER`).
- `references/two-party.template.js` — shell: two machines, one conversation (config: `window.SPIKE_CONVERSATION`).
- `references/guard-messages.js` — reads Java `checkGuard` refusals out of an FSM source file at load; both shells show them as ⛔ bullets (config `guardSources`).
- `references/pack-spike.mjs` — `node …/pack-spike.mjs --all` packs every spike into `ignored/dist/all/` (one bin, a doorway index, `spikes/<name>/` each); `<spike>` packs one into `ignored/dist/<spike>/` (~2 MB: a `foam-bin-3.js` built once from foam3 core + `fsm-pom` (foam.FSM), the machine files, the shells, config). `--from=<folder>` packs pages kept somewhere other than `ignored/spikes/` (e.g. `docs/diagrams/spikes`; keep the doorway and how-to page two folders above each page, as `ignored/` is). Needs no foam3 checkout to run; double-click its `index.html`, or serve that folder from its own root. First run builds the bin and needs `NODE_PATH` pointing at a `node_modules` with `uglify-js`.
- `references/how-to-use.template.html` — the reader-facing "how to use" page (diagram legend, the three page kinds, how to serve a shared folder). Copy once to `ignored/how-to-use.html`; the packer copies it into every dist; the walker and conversation shells link it as "? how to use".
- `references/spikes-index.template.html` — copy once to `ignored/index.html`; `http://127.0.0.1:8765/ignored/` then lists every spike with its title, description and spec (reads the server's folder listing, nothing to maintain).
- `references/critic-prompt.md` — the visual critic subagent's prompt, and what its first run already fixed in the shell.
- `references/gotchas.md`, `references/chrome-mcp-driving.md`.

Existing machine? Run "Extract an existing machine" in `references/statechart.md` first: grep the `foam.FSM(` files, classify wizard vs lifecycle, links from the sync code, shared record from the pollers, verify. Then reach for a shell before writing a page: **learning an existing machine** → walker; **two objects that talk through a shared record** → two-party; **designing a new widget** → the loop above with a hand-written view.

## Seed examples

`foam3/src/foam/demos/sevenguis/` holds the 7GUIs set in FOAM (Counter, TempConv, FlightBooker, Timer, CRUD, CircleDrawer, Cells). Copy the closest one as the starting view.

Worked example: `examples/spike-round/` in this plugin (this skill's own loop, brief to settled, modelled with itself, in `SpikeShell`); copy it to `ignored/spikes/spike-round/` to run it. If a change to the shell only makes sense for one design, it belongs in that design's page, not the shell.

## Output of a spike

- The spec section for the widget: frame, statechart table, mermaid diagram, `foam.FSM` (if any), "Ask the domain expert" table (if any assumption is open), addenda per round, final "settled" note. The design is not settled while an assumption row is unanswered; say so in the settled note or answer it first.
- The throwaway page in `ignored/spikes/<name>/` (never committed).
- A "plan it" handoff naming the spec section.
