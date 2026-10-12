# Rail viewer UX pass 1 — hierarchy, disclosure, empty state

Date: 2026-10-12. Scope: `RailDiagramView` chrome only (toolbar, right column).
Vocabulary: visual hierarchy, progressive disclosure, empty state, signifier,
information scent, Fitts, Hick, Gestalt proximity, system status.

## Problems (from the 2026-10-11 screenshot)

| # | Issue | Term |
|---|---|---|
| P1 | 13 same-weight buttons; nothing says "start here" | visual hierarchy |
| P2 | Transport: 7 small buttons, "end" wraps to its own row; no step readout beside the slider | Fitts, Gestalt proximity, system status |
| P3 | Toolbar shows every toggle and camera button at once | Hick, progressive disclosure |
| P4 | Grammar sources row (preset / registered / class id / edit grammar) crammed, labels truncated | recognition over recall, information scent |
| P5 | Right column before a parse says "press Start" (button is "Parse") and little else | empty state, feedback |
| P6 | "⏭ over", "⏭ rule", "values per rule", "Unfold path" predict little | information scent |

## Design

### 1. One primary action, a real transport (P1, P2, P6)

- `parse` gets `buttonStyle: 'PRIMARY'`; every other action stays SECONDARY.
- Transport becomes one row that never wraps: `◀` · `▶` · `step out` · `next rule` · `▶▶ play` · `⏭ end`, all `size: 'SMALL'`, icons only where the glyph is universal (◀ ▶), text where it is not. Rendered through `foam.u2.ButtonGroup` so overflow goes to its menu instead of wrapping.
- Step readout `step 7 / 228` sits right of the slider in the same `^row` (proximity); the status line keeps the event text.
- Labels: `⏭ over` → `step out`, `⏭ rule` → `next rule`, `values per rule` → `show rule values`, `Unfold path` → `unfold matched path`. Tooltips stay.

### 2. Progressive disclosure in the toolbar (P3, P4)

- Toolbar keeps: title, `Fit width`, `Fit all`, find field, `values on boxes`.
- Everything else moves behind one `More ▾` control: `all rules (n unreachable)`, `show rule values`, `Legend`, `unfold matched path`, `Fold all`. Implementation: a `foam.u2.view.OverlayActionListView` for the actions and the Boolean toggles rendered as checkbox rows in the same overlay (if the overlay cannot host property views, an `ExpandableBorder` strip under the toolbar instead — log the gap).
- Grammar sources: the preset picker is the first control and is given room (min 18rem); `registered in this page…`, `class id` and `edit grammar` move into a second row shown by `▸ other sources`. The preset select shows the full name (no truncation): `ChoiceView` with `size` default and the row no longer `flex: 1` on every child.

### 3. Empty state and feedback (P5)

- Before a grammar: right column shows one line in `^hint`: "Pick a preset, or a grammar registered in this page, then press Parse."
- After a grammar, before a parse: status "7 rules, start = START · press Parse"; derivation panel empty text becomes "Press Parse to record the derivation" (message `EMPTY`).
- After editing the input: status "input changed — press Parse" (already), and the `parse` button pulses once (`^attention` class toggled by a `needsParse` Boolean; no colour literal, uses `$primary*`).
- Message names change accordingly; `START`/"Start" wording is gone everywhere.

### 4. Canvas signifiers (pass 2, pulled in)

- `+` / `−` zoom actions beside Fit width / Fit all, so zooming is visible, not only a wheel gesture.
- A rule-reference box thickens its stroke on hover (`[data-rail]:hover > .box.ruleref`), so a clickable box reads as clickable before the click. The cursor was already a pointer.

### 5. Legibility (pass 2, pulled in)

- Canvas text one step up in `RailTheme.fonts`: labels 13 → 14px, rule names 13 → 14px, glyphs 11 → 12px, values 9 → 10px.
- `muted` ink darker in light (`#666`) and lighter in dark (`#a8a8a8`) for contrast.

## Deviations while implementing

- `More` and `other sources` are text-style toggle actions revealing a second row (`show()`), not an overlay menu: `OverlayActionListView` hosts actions only, and the hidden set is mostly property views (checkboxes). Logged as gap 13.
- Parse is its own full-width primary row above a six-button transport, rather than seven in one row: at 440px seven never fit without wrapping, and a wrap put `end` on a row of its own.

## Verification

- `RailDiagramViewTest`: adds `parse.buttonStyle === 'PRIMARY'`; transport buttons share one row (`getBoundingClientRect().top` equal); toolbar shows ≤ 5 controls before `More`; empty-state messages present before/after `useGrammar`.
- `CSSAuditTest` 0; rail suite unchanged apart from the above.
- Screenshots light/dark at 1280 px and at 1000 px (the overflow case).
