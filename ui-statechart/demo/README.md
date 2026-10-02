# State-machine pages: README for people and coding agents

This folder is a self-contained set of interactive pages. Each page draws a state machine (the states a record can be in, and the moves between them) and lets you walk through it by clicking. It needs no source checkout, no build and no install: the FOAM framework is bundled in `foam-bin-3.js`.

## Open it

**Simplest:** double-click `index.html`. It opens as `file://` and works, because everything the pages need is already in this folder.

**With a local server** (use this when a browser blocks `file://` pages, or when an agent drives the browser):

```sh
cd <this folder>
python3 -m http.server 8767
# then open http://127.0.0.1:8767/index.html
```

Any static file server works. Nothing is sent anywhere. The one network request is the diagram library (mermaid), which loads from a CDN. Product icons that a page names by root path (`/images/…`) show only when the folder is served from its own root; double-clicked, the labels still show. Offline, copy `mermaid.min.js` next to the page and point its `<script>` tag at the copy.

## What is in here

| Path | What it is |
| --- | --- |
| `index.html` | Doorway: lists every page, with a title and a one-line question for each |
| `how-to-use.html` | Reader's guide: the diagram legend, the kinds of page, how to read a walk |
| `spikes/<name>/index.html` | One page per machine or conversation |
| `machines/` | The state-machine source files the pages load from the app's `src/` (copied at pack time); a page that keeps its machines in its own folder carries them in `spikes/<name>/` instead |
| `machines/guards.js` | The refusal messages ("why this move is not allowed"), extracted at pack time |
| `shell/` | The shared page code (walker, two-party conversation, diagram) |
| `foam-bin-3.js` | The FOAM framework plus `foam.FSM`, pre-built |

The folder is a snapshot, and it does not update itself. When the app's wording or machines change, whoever owns the app source re-packs it (see the last section).

## For coding agents (Claude Code and similar)

- **Serve, then open.** Start the server above in the background, open `http://127.0.0.1:8767/index.html`, and hand the human the URL. Do not edit files in this folder to "fix" a page, because the next pack overwrites them. Report the problem instead.
- **Page kinds.**
  - A *design spike* page shows a screen being designed, with a dark "Spike controls" strip (sample data, layouts) and tabs (checklist, statechart, open questions, legend, log) below it.
  - A *walker* page shows one or more machines: click a state or a move button, and the "you are here" card updates.
  - A *conversation* page shows two sides of one exchange (for example buyer and seller): pick a story preset, or click the moves in turn.
  `how-to-use.html` explains the page kinds in this folder for a human reader.
- **Checking that a page loaded.** The page title renders, the diagram draws, and the browser console shows no red errors. Many pages expose `window.__spike` for scripted checks.
- **Answering questions from the pages.** State names, allowed moves and refusal messages come from `machines/`, so they are what the app said at pack time. Cite the file under `machines/` when you quote one. Prose in `spikes/<name>/config.js` is hand-written explanation and may lag behind the app.
- **Browser driving.** Wait for the diagram to finish drawing before you click. Hidden or background tabs may not re-render, so keep the tab in front.

## Re-packing (only for someone with the app source and the ui-statechart skill)

From the app checkout root:

```sh
NODE_PATH=<app>/node_modules node .claude/skills/ui-statechart/references/pack-spike.mjs --all
# output: ignored/dist/all/ ; add --rebuild-bin after a FOAM framework change,
# and --from=<folder> when the pages live outside ignored/spikes (that folder's README says which)
```

A page whose source folder holds a `.no-pack` file is never packed: it is private.

## For design work (development, not this folder)

To design a new screen, or to change a page, use the `ui-statechart` skill inside an app checkout that has FOAM. Its `SKILL.md` runs the loop: states × events table, then a throwaway page served from the checkout root (`python3 -m http.server 8765`, pages under `ignored/spikes/<name>/`), then rounds of "look, answer, fix", then a written spec. This folder is only the shareable output of that work.
