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
| 16 | `TabChoiceView` always binds the URL | 🟡 | `memorable` switch on the view |
| 17 | A markdown tag's class only registers once something references it | 🟡 | Eager-load files that carry a `registerElement` script |
| 18 | Two theming systems: Theme colour fields are CSS macros, not tokens | 🟠 | Retire the macro fields or make them token overrides |
| 19 | No screen for `CSSTokenOverride`, the real per-theme theming | 🟠 | A token override editor on the Theme screen |
| 20 | `ImageView` renders a picture at natural size | 🟡 | A bounded preview view for `Image` properties |
| 21 | Theme fields explain nothing: no `help`, no units, raw class names | 🟡 | `help` on every Theme property |
| 22 | `TabbedDetailView` renders every tab twice; async views in the first tree crash | 🟠 | Apply section visibility synchronously on first render |
| 23 | One permission round trip per property on first open of a record | 🟡 | Batch `auth.check` per class |
| 24 | `DAOBrowserView` picks canned query index 1 by default | 🟡 | Default to 0 |
| 25 | A bare word in the table search box matches nothing | 🟠 | Fall back to keyword search when the query parser yields no predicate |
| 26 | A table cell can't have an edit view: every cell is forced to VIEW | 🟠 | A per-column `tableCellView` / mode-aware cell, plus an inline-edit table mode |
| 27 | A detail view can't join the record's Save | 🟠 | A `save` / `cancel` topic on the update view, or a `saveHooks` export |
| 28 | No "unsaved changes" guard when leaving a screen | 🟠 | A stack-level `canLeave` check plus one standard Discard / Keep dialog |

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

## 16. `TabChoiceView` always binds the URL 🟡

**Needed** · a Code | Diagram tab strip on every `<grammar>` tag in a document — twenty of them on one page.
**foam3** · `TabChoiceView` mixes in `Memorable` and its `cannedQuery` is `memorable: true` (`TabChoiceView.js:11,48-52`), so each instance writes the selected label into the URL's `query` key and reads it back on render; many instances fight over one key.
**Did** · wrap it in `startContext({ memento_: foam.u2.memento.Memento.create() })` — a detached memento root, the trick `foam.core.reflow.example.Example` also uses.
**Fix** · a `memorable` switch on the view, off by default when there are siblings.

## 17. A markdown tag's class only registers once something references it 🟡

**Needed** · `<grammar>` recognised in every flow.
**foam3** · `registerElement` runs in a `foam.SCRIPT` inside the class file, and a class file loads on first lookup of the class. Until then `MarkdownView` renders `<grammar>` as plain text — silently. `<example>` only works because the console's `example` command `requires` it, which the loader follows.
**Did** · a `/grammar` console command (`GrammarCommand`, listed in `journals/cmds.jrl`) that `requires` `GrammarTag`; the console loads its commands at start, so the tag is registered before any flow renders.
**Fix** · let a pom entry mark a file eager (`{ name, flags, eager: true }`), or have `MarkdownView` try `foam.maybeLookup` on an unknown tag name.

## 18. Two theming systems: Theme colour fields are CSS macros, not tokens 🟠

**Needed** · a Theme screen where changing a colour changes the app.
**foam3** · `Theme.primary1..5`, `secondary*`, `approval*`, `warning*`, `destructive*`, `grey*`, `black`, `white`, `inputHeight`, `inputVerticalPadding`, `inputHorizontalPadding` are plain strings that `ApplicationController.MACROS` text-replaces into `/*%PRIMARY1%*/` and `$inputHeight` in CSS (`ApplicationController.js:132-178`, `:676-717`). Five files still use the colour macros; every view written with `$primary500`-style tokens ignores them. The screen gives no hint which system a field belongs to.
**Did** · dropped the Colours tab from the app's Theme screen; the CSS tokens tab (overrides + catalogue) stands in its place. Removal from foam3 sized at 4-6 days (deprecate first: 1-1.5).
**Fix** · drop the macro colour fields, or have the app convert them into `CSSTokenOverride` rows on save.

## 19. No screen for `CSSTokenOverride`, the real per-theme theming 🟠

**Needed** · set `$primary500` for one theme, light and dark.
**foam3** · `cssTokenOverrideDAO` + `CSSTokenOverrideService` do exactly this (`doc/fbe/CSSTokens.md` "Overriding Tokens"), but no menu, no Theme section and no view lists or edits the rows. The only way in is a journal line or the generic Data Management browser.
**Did** · `TokenOverridesView` (table with swatches, add form, per-row remove) under the Colours tab of the app's Theme screen.
**Fix** · ship that table in `foam.core.theme` and reference it from a `tokens` section on `Theme`.

## 20. `ImageView` renders a picture at natural size 🟡

**Needed** · a logo preview on the Theme screen.
**foam3** · `Theme.logo` and four siblings use `MultiView [TextArea, ImageView]`; `foam.u2.view.ImageView` tags `foam.u2.tag.Image` with no width, height or CSS, so a 1200px logo fills the page. `ThemeImageUploadView` (Customise Theme) bounds its preview with its own `max-width: 50%`.
**Did** · `ThemeImagesView`: a 15rem × 7.5rem box per image, light and dark surface, `object-fit: contain`.
**Fix** · `ImageView` takes a `maxWidth`/`maxHeight` (or a `displayWidth` the `Image` property already has) and bounds by default.

## 21. Theme fields explain nothing 🟡

**Needed** · a user who opens the Inputs or Navigation tab should learn what `inputHeight` or `sideNav` does.
**foam3** · the properties have `documentation` (shown nowhere in the UI) and no `help`; `PropertyBorder` renders `help` as a ? icon with an expandable text (`PropertyBorder.js:375-414`). `sideNav` is a JSON view spec in a plain string field; `topNavigation` and `footerView` are class ids with no default shown.
**Did** · `ThemeDetailView` passes `help` per field through `SectionView.config`; `InputSizingView` adds a live sample box.
**Fix** · `help` on the Theme properties in foam3; a view-spec editor for `sideNav`.


## 22. `TabbedDetailView` renders every tab twice; async views in the first tree crash 🟠

**Needed** · open a Theme, press Edit.
**foam3** · `TabbedDetailView.updateVis` is `isMerged` with a 100ms delay (`TabbedDetailView.js:125-132`), so the first render runs with `stableVisibilities_ = []`, which the template treats as "every section". The real list arrives 100ms later and the whole tab tree is rebuilt. Views in the first tree that render asynchronously are still awaiting: `FObjectView` (the default for `appConfig`, an `FObjectProperty`) awaits `choicesLoaded`, resumes on a detached element, and `end()` returns `undefined`, so `.start()` throws (`FObjectView.js:290`). Every open also logs forty "Attempt to add child to detached parent" warnings. Stock foam3's Admin → Themes - All shows both.
**Did** · `ThemeDetailView` redeclares `updateVis` without the merge; Theme's sections resolve synchronously, so the first render is the only one.
**Fix** · apply the visibility list synchronously on first render and keep the merge for later changes; or have `addChild_` on a detached parent stop the async render instead of warning.

## 23. One permission round trip per property on first open of a record 🟡

**Needed** · open a Theme as a non-admin.
**foam3** · every Theme property is `writePermissionRequired`, so `createVisibilityFor` (`Element2.js:1885-1915`) runs `auth.check` for `theme.rw.<prop>` then `theme.ro.<prop>`, one request each, about fifty per record. `CachedAuthServiceProxy` caches per permission string for the session (`CachedAuthServiceProxy.js:46-55`), so only the first open pays, but that first open fills in over four to six seconds, tab by tab. There is no batched `checkAll`.
**Did** · nothing; rendered the tabs once so at least the chrome does not rebuild while the fields arrive (gap 22).
**Fix** · one `auth.checkAll(class)` round trip that returns every `<class>.rw/ro.<prop>` answer at once, used by the sectioned detail views.

## 24. `DAOBrowserView` picks canned query index 1 by default 🟡

**Needed** · a table whose first canned query ("All") is the one shown on open.
**foam3** · `DAOBrowserView.cannedPredicate` falls back to `config$cannedQueries[1]` when `preSelectedCannedQuery` is null (`DAOBrowserView.js:190-194`), so the second tab is selected on open unless the config says `0`.
**Did** · `preSelectedCannedQuery: 0` on the catalogue's config.
**Fix** · default to index 0.

## 25. A bare word in the table search box matches nothing 🟠

**Needed** · type `Canada` into the Countries list, or `borderBrand` into the token catalogue, and see the rows filter.
**foam3** · `DAOControllerConfig.searchMode` defaults to `FULL`, where `foam.parse.QueryRouter` tries the simple query language first and only runs the full-text `KEYWORD` search when the text starts with `TEXT:` or `:` (`QueryRouter.js`, grammar `FULL: alt(query, text)`, `text: seq1(1, key('TEXT:' | ':'), ...)`). A bare word parses to no predicate, the URL still records `search=Canada`, and the table shows every row. Seen on the stock Countries menu as `demo`; `:Canada` gives one row.
**Did** · `SIMPLE` mode is no better: its grammar is the same `text` rule with the prefix. The catalogue hides the query bar (`hideQueryBar`) and keeps a `ClearableSearchField` of its own that sets `config.searchPredicate = KEYWORD(text)`; `KEYWORD` works on a client `MDAO`.
**Fix** · in `FULL`, fall back to `KEYWORD(text)` when the query parser produces nothing; or make the placeholder say the prefix.

## 26. A table cell can't have an edit view: every cell is forced to VIEW 🟠

**Needed** · the token catalogue, in EDIT mode, with Light and Dark as colour pickers in the row and an Add / Save override action per row.
**foam3** · `UnstyledTableRow` renders each cell inside `startContext({ controllerMode: 'VIEW' })` and only through `prop.tableCellFormatter.format(...)` (`UnstyledTableRow.js:188-220`). The formatter gets a projection of the visible columns, not the row object, and there is no per-column view or edit view. Row actions are a context menu, not a column. Clicks on an input inside a cell also reach the row's `click`, which opens the record by default.
**Did** · `TokenEditFormatter` looks the catalogue up in the context, gets an editor object per row, and opens its own context with that editor as `data` and the screen's mode, so `ModeAltView` can pick the read or the edit view. The catalogue sets a no-op `click`, and re-renders the rows (`on.reset`) when the mode changes.
**Fix** · a mode-aware cell: let a property's `view` (with `ModeAltView`) render in the table under the table's own `controllerMode`, and support action columns. An "inline edit" table mode would cover the rest.

## 27. A detail view can't join the record's Save 🟠

**Needed** · the Theme screen's override rows are other records (`CSSTokenOverride`). A change staged in a row should be stored when the page's Save is pressed, and dropped on Cancel.
**foam3** · `DAOUpdateView.save` does `config.dao.put(workingData)` then `stack.back()` (`DAOUpdateView.js:117-145`). Cancel is also `stack.back()`. The view publishes `finished` only when the record changed, does not export `config`, and has no hook for child views. A view inside it cannot tell Save from Cancel.
**Did** · `ThemeTokensView` imports `themeDAO` and listens for a put of this theme on it. That put is what Save does, so staged rows are stored then; Cancel never puts, so they are dropped with the view. This depends on the menu's `daoKey` being `themeDAO`.
**Fix** · `saved` and `cancelled` topics on `DAOUpdateView` (and `DAOCreateView`), exported to the detail view; or an exported `saveHooks` list the Save action awaits before `stack.back()`.
**Closest existing hook** · comics v3 `DetailView` lets a *model* override `save` and `cancelEdit` with a `foam.comics.v3.ComicsAction` of the same name (`DetailView.js:295-318`, documented in `doc/guides/Comics.md`). That is per model, not per view, and this menu runs comics v2 (`DAOMenu2`), so it does not apply here.

## 28. No "unsaved changes" guard when leaving a screen 🟠

**Needed** · warn before Cancel, Back, or a menu click throws away staged edits ("You have unsaved changes: Discard / Keep editing").
**foam3** · searched `foam/u2/stack`, `foam/core/u2/navigation`, `ApplicationController`, `foam/core/menu`, comics v2 and v3: nothing can veto navigation. `Stack.push` / `back` / `jump` have no check, and no `beforeunload` handler exists outside debug tools. What does exist: `foam.u2.dialog.ConfirmationModal` (a reusable dialog), `Action.confirmationRequired` (confirm before one action runs, `doc/guides/Actions.md`), wizard `discard`, and hand-built "Unsaved Changes Detected" dialogs inside the Reflow `Console` only (`Console.js:2025`).
**Did** · nothing yet; the Theme screen shows staged rows instead (status line planned).
**Fix** · a `canLeave()` (or `dirty` slot) that `Stack` asks the top view before `back` / `push` / `jump`, a `beforeunload` hook for tab close, and one standard Discard / Keep editing dialog built on `ConfirmationModal`. Document it next to `confirmationRequired`.
