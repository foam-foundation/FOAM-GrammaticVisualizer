/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.rail',
  name: 'GrammarTag',
  extends: 'foam.u2.View',

  requires: [
    'foam.parse.Grammar',
    'foam.parse.StringPStream',
    'foam.parse.rail.DocumentView',
    'foam.parse.rail.ParseTrace',
    'foam.parse.rail.RailDiagramView',
    'foam.parse.rail.Session',
    'foam.u2.memento.Memento',
    'foam.u2.view.ChoiceView',
    'foam.u2.view.TabChoiceView'
  ],

  imports: [ 'scope? as flowScope' ],

  documentation: `
    The <grammar> markdown tag: a foam.parse grammar written where it is
    explained, shown as source or as its railroad diagram.

      <grammar input="[1, 2]">
      { START: seq(sym('list'), eof()), ... }
      </grammar>

    The body is the text of a symbols() function, the same text the viewer's
    presets and editor use. Input comes from the input attribute, or from
    input-from="name" naming a block of the surrounding flow whose value is a
    string (or has a string value), so a long input lives in its own block.
    With neither, the viewer's own input box is used.

    Two tabs. Grammar: the source, editable, and with inputs="a|b|c" (single-
    quote the attribute when an input holds a double quote) a table with one
    row per input: what the grammar parsed and the value it produced. Diagram:
    the railroad, with an Example picker that loads one of the inputs and
    parses it to the end; clicking a table row does the same. Under the
    viewer, one card per input is a Session of its own: a document preview
    at that session's step and a small transport to move it, independent of
    the others. Clicking a card makes it the viewer's session; the viewer and
    the active card then step together.

    Works wherever foam.u2.view.MarkdownView renders: flows, knowledge base
    documents, by-example docs. The markdown is the persistence.
  `,

  css: `
    << { display: block; margin: $space-2 0; border: 1px solid $borderLight; border-radius: $inputBorderRadius; overflow: hidden; }
    <<header { display: flex; align-items: center; gap: $space-2; padding: 0 $space-2; background: $backgroundSecondary; border-bottom: 1px solid $borderLight; }
    <<header .foam-u2-view-TabChoiceView { margin: 0; }
    <<hint { color: $textTertiary; margin-left: auto; }
    <<code textarea { width: 100%; box-sizing: border-box; border: none; font-family: monospace; padding: $space-2; field-sizing: content; min-height: 6rem; max-height: 40rem; }
    <<diagram .foam-parse-rail-RailDiagramView { height: 48rem; }
    <<error { color: $textDestructive; padding: $space-1 $space-2; }
    <<examples table { width: 100%; border-collapse: collapse; font-family: monospace; }
    <<examples th { text-align: left; font-weight: $font-medium; color: $textSecondary; padding: $space-1 $space-2; border-bottom: 1px solid $borderLight; }
    <<examples td { padding: $space-1 $space-2; border-bottom: 1px solid $borderXLight; white-space: pre; vertical-align: top; }
    <<examples tr.row { cursor: pointer; }
    <<examples tr.row:hover { background: $backgroundHover; }
    <<examples .ok   { color: $success500; }
    <<examples .fail { color: $destructive500; }
    <<examples .rest { color: $textTertiary; }
    <<pick { display: flex; align-items: center; gap: $space-2; padding: $space-1 $space-2; border-bottom: 1px solid $borderLight; }
    <<pick .foam-u2-view-ChoiceView { flex: 0 1 30rem; }
    <<cards { display: flex; flex-wrap: wrap; gap: $space-2; padding: $space-2; border-top: 1px solid $borderLight; }
    <<card { flex: 1 1 24rem; max-width: 40rem; border: 1px solid $borderLight; border-radius: $inputBorderRadius; cursor: pointer; overflow: hidden; }
    <<card:hover { border-color: $borderStrong; }
    <<active { border-color: $primary500; box-shadow: 0 0 0 1px $primary500; }
    <<cardHead { display: flex; gap: $space-2; align-items: baseline; padding: $space-1 $space-2; font-family: monospace; background: $backgroundSecondary; white-space: pre; overflow: hidden; text-overflow: ellipsis; }
    <<cardHead .summary { color: $textTertiary; margin-left: auto; font-size: 1.1rem; white-space: nowrap; }
    <<cardBar { display: flex; align-items: center; gap: $space-1; padding: $space-1 $space-2; border-top: 1px solid $borderXLight; }
    <<cardBar .foam-u2-ActionView { padding-left: $space-1; padding-right: $space-1; }
    <<cardBar .readout { margin-left: auto; font-family: monospace; color: $textTertiary; }
    <<cards .ok   { color: $success500; }
    <<cards .fail { color: $destructive500; }
    <<card .foam-parse-rail-DocumentView { max-height: 12rem; }
    <<cardNote { padding: $space-1 $space-2; color: $textTertiary; }
  `,

  messages: [
    { name: 'TAB_GRAMMAR',  message: 'Grammar' },
    { name: 'TAB_DIAGRAM',  message: 'Diagram' },
    { name: 'PICK_LABEL',   message: 'Example' },
    { name: 'CARDS_TITLE',  message: 'All examples' },
    { name: 'CARD_SKIPPED', message: 'preview skipped: input longer than 2000 chars' },
    { name: 'CARD_HINT',    message: 'click a card to show it in the diagram' },
    { name: 'PICK_PLACEHOLDER', message: 'pick an input…' },
    { name: 'HINT',         message: 'body of a foam.parse symbols() function' },
    { name: 'COL_INPUT',    message: 'Input' },
    { name: 'COL_PARSED',   message: 'Parsed' },
    { name: 'COL_RESULT',   message: 'Result' },
    { name: 'ROW_HINT',     message: 'click a row to see it in the diagram' },
    { name: 'NO_PARSE',     message: 'undefined' }
  ],

  properties: [
    {
      name: 'innerText',
      documentation: 'MarkdownView hands the tag body to this property as source text.',
      setter: function(n) { this.grammarText = n; },
      getter: function() { return this.grammarText; }
    },
    {
      class: 'String',
      name: 'grammarText',
      documentation: 'Body of a symbols() function; edited in the Code tab, compiled for the Diagram tab.',
      adapt: function(_, s) { return foam.String.isInstance(s) ? s.trim() : String(s); },
      view: { class: 'foam.u2.tag.TextArea', onKey: true, rows: 4 }
    },
    {
      class: 'String',
      name: 'input',
      attribute: true,
      documentation: 'Text to parse, from the input attribute.'
    },
    {
      class: 'String',
      name: 'inputFrom',
      domName: 'input-from',
      attribute: true,
      documentation: 'Name of a block in the surrounding flow whose value (or value.value) is the text to parse.'
    },
    {
      class: 'String',
      name: 'inputs',
      attribute: true,
      documentation: "Example inputs separated by '|'; each becomes a row of the Examples tab. Markdown sets attributes after creating the element, so arriving inputs pick the Examples tab themselves.",
      postSet: function() { this.selected = ''; }
    },
    {
      name: 'exampleInputs',
      expression: function(inputs) { return inputs ? inputs.split('|') : []; }
    },
    {
      class: 'String',
      name: 'mode',
      value: 'grammar',
      documentation: "'grammar' or 'diagram'; the tab strip binds to it."
    },
    {
      class: 'String',
      view: { class: 'foam.u2.view.ChoiceView' },
      name: 'selected',
      documentation: 'The example input shown in the diagram; the picker and a table row click set it.',
      postSet: function(_, n) { if ( n ) this.showExample(n); }
    },
    { class: 'String', name: 'error' },
    {
      name: 'sessions',
      documentation: 'One Session per input, recorded when the Diagram tab opens and after a grammar edit. Each steps on its own; the selected one is mirrored in the viewer.',
      factory: function() { return []; }
    },
    { name: 'activeSub_', documentation: 'Subscriptions tying the viewer and the active session together; replaced on every selection.' },
    { class: 'String', name: 'compiledText_', documentation: 'The grammar text the viewer and sessions were built from; a tab switch with the same text keeps the trace.' },
    { name: 'viewer', documentation: 'The RailDiagramView, created the first time the Diagram tab opens and kept.' },
    { name: 'diagramEl', documentation: 'The box the viewer lives in; shown on the Diagram tab.' }
  ],

  methods: [
    function render() {
      this.SUPER();
      var self = this;
      this.addClass()
        .start('div').addClass(this.myClass('header'))
          // Its own memento root: a page of tags must not all bind the URL's query key.
          .startContext({ memento_: this.Memento.create() })
            .start(this.TabChoiceView, { data$: this.mode$, choices: [ [ 'grammar', this.TAB_GRAMMAR ], [ 'diagram', this.TAB_DIAGRAM ] ] }).end()
          .endContext()
          .start('span').addClass(this.myClass('hint')).addClass('p-sm').add(this.HINT).end()
        .end()
        .start('div').addClass(this.myClass('code')).show(this.mode$.map(function(m) { return m === 'grammar'; }))
          .start(this.GRAMMAR_TEXT, { data$: this.grammarText$ }).attrs({ spellcheck: false }).end()
        .end()
        .start('div').addClass(this.myClass('error')).addClass('p-sm').show(this.error$.map(function(e) { return !! e; })).add(this.error$).end()
        .start('div').addClass(this.myClass('examples')).show(this.mode$.map(function(m) { return m === 'grammar'; }))
          .add(this.dynamic(function(exampleInputs, grammarText) { self.renderExamples(this, exampleInputs, grammarText); }))
        .end()
        // The viewer is created on the first Diagram open and then stays mounted: a detached
        // u2 element cannot take children again, and keeping it keeps the trace across tab switches.
        .start('div').addClass(this.myClass('diagram')).show(this.mode$.map(function(m) { return m === 'diagram'; }))
          // Example picker: which of the inputs the diagram parses.
          .start('div').addClass(this.myClass('pick')).addClass('p-sm').show(this.exampleInputs$.map(function(xs) { return xs.length > 0; }))
            .add(this.PICK_LABEL)
            .start(this.SELECTED, { data$: this.selected$, placeholder: this.PICK_PLACEHOLDER, choices$: this.exampleInputs$.map(function(xs) { return xs.map(function(i) { return [ i, i === '' ? '(empty)' : i ]; }); }) }).end()
          .end()
          .start('div', null, this.diagramEl$).end()
          // Every input parsed to the end, one card each; the active one is outlined.
          .start('div').addClass(this.myClass('cards')).show(this.exampleInputs$.map(function(xs) { return xs.length > 0; }))
            .add(this.dynamic(function(sessions) { self.renderCards(this, sessions); }))
          .end()
        .end();
      this.onDetach(this.mode$.sub(this.onMode));
      this.onDetach(this.grammarText$.sub(this.recompile));
      this.onMode();
    },

    function renderExamples(e, inputs, text) {
      /** One row per example input: what the grammar consumed, the value it produced, and a click to see it in the diagram. */
      var self = this, start;
      if ( ! inputs.length ) return;
      try { start = this.compileText(text).getSymbol('START'); }
      catch (x) { e.start('div').addClass(self.myClass('error')).add('grammar error: ' + ( x.message || x )).end(); return; }
      e.start('table')
        .start('tr').start('th').add(this.COL_INPUT).end().start('th').add(this.COL_PARSED).end().start('th').add(this.COL_RESULT).end().end()
        .forEach(inputs, function(input) {
          var ps = null;
          try { ps = start.parse(self.StringPStream.create({ str: input }), self.compileText(text)); } catch (x) { ps = null; }
          var parsed = ps ? input.slice(0, ps.pos) : '';
          this.start('tr').addClass('row').attrs({ title: self.ROW_HINT }).on('click', function() { self.selected = input; self.mode = 'diagram'; if ( ! input ) self.showExample(input); })
            .start('td').add(input === '' ? '(empty)' : input).end()
            .start('td').add(parsed).start('span').addClass('rest').add(ps ? input.slice(ps.pos) : '').end().end()
            .start('td').addClass(ps ? 'ok' : 'fail').add(ps ? self.describe(ps.value) : self.NO_PARSE).end()
          .end();
        })
      .end();
    },

    function renderCards(e, sessions) {
      var self = this;
      sessions.forEach(function(ses) {
        e.start('div').addClass(self.myClass('card')).enableClass(self.myClass('active'), self.selected$.map(function(sel) { return sel === ses.input; }))
          .attrs({ title: self.CARD_HINT })
          .start('div').addClass(self.myClass('cardHead')).addClass('p-sm').on('click', function() { self.selected = ses.input; })
            .start('span').addClass(ses.matched ? 'ok' : 'fail').add(ses.matched ? '✓' : '✗').end()
            .add(ses.input === '' ? '(empty)' : ses.input)
            .start('span').addClass('summary').add(ses.summary$).end()
          .end()
          .callIf(!! ses.trace, function() {
            this.add(self.DocumentView.create({ text: ses.input, snapshot$: ses.snapshot$ }, self))
              // The card's own transport: this session moves without touching the others.
              .start('div').addClass(self.myClass('cardBar')).addClass('p-sm')
                .startContext({ data: ses })
                  .start(ses.RESTART,  { size: 'SMALL' }).end()
                  .start(ses.STEP_BACK, { size: 'SMALL' }).end()
                  .start(ses.STEP_ONE,  { size: 'SMALL' }).end()
                  .start(ses.RUN_TO_END, { size: 'SMALL' }).end()
                .endContext()
                .start('span').addClass('readout').add(ses.step$, ' / ', ses.traceLength$).end()
              .end();
          })
          .callIf(! ses.trace, function() { this.start('div').addClass(self.myClass('cardNote')).addClass('p-sm').add(ses.error || self.CARD_SKIPPED).end(); })
        .end();
      });
    },

    function buildSessions() {
      /** One Session per input, each parsed to the end with the grammar as written now. */
      var self = this, grammar, start = this.viewer && this.viewer.startSymbol || 'START';
      try { grammar = this.compileText(this.grammarText); } catch (x) { this.sessions = []; return; }
      this.sessions = this.exampleInputs.map(function(input) {
        var ses = self.Session.create({ input: input, grammar: grammar, startSymbol: start });
        if ( input.length > 2000 ) { ses.error = self.CARD_SKIPPED; return ses; }
        return ses.record();
      });
      this.activate(this.sessionFor(this.selected));
    },

    function sessionFor(input) {
      return this.sessions.find(function(s) { return s.input === input; }) || null;
    },

    function activate(ses) {
      /** The viewer shows this session; from here on the two step together until another is chosen. */
      var self = this;
      if ( this.activeSub_ ) { this.activeSub_.detach(); this.activeSub_ = null; }
      if ( ! ses || ! this.viewer || ! ses.trace ) return;
      this.viewer.setInput(ses.input);
      this.viewer.trace = ses.trace;
      this.viewer.show(ses.step);
      var feedback = false;
      var subs = foam.lang.FObject.create();
      subs.onDetach(this.viewer.step$.sub(function() { if ( feedback ) return; feedback = true; ses.step = self.viewer.step; feedback = false; }));
      subs.onDetach(ses.step$.sub(function() { if ( feedback ) return; feedback = true; self.viewer.show(ses.step); feedback = false; }));
      this.activeSub_ = subs;
      this.onDetach(subs);
    },

    function describe(v) {
      /** A parse value as the tutorial's tables show it: strings quoted, arrays and objects as JSON. */
      try { return v === undefined ? 'undefined' : JSON.stringify(v); } catch (x) { return String(v); }
    },

    function compileText(text) {
      /** The symbols() body compiled to a Grammar; the viewer's vocabulary (seq, alt, sym, ...) is injected by name. */
      var fn = new Function('return function(' + this.RailDiagramView.PARSER_NAMES.join(', ') + ') { return (' + text + '); };')();
      return this.Grammar.create({ symbols: fn });
    },

    function showExample(input) {
      /** One of the inputs in the diagram (a table row, the picker or a card chose it): its session, at its step. */
      this.input = input;
      this.mode = 'diagram';
      if ( ! this.viewer ) return;
      var ses = this.sessionFor(input);
      if ( ses ) this.activate(ses);
      else { this.compile(); this.viewer.runToEnd(); }
    },

    function add() {
      // MarkdownView passes the tag body through add(); it is the source text, not a child.
      if ( arguments.length == 1 && foam.String.isInstance(arguments[0]) ) {
        this.grammarText = arguments[0];
        return this;
      }
      return this.SUPER.apply(this, arguments);
    },

    function resolveInput() {
      /** input attribute, else the named block's value in the flow scope, else nothing. */
      if ( this.input ) return this.input;
      if ( ! this.inputFrom ) return null;
      var v = this.flowScope && this.flowScope[this.inputFrom];
      if ( foam.String.isInstance(v) ) return v;
      if ( v && foam.String.isInstance(v.value) ) return v.value;
      if ( v && foam.String.isInstance(v.output) ) return v.output;
      this.error = 'input-from: no text in block "' + this.inputFrom + '"';
      return null;
    },

    function compile() {
      /** The Diagram tab shows the grammar as written now; a compile error is shown in place of the diagram's status. */
      if ( ! this.viewer ) return;
      this.error = '';
      this.compiledText_ = this.grammarText;
      var input = this.resolveInput();
      if ( input !== null ) this.viewer.setInput(input);
      try { this.viewer.useGrammar(this.compileText(this.grammarText)); }
      catch (x) { this.error = 'grammar error: ' + ( x.message || x ); this.viewer.useGrammar(null); }
      this.buildSessions();
    }
  ],

  listeners: [
    function onMode() {
      if ( this.mode !== 'diagram' ) return;
      if ( ! this.viewer ) {
        this.viewer = this.RailDiagramView.create({ compact: true }, this);
        this.diagramEl.add(this.viewer);
      }
      // Same text as last time: keep the trace the user was stepping through.
      if ( this.compiledText_ !== this.grammarText ) this.compile();
    },

    {
      name: 'recompile',
      isMerged: true,
      mergeDelay: 300,
      code: function() { if ( this.mode === 'diagram' ) this.compile(); }
    }
  ]
});


foam.SCRIPT({
  package: 'foam.parse.rail',
  name: 'GrammarTagScript',
  requires: [ 'foam.parse.rail.GrammarTag' ],
  flags: [ 'web' ],
  code: function() {
    foam.__context__.registerElement(foam.parse.rail.GrammarTag, 'grammar');
  }
});
