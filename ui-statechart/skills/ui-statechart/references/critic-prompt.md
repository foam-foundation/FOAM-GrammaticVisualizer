# Visual critic — a subagent that critiques a spike page before (or after) the user looks

Use when the user says the page "feels off" (alignment, hierarchy, polish) or before handing over a round that changed layout. Dispatch one subagent with an explicit strong model; it only critiques, the main session applies. First run (2026-09-25), after the user said the page was not centred: 10 ranked findings, all applied, including the one-line centring fix in the shell.

Prompt (fill the brackets):

```
Role: senior visual/interaction designer critiquing a developer tool's page layout. CRITIC ONLY: do not edit any file.

Page: a throwaway design spike inside SpikeShell (title row, a "Spike controls" strip, the design card, then tabs).
User's complaint (verbatim): "[paste]".

Inputs:
- screenshot: [path] (read it)
- code: .claude/skills/ui-statechart/references/spike-shell.js, ignored/spikes/[name]/SpikeView.js
- live: http://127.0.0.1:8765/ignored/spikes/[name]/index.html. If Chrome tools are available, open your own tab,
  check the page at wide, ~900px and ~390px (same-origin iframes of those widths work when the window will not resize),
  then close your tab. No dialogs, nothing destructive.

Fixes must keep: state never by colour alone; disabled controls look disabled and say why; every colour a --sp-* token;
tool (strip, tabs) distinct from the design; no horizontal scroll at phone width. Polish pass, not a redesign.
Shell-wide fixes go in the shell; page fixes name the page.

Deliver (under 600 words), ranked, max 10: problem in plain words (what the eye does wrong), where (file + rule),
exact fix (CSS values / markup), why it works. Judge: centring/max-width, one shared left edge, spacing rhythm,
hierarchy of the primary move vs refusal vs secondary moves, empty space / unequal cards, tool loudness vs design,
type scale. End with: which 3 to do if only 3.
```

What the first run found (now in the shell, so do not re-find): no `margin: 0 auto`; FOAM Tabs band louder than the design; a destructive move styled like a heading; a grid hole from one tall piece (fix: `grid-auto-flow: row dense` + tall piece `grid-row: span 3`); six font sizes (now four: 20 / 15 / 13 / 12); refusal text not tied to its button (now amber left rule + "⏸ Why not yet").
