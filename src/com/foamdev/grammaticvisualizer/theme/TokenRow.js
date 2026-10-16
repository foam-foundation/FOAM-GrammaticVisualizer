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

  tableColumns: [ 'name', 'light', 'dark', 'group', 'override' ],
  searchColumns: [ 'name' ],

  properties: [
    {
      class: 'String',
      name: 'name',
      label: 'Token',
      tableWidth: 260,
      // Natural order, so primary50 comes before primary100. The MDAO's id index sorts with this.
      comparePropertyValues: function(a, b) { return a.localeCompare(b, 'en', { numeric: true }); },
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
      tableCellFormatter: { class: 'com.foamdev.grammaticvisualizer.theme.TokenEditFormatter' }
    },
    {
      class: 'String',
      name: 'dark',
      documentation: 'Value in the dark colour mode.',
      tableCellFormatter: { class: 'com.foamdev.grammaticvisualizer.theme.TokenEditFormatter' }
    },
    {
      class: 'String',
      name: 'override',
      documentation: 'Not data: the column for the row\'s Add / Save override action (EDIT) or an "Overridden" note (VIEW).',
      transient: true,
      tableWidth: 200,
      tableCellFormatter: { class: 'com.foamdev.grammaticvisualizer.theme.TokenEditFormatter' }
    }
  ]
});


foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.theme',
  name: 'TokenEditFormatter',
  extends: 'foam.u2.view.FnFormatter',

  documentation: `
    A catalogue cell drawn from the row's editor (TokenCatalogueView.Edit), so
    a cell has one view in VIEW mode and another in EDIT mode (ModeAltView).
    foam's table renders every cell in a forced controllerMode VIEW sub-context
    and has no per-column edit view (gap 26), so the formatter looks up the
    catalogue in the context and opens its own context with the editor as data
    and the catalogue's mode.
  `,

  properties: [
    {
      name: 'f',
      value: function(value, obj, axiom) {
        var cat  = this.__subContext__.tokenCatalogue;
        var edit = cat && obj && obj.name && cat.editFor(obj.name);
        if ( ! edit ) { this.add(value); return; }
        this.startContext({ data: edit, controllerMode: cat.cellMode() });
        if ( axiom.name !== 'override' ) {
          this.add(edit[axiom.name === 'light' ? 'LIGHT' : 'DARK']);
        } else if ( cat.editable ) {
          this.add(edit.ADD_OVERRIDE, edit.SAVE_OVERRIDE);
        } else if ( edit.overridden ) {
          this.start('span').addClass('p-sm').add(cat.OVERRIDDEN).end();
        }
        this.endContext();
      }
    }
  ]
});
