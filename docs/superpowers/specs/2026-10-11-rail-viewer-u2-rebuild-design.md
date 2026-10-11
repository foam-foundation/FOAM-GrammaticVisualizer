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
