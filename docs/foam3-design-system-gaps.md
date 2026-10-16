# FOAM3 design-system gaps

Found while building the railroad grammar viewer (`src/foam/parse/rail/`) the
FOAM way. Each entry: what we needed, what foam3 has, what we did instead, and
what would close the gap. Line references are to foam3 at the submodule pin.

**Severity:** 🔴 blocker — no framework way · 🟠 workaround — done outside the
design system · 🟡 paper cut — cost time, not design.

## At a glance

| # | Gap | Severity | One-line fix |
|---|---|---|---|
| 1 | Setting a background doesn't set the matching ink | 🟡 | Surface tokens that imply their foreground |
| 2 | Dev server marks JS `immutable`; edits need a hard reload | 🟡 | `?v=<hash>` on dev script tags |
| 3 | Test page follows the OS colour scheme | 🟡 | Note in the testing guide |
| 4 | No resizable split pane | 🟠 | `SplitBorder` with `ratio$` + drag handle |
| 5 | Text field has no Enter / submit hook | 🟡 | `onEnter` on `Input` |
| 6 | CheckBox puts its label in the parent | 🟡 | One `<label>` wrapping the input |
| 7 | Layout primitives ignore `$space-*` | 🟡 | `Rows`/`Cols` gap as a token |
| 8 | No monospace / code font token | 🟡 | `$fontMono` |
| 9 | Action labels live apart from `messages:` | 🟡 | Docs |
| 10 | App input CSS swallows `type=range` | 🟠 | `RangeView` opts out of `TextInputCSS` |
| 11 | Standalone page can't get base typography from the core pom | 🟡 | `foam.u2.BaseStyles` in the u2 pom |
| 12 | Dark mode reaches a page with no theme (observation) | ✅ | Docs |
| 13 | No overflow / "More" container that can hold property views | 🟡 | `OverlayActionListView` accepting any view |
| 14 | A property's `onKey` silently overrides `RangeView`'s live default | 🟡 | `fromProperty` keeps a view-class default |
| 15 | `TextArea` needs a hand-picked `rows`; no content sizing (suggestion) | 🟡 | `field-sizing: content` + `max-height` by default |

---

## 1. Setting a background doesn't set the matching ink 🟡

**Needed** · a light-surface view inside a dark-themed app.
**foam3** · `$backgroundDefault` and `$textDefault` are unrelated tokens. A view that sets one inherits the app's text colour on its own surface. Nothing warns.
**Did** · `RailDiagramView` root sets both `background` and `color`.
**Fix** · a surface token that implies its foreground, like `ColorToken`'s `$name$foreground`.

## 2. Dev server marks JS `immutable`; edits need a hard reload 🟡

**Needed** · see a change after editing a view file.
**foam3** · `/src/**/*.js` is served with `Cache-Control: public, max-age=2419200, immutable`. A normal reload keeps the old file; the tutorial says "hard reload" but people and automation hit the stale copy first.
**Did** · Cmd+Shift+R, or `fetch(url, { cache: 'reload' })` per changed file.
**Fix** · `?v=<hash>` on dev script tags, or no `immutable` when serving from `build/classes`.

## 3. Test page follows the OS colour scheme 🟡

**Needed** · a test asserting the viewer's default palette is light.
**foam3** · the client-test page is a full app page, so `foam.lang.Window` applies `prefers-color-scheme`; on a dark Mac the "default" theme under test is dark.
**Did** · `x.createSubContext({ theme: { activeVariants: { color: 'light' } } })` for each variant.
**Fix** · a line in the testing guide.

## 4. No resizable split pane 🟠

**Needed** · canvas | panel with a draggable divider.
**foam3** · `foam.u2.borders.SplitScreenBorder` is fixed 55vw / 43vw and `100vh × 100vw` — a full-page layout, no drag. `SplitScreenGridBorder` is a fixed grid.
**Did** · own 7px splitter div, pointer maths, a `rightWidth` property.
**Fix** · `SplitBorder` with `ratio$` and a drag handle. Reflow's console needs the same.

## 5. Text field has no Enter / submit hook 🟡

**Needed** · "find rule, Enter → first match"; "class id, Enter → load".
**foam3** · `TextField` / `tag/Input.js` listen to `change` or `input` only. An Action's `keyboardShortcuts` registers on the whole view, so `enter` would also fire from the input textarea.
**Did** · `.start(this.FIND_TEXT).on('keydown', …)` on the field.
**Fix** · `onEnter` / `submitAction` on `Input`, or focus-scoped shortcuts.

## 6. CheckBox puts its label in the parent 🟡

**Needed** · labelled checkboxes in a toolbar row.
**foam3** · `foam.u2.CheckBox` appends its `<label>` to `parentNode` (`CheckBox.js:90-100`); two in one flex row interleave boxes and labels, and the row's `gap` splits a box from its own label. The Boolean default view also reads the label from `placeholder` (`Element2.js:2093-2101`).
**Did** · one `span.^check` per checkbox; label passed as `label$` at the call site.
**Fix** · a checkbox that owns its label (one `<label>` wrapping the input).

## 7. Layout primitives ignore `$space-*` 🟡

**Needed** · toolbar and button rows with a consistent gap.
**foam3** · `$space-*` tokens exist (`CSSTokens.js:319-340`) but `layout.Rows`/`Cols` have no gap, `layout.Layout.gap` is a pixel integer, `ButtonGroup` hard-codes `gap: 1rem`.
**Did** · own `^bar` / `^row` / `^transport` classes with `gap: $space-1_5`.
**Fix** · `Rows`/`Cols` take a `$space-*` token.

## 8. No monospace / code font token 🟡

**Needed** · input, status line and grammar editor are code.
**foam3** · `$font1` is the UI face; no `$fontMono`, no Fonts.js class for code. `CSSAuditTest` accepts the literal.
**Did** · `font-family: monospace`.
**Fix** · one `$fontMono` token.

## 9. Action labels live apart from `messages:` 🟡

**Needed** · one place for every user string.
**foam3** · `messages:` on the view and `label:`/`toolTip:` on each Action are separate axioms, both translated. A label that changes at runtime (play ⇄ pause) still needs a message beside the action.
**Did** · `label$` slot at the call site mapping to a message.
**Fix** · documentation.

## 10. App input CSS swallows `type=range` 🟠

**Needed** · a slider (`foam.u2.RangeView`) in the trace panel.
**foam3** · `foam.u2.TextInputCSS` styles every `<input>` alike (height, padding, border, background); a range becomes a 13rem-tall blank box. `RangeView` has no CSS of its own.
**Did** · `^slider input[type=range] { height: auto; padding: 0; border: none; background: none; appearance: auto; }`.
**Fix** · `RangeView` opts out of `TextInputCSS`, or `TextInputCSS` scopes itself to text-like types.

## 11. Standalone page can't get base typography from the core pom 🟡

**Needed** · `demo/index.html` (no `ApplicationController`) with the app's root font size and `p-*`/`h*` classes.
**foam3** · `foam.core.controller.Fonts` is listed in `foam/core/pom.js`, which `foam3/src/pom.js` does not carry in source mode; `requires:` resolves to `undefined` and `tag()` fails with "Object prototype may only be an Object or null". Nothing names the class a page must mount for base styles.
**Did** · direct `<script src="../foam3/src/foam/core/controller/Fonts.js">` + `this.tag(this.Fonts)`.
**Fix** · a `foam.u2.BaseStyles` in the u2 pom.

## 12. Dark mode reaches a page with no theme ✅

**Observed** · the demo page has no app theme, yet once `Fonts` loaded it followed the OS dark setting and the viewer flipped with it: the root context carries a default `Theme`, and `foam.lang.Window` drives `activeVariants.color` from `prefers-color-scheme`.
**Fix** · a line in the CSSTokens guide: every page gets dark mode; opt out with `useVariants: false`.

## 13. No overflow / "More" container that can hold property views 🟡

**Needed** · fold rarely used toolbar controls (checkboxes + actions) behind one `More ▾`.
**foam3** · `foam.u2.view.OverlayActionListView` (what `ButtonGroup` overflows into) takes actions only; `ExpandableBorder` has no header toggle and caps content at 500px.
**Did** · a `toggleMore` text action and a second toolbar row under `show(moreShown$)`.
**Fix** · an overlay list that accepts any view spec, or an `ExpandableBorder` with a built-in header toggle.

## 14. A property's `onKey` silently overrides `RangeView`'s live default 🟡

**Needed** · a slider that scrubs the trace while dragging.
**foam3** · `RangeView` declares `onKey: true` (`RangeView.js:35`), but `Input.fromProperty` tests `this.hasOwnProperty('onKey')` — a class default is not an own value — and copies the property's `onKey` (false) over it (`tag/Input.js:192-193`). The slider then updates on release only, with nothing to say why.
**Did** · `view: { class: 'foam.u2.RangeView', onKey: true }` on the property.
**Fix** · `fromProperty` should defer to a value the view class sets, or `RangeView` should bind `input` unconditionally (a range has no "typing").

## 15. `TextArea` needs a hand-picked `rows` (suggestion) 🟡

**Needed** · an input box that fits one line of input or a pasted paragraph; a grammar editor that fits the grammar.
**foam3** · `foam.u2.tag.TextArea` sizes by `rows` (default 4), set once at render.
**Did** · `field-sizing: content` with a `max-height` on the viewer's two textareas; `rows` stays the floor for Firefox/Safari.
**Fix** · ship `field-sizing: content; max-height` in `TextArea`'s own CSS so no form has to pick a row count.
