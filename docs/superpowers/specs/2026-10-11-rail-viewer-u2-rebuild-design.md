# Rail viewer chrome rebuilt with foam.u2 — design

Date: 2026-10-11. Branch: `setup/initial-project`.

## Intent

Make the railroad grammar viewer (`src/foam/parse/rail/RailDiagramView`) a FOAM3
view built the way foam3 builds its own: state as declared properties with
`view:` specs, buttons as `actions:`, layout from existing borders, every colour
and size a token, every user string a message. Doing it the FOAM way is also
the instrument: each place the design system has no answer is recorded in
`docs/foam3-design-system-gaps.md`.

Done means: the viewer's chrome contains no raw `<button>`, `<select>`,
`<input>`, `<textarea>` or inline `style()` of its own; the demo page still
works without an app; tests, `CSSAuditTest` and light/dark screenshots pass.

## Not in scope

- `RailScene` (SVG), `RailInputRibbon` (canvas), `DerivationPanel`, `DocumentView`
  internals. They are drawing code, already token-driven after the dark-mode work.
- Modelling grammars/examples as DAOs. That is the next slice.
- Changing what the viewer does. Same features, same keyboard behaviour.

## Approach

Rewrite in place, one section per commit. `RailDiagramView` keeps its logic and
public surface (`usePreset`, `useGrammar`, `setInput`, `record`, `show`,
`grammarText`, `grammarShown`, `documentShown`, `status`, `allowTypedGrammar`,
`debugHook`, `presets`) because `demo/RailDemo.js` and the app wrapper call them.
A section becomes its own view only when it turns out self-contained (the
transport bar and the legend are candidates).

## Mapping

| Today | FOAM | Note |
|---|---|---|
| `<button>` Fit width/all, Unfold path, Fold all, Load grammar, Parse, ◀ ▶ over rule play end | `actions:` rendered with `.add(this.ACTION)` / `ButtonGroup` | `toolTip` from the TIP_* messages; `isEnabled` where the handler bails today (no trace → step buttons record first, so they stay enabled); play/pause is one action whose `label$` follows `playing` |
| `<input type=checkbox>` all rules, values on boxes, values per rule, Legend, Document view | Boolean properties with a `CheckBox` view (`showAll`, `legendShown`, `documentShown` exist; `showValues`/`showLanes` proxy the scene's) | label via the view's `label`; no hand `<label>` |
| find rule `<input>` | `findText` with `TextField`, `onKey: true`, placeholder | Enter → `goToFirstMatch` action or keydown on the field |
| class id `<input>` | `classId` String with `TextField` | Enter loads |
| preset / registered `<select>` | `preset`, `registered` String properties with `ChoiceView` over `choices` | placeholder as the first choice if ChoiceView has none |
| grammar / input `<textarea>` | `grammarText`, `input` with `TextArea` | `syncGrammarEl` and `inputEl` go away: the view binds `data$` |
| `<input type=range>` | `step` with `RangeView`, `max$` from the trace | |
| splitter div + pointer maths | `foam.u2.borders.SplitScreenBorder` if it resizes; else keep a scoped splitter and log the gap | |
| legend panel | `foam.u2.borders.ExpandableBorder` (or `CardBorder` + `show`) | swatches keep token colours via `foam.CSS.returnTokenValue`, not literals |
| `^` css with px, `font-size: 12px`, `sans-serif` | `rem`, Fonts.js classes (`p-sm`, `p-label`), `$space-*`, `$border*`, `$text*` | `RailTheme` tokens become `foam.u2.ColorToken`s (dark variants stay) |
| strings in render | already `messages:`; keep | |

## Verification per commit

- `./build.sh -Ngvtest -W8091 client-tests:<20 rail ids>` — same pass count as
  before (342) plus any new tests; `RailNotationTest` Span failure is known.
- `./build.sh -Ngvtest server-tests:CSSAuditTest` — 0 failures.
- App screenshot light and dark on the 8090 instance as `demo`.
- `demo/index.html` served by `python3 -m http.server`: toy preset parses.

## Gaps log

`docs/foam3-design-system-gaps.md`. One entry per gap: what the viewer needed,
what foam3 offers, workaround used, severity. Written in the commit that hits
the gap.

## Status (2026-10-12)

Done on `setup/initial-project`:

- `RailDiagramView` chrome: 12 actions, 11 property-bound controls, no raw
  `<button>/<input>/<select>/<textarea>` and no inline colour (asserted by
  `RailDiagramViewTest`). Layout CSS on `$space-*`, `rem`, Fonts classes.
- `DerivationPanel` and `DocumentView`: depth palette and legend samples as
  classes on `RailTheme` tokens; sizes on `rem`/`$space-*`/`$header-*`.
- Demo page mounts `Fonts` so the standalone page matches the app's type scale;
  it also follows the OS dark setting through foam3's default theme.
- Rail suite 374 passed / 1 known (`Span`); `CSSAuditTest` 0 failures.
- 12 entries in `docs/foam3-design-system-gaps.md`.

Deviations from the mapping above:

- Legend stays a `show()`-toggled panel, not an `ExpandableBorder`: the border
  has no header toggle and would leave an empty bordered box when collapsed.
- Splitter stays hand-rolled (gap 4).
- `ButtonGroup` not used for the transport: its overflow menu would hide the
  step buttons in the 440px column; a wrapping flex row keeps them visible.

Open:

- Loading the app directly at `#grammaticVisualizer.grammar` on a fresh page
  shows the nav only; clicking the menu renders it. Not reproduced for Reflow in
  a clean run; to check against another `ViewMenu` before calling it a gap.
- ~~Slider only moved on release.~~ Resolved: `Input.fromProperty` copied the
  property's `onKey` (false) over `RangeView`'s live default; the view spec now
  sets `onKey: true` (gap 14).

## Later (noted 2026-10-12, not scheduled)

- ~~**Several previews, one grammar.**~~ Done 2026-10-12 at the tag level:
  `foam.parse.rail.Session { input, grammar, trace, step, snapshot }` with its own
  step actions; the `<grammar>` tag keeps one per input, renders a card per session
  (DocumentView bound to `snapshot$` + ⏮ ◀ ▶ ⏭), and mirrors the selected one into
  `RailDiagramView`, which still holds a single trace. Moving sessions into the
  viewer itself (several diagrams, or the app screen with sessions) is still open.
- **Preview abstraction for non-text sources (xlsx, csv, pdf).** The parser reads a
  string and highlights are character offsets; `DocumentView` assumes lines and
  columns. Needs `Source { text, mapOffset(pos) → location }` and a pluggable
  preview (`TextPreview`, `GridPreview`, `PdfPreview`) that takes spans in its own
  coordinates. `ParseTrace`, the scene and the derivation panel stay as they are.
  CSV is text and already works.
- **`input-from` in a static flow:** in the sample flow the `pairs` Script block
  showed only its name and the second `<grammar>` resolved an empty input; the
  unit test covers `input-from` against a populated scope. To check whether a
  Script block's value is in scope before its autoRun completes, or at all in
  static mode.
- **Theme screens + a themes guide (next up, noted 2026-10-12).** `#grammaticVisualizer.theme-all`
  (foam3's raw `Theme` detail): Colours tab shows names with empty swatches (the
  app's theme sets no `primary1..5`; those fields feed the legacy `/*%PRIMARY1%*/`
  CSS macros, not `$tokens`), Icons/Images render at natural size (`ImageView` has
  no bounds; the Customise Theme screen's `ThemeImageUploadView` caps at 50%),
  Navigation is three raw strings (class names / a JSON view spec), Inputs is
  three strings (`inputHeight`, `inputVerticalPadding`, `inputHorizontalPadding`)
  that become `$inputHeight` etc. via the same macro pass. Real theming is
  `cssTokens` (261 base in `CSSTokens.js` + per-class) overridden per theme through
  `cssTokenOverrideDAO` (`CSSTokenOverride`), which has no menu or editor in foam3.
  Plan: analyse first, then a `doc/guides/Themes.md` (Theme model vs tokens vs
  overrides vs variants) and screen fixes (swatches, image bounds, token
  override editor). No dedicated themes guide exists today; `doc/fbe/CSSTokens.md`
  covers tokens only.
