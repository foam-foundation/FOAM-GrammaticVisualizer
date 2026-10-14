/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.theme',
  name: 'TokenCellView',
  extends: 'foam.u2.View',

  documentation: `
    Read view for an override row's cells: a token name as "$name", or a value
    with a colour swatch. Paired with an edit view through foam.u2.view.ModeAltView,
    so the same property reads as text in VIEW mode and is an input in EDIT mode.
  `,

  messages: [ { name: 'DASH', message: '—' } ],

  css: `
    << { font-family: monospace; display: inline-flex; align-items: center; gap: $space-1; }
    <<swatch { display: inline-block; width: 1rem; height: 1rem; border-radius: $radius; border: 1px solid $borderLight; }
  `,

  properties: [
    { class: 'Boolean', name: 'asName', documentation: 'Show data as a token name ($data) instead of a value.' }
  ],

  methods: [
    function render() {
      var self = this;
      this.addClass(this.myClass()).add(this.slot(function(data) {
        if ( ! data ) return self.DASH;
        if ( self.asName ) return '$' + data;
        return this.E('span')
          .start('span').addClass(self.myClass('swatch')).style({ 'background-color': data }).end()
          .start('span').add(data).end();
      }));
    }
  ]
});
