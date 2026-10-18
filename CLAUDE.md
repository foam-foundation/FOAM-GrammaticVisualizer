# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is, and why

A FOAM3 application (`GrammaticVisualizer`) that hosts the **railroad grammar viewer**: `foam.parse` grammars drawn as railroad diagrams, with a parse replayed over them step by step.

Two objectives, in this order of certainty:

1. **Learn how to improve the foam3 framework** by building a real app the way foam3 intends (declared models, u2 views, tokens, comics screens) and writing down every place the framework falls short — `docs/foam3-design-system-gaps.md`. When a FOAM-idiomatic way and a quick way both exist, take the FOAM way and log what it cost.
2. **The product itself is still undecided.** The grammar visualizer is being built because it is a compelling thing to build, not because the end product is settled. Don't over-invest in product assumptions (what grammars, who the users are); do keep the viewer a reusable library (`foam.parse.rail`) that any FOAM app could mount.

Two ways to see the viewer:

- **Inside the app** — menu "Grammar Visualizer" (`#grammaticVisualizer.grammar`), a `ViewMenu` wrapping `foam.parse.rail.RailDiagramView`. Needs the Java build.
- **Standalone** — `demo/index.html`, loads FOAM from source, no build: `python3 -m http.server 8000` → http://localhost:8000/demo/index.html.

FOAM itself is the `foam3/` git submodule (clone with `--recurse-submodules`, or `git submodule update --init`). Its own guidance is in `foam3/doc/guides/claude.md` and the skills under `foam3/.claude/skills/` (`foam-view-builder`, `foam-design-patterns`, …) — read those before writing a view, model, DAO or CSS. Before writing a script or tool, look in `foam3/tools/` first — `exampleNode.js` is the template for a FOAM script in node.

## foam3 feedback lists

Two lists, shared by all my foam3 projects (symlinks into `~/Documents/GitHub/foam3-notes/`, not committed):

- `docs/foam3-design-system-gaps.md`: what foam3 lacks.
- `docs/foam3-agent-experience.md`: what slowed the agent down (discoverability, silent failures, build cost).

When you hit a new one, add it in the same session. The rules are at the top of each file. Commit changes in `~/Documents/GitHub/foam3-notes`; never push it without asking. Local `post-checkout`, `post-rewrite` and `post-merge` hooks put the symlinks back after a branch switch, rebase or merge; branches older than `feature/fsm-studio` still commit their own old copy, so edit the shared file, not that one.

## Commands

All from the repo root. `./build.sh` is `node foam3/tools/build.js`.

```sh
(cd foam3 && ./build.sh --install)   # once: FOAM's npm packages
sudo chown -R $USER /opt             # once: deploy dir
./deployment/demo/run.sh             # build + run on :8080 with the demo user (= ./build.sh -Jdemo)
```

Logins: `admin` / `badpassword` (everything), `demo` / `demopassword` (basic user, group `grammaticVisualizer`).

Tests (FOAM `JSTest`/`Test` classes, run in a headless app build — several minutes):

```sh
./build.sh client-tests:RailDiagramViewTest,ParseTraceTest      # JS tests by id (ids in src/foam/parse/rail/test/tests.jrl)
./build.sh server-tests:CSSAuditTest,SentenceTest                # Java tests
./build.sh server-tests:CSSAuditTest                             # FOAM's CSS lint: hard-coded colours/fonts, unknown $tokens, syntax
```

The full rail list (21 ids) is in `README.md`. Known failure: `RailNotationTest` reports `missing: Span` until the viewer gets a diagram for `foam.parse.Span`.

To build or test **without disturbing a running :8080 server**, give the run its own deploy name and port: `./build.sh -Ngvtest -W8091 client-tests:…`, `./build.sh -Jdemo -Ngvtest -W8090` (deploys to `/opt/gvtest`).

Two things that cost time if you don't know them:

- **Journals need a server restart; JS/CSS need a hard reload.** The dev server sends `/src/**/*.js` with `Cache-Control: immutable`, so a plain reload keeps the old file. Cmd+Shift+R, or `fetch(url, { cache: 'reload' })` when automating.
- The client-test page follows the OS colour scheme; a test must create explicit light/dark sub-contexts (`x.createSubContext({ theme: { activeVariants: { color: 'light' } } })`) rather than assume the default is light.

## Layout

| Path | What |
|---|---|
| `pom.js` | Root POM: foam3 + the rail viewer (`web`) + its tests (`test`) + the app package + journals |
| `src/foam/parse/rail/` | The viewer library, package `foam.parse.rail` (kept in FOAM's namespace; came from foam3 PR 5607) |
| `src/foam/parse/rail/test/` | Its tests + `tests.jrl`; add a class to `pom.js`, `tests.jrl` and the README list |
| `src/com/foamdev/grammaticvisualizer/` | The app: `Sentence` model (placeholder), `GrammarVisualizerView` (the menu screen) |
| `src/com/foamdev/grammaticvisualizer/fsm/` | State Machines screen (`#grammaticVisualizer.stateMachines`): a machine is XState JSON in `machineDAO`; `MachineCodec` (formats, checks), `MachineOps` (edits), `MachineRunner` (steps a runtime `foam.FSM`), `MachineCanvas` (SVG), `StateMachineStudioView`. `FSMEvents.js` refines `foam.FSM` with an `on` map and `send<Name>(event)` (gap 29) |
| `journals/*.jrl` | App config as data: `services.jrl` (DAOs), `menus.jrl` (one entry per line — the reader cuts two-line entries), `groups.jrl` + `groupPermissionJunctions.jrl` (what `demo` may see), `users.jrl`, `themes.jrl`, `sentences.jrl` (seed rows), `flows.jrl` + `cmds.jrl` (Reflow) |
| `journals/*.md` | A markdown file with a `<flow name="…"/>` tag becomes a Reflow flow at build time (`foam3/tools/JournalMaker.js`); `examples-parsers.md` is the parser tutorial with a `<grammar>` block per parser |
| `deployment/demo/` | `-Jdemo` overlay: the `demo` user |
| `demo/` | Standalone page (`RailDemo.js` mounts the viewer with the typed-grammar editor on) |
| `docs/` | Spec for the u2 rebuild and the gaps log |

## How the viewer is put together

`RailDiagramView` is composition only; each concern is one class:

- **`RailBuilder`** maps a `foam.parse.Grammar` to strips (one per rule) of `RailElement`s (`RailSeq`, `RailAlt`, `RailRepeat`, `RailSymRef`, …). Rule references are `RailSymRef` boxes that unfold on click; the builder never recurses through `Symbol`, so recursive grammars are safe. `NOTATION.md` lists every drawing and badge; `RailNotationTest` fails when a `foam.parse` parser has no row there.
- **`RailScene`** owns the SVG strips, camera (pan/zoom), hit testing and tooltips, and generates its stylesheet from the theme (`cssText()`).
- **`ParseTrace`** records a parse as events via the `apply` hook on `StringPStream`; `TraceSnapshot` (`trace.at(n)`) is what every panel renders. Runaway loops and left recursion are caught and explained (`Runaway`, `explain()`).
- **Panels:** `RailInputRibbon` (canvas), `DocumentView`, `DerivationPanel`. `show(n)` hands one snapshot to all of them.
- **`RailTheme`** holds geometry constants and every colour as `cssTokens` (`$foam.parse.rail.RailTheme.<name>`), each with a dark variant. `colors` (what the SVG/canvas read) is derived from the same tokens; `refresh()` re-reads after the host app flips `theme.activeVariants.color`. Panel CSS references the tokens directly, so `CSSAuditTest` must stay at 0.

The chrome follows foam3's u2 rules: every button is an `actions:` entry, every control a property with a `view:`, rendered inside `startContext({ data: this })` so `.add(this.PROP)` / `.start(this.ACTION)` bind to the view. `RailDiagramViewTest` asserts there are no raw `<button>/<input>/<select>/<textarea>` and no inline colour in the chrome — keep it that way. `compact: true` (used by the `<grammar>` tag) drops title, hint, grammar sources and the More row. The viewer holds one trace; `foam.parse.rail.Session` (input, trace, step, snapshot) is how the `<grammar>` tag keeps one parse per example input and mirrors the active one into the viewer. Public surface used by `demo/RailDemo.js` and the app wrapper: `usePreset`, `useGrammar`, `setInput`, `record`, `show`, `grammarText`, `grammarShown`, `documentShown`, `status`, `allowTypedGrammar`, `debugHook`, `presets`.

## App conventions

- Permissions are explicit: a new menu or DAO for the `demo` user needs `menu.read.<id>` / `service.<daoKey>` junctions in `journals/groupPermissionJunctions.jrl`.
- A DAO's journal file name defaults to the class's plural; set `.setJournalName(...)` in `services.jrl` or seed journals under `journals/` are never read (this bit `sentenceDAO` once).
- Commit messages: plain, imperative, no attribution trailers.
