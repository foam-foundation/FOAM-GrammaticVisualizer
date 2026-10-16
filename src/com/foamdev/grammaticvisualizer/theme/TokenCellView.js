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
    Read view for a token's cells (override rows and the catalogue): a token
    name as "$name", or a value, with a colour swatch when the value reads as
    a colour (hex, rgb(), hsl(), currentColor). Paired with an edit view through foam.u2.view.ModeAltView,
    so the same property reads as text in VIEW mode and is an input in EDIT mode.
  `,

  messages: [ { name: 'DASH', message: '—' } ],

  css: `
    << { font-family: monospace; display: inline-flex; align-items: center; gap: $space-1; }
    <<pair { display: inline-flex; align-items: center; gap: $space-2; }
    <<swatch { display: inline-block; flex: none; width: 1.6rem; height: 1.6rem; border-radius: $radius; border: 1px solid $borderLight; }
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
        return this.E('span').addClass(self.myClass('pair'))
          .callIf(/^(#|rgb|hsl|currentColor$)/i.test(data), function() {
            this.start('span').addClass(self.myClass('swatch')).style({ 'background-color': data }).end();
          })
          // Hex in one case: a colour input reports lower case, CSSTokens are written in upper.
          .start('span').addClass(self.myClass('value')).add(/^#[0-9a-f]+$/i.test(data) ? data.toUpperCase() : data).end();
      }));
    }
  ]
});
