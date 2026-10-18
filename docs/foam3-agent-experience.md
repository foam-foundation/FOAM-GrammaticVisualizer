# foam3 for coding agents — friction log

What slowed an agent (Claude Code) down while building this app on foam3, as
distinct from the design-system gaps in `foam3-design-system-gaps.md`. Each
entry: what happened, what the agent did instead, what would have prevented
it. Line references are to foam3 at the submodule pin.

**Cost:** 💸 expensive (minutes to hours, repeated) · 🕳️ silent (no error,
wrong result) · 📖 discoverability (the answer existed, nothing pointed to it).

## At a glance

| # | Friction | Cost | Prevention |
|---|---|---|---|
| 1 | `tools/` has no index; the `.md` → flow build feature went unnoticed | 📖 | `tools/README.md` or a line per tool in `doc/guides/claude.md` |
| 2 | A one-off script was written in Python instead of with `foam_node.js` | 📖 | Name `tools/exampleNode.js` as *the* script template in guidance |
| 3 | Dev server marks JS `immutable`; edits don't show until a hard reload | 🕳️💸 | Version query on dev script tags |
| 4 | A class file loads on first lookup; a `foam.SCRIPT` in it (e.g. `registerElement`) never runs until then | 🕳️ | An `eager` flag on pom files, or `MarkdownView` looking unknown tags up |
| 5 | Running one JS test needs a full Java build (~3–5 min) | 💸 | A JS-only test runner against the source pom |
| 6 | Journal reader splits a two-line `p({…})` at the line break, with a parse error that names the fragment only | 🕳️ | Document the one-entry-one-line rule, or join continuation lines |
| 7 | Test page follows the OS colour scheme; "default theme" is dark on a dark Mac | 🕳️ | Pin the test page to light, or say so in the testing guide |
| 8 | `MarkdownView` renders asynchronously; probing right after `write()` gives false negatives | 🕳️ | Document the `isMerged` 150 ms delay; expose a render promise |
| 9 | An HTML comment in markdown hides a whole example; an `<html>` block needs a blank line before it | 🕳️ | Markdown guide: block rules for custom tags |
| 10 | Property `onKey` silently overrides a view class default (`RangeView`) | 🕳️ | `fromProperty` defers to a view-class default |
| 11 | `requires:` is a lazy getter; `foam.maybeLookup(id)` is the only way to ask "is it loaded" | 📖 | One line in `foam/lang/CLAUDE.md` (it is there now) |
| 12 | `foam.lookup(id, true)` looks like a soft lookup but the flag is ignored, and `foam.assert` is `console.assert`: it logs, never throws, so `try/catch` never sees it | 🕳️ | Reject extra arguments, or make the shortcut forward to `maybeLookup`; say in `Context.js` that assert does not throw |
| 14 | A view method named `load` replaces `Element.load`; the view never renders and nothing says why | 🕳️💸 | Warn when a class overrides an Element lifecycle method |
| 15 | A `class: 'Array'` property ignores its `expression`: the type's default factory wins | 🕳️ | Skip the default factory when an expression is set, or warn |
| 16 | `prop$: slot` at create time is a two-way link and can overwrite an expression property | 🕳️ | Document it next to `follow` |
| 17 | JS-only tests can run in node in seconds, but nothing offers it | 💸 | Ship a node runner for `JSTest` classes that need no DOM |
| 18 | `foam.String.constantize('hasOwnProperty')` breaks every later `constantize` call on the page | 🕳️ | `Object.prototype.hasOwnProperty.call(cache, key)` in `memoize1` |

## 1. `tools/` has no index 📖

**Happened** · needed to turn a markdown tutorial into a Reflow flow. Wrote a Python
generator that parsed `flows.jrl` with regexes and re-escaped JSON by hand.
**Existed** · `tools/JournalMaker.js:98-135,170-190` already converts any `.md`
carrying a `<flow name="…"/>` tag into the `flows` journal at build time; foam3's own
`src/documentation/intro-to-flow.md` uses it.
**Prevention** · a `tools/README.md` with one line per maker/tool, linked from
`doc/guides/claude.md`; a grep-able comment at the top of each file saying what it
turns into what.

## 2. Scripts in the wrong language 📖

**Happened** · same script: Python, because nothing said "write scripts with FOAM".
**Existed** · `tools/exampleNode.js` — `require('foam3/src/foam_node.js')`, load the
pom, then `foam.json`, journal parsing and DAOs are available in node.
**Prevention** · guidance that names that file as the template for any one-off.

## 3. `immutable` JS in dev 🕳️💸

**Happened** · after every edit the page kept the old file; several "the fix did not
work" detours before `fetch(url, { cache: 'reload' })` became routine.
**Prevention** · `?v=<hash>` on dev script tags, or no `immutable` when serving from
`build/classes`. (Gap 2 in the design-system log; it costs agents more than people.)

## 4. Lazy class files and `foam.SCRIPT` 🕳️

**Happened** · a `<grammar>` markdown tag rendered as plain text in the app while
its unit test passed: the file holding `registerElement` only loads when something
looks the class up. `<example>` works because a console command `requires` it.
**Prevention** · `{ name, flags, eager: true }` in a pom, or `MarkdownView` trying
`foam.maybeLookup` for an unknown tag name. (Gap 17.)

## 5. One JS test = one Java build 💸

**Happened** · every red/green cycle on a `JSTest` cost 3–5 minutes of javac + Jetty.
Over a session that was the single largest time sink.
**Prevention** · a client-tests runner that serves the source pom to a headless
browser without compiling Java; or let `./build.sh client-tests` skip the Java step
when no `.java` or `javaCode` changed.

## 6. Journal entries on two lines 🕳️

**Happened** · six menus written as `p({ …,\n "handler": … })` were cut at the line
break; the log said `Parse error … EOF` and showed only the first fragment. Menus
silently missing for the basic user.
**Prevention** · state the rule (one entry per line unless the continuation starts
with `{`/`[`), or join lines until the braces balance.

## 7. Test page is dark on a dark Mac 🕳️

**Happened** · an assertion that the default palette is light failed; the test page
is a full app page and follows `prefers-color-scheme`.
**Prevention** · pin the test page's `colorScheme`, or document
`x.createSubContext({ theme: { activeVariants: { color: 'light' } } })`. (Gap 3.)

## 8. `MarkdownView` renders later than `write()` 🕳️

**Happened** · in-page probes (`write(); querySelector`) returned zero tags for inputs
that render fine; an hour of chasing phantom parser bugs (`+`, `(60)`, `>`) before a
1.2 s wait showed them all rendering.
**Prevention** · note the merged 150 ms re-render, and give views a "rendered"
promise an agent can await.

## 9. Markdown block rules for custom tags 🕳️

**Happened** · (a) foam3's Email example is inside `<!-- -->`; a tag inserted "after
the heading" landed in the comment and vanished. (b) A block tag directly after a
paragraph line is inline HTML, not a block.
**Prevention** · a short "custom tags" section in the markdown guide: blank line
before a block tag; comments hide everything inside.

## 10. `onKey` default lost 🕳️

See gap 14: `RangeView` says `onKey: true`, `Input.fromProperty` overwrites it with
the property's `false`. The slider moved only on release; nothing said why.

## 11. "Is this class loaded?" 📖

`requires:` is a lazy getter, so `this.Foo` always returns something; only
`foam.maybeLookup(id)` answers whether the file loaded. Already in
`foam/lang/CLAUDE.md`; listed here because it is the question behind #4.

## 12. A soft lookup that is not soft 🕳️

`scanRegistered` called `foam.lookup(id, true)` for every id in `foam.USED`, trusting
the `true` to mean "return null if missing". The `foam.lookup` shortcut takes one argument
(`Context.js:236`), so every refinement in `USED` (which registers nothing under its own
id, `EndBoot.js:322`) printed `Assertion failed: Could not find any registered class`.
The surrounding `try/catch` caught nothing because `foam.assert` is
`console.assert.bind(console)` (`foam.js:305`): a red line, no exception. One hundred
lines of noise per Diagram tab, zero functional effect, so nothing flagged it. Use
`foam.maybeLookup`, and skip `USED` entries whose model has `refines`.

## 12. A removed property stays referenced for two years because nothing exercises the view

`DAOControllerConfig.browseActions` was removed in April 2024 (foam3 1fd8f18b, "Remove
browse actions"), but `foam.comics.v2.DAOBrowseControllerView` still read
`config.browseActions.length` (`DAOBrowseControllerView.js:284`). Every default DAO menu
now goes through `foam.comics.v3.DAOController`, so the v2 view only runs for the few
screens that name it (`ThemeCustomisationBrowseController`, `DataManagement`,
`EmbeddedTableView`), and those have no tests. Result: foam3's own Admin → Customise
Theme menu throws `Cannot read properties of undefined (reading 'length')` on open, in
every app, with nothing in CI to say so. Found by clicking. Guarded with `?.` here; the
real fix is a smoke test that opens every menu in `menus.jrl` once.

## 13. Client tests stall silently when the test port is still held

`./build.sh -N<name> -W8091 client-tests:...` starts a server on 8091 and a headless
Chrome against it. If a java process from an earlier run still holds 8091 (a run that
was interrupted, or a test instance that never shut down), the new server fails to
bind, nothing says so, and the browser opens the old instance with a session id it
does not know: the test page is the login form, no test runs, and after 30s the only
output is "Client tests made no progress ... after 1 results". `lsof -nP -iTCP:8091
-sTCP:LISTEN` shows the squatter. Cost: an hour chasing a view "bug" that did not
exist, including a wrong first diagnosis (another app instance on 8090). The runner
should refuse to start when its port is taken.

## 14. A view method named `load` stops the view from rendering 🕳️💸

The state machine studio had `async function load(id)` to load a saved machine. That replaced `Element.load`, the lifecycle step that renders, so `write()` produced an empty element. No error named it: the only console line was an unrelated `Uncaught (in promise)` from a `ChoiceView` (`"key" cannot be undefined/null`, `MDAO.js:162`). Found by catching `unhandledrejection` in the test, then reading the Element method list. Renamed to `loadMachine` (and `apply` to `applyOp`, to be safe). The same family as foam3's own trap "an action named like an Element method replaces it" (`src/foam/u2/CLAUDE.md`), but for methods. Cost: about 20 minutes and three test builds.

## 15. A `class: 'Array'` property ignores its `expression` 🕳️

`checks` was `{ class: 'Array', expression: function(machine) {...} }`. The Array type's default factory (`[]`) ran first and stored a value, so the expression never ran: the Checks tab always said `(0)`. Found by reproducing in node (`hasOwnProperty('checks')` was already true after create). Fix: no `class` on an expression property, or a type whose factory yields to the expression. A message named like a property (`FINISHED` vs `finished`) is the loud cousin: "Class constant conflict" in the console and the class fails to build.

## 16. `prop$: slot` at create time is two-way 🕳️

The studio passed `problems$: this.checks$` to the canvas. That links both ways, so the canvas's own value was written back into `checks` and replaced its expression. `canvas.problems$.follow(this.checks$)` is the one-way form. Document it next to `follow` in `doc/guides/Slots.md`.

## 17. JS-only tests can run in node in seconds 💸

Every client test run is a full build plus headless Chrome (about 3 minutes). For classes with no DOM (codec, edit ops, runner, the events refinement) a 20-line node script that loads `foam_node.js` and the app pom, then calls `runTest(x)` with a collecting `x.test`, runs them in about 2 seconds. That made red / green cheap for four of the five test classes; only the views needed the browser. foam3 should ship one (see entry 5).

## 18. `constantize('hasOwnProperty')` breaks `constantize` for the whole page 🕳️

To keep state value names clear of a `foam.FSM` class's own constants, the codec turned every `StateMachineEnum` axiom name into its constant name with `foam.String.constantize`. One axiom is the method `hasOwnProperty`. `memoize1` (`src/foam/lang/stdlib.js:201-214`) caches into a plain object and checks `cache.hasOwnProperty(mKey)`, so storing the key `hasOwnProperty` replaces that method with a string, and every later `constantize` call throws `cache.hasOwnProperty is not a function`, in any class. Reproduced in node: `constantize('hasOwnProperty')` then `constantize('fooBar')`. The studio now reads property axioms only and converts names by hand. Fix in foam3: `Object.prototype.hasOwnProperty.call(cache, mKey)` (or a `Map`).

