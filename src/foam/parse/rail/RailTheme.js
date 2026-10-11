/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.rail',
  name: 'RailTheme',
  extends: 'foam.parse.rail.CViewTheme',

  documentation: `
    Colours, fonts and geometry for the railroad viewer. Geometry lives here as
    constants so every element and test reads one table. Values were tuned on
    real grammars: the heaviest stroke a state can reach must still leave a full
    curve radius of clear space beside every box.
  `,

  constants: {
    // Boxes
    PAD:        8,     // inside a box, left/right of the label
    GLYPH_SLOT: 11,    // column reserved on the left of every box for the outcome glyph
    BOX_H:      28,
    // Tracks
    GAP:        26,    // between items on one sequence track
    VGAP:       18,    // between stacked branches
    ARC:        14,    // curve radius
    LOOP_PAD:   32,    // horizontal room reserved for a detour column on each side
    BEND:       1.6,   // detour column sits BEND * ARC in from the element edge
    BYPASS_HEADROOM: 2.4,  // optional bypass runs BYPASS_HEADROOM * ARC above the item
    // Unfolded frame and strip
    FRAME_HEAD: 20,
    FRAME_PAD:  10,
    LABEL_W:    90,    // rule-name column, minimum; the scene widens it to the longest name + LABEL_GAP
    LABEL_GAP:  12,    // clear space between the longest rule name and the entry dot
    STUB:       14,    // entry/exit stub between the label column and the track
    STRIP_GAP:  28,    // vertical gap between strips
    CANVAS_MARGIN: 20, // strips start this far from the scene origin
    TERMINATOR_RADIUS: 4,  // entry dot
    END_STOP_W: 3,         // exit bar
    END_STOP_H: 12,
    // Priority numbers on branches
    PRIORITY_DX: 14,   // left of the branch entry
    PRIORITY_DY: 11,   // above the branch row
    PRIORITY_RADIUS: 7,
    // Stroke weights (px). State is encoded by weight as well as hue.
    STROKE_BASE: 1,
    STROKE_VISITED: 2,
    STROKE_HIGHLIGHT: 3,
    STROKE_PULSE: 3,   // extra width at pulse = 1, decaying to 0
    BRANCH_STROKE: 1.5,
    BRANCH_STROKE_VISITED: 2.5,
    RULE_LABEL_FLASH_ALPHA: 0.35,
    // cssTokens that colors reads for the SVG strips, ribbon canvas and tooltip.
    COLOR_TOKENS: [ 'track', 'text', 'muted', 'terminalBg', 'ruleRefBg', 'frameBg', 'genericBg', 'gateBg',
                    'outcomeNONE', 'outcomeTRYING', 'outcomeMATCHED', 'outcomeFAILED',
                    'consumedBg', 'failBg', 'ribbonBg', 'tooltipBg', 'tooltipText' ]
  },

  cssTokens: [
    // One palette for the HTML panels (css: blocks reference $foam.parse.rail.RailTheme.<name>)
    // and the diagram (colors below reads the same tokens), so a panel row and the box it
    // points at always match. Each token carries a dark variant: when the host app's theme
    // sets activeVariants.color = 'dark' (foam.lang.Window), css: blocks re-expand on their
    // own and refresh() re-reads colors for the SVG and canvas. Surfaces, ink and lines follow
    // the app's semantic tokens in dark so the viewer sits on the app's own dark surface; the
    // tints are the light ones darkened by hand. The standalone demo has no host theme and
    // stays light. The outcome colours are Okabe-Ito (colourblind-safe); MATCHED and FAILED
    // lighten in dark so they keep contrast on #202020.
    { name: 'ink',            value: '#222',    variantKey: 'color', variants: { dark: { value: '$textDefault' } } },     // body text
    { name: 'inkSecondary',   value: '#444',    variantKey: 'color', variants: { dark: { value: '$textSecondary' } } },   // headings, legend text
    { name: 'inkMuted',       value: '#6b6b6b', variantKey: 'color', variants: { dark: { value: '$textTertiary' } } },    // hints, spans, counts
    { name: 'inkUnreached',   value: '#888',    variantKey: 'color', variants: { dark: { value: '#7a7a7a' } } },          // document text the parse never reached
    { name: 'inkOnDark',      value: '#fff' },                                                                            // text on a coloured chip or the tooltip
    { name: 'line',           value: '#ccc',    variantKey: 'color', variants: { dark: { value: '$borderDefault' } } },   // panel borders
    { name: 'lineSoft',       value: '#e4e4e4', variantKey: 'color', variants: { dark: { value: '$borderLight' } } },     // section dividers
    { name: 'matched',        value: '#0072B2', variantKey: 'color', variants: { dark: { value: '#4aa3e0' } } },          // Outcome MATCHED
    { name: 'trying',         value: '#E69F00' },                                                                         // Outcome TRYING
    { name: 'tryingText',     value: '#B87A00', variantKey: 'color', variants: { dark: { value: '#f0b429' } } },          // TRYING as text: readable on the page colour
    { name: 'failed',         value: '#D55E00', variantKey: 'color', variants: { dark: { value: '#f0813a' } } },          // Outcome FAILED
    { name: 'terminalBorder', value: '#d9c98d', variantKey: 'color', variants: { dark: { value: '#8a7a3a' } } },          // edge of a terminal chip (fill is terminalBg)
    { name: 'filterBorder',   value: '#f0d890', variantKey: 'color', variants: { dark: { value: '#8a7a3a' } } },          // edge of the derivation filter bar
    // Surfaces
    { name: 'page',           value: '#fff',    variantKey: 'color', variants: { dark: { value: '$backgroundDefault' } } },   // viewer background
    { name: 'pageVeil',       value: 'rgba(255,255,255,0.96)', variantKey: 'color', variants: { dark: { value: 'rgba(32,32,32,0.94)' } } },  // legend panel over the canvas
    { name: 'statusBg',       value: '#fafafa', variantKey: 'color', variants: { dark: { value: '$backgroundSecondary' } } }, // status line
    { name: 'splitter',       value: '#eee',    variantKey: 'color', variants: { dark: { value: '$backgroundTertiary' } } },  // column splitter
    { name: 'sceneBg',        value: '#fafafa', variantKey: 'color', variants: { dark: { value: '#262626' } } },          // canvas behind the strips; also the priority-number halo
    { name: 'ribbonBg',       value: '#fff',    variantKey: 'color', variants: { dark: { value: '$backgroundDefault' } } },   // input ribbon canvas
    { name: 'highlightSoft',  value: '#d6e8f5', variantKey: 'color', variants: { dark: { value: '#1e3a52' } } },          // splitter hover; consumed input
    { name: 'highlightHot',   value: '#cfe0f5', variantKey: 'color', variants: { dark: { value: '#27496a' } } },          // the document span the current step is on
    { name: 'rowHover',       value: '#f1f5fb', variantKey: 'color', variants: { dark: { value: '#2a2f38' } } },          // derivation row under the pointer
    { name: 'rowSelected',    value: '#e6eefc', variantKey: 'color', variants: { dark: { value: '#243447' } } },          // derivation row that was clicked
    { name: 'guide',          value: '#d8d8d8', variantKey: 'color', variants: { dark: { value: '#444' } } },             // depth guide lines in the derivation
    { name: 'leafBg',         value: '#fff7d6', variantKey: 'color', variants: { dark: { value: '#4a4020' } } },          // terminal chip in the derivation (matches terminalBg)
    { name: 'textChipBg',     value: '#f1f1f1', variantKey: 'color', variants: { dark: { value: '#373737' } } },          // matched-text chip in the derivation
    { name: 'filterBg',       value: '#fff7e0', variantKey: 'color', variants: { dark: { value: '#3d3520' } } },          // derivation filter bar
    { name: 'openBg',         value: '#fff1cc', variantKey: 'color', variants: { dark: { value: '#4a3f14' } } },          // document span of a rule still being tried
    { name: 'diedBg',         value: '#f8d9c4', variantKey: 'color', variants: { dark: { value: '#5a2e1a' } } },          // document span where the parse failed
    { name: 'tooltipBg',      value: 'rgba(34, 34, 34, 0.92)', variantKey: 'color', variants: { dark: { value: 'rgba(60, 60, 60, 0.96)' } } },
    { name: 'tooltipText',    value: '#fff' },
    // Diagram (SVG strips, read through colors below)
    { name: 'track',          value: '#555',    variantKey: 'color', variants: { dark: { value: '#b0b0b0' } } },          // rails between boxes
    { name: 'text',           value: '#222',    variantKey: 'color', variants: { dark: { value: '$textDefault' } } },     // box labels, rule names, values
    { name: 'muted',          value: '#777',    variantKey: 'color', variants: { dark: { value: '#9a9a9a' } } },          // badges, counters, frames, priority discs
    { name: 'terminalBg',     value: '#fff7d6', variantKey: 'color', variants: { dark: { value: '#4a4020' } } },          // terminal box fill
    { name: 'ruleRefBg',      value: '#e8f0ff', variantKey: 'color', variants: { dark: { value: '#243447' } } },          // rule reference box fill
    { name: 'frameBg',        value: 'rgba(232,240,255,0.35)', variantKey: 'color', variants: { dark: { value: 'rgba(36,52,71,0.45)' } } },  // unfolded rule frame
    { name: 'genericBg',      value: '#e5e5e5', variantKey: 'color', variants: { dark: { value: '#3a3a3a' } } },          // parser with no drawing yet
    { name: 'gateBg',         value: '#f3f3f3', variantKey: 'color', variants: { dark: { value: '#2e2e2e' } } },          // not/peek gate
    { name: 'outcomeNONE',    value: '#555',    variantKey: 'color', variants: { dark: { value: '#b0b0b0' } } },
    { name: 'outcomeTRYING',  value: '#E69F00' },
    { name: 'outcomeMATCHED', value: '#0072B2', variantKey: 'color', variants: { dark: { value: '#4aa3e0' } } },
    { name: 'outcomeFAILED',  value: '#D55E00', variantKey: 'color', variants: { dark: { value: '#f0813a' } } },
    { name: 'consumedBg',     value: '#d6e8f5', variantKey: 'color', variants: { dark: { value: '#1e3a52' } } },          // ribbon: consumed prefix
    { name: 'failBg',         value: '#f8d9c4', variantKey: 'color', variants: { dark: { value: '#5a2e1a' } } }           // ribbon: the character the parse died on
  ],

  properties: [
    {
      name: 'colors',
      documentation: 'Token name -> CSS colour, read from cssTokens for the active colour variant; refresh() re-reads after a switch.',
      factory: function() {
        var self = this, c = {};
        this.COLOR_TOKENS.forEach(function(name) { c[name] = self.token(name); });
        c.tooltipBorder = c.tooltipBg;
        return c;
      }
    },
    {
      name: 'fonts',
      factory: function() {
        return {
          label:    '13px sans-serif',        // box labels
          badge:    'bold 9px sans-serif',    // ×1+, aA, run counters
          glyph:    'bold 11px sans-serif',   // ✓ ▶ ✗
          ruleName: 'bold 13px monospace',    // strip label column
          priority: 'bold 10px sans-serif',   // branch numbers
          tooltip:  '12px monospace',
          ribbon:   '15px monospace',
          value:    '9px monospace'          // value tags under boxes, value lanes under strips
        };
      }
    },
    { class: 'String', name: 'background', factory: function() { return this.token('sceneBg'); } }
  ],

  methods: [
    function token(name) {
      /** A cssToken of this class resolved for the current colour variant (the host theme in the context, if any). */
      return foam.CSS.returnTokenValue('$' + this.cls_.id + '.' + name, this.cls_, this.__subContext__);
    },

    function refresh() {
      /** Drop the resolved colours so the next read follows the colour variant now active. */
      this.clearProperty('colors');
      this.clearProperty('background');
    },

    function outcomeColor(outcome) {
      /** Colour token for an Outcome enum value: "outcome" + its name. */
      return this.resolve('outcome' + outcome.name);
    }
  ]
});
