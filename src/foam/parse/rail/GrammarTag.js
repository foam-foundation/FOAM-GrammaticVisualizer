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
    'foam.parse.rail.RailDiagramView',
    'foam.u2.memento.Memento',
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
  `,

  messages: [
    { name: 'TAB_CODE',    message: 'Code' },
    { name: 'TAB_DIAGRAM', message: 'Diagram' },
    { name: 'HINT',        message: 'body of a foam.parse symbols() function' }
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
      name: 'mode',
      value: 'code',
      documentation: "'code' or 'diagram'; the tab strip binds to it."
    },
    { class: 'String', name: 'error' },
    { name: 'viewer', documentation: 'The RailDiagramView, created the first time the Diagram tab opens.' }
  ],

  methods: [
    function render() {
      this.SUPER();
      var self = this;
      this.addClass()
        .start('div').addClass(this.myClass('header'))
          // Its own memento root: a page of tags must not all bind the URL's query key.
          .startContext({ memento_: this.Memento.create() })
            .start(this.TabChoiceView, { data$: this.mode$, choices: [ [ 'code', this.TAB_CODE ], [ 'diagram', this.TAB_DIAGRAM ] ] }).end()
          .endContext()
          .start('span').addClass(this.myClass('hint')).addClass('p-sm').add(this.HINT).end()
        .end()
        .start('div').addClass(this.myClass('code')).show(this.mode$.map(function(m) { return m !== 'diagram'; }))
          .start(this.GRAMMAR_TEXT, { data$: this.grammarText$ }).attrs({ spellcheck: false }).end()
        .end()
        .start('div').addClass(this.myClass('error')).addClass('p-sm').show(this.error$.map(function(e) { return !! e; })).add(this.error$).end()
        .start('div').addClass(this.myClass('diagram')).show(this.mode$.map(function(m) { return m === 'diagram'; }))
          .add(this.dynamic(function(mode) {
            if ( mode !== 'diagram' ) return;
            if ( ! self.viewer ) self.viewer = self.RailDiagramView.create(null, self);
            this.add(self.viewer);
            self.compile();
          }))
        .end();
      this.onDetach(this.grammarText$.sub(this.recompile));
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
      var input = this.resolveInput();
      if ( input !== null ) this.viewer.setInput(input);
      try { this.viewer.useGrammar(this.viewer.compileGrammar(this.grammarText)); }
      catch (x) { this.error = 'grammar error: ' + ( x.message || x ); this.viewer.useGrammar(null); }
    }
  ],

  listeners: [
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
