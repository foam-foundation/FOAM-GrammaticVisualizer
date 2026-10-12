/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.rail',
  name: 'RailDiagramView',
  extends: 'foam.u2.View',

  requires: [
    'foam.parse.Grammar',
    'foam.parse.GrammarAxiom',
    'foam.parse.rail.DerivationPanel',
    'foam.parse.rail.DocumentView',
    'foam.parse.rail.Outcome',
    'foam.parse.rail.ParseTrace',
    'foam.parse.rail.RailBuilder',
    'foam.parse.rail.RailInputRibbon',
    'foam.parse.rail.RailScene',
    'foam.parse.rail.RailStrip',
    'foam.parse.rail.RailSymRef',
    'foam.parse.rail.Tier'
  ],

  imports: [ 'theme? as hostTheme' ],

  documentation: `
    The page: a scene host sized by a ResizeObserver, a toolbar, a legend, and
    the trace column (input, transport, ribbon or document view, status,
    derivation). Composition and wiring only. The chrome is declared: every
    control is a property with a view and every button an action, rendered in
    a context whose data is this view, so setting a property does what the
    control does. The scene owns the elements and the pointer (drag pans,
    wheel zooms, hover tooltips, clicks come back through onHit), the builder
    owns the mapping, ParseTrace owns the parse; show(n) hands one snapshot to
    scene, ribbon, document view, panel and status line.
  `,

  constants: {
    PANEL_WIDTH: 440,      // right column default width (px)
    PANEL_MIN: 240,        // splitter floor for either column (px)
    DOC_SHARE: 0.5,        // opening the document view widens the right column to this share of the window
    PLAY_INTERVAL_MS: 140, // auto-step pace
    // The foam.parse.Parsers vocabulary injected into typed grammar text, by parameter name.
    PARSER_NAMES: [ 'seq', 'seq0', 'seq1', 'alt', 'repeat', 'repeat0', 'plus', 'optional', 'sym', 'literal', 'literalIC',
                    'range', 'chars', 'notChars', 'anyChar', 'eof', 'not', 'peek', 'until', 'until0', 'join', 'substring', 'str' ],
    DEFAULT_PRESETS: {
      'comma list (toy)': { input: '[1, [ab, 22], x]', grammar: "{\n  START:   alt(seq(sym('list'), eof()), seq(sym('keyword'), eof())),\n  list:    seq(literal('['), optional(sym('ws')), repeat(sym('item'), seq(optional(sym('ws')), literal(','), optional(sym('ws')))), optional(sym('ws')), literal(']')),\n  item:    alt(sym('number'), sym('word'), sym('list')),\n  number:  plus(range('0', '9')),\n  word:    plus(range('a', 'z')),\n  ws:      plus(literal(' ')),\n  keyword: alt(literal('do'), literal('double'))\n}" },
      'key=value pairs': { input: 'name=alex;city="new york";tz=est', grammar: "{\n  START: seq(sym('pair'), repeat(seq(literal(';'), sym('pair'))), eof()),\n  pair:  seq(sym('key'), literal('='), sym('value')),\n  key:   plus(range('a', 'z')),\n  value: alt(sym('quoted'), sym('bare')),\n  quoted: seq(literal('\"'), repeat(notChars('\"')), literal('\"')),\n  bare:  plus(notChars(';'))\n}" },
      'ordered-choice trap': { input: 'integer', grammar: "{\n  START: seq(sym('word'), eof()),\n  word:  alt(literal('in'), literal('int'), literal('integer'))\n}" },
      'gates and badges': { input: '/* hi */"x"', grammar: "{\n  START:   seq(sym('comment'), sym('quoted'), eof()),\n  comment: seq(literal('/*'), until(literal('*/'))),\n  quoted:  seq(literal('\"'), repeat(not(literal('\"'), anyChar())), literal('\"')),\n  upper:   str(plus(range('a', 'z')))\n}" },
      'BAD: loop over empty match': { input: 'b', grammar: "{\n  START: seq(sym('as'), eof()),\n  as:    repeat(optional(literal('a')))\n}" },
      'BAD: left recursion': { input: '1,2', grammar: "{\n  START: seq(sym('list'), eof()),\n  list:  alt(seq(sym('list'), literal(','), sym('item')), sym('item')),\n  item:  range('0', '9')\n}" }
    }
  },

  messages: [
    { name: 'HINT',              message: 'drag = pan · wheel = zoom · hover = tooltip' },
    { name: 'TITLE',             message: 'foam.parse.rail' },
    { name: 'LEGEND_TOGGLE',     message: 'Legend' },
    { name: 'DOC_TOGGLE',        message: 'Document view' },
    { name: 'TIP_SPLIT',         message: 'drag to resize the panel' },
    { name: 'LEGEND_NOTATION',   message: 'Notation:' },
    { name: 'LEGEND_TERMINAL',   message: 'rounded yellow box = terminal (text to match)' },
    { name: 'LEGEND_RULE_REF',   message: 'blue box = rule reference' },
    { name: 'LEGEND_END_STOP',   message: '⊣ = end of input' },
    { name: 'LEGEND_PRIORITY',   message: '①②③ = branch priority, first match wins' },
    { name: 'LEGEND_LOOP',       message: '↺ = loop, greedy (never gives back)' },
    { name: 'LEGEND_MIN',        message: '×1+ = minimum repeats · ∅ = may match nothing' },
    { name: 'LEGEND_BYPASS',     message: 'track over a box = optional' },
    { name: 'LEGEND_GENERIC',    message: 'grey box = parser class with no drawing yet' },
    { name: 'LEGEND_UNFOLD',     message: '▾ = unfolded rule (click a blue box to unfold, its header to fold, shift-click to jump to the definition)' },
    { name: 'LEGEND_UNREACH',    message: 'muted name + (unreachable) = rule the start symbol never reaches' },
    { name: 'LEGEND_GATE',       message: '⊘ dashed frame = must NOT match next (nothing consumed) · ⟶? = must match next' },
    { name: 'LEGEND_BADGES',     message: '∅ no value · «» substring · ⊕ joined string · ⚙ action · 💬 suggestion/message · 🐞 debug' },
    { name: 'LEGEND_TRACE',      message: 'Trace:' },
    { name: 'LEGEND_MATCHED',    message: '✓ matched' },
    { name: 'LEGEND_TRYING',     message: '▶ trying' },
    { name: 'LEGEND_FAILED',     message: '✗ failed' },
    { name: 'LEGEND_HISTORY',    message: '✓ ran earlier, rule idle now' },
    { name: 'LEGEND_NEVER',      message: 'not reached' },
    { name: 'VALUES_TOGGLE',     message: 'values on boxes' },
    { name: 'LANES_TOGGLE',      message: 'show rule values' },
    { name: 'LEGEND_VALUES',     message: 'text under a box = what it matched so far, in order (…+n = more, hover lists them) · row under a rule = every value that rule matched' },
    { name: 'LEGEND_COUNTER',    message: '"tried ×n · ✓m" under a rule = attempts and matches so far · click the rule name to list the matches' },
    { name: 'LEGEND_SELECTED',   message: 'heavy outline = selected from the derivation panel' },
    { name: 'LEGEND_RIBBON',     message: 'Ribbon:' },
    { name: 'LEGEND_CONSUMED',   message: 'consumed so far' },
    { name: 'LEGEND_OPEN',       message: 'attempt in progress' },
    { name: 'LEGEND_DIED',       message: 'char it died on' },
    { name: 'LEGEND_CURRENT',    message: 'current char' },
    { name: 'LEGEND_UNDER_TEST', message: 'char under test' },
    { name: 'LEGEND_CARET',      message: '▏ caret = stream position · small numbers = char index' },
    { name: 'LEGEND_DERIV',      message: 'Derivation:' },
    { name: 'LEGEND_DERIV_MATCHED', message: '✓ matched, pruned of dead ends' },
    { name: 'LEGEND_DERIV_OPEN', message: '▶ still open at this step' },
    { name: 'ALL_RULES',         message: 'all rules' },
    { name: 'UNREACHABLE_WORD',  message: 'unreachable' },
    { name: 'NO_GRAMMAR',        message: 'no grammar loaded' },
    { name: 'NO_SYMBOLS',        message: 'no symbols' },
    { name: 'PAUSE',             message: '❚❚ pause' },
    { name: 'SLIDER_HINT',       message: 'scrub through the recorded parse' },
    { name: 'NOT_PARSED',        message: 'input changed — press Parse' },
    { name: 'PRESS_PARSE',       message: 'press Parse' },
    { name: 'LOAD_FIRST',        message: 'load a grammar first' },
    { name: 'NO_GRAMMAR_HINT',   message: 'Pick a preset, or a grammar registered in this page, then press Parse.' },
    { name: 'MORE',              message: 'More ▾' },
    { name: 'LESS',              message: 'Less ▴' },
    { name: 'OTHER_SOURCES',     message: 'other sources' },
    { name: 'PRESET_PLACEHOLDER',     message: 'preset…' },
    { name: 'REGISTERED_PLACEHOLDER', message: 'registered in this page…' },
    { name: 'CLASS_ID_PLACEHOLDER',   message: 'class id, Enter' },
    { name: 'TYPED_TITLE',            message: 'body of a foam.parse symbols() function (dev only)' },
    { name: 'FIND_PLACEHOLDER',       message: 'find rule…' }
  ],

  css: `
    ^ { display: flex; flex-direction: column; height: 100vh; box-sizing: border-box; overflow: hidden; background: $foam.parse.rail.RailTheme.page; color: $foam.parse.rail.RailTheme.ink; }
    ^bar { display: flex; flex-wrap: wrap; gap: $space-1_5 $space-2_5; align-items: center; padding: $space-1_5 $space-2; border-bottom: 1px solid $foam.parse.rail.RailTheme.line; flex: none; }
    ^title { margin-right: $space-1_5; }
    ^check { display: inline-flex; align-items: center; gap: $space-1; }
    ^bar .foam-u2-TextField { flex: 0 1 18rem; width: auto; }
    ^bar2 { flex-basis: 100%; display: flex; flex-wrap: wrap; gap: $space-1_5 $space-2_5; align-items: center; }
    ^presetPick { flex: 1 1 18rem; }
    ^emptyHint { padding: $space-2; }
    ^parse { width: 100%; margin-top: $space-1_5; }
    @keyframes foam-parse-rail-RailDiagramView-attention { from { box-shadow: 0 0 0 0.6rem $primary300; } to { box-shadow: 0 0 0 0 transparent; } }
    ^attention { animation: foam-parse-rail-RailDiagramView-attention 900ms ease-out 2; }
    ^readout { flex: none; font-family: monospace; color: $foam.parse.rail.RailTheme.inkMuted; white-space: nowrap; }
    ^sliderRow > .foam-u2-RangeView { flex: 1; }
    ^main { flex: 1; min-height: 0; display: flex; }
    ^left { flex: 1; min-width: 0; position: relative; }
    ^host { position: absolute; inset: 0; overflow: hidden; touch-action: none; }
    ^ribbon canvas { display: block; }
    ^legendPanel { position: absolute; left: $space-2; bottom: $space-2; max-width: 62%; max-height: 70%; overflow: auto; background: $foam.parse.rail.RailTheme.pageVeil;
                   border: 1px solid $foam.parse.rail.RailTheme.line; border-radius: $inputBorderRadius; padding: $space-2 $space-2_5; color: $foam.parse.rail.RailTheme.inkSecondary; box-shadow: $shadow-md; }
    ^legendGroup { display: flex; flex-wrap: wrap; gap: $space-0_5 $space-3; align-items: baseline; margin: $space-0_5 0 $space-1_5; }
    ^swatch { font-weight: $font-bold; }
    ^swatch-matched { color: $foam.parse.rail.RailTheme.matched; }
    ^swatch-trying  { color: $foam.parse.rail.RailTheme.trying; }
    ^swatch-failed  { color: $foam.parse.rail.RailTheme.failed; }
    ^swatch-text    { color: $foam.parse.rail.RailTheme.text; }
    ^legend-consumed   { background: $foam.parse.rail.RailTheme.consumedBg; }
    ^legend-open       { border-bottom: 3px solid $foam.parse.rail.RailTheme.trying; }
    ^legend-died       { background: $foam.parse.rail.RailTheme.failBg; }
    ^legend-current    { border: 1px dashed $foam.parse.rail.RailTheme.muted; padding: 0 $space-0_5; }
    ^legend-under-test { border: 2px solid $foam.parse.rail.RailTheme.trying; padding: 0 $space-0_5; }
    ^legend-matched    { color: $foam.parse.rail.RailTheme.matched; }
    ^legend-trying     { color: $foam.parse.rail.RailTheme.trying; }
    ^right { flex: none; display: flex; flex-direction: column; min-height: 0; }
    ^split { flex: none; width: 0.7rem; cursor: col-resize; background: $foam.parse.rail.RailTheme.splitter; border-left: 1px solid $foam.parse.rail.RailTheme.line; border-right: 1px solid $foam.parse.rail.RailTheme.line; }
    ^split:hover { background: $foam.parse.rail.RailTheme.highlightSoft; }
    /* u2 turns title= into a tooltip mounted on body, outside ^, whose colours come from theme tokens the demo does not have. */
    .foam-u2-TooltipView { background: $foam.parse.rail.RailTheme.tooltipBg; color: $foam.parse.rail.RailTheme.inkOnDark; }
    ^section { padding: $space-1_5 $space-2; border-bottom: 1px solid $foam.parse.rail.RailTheme.lineSoft; flex: none; }
    ^row { display: flex; gap: $space-1_5; align-items: center; flex-wrap: wrap; }
    ^row > * { min-width: 0; flex: 1; }
    ^row > .foam-u2-ActionView { flex: none; }
    ^gram textarea { width: 100%; box-sizing: border-box; font-family: monospace; margin: $space-1_5 0 $space-1; }
    ^input textarea { width: 100%; box-sizing: border-box; font-family: monospace; resize: vertical; }
    ^transport { display: flex; gap: $space-1; margin: $space-1_5 0 $space-1; }
    ^transport > * { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    /* The app's text-input CSS sizes every <input>; a range needs the native control back. */
    ^slider input[type=range] { width: 100%; height: auto; margin: 0; padding: 0; border: none; background: none; appearance: auto; }
    ^ribbon { flex: none; overflow: hidden; border-bottom: 1px solid $foam.parse.rail.RailTheme.lineSoft; }
    ^doc { flex: 1 1 45%; min-height: 0; display: flex; flex-direction: column; border-bottom: 1px solid $foam.parse.rail.RailTheme.line; }
    ^docToggle { margin-left: auto; white-space: nowrap; }
    ^status { font-family: monospace; white-space: pre-wrap; overflow-wrap: anywhere; min-height: 2.6em; padding: $space-1 $space-2; border-bottom: 1px solid $foam.parse.rail.RailTheme.line; background: $foam.parse.rail.RailTheme.statusBg; flex: none; }
    ^panel { flex: 1; min-height: 0; overflow: auto; padding: $space-1_5 0; }
    ^hint { color: $foam.parse.rail.RailTheme.inkMuted; }
  `,

  properties: [
    { name: 'grammar', documentation: 'A foam.parse.Grammar; set it (or call useGrammar) to draw.' },
    { name: 'scene',   factory: function() { return this.RailScene.create(); } },
    { name: 'builder' },
    { class: 'String', name: 'startSymbol' },
    { class: 'String', name: 'status' },
    {
      class: 'Boolean',
      name: 'showAll',
      documentation: 'Include rules unreachable from the start symbol.',
      view: { class: 'foam.u2.CheckBox' },
      postSet: function() { this.rebuildStrips(); }
    },
    { class: 'Int', name: 'unreachableCount' },
    {
      class: 'String',
      name: 'findText',
      documentation: 'Substring filter on rule names; empty = every rule. Enter in the field goes to the first match.',
      view: { class: 'foam.u2.TextField', onKey: true },
      postSet: function() { this.rebuildStrips(); }
    },
    {
      class: 'Boolean',
      name: 'showValues',
      documentation: "The scene's showValues as a property of the view, so the toolbar binds to it.",
      factory: function() { return this.scene.showValues; },
      view: { class: 'foam.u2.CheckBox' },
      postSet: function(_, v) { this.scene.showValues = v; }
    },
    {
      class: 'Boolean',
      name: 'showLanes',
      documentation: "The scene's showLanes as a property of the view, so the toolbar binds to it.",
      factory: function() { return this.scene.showLanes; },
      view: { class: 'foam.u2.CheckBox' },
      postSet: function(_, v) { this.scene.showLanes = v; }
    },
    {
      class: 'String',
      name: 'input',
      documentation: 'The text to parse. Editing it drops the trace: plain text until Parse.',
      view: { class: 'foam.u2.tag.TextArea', onKey: true, rows: 1 },
      postSet: function() { this.inputChanged(); }
    },
    { name: 'trace', documentation: 'The recorded ParseTrace, or null before Parse.' },
    {
      class: 'Int',
      name: 'step',
      documentation: 'Position in the trace. The slider binds to it; show() keeps it in step with the snapshot shown.',
      view: { class: 'foam.u2.RangeView', minValue: 0, step: 1 },
      postSet: function(_, n) { if ( this.feedback_ ) return; this.stopPlay(); this.show(n); }
    },
    { class: 'Int', name: 'traceLength', documentation: 'Length of the trace, 0 without one; the slider maximum.' },
    { class: 'Boolean', name: 'playing', documentation: 'Auto-stepping; togglePlay flips it.' },
    { class: 'Boolean', name: 'needsParse', documentation: 'The grammar or input changed since the last parse; the Parse button draws attention to itself.' },
    { class: 'Boolean', name: 'moreShown',    documentation: 'Second toolbar row (rule filters, value lanes, legend, fold/unfold) unfolded.' },
    { class: 'Boolean', name: 'sourcesShown', documentation: 'Grammar sources beyond the presets (page grammars, class id, typed grammar) unfolded.' },
    { name: 'ribbon', factory: function() { return this.RailInputRibbon.create({ theme: this.scene.theme, measure: this.scene.measure }); } },
    { name: 'panel',  factory: function() { var self = this; return this.DerivationPanel.create({ onSelect: function(p) { self.highlight(p); } }); } },
    { name: 'doc',    factory: function() { var self = this; return this.DocumentView.create({ onSelect: function(p) { self.highlight(p); } }); } },
    { name: 'hostEl' },
    { name: 'ribbonEl' },
    { name: 'playTimer_' },
    { name: 'feedback_', documentation: 'True while show() writes step, so the step postSet does not call show() again.' },
    { name: 'presets', factory: function() { return this.DEFAULT_PRESETS; }, documentation: 'name -> { input, grammar: symbols() body as text }.' },
    {
      class: 'String',
      name: 'preset',
      documentation: 'Name of the preset in use; setting it loads that preset (grammar and input together).',
      view: { class: 'foam.u2.view.ChoiceView' },
      postSet: function(_, n) { if ( n ) this.loadPreset(n); }
    },
    {
      class: 'String',
      name: 'registered',
      documentation: 'Index into registered_ of the grammar picked from the page; setting it loads that grammar.',
      view: { class: 'foam.u2.view.ChoiceView' },
      postSet: function(_, n) { if ( n ) this.loadRegistered(n); }
    },
    {
      class: 'String',
      name: 'classId',
      documentation: 'A class id typed by hand; Enter in the field loads it.',
      view: { class: 'foam.u2.TextField', onKey: true }
    },
    { class: 'Boolean', name: 'allowTypedGrammar', documentation: 'Dev only: show the editor that compiles typed grammar text. Off by default; the demo page turns it on.' },
    {
      class: 'String',
      name: 'grammarText',
      documentation: 'Body of a foam.parse symbols() function; loadTyped compiles it. Presets and page grammars write it for reference.',
      view: { class: 'foam.u2.tag.TextArea', onKey: true, rows: 8 }
    },
    { name: 'registered_', factory: function() { return []; }, documentation: '[{ label, load }] grammars found in the page by scanRegistered().' },
    {
      name: 'registeredChoices',
      documentation: 'registered_ as [index, label] choices for the picker.',
      expression: function(registered_) { return registered_.map(function(f, i) { return [ String(i), f.label ]; }); }
    },
    { class: 'Boolean', name: 'legendShown',  documentation: 'Legend panel over the canvas corner; off by default.', view: { class: 'foam.u2.CheckBox' } },
    { class: 'Boolean', name: 'grammarShown', documentation: 'Typed-grammar editor unfolded (dev only).' },
    { class: 'Boolean', name: 'documentShown', documentation: 'Whole input as decorated text in place of the one-line ribbon.',
      view: { class: 'foam.u2.CheckBox' },
      postSet: function(_, on) { if ( on && this.rightWidth === this.PANEL_WIDTH ) this.rightWidth = Math.max(this.PANEL_WIDTH, Math.round(window.innerWidth * this.DOC_SHARE)); } },
    { class: 'Int', name: 'rightWidth', factory: function() { return this.PANEL_WIDTH; }, documentation: 'Right column width in px; the splitter drags it, opening the document view widens it once.' },
    { class: 'Boolean', name: 'debugHook', documentation: 'Expose window.__rail so scripted checks can drive the page deterministically.' }
  ],

  methods: [
    function render() {
      var self = this;
      this.addClass(this.myClass())
        // The chrome binds to this view: a property view reads data.<prop>, an action runs on data.
        .startContext({ data: this })
          .start('div').addClass(this.myClass('bar')).call(function() { self.renderBar(this); }).end()
          .start('div').addClass(this.myClass('main'))
            .start('div').addClass(this.myClass('left')).call(function() { self.renderCanvas(this); }).end()
            .start('div').addClass(this.myClass('split')).attrs({ title: this.TIP_SPLIT }).on('pointerdown', function(e) { self.startSplit(e); }).end()
            .start('div').addClass(this.myClass('right')).style({ width: this.rightWidth$.map(function(w) { return w + 'px'; }) })
              .call(function() { self.renderPanels(this); })
            .end()
          .end()
        .endContext();

      // The scene's viewport follows the host element's size; the ribbon follows its column.
      this.hostEl.el().then(function(el) {
        var size = function() { self.scene.viewWidth = el.clientWidth; self.scene.viewHeight = el.clientHeight; };
        new ResizeObserver(size).observe(el);
        size();
        if ( self.grammar ) self.useGrammar(self.grammar);
      });
      this.ribbonEl.el().then(function(el) {
        var size = function() { self.ribbon.width = el.clientWidth; };
        new ResizeObserver(size).observe(el);
        size();
      });
      this.ribbon.text = this.input;
      this.doc.text = this.input;

      // The scene owns the pointer; clicks that did not drag come back here.
      this.scene.onHit = function(el, e) { self.onHit(el, e); };

      // A host app flips theme.activeVariants.color on a light/dark switch. The css: blocks
      // re-expand on their own (foam.u2.CSS.reloadStyles); the scene's generated stylesheet
      // and the ribbon canvas are repainted here. The standalone demo has no host theme.
      if ( this.hostTheme ) this.onDetach(this.hostTheme.activeVariants$.sub(function() { self.scene.refreshTheme(); self.ribbon.invalidate(); }));

      this.scanRegistered();

      if ( this.debugHook && typeof window !== 'undefined' ) {
        window.__rail = {
          view:  this,
          hit:   function(vx, vy) {
            var r = self.scene.viewport_.element_.getBoundingClientRect();
            var h = self.scene.elementAt({ target: document.elementFromPoint(r.left + vx, r.top + vy) });
            return h ? { cls: h.cls_.name, tip: h.tipText ? h.tipText() : '', path: h.pathKey } : null;
          },
          show:  function(n) { self.show(n); return self.status; },
          step:  function() { return self.step; },
          total: function() { return self.trace ? self.trace.length() : 0; },
          strips: function() { return self.scene.strips.map(function(s) { return s.name; }); }
        };
      }
    },

    function check(e, prop, label, opt_class) {
      /** A checkbox bound to a Boolean property of this view. The CheckBox puts its label beside itself in the parent, so each gets a span of its own. */
      return e.start('span').addClass(this.myClass('check')).addClass(opt_class || '')
        .start(prop, { label$: foam.lang.Slot.isInstance(label) ? label : foam.lang.ConstantSlot.create({ value: label }) }).end()
      .end();
    },

    function renderBar(e) {
      /** Top toolbar: camera, rule filter, find/unfold, value and legend toggles. */
      var self = this;
      // First row: what everyone needs. The rest unfolds behind More (progressive disclosure).
      e.start('span').addClass(this.myClass('title')).addClass('p-bold').add(this.TITLE).end()
        .start(this.FIT_WIDTH, { size: 'SMALL' }).end()
        .start(this.FIT_ALL, { size: 'SMALL' }).end()
        .start(this.ZOOM_IN, { size: 'SMALL' }).end()
        .start(this.ZOOM_OUT, { size: 'SMALL' }).end()
        .start(this.FIND_TEXT, { placeholder: this.FIND_PLACEHOLDER })
          .on('keydown', function(ev) { if ( ev.key === 'Enter' ) self.goToFirstMatch(); })
        .end()
        .call(function() { self.check(this, self.SHOW_VALUES, self.VALUES_TOGGLE); })
        .start(this.TOGGLE_MORE, { size: 'SMALL', label$: this.moreShown$.map(function(o) { return o ? self.LESS : self.MORE; }) }).end()
        .start('span').addClass(this.myClass('hint')).addClass('p-sm').add(this.HINT).end()
        .start('div').addClass(this.myClass('bar2')).show(this.moreShown$)
          .call(function() { self.check(this, self.SHOW_ALL, self.unreachableCount$.map(function(n) { return self.ALL_RULES + ' (' + n + ' ' + self.UNREACHABLE_WORD + ')'; })); })
          .call(function() { self.check(this, self.SHOW_LANES, self.LANES_TOGGLE); })
          .call(function() { self.check(this, self.LEGEND_SHOWN, self.LEGEND_TOGGLE); })
          .start(this.UNFOLD_PATH, { size: 'SMALL' }).end()
          .start(this.FOLD_ALL, { size: 'SMALL' }).end()
        .end();
    },

    function renderCanvas(e) {
      /** Left column: the scene host and the legend over its corner. */
      var self = this;
      var legendGroup = function(e, title) { return e.start('div').addClass(self.myClass('legendGroup')).start('b').add(title).end(); };
      // Swatch carries the colour or the fade; the words stay full contrast, so a dim
      // state is never explained by dim text. Tier alphas are data from the enum, not a style choice.
      var swatch = function(e, cls, label, opt_tier) {
        return e.start('span')
          .start('span').addClass(self.myClass('swatch')).addClass(self.myClass(cls)).callIf(opt_tier, function() { this.style({ opacity: opt_tier.alpha }); }).add('▬').end()
          .add(' ' + label)
        .end();
      };
      e.start('div', null, this.hostEl$).addClass(this.myClass('host')).add(this.scene).end()
        .start('div').addClass(this.myClass('legendPanel')).addClass('p-sm').show(this.legendShown$)
          .call(function() {
            legendGroup(this, self.LEGEND_NOTATION)
              .start('span').add(self.LEGEND_TERMINAL).end()
              .start('span').add(self.LEGEND_RULE_REF).end()
              .start('span').add(self.LEGEND_END_STOP).end()
              .start('span').add(self.LEGEND_PRIORITY).end()
              .start('span').add(self.LEGEND_LOOP).end()
              .start('span').add(self.LEGEND_MIN).end()
              .start('span').add(self.LEGEND_BYPASS).end()
              .start('span').add(self.LEGEND_GENERIC).end()
              .start('span').add(self.LEGEND_UNFOLD).end()
              .start('span').add(self.LEGEND_UNREACH).end()
              .start('span').add(self.LEGEND_GATE).end()
              .start('span').add(self.LEGEND_BADGES).end()
            .end();
            legendGroup(this, self.LEGEND_TRACE)
              .call(function() { swatch(this, 'swatch-matched', self.LEGEND_MATCHED); })
              .call(function() { swatch(this, 'swatch-trying',  self.LEGEND_TRYING); })
              .call(function() { swatch(this, 'swatch-failed',  self.LEGEND_FAILED); })
              .call(function() { swatch(this, 'swatch-matched', self.LEGEND_HISTORY, self.Tier.HISTORY); })
              .call(function() { swatch(this, 'swatch-text',    self.LEGEND_NEVER,   self.Tier.NEVER); })
              .start('span').add(self.LEGEND_VALUES).end()
              .start('span').add(self.LEGEND_COUNTER).end()
              .start('span').add(self.LEGEND_SELECTED).end()
            .end();
            legendGroup(this, self.LEGEND_RIBBON)
              .start('span').addClass(self.myClass('legend-consumed')).add(self.LEGEND_CONSUMED).end()
              .start('span').addClass(self.myClass('legend-open')).add(self.LEGEND_OPEN).end()
              .start('span').addClass(self.myClass('legend-died')).add(self.LEGEND_DIED).end()
              .start('span').addClass(self.myClass('legend-current')).add(self.LEGEND_CURRENT).end()
              .start('span').addClass(self.myClass('legend-under-test')).add(self.LEGEND_UNDER_TEST).end()
              .start('span').add(self.LEGEND_CARET).end()
            .end();
            legendGroup(this, self.LEGEND_DERIV)
              .start('span').addClass(self.myClass('legend-matched')).add(self.LEGEND_DERIV_MATCHED).end()
              .start('span').addClass(self.myClass('legend-trying')).add(self.LEGEND_DERIV_OPEN).end()
            .end();
          })
        .end();
    },

    function renderPanels(e) {
      /** Right column: grammar sources, input + transport, then ribbon or document view, status, derivation. */
      var self = this;
      // Sources: the preset picker is the one control everyone needs; the rest unfolds.
      e.start('div').addClass(this.myClass('section')).addClass(this.myClass('gram'))
          .start('div').addClass(this.myClass('row'))
            .start(this.PRESET, { placeholder: this.PRESET_PLACEHOLDER, choices: Object.keys(this.presets).map(function(k) { return [ k, k ]; }) }).addClass(this.myClass('presetPick')).end()
            .start(this.TOGGLE_SOURCES, { size: 'SMALL', label$: this.sourcesShown$.map(function(o) { return ( o ? '▾ ' : '▸ ' ) + self.OTHER_SOURCES; }) }).end()
          .end()
          .start('div').addClass(this.myClass('row')).show(this.sourcesShown$)
            .start(this.REGISTERED, { placeholder: this.REGISTERED_PLACEHOLDER, choices$: this.registeredChoices$ }).end()
            .start(this.CLASS_ID, { placeholder: this.CLASS_ID_PLACEHOLDER })
              .on('keydown', function(ev) { if ( ev.key === 'Enter' ) self.loadClassId(self.classId); })
            .end()
            .start(this.TOGGLE_GRAMMAR, { size: 'SMALL', label$: this.grammarShown$.map(function(o) { return ( o ? '▾ ' : '▸ ' ) + self.TOGGLE_GRAMMAR.label; }) }).end()
          .end()
          .start('div').show(this.grammarShown$)
            .start('div').addClass(this.myClass('hint')).addClass('p-sm').add(this.TYPED_TITLE).end()
            .start(this.GRAMMAR_TEXT).attrs({ spellcheck: false }).end()
            .start(this.LOAD_TYPED, { size: 'SMALL' }).end()
          .end()
        .end()
        // Empty state: say what to do until a grammar is loaded.
        .start('div').addClass(this.myClass('hint')).addClass(this.myClass('emptyHint')).addClass('p-sm').show(this.grammar$.map(function(g) { return ! g; })).add(this.NO_GRAMMAR_HINT).end()
        .start('div').addClass(this.myClass('section')).addClass(this.myClass('input'))
          .start(this.INPUT).attrs({ spellcheck: false }).end()
          // The one primary action; it pulses when the grammar or input changed since the last parse.
          .start(this.PARSE).addClass(this.myClass('parse')).enableClass(this.myClass('attention'), this.needsParse$).end()
          .start('div').addClass(this.myClass('transport'))
            .start(this.STEP_BACK, { size: 'SMALL' }).end()
            .start(this.STEP_ONE, { size: 'SMALL' }).end()
            .start(this.STEP_OVER, { size: 'SMALL' }).end()
            .start(this.NEXT_RULE, { size: 'SMALL' }).end()
            .start(this.TOGGLE_PLAY, { size: 'SMALL', label$: this.playing$.map(function(p) { return p ? self.PAUSE : self.TOGGLE_PLAY.label; }) }).end()
            .start(this.RUN_TO_END, { size: 'SMALL' }).end()
          .end()
          .start('div').addClass(this.myClass('row')).addClass(this.myClass('sliderRow'))
            .start(this.STEP, { maxValue$: this.traceLength$ }).attrs({ title: this.SLIDER_HINT }).end()
            .start('span').addClass(this.myClass('readout')).addClass('p-sm').add(this.step$, ' / ', this.traceLength$).end()
          .end()
          .call(function() { self.check(this, self.DOCUMENT_SHOWN, self.DOC_TOGGLE, self.myClass('docToggle')); })
        .end()
        .start('div', null, this.ribbonEl$).addClass(this.myClass('ribbon')).hide(this.documentShown$).add(this.ribbon).end()
        .start('div').addClass(this.myClass('doc')).show(this.documentShown$).add(this.doc).end()
        .start('div').addClass(this.myClass('status')).addClass('p-sm').add(this.status$).end()
        .start('div').addClass(this.myClass('panel')).add(this.panel).end();
    },

    // ---- grammar sources -------------------------------------------------

    function compileGrammar(text) {
      /**
       * The text is the body of a foam.parse symbols() function; the Parsers vocabulary
       * is injected by parameter name. Grammar.SYMBOLS.adapt reads those names off
       * fn.toString() with a single-line regex, so the parameter list stays on ONE line.
       * Dev-only: this evaluates typed code on the user's own page.
       */
      var fn = new Function('return function(' + this.PARSER_NAMES.join(', ') + ') { return (' + text + '); };')();
      return this.Grammar.create({ symbols: fn });
    },

    function usePreset(name) {
      /** Public entry: the preset property does the loading. */
      this.preset = name;
    },

    function loadPreset(name) {
      /** A preset swaps grammar and sample input together and loads at once. */
      var p = this.presets[name];
      if ( ! p ) return;
      this.grammarText = p.grammar;
      this.input = p.input;
      try { this.useGrammar(this.compileGrammar(p.grammar)); }
      catch (x) { this.status = 'preset error: ' + ( x.message || x ); }
    },

    function scanRegistered() {
      /**
       * Grammars already in this page: classes that extend foam.parse.Grammar or declare
       * grammars: axioms. Built classes are inspected directly; lazy models are peeked at
       * (extends / grammars keys) before building, because building everything is slow and
       * floods the console with unrelated errors.
       */
      var self = this, found = [];
      var consider = function(id) {
        try {
          var cls = foam.lookup(id, true);
          if ( ! cls || ! cls.getAxiomsByClass ) return;
          if ( self.Grammar.isSubClass(cls) && cls !== self.Grammar ) found.push({ label: id, load: function() { return cls.create(); } });
          cls.getAxiomsByClass(self.GrammarAxiom).forEach(function(ax) {
            found.push({ label: id + '.' + ax.name, load: function() { return cls.create()[ax.name]; } });
          });
        } catch (x) { /* a class that refuses to build is not a grammar we can show */ }
      };
      Object.keys(foam.USED || {}).forEach(consider);
      Object.keys(foam.UNUSED || {}).forEach(function(id) {
        var m = foam.UNUSED[id];
        if ( m && ( m.extends === 'foam.parse.Grammar' || ( m.grammars && m.grammars.length ) ) ) consider(id);
      });
      found.sort(function(a, b) { return a.label < b.label ? -1 : 1; });
      this.registered_ = found;
    },

    function loadRegistered(i) {
      try {
        var f = this.registered_[+i];
        this.grammarText = '// loaded from ' + f.label + ' (read-only; pick a preset to type your own)';
        this.useGrammar(f.load());
      } catch (x) { this.status = 'could not load: ' + ( x.message || x ); }
    },

    function loadClassId(id) {
      /** Third path: a class id typed by hand. Grammar subclass, or Class.axiomName for a grammars: axiom. */
      var parts = id.split('.'), cls = foam.lookup(id, true), ax = null;
      if ( ! cls && parts.length > 1 ) { cls = foam.lookup(parts.slice(0, -1).join('.'), true); ax = parts[parts.length - 1]; }
      if ( ! cls ) { this.status = 'no class ' + id; return; }
      try {
        var obj = cls.create();
        var g = ax ? obj[ax] : obj;
        if ( ! this.Grammar.isInstance(g) ) { this.status = id + ' is not a grammar'; return; }
        this.useGrammar(g);
      } catch (x) { this.status = 'could not load ' + id + ': ' + ( x.message || x ); }
    },

    function useGrammar(grammar) {
      /** Rebuilds the strips for a grammar and frames them; any recorded trace is dropped. The builder decides the start symbol. */
      this.stopPlay();
      this.grammar = grammar;
      if ( ! grammar ) { this.scene.setStrips([]); this.status = this.NO_GRAMMAR; return; }
      this.builder = this.RailBuilder.create({ grammar: grammar, theme: this.scene.theme, measure: this.scene.measure });
      this.startSymbol = this.builder.startSymbol;
      this.unreachableCount = this.builder.unreachableNames().length;
      this.rebuildStrips();
      this.dropTrace();
      this.status = grammar.symbols.length ? grammar.symbols.length + ' rules, start = ' + this.startSymbol + ' · ' + this.PRESS_PARSE : this.NO_SYMBOLS;
      this.needsParse = !! grammar.symbols.length;
      this.scene.fitWidth();
    },

    function rebuildStrips() {
      /** Strips follow the showAll toggle; the camera is kept (a toggle should not jump the view). */
      if ( ! this.builder ) return;
      this.scene.setStrips(this.builder.buildReachableStrips(this.showAll, this.findText.trim()));
      if ( this.trace ) this.show(this.step);
    },

    function goToRule(name) {
      if ( ! this.scene.stripFor(name) ) this.findText = '';     // filtered out: show all again first
      this.scene.flashStrip(name);
    },

    function goToFirstMatch() {
      /** Enter in the find field: flash the first strip the filter left. */
      if ( this.scene.strips.length ) this.goToRule(this.scene.strips[0].name);
    },

    // ---- trace lifecycle -------------------------------------------------

    function setInput(text) {
      /** Public entry: the input property does the work. */
      this.input = text;
    },

    function inputChanged() {
      /** Editing the input invalidates the trace: back to plain text until Parse. */
      this.stopPlay();
      this.dropTrace();
      this.scene.applyTrace(null);
      this.status = this.NOT_PARSED;
      this.needsParse = !! this.grammar;
    },

    function dropTrace() {
      /** No trace: every panel shows the plain input. */
      this.trace = null;
      this.feedback_ = true;
      this.traceLength = 0;
      this.step = 0;
      this.feedback_ = false;
      this.ribbon.text = this.input; this.ribbon.snapshot = null;
      this.doc.text = this.input; this.doc.snapshot = null;
      this.panel.snapshot = null; this.panel.filterParser = null;
    },

    function record(opt_step) {
      if ( ! this.grammar ) { this.status = this.LOAD_FIRST; return; }
      if ( ! this.grammar.symbols.length ) { this.status = this.NO_SYMBOLS; return; }
      try { this.trace = this.ParseTrace.create({ grammar: this.grammar, startSymbol: this.startSymbol, input: this.input }).record(); }
      catch (x) { this.trace = null; this.status = 'could not parse: ' + ( x.message || x ); return; }
      this.needsParse = false;
      this.show(opt_step === undefined ? this.trace.length() : opt_step);   // the camera stays where the user put it; follow-pan takes over while stepping
    },

    function show(n) {
      /** Everything visible follows one snapshot. */
      if ( ! this.trace ) return;
      var snap = this.trace.at(n);
      this.feedback_ = true;
      this.step = snap.step;
      this.traceLength = snap.total;
      this.feedback_ = false;
      this.scene.applyTrace(snap);
      this.ribbon.snapshot = snap;
      this.doc.snapshot = snap;
      this.panel.snapshot = snap;
      this.status = snap.summary();
    },

    function stopPlay() {
      if ( this.playTimer_ ) clearInterval(this.playTimer_);
      this.playTimer_ = null;
      this.playing = false;
    },

    function highlight(parser) { this.scene.highlightParser(parser); },

    function startSplit(e) {
      /** Splitter drag: the right column follows the pointer until release. */
      var self = this, x0 = e.clientX, w0 = this.rightWidth;
      var move = function(ev) { self.rightWidth = Math.max(self.PANEL_MIN, Math.min(window.innerWidth - self.PANEL_MIN, w0 + x0 - ev.clientX)); };
      var up = function() { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
      e.preventDefault();
    },

    // ---- clicks (the scene resolves the element) ----------------------------

    function onHit(el, e) {
      /** Click policy. Rule reference: shift-click jumps to its definition, plain click unfolds/folds. Rule name: list its runs. */
      if ( this.RailSymRef.isInstance(el) ) {
        if ( e.shiftKey ) { this.goToRule(el.name); return; }
        if ( el.canUnfold() || el.unfolded ) { el.toggle(); this.afterToggle(el); }
        return;
      }
      if ( this.RailStrip.isInstance(el) ) {
        // Rule name clicked: list that rule's runs in the panel (click again to go back).
        var same = this.panel.filterParser === el.parser;
        this.panel.filterName   = el.name;
        this.panel.filterParser = same ? null : el.parser;
      }
    },

    function afterToggle(el) {
      /** Freshly built (or removed) content needs the strip redrawn and the current lights. */
      this.scene.hideTooltip();
      var strip = this.scene.stripOf(el);
      if ( strip ) this.scene.rebuildStrip(strip);
      if ( this.trace ) this.show(this.step);
    }
  ],

  actions: [
    {
      name: 'fitWidth',
      label: 'Fit width',
      code: function() { this.scene.fitWidth(); }
    },
    {
      name: 'fitAll',
      label: 'Fit all',
      code: function() { this.scene.fitAll(); }
    },
    {
      name: 'zoomIn',
      label: '+',
      toolTip: 'zoom in',
      code: function() { this.scene.zoomAt(this.scene.viewWidth / 2, this.scene.viewHeight / 2, 1.25); }
    },
    {
      name: 'zoomOut',
      label: '−',
      toolTip: 'zoom out',
      code: function() { this.scene.zoomAt(this.scene.viewWidth / 2, this.scene.viewHeight / 2, 0.8); }
    },
    {
      name: 'toggleMore',
      label: 'More',
      buttonStyle: 'TEXT',
      toolTip: 'rule filters, value lanes, legend, fold and unfold',
      code: function() { this.moreShown = ! this.moreShown; }
    },
    {
      name: 'toggleSources',
      label: 'other sources',
      buttonStyle: 'TEXT',
      toolTip: 'grammars registered in this page, a class id, or typed grammar text',
      code: function() { this.sourcesShown = ! this.sourcesShown; }
    },
    {
      name: 'unfoldPath',
      label: 'unfold matched path',
      toolTip: 'open every rule reference on the derivation path, inside the start strip',
      isEnabled: function(trace) { return !! trace; },
      code: function() {
        /** Open every rule reference on the derivation path, inside the start strip only, top-down; then re-light and re-fit. */
        var self = this, snap = this.trace.at(this.step);
        if ( ! snap.derivation ) return;
        var startStrip = this.scene.stripFor(this.startSymbol);
        var inStart = function(el) { for ( var p = el ; p ; p = p.parent ) if ( p === startStrip ) return true; return false; };
        var todo = [ snap.derivation ], node;
        while ( todo.length ) {                                    // explicit stack: a recursion staircase is deep
          node = todo.pop();
          if ( foam.parse.Symbol.isInstance(node.parser) ) {
            self.scene.elementsFor(node.parser).forEach(function(el) { if ( self.RailSymRef.isInstance(el) && inStart(el) ) el.unfold(); });
          }
          for ( var i = node.kids.length - 1 ; i >= 0 ; i-- ) todo.push(node.kids[i]);
        }
        this.scene.rebuildStrip(startStrip);
        this.show(this.step);
        this.scene.fitWidth();
      }
    },
    {
      name: 'foldAll',
      label: 'Fold all',
      code: function() {
        var self = this, open;
        do {
          open = [];
          this.scene.eachElement(function(el) { if ( self.RailSymRef.isInstance(el) && el.unfolded ) open.push(el); });
          open.forEach(function(el) { el.fold(); });
        } while ( open.length );
        this.scene.strips.forEach(function(s) { self.scene.rebuildStrip(s); });
        if ( this.trace ) this.show(this.step);
      }
    },
    {
      name: 'toggleGrammar',
      label: 'edit grammar',
      buttonStyle: 'LINK',
      isAvailable: function(allowTypedGrammar) { return allowTypedGrammar; },
      code: function() { this.grammarShown = ! this.grammarShown; }
    },
    {
      name: 'loadTyped',
      label: 'Load grammar',
      isAvailable: function(allowTypedGrammar) { return allowTypedGrammar; },
      code: function() {
        try { this.useGrammar(this.compileGrammar(this.grammarText)); }
        catch (x) { this.status = 'grammar error: ' + ( x.message || x ); }
      }
    },
    {
      name: 'parse',
      label: 'Parse',
      buttonStyle: 'PRIMARY',
      toolTip: 'record the parse of the input, then stand at step 0',
      isEnabled: function(grammar) { return !! grammar; },
      code: function() { this.stopPlay(); this.record(0); }
    },
    {
      name: 'stepBack',
      label: '◀',
      toolTip: 'one event back',
      isEnabled: function(trace, step) { return !! trace && step > 0; },
      code: function() { this.stopPlay(); this.show(this.step - 1); }
    },
    {
      name: 'stepOne',
      label: '▶',
      toolTip: 'one event forward',
      isEnabled: function(grammar) { return !! grammar; },
      code: function() { this.stopPlay(); if ( ! this.trace ) this.record(0); else this.show(this.step + 1); }
    },
    {
      name: 'stepOver',
      label: 'step out',
      toolTip: 'skip to the end of the attempt just started',
      isEnabled: function(grammar) { return !! grammar; },
      code: function() { this.stopPlay(); if ( ! this.trace ) this.record(0); else this.show(this.trace.stepOverFrom(this.step)); }
    },
    {
      name: 'nextRule',
      label: 'next rule',
      toolTip: 'skip to the next rule entry',
      isEnabled: function(grammar) { return !! grammar; },
      code: function() { this.stopPlay(); if ( ! this.trace ) this.record(0); else this.show(this.trace.nextRuleFrom(this.step)); }
    },
    {
      name: 'togglePlay',
      label: '▶▶ play',
      toolTip: 'auto-step; any other button pauses',
      isEnabled: function(grammar) { return !! grammar; },
      code: function() {
        /** Auto-step at a human pace; stops at the end or on any other navigation. Background tabs throttle timers. */
        if ( this.playTimer_ ) { this.stopPlay(); return; }
        if ( ! this.trace ) this.record(0);
        if ( ! this.trace ) return;                                  // no grammar
        if ( this.step >= this.trace.length() ) this.show(0);
        var self = this;
        this.playTimer_ = setInterval(function() {
          if ( self.step >= self.trace.length() ) { self.stopPlay(); return; }
          self.show(self.step + 1);
        }, this.PLAY_INTERVAL_MS);
        this.playing = true;
      }
    },
    {
      name: 'runToEnd',
      label: '⏭ end',
      toolTip: 'jump to the last event',
      isEnabled: function(grammar) { return !! grammar; },
      code: function() { this.stopPlay(); if ( ! this.trace ) this.record(); else this.show(this.trace.length()); }
    }
  ]
});
