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
