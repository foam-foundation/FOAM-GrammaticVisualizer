# Driving a spike page from Chrome MCP (only when the user asks)

Default is: user tests by eye, you post a checklist. Use this when the user asks for a regression check or says "drive it".

## Load tools once

`ToolSearch` with `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__tabs_close_mcp`. Create your own tab; close it when done.

## Fresh code

```js
await fetch('SpikeView.js', { cache: 'reload' }); location.reload();
```
Then wait ~1.5 s before touching the page.

## Reliable clicks (coordinate clicks drift after a resize)

```js
// buttons: by label
[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Step').click();

// range slider: set value then fire input
var s = document.querySelector('input[type=range]'); s.value = 12; s.dispatchEvent(new Event('input', { bubbles: true }));

// canvas: PointerEvents at page coordinates
function pointer(type, x, y) {
  var c = document.querySelector('canvas'), r = c.getBoundingClientRect();
  c.dispatchEvent(new PointerEvent(type, { clientX: r.left + x, clientY: r.top + y, bubbles: true, pointerId: 1, button: 0 }));
}
pointer('pointerdown', 120, 80); pointer('pointerup', 120, 80);
```

## Deterministic hit-testing

Expose from the spike view during `init`:

```js
window.__spike = { view: this, hit: (x, y) => this.scene.hitAt(x, y) };   // hitAt returns the element or null
```
Then from MCP: `__spike.hit(120, 80)?.parser?.toString()`.

## The MCP tab is usually hidden: flush before you read

u2 updates DOM text on `requestAnimationFrame`, and Chrome never fires that in a hidden tab, so after a click the property changes but the page does not. Take a `screenshot` (any scale) right after the action: it activates the tab for a moment and the pending frame runs. Then read the DOM. Check with:

```js
await Promise.race([ new Promise(r => requestAnimationFrame(() => r('visible'))), new Promise(r => setTimeout(() => r('hidden'), 1000)) ])
```

## Reading state without screenshots

- Status text: `document.querySelector('.spike-status').textContent`
- Current FSM state: `__spike.view.state.name`
- Console errors: `read_console_messages` with `pattern: "Error|Illegal"`.

Screenshots are for the user's eyes; for assertions read the DOM or `__spike`.
