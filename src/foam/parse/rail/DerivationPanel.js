/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.rail',
  name: 'DerivationPanel',
  extends: 'foam.u2.View',

  documentation: `
    What actually matched, as a tree: rules and terminals only, dead ends
    pruned, open attempts pending in amber. One grid row per node: depth
    guides · glyph · name · span · consumed. Rules read as headings, terminals
    as yellow pills (the canvas vocabulary). Click a row to locate it on the
    canvas; filterParser switches to a flat list of one rule's runs.
  `,

  css: `
    ^ { font-size: $header-xxxs; color: $foam.parse.rail.RailTheme.ink; }
    ^title { font-weight: $font-bold; color: $foam.parse.rail.RailTheme.inkSecondary; padding: 0 $space-2 $space-1; }
    ^sub { color: $foam.parse.rail.RailTheme.inkMuted; font-size: 1.1rem; padding: 0 $space-2 $space-2; }
    ^row { display: grid; grid-template-columns: auto $space-4 minmax(0, 1fr) 6.2rem auto; align-items: baseline;
           gap: 0 $space-1_5; padding: $space-0_5 $space-2 $space-0_5 $space-1_5; cursor: pointer; border-left: 3px solid transparent; }
    ^row:hover { background: $foam.parse.rail.RailTheme.rowHover; }
    ^row:hover ^locate { visibility: visible; }
    ^selected { background: $foam.parse.rail.RailTheme.rowSelected; border-left-color: $foam.parse.rail.RailTheme.matched; }
    ^guides { height: 1.4em; background: repeating-linear-gradient(to right, $foam.parse.rail.RailTheme.guide 0 1px, transparent 1px 1.4rem); }
    ^glyph { text-align: center; }
    ^rule { font-weight: $font-medium; }
    ^rule, ^leaf { justify-self: start; }
    ^leaf { font-family: monospace; color: $foam.parse.rail.RailTheme.ink; background: $foam.parse.rail.RailTheme.leafBg; border: 1px solid $foam.parse.rail.RailTheme.terminalBorder; border-radius: 0.9rem; padding: 0 0.7rem; line-height: 1.4; }
    ^pending ^leaf { border-color: $foam.parse.rail.RailTheme.trying; }
    ^span { font-size: 1.1rem; font-family: monospace; color: $foam.parse.rail.RailTheme.inkMuted; text-align: right; white-space: nowrap; }
    ^text { display: inline-block; vertical-align: bottom; font-size: 1.1rem; font-family: monospace; color: $foam.parse.rail.RailTheme.inkSecondary; background: $foam.parse.rail.RailTheme.textChipBg; border-radius: 0.3rem; padding: 0 $space-1; white-space: nowrap; max-width: 16rem; overflow: hidden; text-overflow: ellipsis; }
    ^count { font-size: 1rem; color: $foam.parse.rail.RailTheme.inkMuted; margin-left: $space-1; }
    ^locate { visibility: hidden; color: $foam.parse.rail.RailTheme.matched; font-size: 1.1rem; margin-left: $space-1_5; }
    ^pending { color: $foam.parse.rail.RailTheme.trying; }
    ^pending ^rule { color: $foam.parse.rail.RailTheme.tryingText; }
    ^matched ^glyph { color: $foam.parse.rail.RailTheme.matched; }
    ^empty { color: $foam.parse.rail.RailTheme.inkMuted; padding: $space-1 $space-2; }
    ^filter { background: $foam.parse.rail.RailTheme.filterBg; border-bottom: 1px solid $foam.parse.rail.RailTheme.filterBorder; padding: $space-1 $space-2; margin-bottom: $space-1; }
    ^clear { color: $foam.parse.rail.RailTheme.matched; cursor: pointer; margin-left: $space-2; text-decoration: underline; }
  `,

  messages: [
    { name: 'TITLE',     message: 'Derivation' },
    { name: 'SUBTITLE',  message: 'what actually matched, dead ends pruned · click a row to locate it on the canvas' },
    { name: 'EMPTY',     message: 'press Parse to record the derivation' },
    { name: 'LOCATE',    message: '⌖ locate' },
    { name: 'BACK',      message: 'back to tree' },
    { name: 'RECURSING', message: '(recursing)' }
  ],

  properties: [
    { name: 'snapshot' },
    { name: 'filterParser', postSet: function() { this.rebuild(); } },
    { class: 'String', name: 'filterName' },
    { class: 'Function', name: 'onSelect', value: function(parser) {} },
    { name: 'selectedParser_' },
    { name: 'body_' }
  ],

  methods: [
    function render() {
      this.addClass(this.myClass())
        .start('div').addClass(this.myClass('title')).add(this.TITLE).end()
        .start('div').addClass(this.myClass('sub')).add(this.SUBTITLE).end()
        .start('div', null, this.body_$).end();
      this.snapshot$.sub(this.rebuild);
      this.rebuild();
    },

    function renderRow(body, r) {
      var self = this, span = r.end === null ? '@' + r.start : r.start + '→' + r.end;
      var row = body.start('div')
        .addClass(this.myClass('row'))
        .addClass(this.myClass(r.pending ? 'pending' : 'matched'))
        .enableClass(this.myClass('selected'), r.parser === this.selectedParser_)
        .on('click', function() { self.selectedParser_ = r.parser; self.onSelect(r.parser); self.rebuild(); });
      row.start('span').addClass(this.myClass('guides')).style({ width: ( r.depth * 1.4 ) + 'rem' }).end();
      row.start('span').addClass(this.myClass('glyph')).add(r.pending ? '▶' : '✓').end();
      row.start('span').addClass(this.myClass(r.kind === 'leaf' ? 'leaf' : 'rule')).add(r.label)
        .callIf(r.count > 1, function() { this.start('span').addClass(self.myClass('count')).add('×' + r.count + ( r.recursing ? ' ' + self.RECURSING : '' )).end(); })
      .end();
      row.start('span').addClass(this.myClass('span')).add(span).end();
      row.start('span')
        .callIf(!! r.consumed, function() { this.start('span').addClass(self.myClass('text')).add(r.consumed).end(); })
        .start('span').addClass(this.myClass('locate')).add(this.LOCATE).end()
      .end();
      row.end();
    }
  ],

  listeners: [
    function rebuild() {
      var self = this, snap = this.snapshot, body = this.body_;
      if ( ! body ) return;
      body.removeAllChildren();
      if ( ! snap || ! snap.derivation ) { body.start('div').addClass(this.myClass('empty')).add(this.EMPTY).end(); return; }
      var rows = snap.derivationRows(this.filterParser);
      if ( this.filterParser ) {
        body.start('div').addClass(this.myClass('filter'))
          .add(rows.length + ' matched ' + ( rows.length === 1 ? 'run' : 'runs' ) + ' of ' + this.filterName + ' so far (failed attempts are not on the path)')
          .start('span').addClass(this.myClass('clear')).add(this.BACK).on('click', function() { self.filterParser = null; }).end()
        .end();
      }
      rows.forEach(function(r) { self.renderRow(body, r); });
    }
  ]
});
