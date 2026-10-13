/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.theme',
  name: 'TokenRow',

  documentation: `
    One base CSS token resolved for a theme, as a row for the token catalogue:
    the catalogue is an in-memory DAO of these so foam's own table, search and
    canned queries do the listing. Not persisted.
  `,

  ids: [ 'name' ],

  tableColumns: [ 'name', 'light', 'dark', 'group' ],
  searchColumns: [ 'name' ],

  properties: [
    {
      class: 'String',
      name: 'name',
      label: 'Token',
      tableWidth: 260,
      tableCellFormatter: function(value) { this.start('span').addClass('p-sm').style({ 'font-family': 'monospace' }).add('$' + value).end(); }
    },
    {
      class: 'String',
      name: 'group',
      documentation: 'Display group: Brand, Surfaces, Text, Borders, Status, Hints, Typography, Sizing and shape, Palette ramps, Other.',
      tableWidth: 140
    },
    {
      class: 'String',
      name: 'light',
      documentation: 'Value in the light colour mode.',
      tableCellFormatter: { class: 'com.foamdev.grammaticvisualizer.theme.TokenValueFormatter' }
    },
    {
      class: 'String',
      name: 'dark',
      documentation: 'Value in the dark colour mode.',
      tableCellFormatter: { class: 'com.foamdev.grammaticvisualizer.theme.TokenValueFormatter' }
    }
  ]
});


foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.theme',
  name: 'TokenValueFormatter',
  extends: 'foam.u2.view.FnFormatter',

  documentation: `
    A table cell for a token value: a swatch when the value reads as a colour
    (hex, rgb(), hsl(), currentColor), then the value in monospace. Decided from
    the value, not a row flag: the table hands formatters a projection of the
    visible columns, so a hidden flag would not be there. The CSS lives on
    TokenCatalogueView (a formatter is not an Element, its css: is not installed).
  `,

  properties: [
    {
      name: 'f',
      value: function(value) {
        var base = 'com-foamdev-grammaticvisualizer-theme-TokenCatalogueView-';
        if ( value && /^(#|rgb|hsl|currentColor$)/i.test(value) ) this.start('span').addClass(base + 'swatch').style({ 'background-color': value }).end();
        this.start('span').addClass('p-sm', base + 'value').add(value).end();
      }
    }
  ]
});
