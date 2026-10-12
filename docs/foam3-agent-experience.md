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
| 11 | `requires:` is a lazy getter; `foam.lookup(id, true)` is the only way to ask "is it loaded" | 📖 | One line in `foam/lang/CLAUDE.md` (it is there now) |

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
`foam.lookup(id, true)` answers whether the file loaded. Already in
`foam/lang/CLAUDE.md`; listed here because it is the question behind #4.
