# ui-statechart

A Claude Code skill for FOAM. It does two jobs:

- **Plan a screen before building it.** You list the situations a screen can be in and what each action does in each one (a states × events table). Claude turns that into a `foam.FSM`, builds a throwaway page you click through, and writes every decision into a spec. The planning part is a work in progress.
- **Walk an existing state machine.** Point it at the `foam.FSM` machines in your code and get clickable diagrams: every state, every allowed move, and the code's own message for a move it refuses. Two machines that are two ends of one exchange can be replayed side by side.

## See it without installing anything

Open `demo/index.html` by double-clicking it. It needs no checkout and no server; FOAM is bundled in `demo/foam-bin-3.js`. The diagram library (mermaid) loads from a CDN.

| Page | What it shows |
| --- | --- |
| Online order (walker) | One ten-state order machine: click through it, see the allowed moves and the groups |
| Online order: buyer and seller | The same order as two machines sharing one record; four stories, one of them a designed-in gap marked ⚠ |
| Spike round | The skill's own design loop, modelled with the skill, inside its page shell |

`demo/starter/` is a minimal FOAM app (a model, a form, a table) for anyone new to FOAM; it needs a small local server, see its README.

## Install the skill

The pages load the skill's files by a path relative to your app checkout, so the skill folder must sit inside the app:

```
<app>/.claude/skills/ui-statechart/   ← copy skills/ui-statechart/ here
<app>/foam3/                          ← a foam3 checkout that includes foam.FSM (foam3 development, 2026-10-01 or later)
<app>/ignored/spikes/<name>/          ← throwaway pages go here (add ignored/ to .gitignore)
```

As a plugin: `/plugin marketplace add foam-foundation/FOAM-GrammaticVisualizer`, then `/plugin install ui-statechart@foam-grammatic-visualizer`. The skill then loads in Claude Code, but its page files still need to be copied into the app once, as above (SKILL.md, "Where the skill must sit").

Then ask Claude Code to "design this screen" or "walk the state machine in <file>".

## What is in this folder

| Path | What it is |
| --- | --- |
| `skills/ui-statechart/SKILL.md` | The loop, the rules and the checklists Claude follows |
| `skills/ui-statechart/references/` | The statechart guide, FOAM gotchas, page shells (walker, two-party, SpikeShell), the diagram helper and the pack script |
| `DESIGN.md` | Why the skill works this way |
| `examples/` | Source of the demo pages, in the layout an app uses (copy to `<app>/ignored/spikes/`) |
| `demo/` | The same pages packed to open by double-click |

## Re-packing the demo

From an app laid out as above, with the examples copied to `ignored/spikes/`:

```sh
NODE_PATH=<app>/node_modules node .claude/skills/ui-statechart/references/pack-spike.mjs --all --rebuild-bin
# output: ignored/dist/all/ ; it needs uglify-js on NODE_PATH
```

## License

Apache License 2.0, the same as FOAM.
