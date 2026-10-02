# FOAM-Grammatic-Visualizer
Build and visualize FOAM Grammar based parsers.

## Railroad grammar viewer

Draws a `foam.parse` grammar as railroad diagrams, one strip per rule, and replays a parse over them step by step. The right-hand panel lists what matched, with the input span of each rule.

The diagrams use railroad shapes with PEG meaning: branch numbers are priority (first match wins) and loops are greedy. [`src/foam/parse/rail/NOTATION.md`](src/foam/parse/rail/NOTATION.md) lists every shape and badge.

### Run the demo

FOAM is a git submodule of this repository, so clone with it:

```sh
git clone --recurse-submodules https://github.com/foam-foundation/FOAM-GrammaticVisualizer.git
cd FOAM-GrammaticVisualizer
python3 -m http.server 8000
```

If the `foam3/` folder is empty (a clone made without `--recurse-submodules`), fill it with `git submodule update --init`.

Open http://localhost:8000/demo/index.html. The page loads FOAM from source, so it needs no build. Pick a preset, press **Parse**, then step with the buttons beside it.

Query parameters load your own files. Every URL has to be on the same origin as the page:

| Parameter | Loads |
| --- | --- |
| `?grammar=URL` | a `symbols()` body as text; it waits in the editor until **Load** is pressed |
| `?input=URL` | the text to parse |
| `?presets=URL` | a JSON object of `{ name: { input, grammar } }`, added to the preset list |
| `&doc` | opens the document view |

### Use the viewer in a FOAM app

Add `src/foam/parse/rail/pom` to the app's `projects:` with `flags: 'web'`, then mount `foam.parse.rail.RailDiagramView`, created with `grammar:` set to a `foam.parse.Grammar`. To show another grammar later, call `useGrammar(g)`. The pom path is relative to wherever this repository is checked out inside the app.

### Run the tests

The tests are FOAM `JSTest` classes and run in a browser through FOAM's test build, which needs Java, Node.js and Maven ([FOAM installation notes](https://github.com/foam-foundation/foam3/blob/development/INSTALL.md)).

```sh
(cd foam3 && ./build.sh --install)    # once: FOAM's npm packages
./build.sh client-tests:RailThemeTest,ParserLabelsTest,RailTerminalTest,RailStripTest,RailBuilderTest,RailSceneTest,RailAltTest,RailRepeatTest,RailOptionalTest,RailSymRefTest,RailReachabilityTest,RailUntilTest,RailGateTest,RailBadgeTest,RailNotationTest,ParseTraceTest,RailTraceApplyTest,RailSvgTest,RailDomSceneTest,DocumentViewTest
```

Known failure: `RailNotationTest` reports `missing: Span`. `foam.parse.Span` is new in FOAM and the viewer has no diagram for it yet, so it draws as a grey generic box. The test fails by design whenever FOAM gains a parser with no row in `NOTATION.md`.

### Layout

| Path | What it is |
| --- | --- |
| `src/foam/parse/rail/` | the viewer: diagram elements, layout, parse trace, panels |
| `src/foam/parse/rail/test/` | 20 test classes and their `tests.jrl` |
| `demo/` | the demo page |
| `foam3/` | FOAM, as a submodule |
| `pom.js`, `build.sh`, `deployment/test/` | what FOAM's build needs to run the tests from this repository |

`TextUtil` and `CViewTheme` in `src/foam/parse/rail/` are copies of two small `foam.graphics` files proposed in [foam3#5495](https://github.com/foam-foundation/foam3/pull/5495). They sit in the `foam.parse.rail` package so that both can load together once that pull request merges.
