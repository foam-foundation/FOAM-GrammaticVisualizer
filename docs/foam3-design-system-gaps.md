# FOAM3 design-system gaps

Found while rebuilding the railroad grammar viewer (`src/foam/parse/rail/`) as a
FOAM u2 view. One entry per gap: what the viewer needed, what foam3 offers, the
workaround used, how much it hurt. Pointers are to foam3 at the submodule pin.

Severity: **blocker** (no way to do it with the framework), **workaround** (done,
but outside the design system), **paper cut** (cost time, not design).

---

## 1. A view that sets its background must also set its ink

- **Needed:** a light-surface view inside an app whose theme is dark.
- **foam3:** `$backgroundDefault` and `$textDefault` are separate tokens with no
  pairing; a view that sets one and not the other inherits the app's text colour
  on its own surface. Nothing warns.
- **Workaround:** `RailDiagramView` root sets both `background` and `color`.
- **Severity:** paper cut. A surface token that implies its foreground (like
  `ColorToken`'s `$name$foreground`) would make this impossible to get wrong.

## 2. Immutable cache headers make every JS change a hard reload

- **Needed:** see a change to a view after editing its file.
- **foam3:** the dev server sends `Cache-Control: public, max-age=2419200,
  immutable` for `/src/**/*.js`, so a normal reload keeps the old file and the
  browser never asks. The tutorial says "hard reload", but automation (and
  people) hit the stale copy first.
- **Workaround:** `fetch(url, { cache: 'reload' })` for each changed file, or
  Cmd+Shift+R.
- **Severity:** paper cut. A `?v=<hash>` on dev script tags, or no `immutable`
  when running from `build/classes`, would remove it.

## 3. Test page follows the OS colour scheme

- **Needed:** a test asserting the viewer's default palette is light.
- **foam3:** the client-test page is a full app page, so `foam.lang.Window`
  applies the OS `prefers-color-scheme` and the "default" theme under test is
  dark on a dark Mac. Tests must create explicit light/dark sub-contexts.
- **Workaround:** `x.createSubContext({ theme: { activeVariants: { color: 'light' } } })`.
- **Severity:** paper cut; worth a line in the testing guide.

## 4. No resizable split pane

- **Needed:** two columns with a draggable divider (canvas | trace panel).
- **foam3:** `foam.u2.borders.SplitScreenBorder` is a fixed 55vw / 43vw full-page
  layout (`height: 100vh; width: 100vw`), no drag, no slot for a divider.
  `SplitScreenGridBorder` is a grid, also fixed.
- **Workaround:** the viewer keeps its own 7px splitter div with pointer maths
  and a `rightWidth` property.
- **Severity:** workaround. A `SplitBorder` with `ratio$` and a drag handle
  would serve every two-pane screen (Reflow's console has the same need).

## 5. A text field has no Enter / submit hook

- **Needed:** "find rule, Enter goes to the first match"; "class id, Enter loads".
- **foam3:** `foam.u2.TextField` / `tag/Input.js` listen to `change` or `input`
  only. An Action's `keyboardShortcuts` registers on the whole view, so `enter`
  there would also fire from the input textarea.
- **Workaround:** `.start(this.FIND_TEXT).on('keydown', …)` on the field.
- **Severity:** paper cut. An `onEnter` / `submitAction` on `Input` (or a
  `keyboardShortcuts` scope of "when this view has focus") would remove the raw
  DOM listener.

## 6. CheckBox renders its label beside itself, in the parent

- **Needed:** a labelled checkbox in a toolbar row.
- **foam3:** `foam.u2.CheckBox` appends its `<label>` to `parentNode`
  (`CheckBox.js:90-100`), so two checkboxes in one flex row interleave inputs and
  labels, and a flex `gap` on the row separates a box from its own label. The
  Boolean property default view also takes `placeholder`, not `label`, as the
  label text (`Element2.js:2093-2101`).
- **Workaround:** each checkbox in its own `span` (`^check`), label passed as
  `label$` at the call site.
- **Severity:** paper cut. A checkbox that owns its label (one `<label>` wrapping
  the input) would need no wrapper.

## 7. Layout primitives carry no spacing tokens

- **Needed:** a toolbar row and a button row with a consistent gap.
- **foam3:** `$space-*` tokens exist (`CSSTokens.js:319-340`), but
  `foam.u2.layout.Rows` / `Cols` have no gap at all and `foam.u2.layout.Layout`
  takes `gap` as a pixel integer. `ButtonGroup` hard-codes `gap: 1rem`.
- **Workaround:** the viewer's own `^bar` / `^row` / `^transport` classes with
  `gap: $space-1_5`.
- **Severity:** paper cut. `Rows`/`Cols` taking a `$space-*` token (or
  `Layout.gap` accepting a token) would make the view's layout CSS disappear.

## 8. No monospace / code font token

- **Needed:** the input, status line and grammar editor are code.
- **foam3:** `$font1` is the UI face; there is no `$fontMono` and no Fonts.js
  class for code. `CSSAuditTest` accepts the literal `font-family: monospace`.
- **Workaround:** literal `monospace`.
- **Severity:** paper cut; a themeable code face is a one-token addition.

## 9. An action's label lives apart from the view's messages

- **Needed:** one place for every user string.
- **foam3:** `messages:` on the view and `label:` / `toolTip:` on each Action
  are separate axioms, both translated. The old chrome had messages for button
  text; the actions now carry it, so the messages were deleted — but a label
  that changes at runtime (play / pause) still needs a message beside the action.
- **Workaround:** `label$` slot at the call site mapping to a message.
- **Severity:** paper cut; documentation more than design.

## 10. The app's input CSS swallows a range input

- **Needed:** a slider (`foam.u2.RangeView`) in the trace panel.
- **foam3:** `foam.u2.TextInputCSS` styles every `<input>` the same (height,
  padding, border, background), so a `type=range` renders as a 13rem-tall blank
  box and the native track disappears. `RangeView` carries no CSS of its own.
- **Workaround:** `^slider input[type=range] { height: auto; padding: 0; border: none; background: none; appearance: auto; }`.
- **Severity:** workaround. `RangeView` should opt out of the text-input CSS
  (or `TextInputCSS` should scope itself to text-like types).

## 11. A standalone page cannot get the app's typography from the core pom

- **Needed:** `demo/index.html` (no `ApplicationController`) with the same
  root font size and `p-*`/`h*` classes as the app, so one stylesheet fits both.
- **foam3:** `foam.core.controller.Fonts` is listed in `foam/core/pom.js`, which
  `foam3/src/pom.js` does not carry in source mode; `requires:` then resolves
  to `undefined` and `tag()` fails with "Object prototype may only be an Object
  or null". Nothing names the class a page must mount to get the base styles.
- **Workaround:** a direct `<script src="../foam3/src/foam/core/controller/Fonts.js">`
  and `this.tag(this.Fonts)` in the demo view.
- **Severity:** paper cut. A `foam.u2.BaseStyles` (root size, body font, Fonts
  classes) listed in the u2 pom would make any page's first line obvious.

## 12. Dark mode reaches a page with no theme — through a default Theme

- **Observed, not a gap:** the demo page has no app theme, yet once Fonts
  loaded it followed the OS dark setting and the viewer flipped with it. The
  root context carries a default `Theme` and `foam.lang.Window` drives its
  `activeVariants.color` from `prefers-color-scheme`. Worth a line in the
  CSSTokens guide: "every page gets dark mode; opt out with `useVariants: false`".
