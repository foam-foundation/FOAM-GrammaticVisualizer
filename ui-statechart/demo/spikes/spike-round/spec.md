# Spike round — the tool, modelled with the tool

**Date:** 2026-09-25
**Why:** the skill was first used on one product's eight-page form wizard. This example models the interaction of the tool itself, from a different domain (design work), to check that the tool is not tied to that product. **Genericity test:** the page must run inside `SpikeShell` with zero shell changes.
**Open the page:** copy this folder to `<app>/ignored/spikes/spike-round/` (skill at `<app>/.claude/skills/ui-statechart/`, foam3 at `<app>/foam3/`), run `python3 -m http.server 8765` from `<app>`, then open `http://127.0.0.1:8765/ignored/spikes/spike-round/index.html`.
**Status:** kept as a worked example of the `ui-statechart` skill; the page is `index.html` in this folder.

## 1. Frame

- **What it does:** shows one design spike's life (frame, statechart, page, rounds with the user, settled) as pieces side by side, with what is left and why a move is refused.
- **Who uses it:** the designer running the `ui-statechart` loop (a person, or a coding agent driving the skill), and the reviewer who wants to know "where is this design?".
- **Done looks like:** at any moment the page says which step the spike is in, what blocks the next move, and whether it may be called settled.

## 2. Statechart

### 2a. Page machine — source of truth

| state \ event | continue | back | user: asks for a change | user: says settled | drop spike |
|---|---|---|---|---|---|
| **FRAMING** (initial) | CHARTING / guard: all three frame lines written | — | ✗ | ✗ | ABANDONED |
| **CHARTING** | BUILDING / guard: every cell decided | FRAMING | ✗ | ✗ | ABANDONED |
| **BUILDING** | AWAITING_LOOK / guard: page loads, `checkMachine()` is `[]`, round checklist written | CHARTING | ✗ | ✗ | ABANDONED |
| **AWAITING_LOOK** | ✗ (the user is looking; nothing to do) | ✗ | REVISING | SETTLED / guard: no assumption open | ABANDONED |
| **REVISING** | AWAITING_LOOK / guard: this round's addendum written | CHARTING (the change needs a new state or event) | ✗ | ✗ | ABANDONED |
| **SETTLED** (terminal: next is "plan it") | — | — | — | — | — |
| **ABANDONED** (terminal) | — | — | — | — | — |

Guards return the refusal reason (`''` = allowed), shown under the disabled move.

### 2b. Pieces

| piece | waits for | active in |
|---|---|---|
| Frame (does / who / done) | nothing | FRAMING |
| Statechart table (cells decided, n of m) | the frame | CHARTING |
| Spike page (loads, machine check, checklist) | every cell decided | BUILDING, REVISING |
| Rounds (addenda) | the first hand-over | REVISING |
| Assumptions (answered, n of m) | nothing; answers arrive any time | every non-terminal state |

Data events: edit a frame line, decide a cell, tick a page check, write the addendum, answer an assumption.

## 3. The genericity check: the same shape as a form wizard

| pattern | form wizard (another product) | spike round (design work) |
|---|---|---|
| steps fewer than states | Prepare · Evidence · Review | Frame & chart · Build · Rounds |
| a wait on someone else, no Back | THIRD_PARTY_WAIT (an outside check) | AWAITING_LOOK (the user looks) |
| simulated outside answers | "the check settled them" / "could not settle" | "User asks for a change" / "User says settled" |
| guard reason = disabled text | "Link at least one record." | "Decide 4 more cells." |
| a piece independent of the step | — | Assumptions (answerable any time) |
| terminal by outside decision | RESOLVED (outside check) | SETTLED (the user) |
| assumption blocks the end | — (A1-A4 are listed, do not block) | open assumptions refuse SETTLED |

What the shell had to know about either domain: nothing. What repeats in both designs and is a candidate for the skill (not the shell): the piece-with-status card, the live-review rail, one primary move with its refusal. Extract when a third spike needs them.

## Addenda

- Round 0 (2026-09-25): spec and page written in one pass on the user's "go with your best judgment". Scripted walk verified every path. Fresh spike: frame, then 4 cells left refused, then every cell decided, then the page checks refused until ticked, then handed over, change asked, hand-back refused until the addendum was written, handed back (logged as round 0), then settled. Wizard-redesign sample: "settled" refused with "4 assumptions still open (A1, A2, A3, A4)", and allowed after all four were ticked answered. `checkMachine()` returns `[]`.
  **Genericity result:** the shell needed no change for the new domain. It needed one change that improves every page: a disabled u2 button looked enabled in dark mode, so `SpikeShell` now dashes and fades `.foam-u2-ActionView[disabled]`. Found while building: a constant named like a property in upper case (`FRAME` beside `frame`) breaks the class, now in gotchas. Awaiting the user's look.
- Round 1 (2026-09-25, user: "it is not centred… visual hierarchy can still be improved… spin up a sub-agent with a specialized role to critique you"): a visual critic subagent (read-only) returned 10 ranked findings, and all 10 were applied. In the shell: centred (`max-width: 1280px; margin: 0 auto`, measured 160px each side at 1600px); tabs quieted (no black band, 13px labels, a selected tab shows glyph, underline and tint); one shared 16px left edge; spacing and a four-step type scale; the question on its own line; the strip tag wraps cleanly at phone width. In the pages: "Drop this spike" moved to a ruled secondary line as a small underlined link (with Back); a dense grid so the short pieces stack beside the tall Frame piece (no hole); the refusal label is now "⏸ Why not yet" with an amber left rule, on both pages. The critic's prompt is saved as `references/critic-prompt.md`, and the skill's Round step now runs it for layout rounds.
- Round 2 (2026-09-25, user: "maybe import some icon libraries… not sure that's a good idea"): decided **product icons, not a library**. A spike should look like the product and port straight into the real view, and a library adds a second CDN. Built `fsmstudio.SpikeIcon` in the shell. It draws the tool's own set in `currentColor`, or any product image file through `src`. Tabs carry icon labels with plain `mementoLabel`s. An icon always sits beside its word or has a screen-reader label. The check icon means done only, so "Settled" got a flag after it had shown a check before it was reached. The packer now copies the `/images/…svg` files a page names. Verified in Chrome in dark mode, with no errors on either page.
- Round 3 (2026-09-25, user: "I don't quite understand the word frame and chart"): on the page, Frame became **Brief** and the statechart table became the **Moves table** (situation × action). The diagram now reads "Writing the brief" and "Mapping the moves". Skill rule: readers see plain words, and the technical words stay in code and in the spec. This round was syntax-checked only, not walked in Chrome.

