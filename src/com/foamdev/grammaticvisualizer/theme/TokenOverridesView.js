/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.theme',
  name: 'TokenOverridesView',
  extends: 'foam.u2.View',

  documentation: `
    The CSSTokenOverride rows of one theme, as a table with a swatch per value.
    New overrides are added from the token catalogue below. In EDIT mode each row's cells
    are inputs (ModeAltView swaps TokenCellView for an editor); a change is staged
    until the row's Save override action or the page's Save (saveAll) stores it. A row's target is the value for
    every colour mode; variants.dark wins in dark mode. foam3 keeps these rows
    in cssTokenOverrideDAO and CSSTokenOverrideService reads them live, so a
    put here recolours the running app.
  `,

  implements: [ 'foam.mlang.Expressions' ],

  imports: [ 'cssTokenOverrideDAO?', 'ctrl?' ],

  requires: [
    'com.foamdev.grammaticvisualizer.theme.TokenCellView',
    'foam.core.theme.customisation.CSSTokenOverride',
    'foam.u2.ControllerMode'
  ],

  classes: [
    {
      name: 'Row',
      documentation: `
        One override as editable properties. Each value property pairs a read view
        (TokenCellView) with an edit view through ModeAltView, so the ControllerMode
        in the row's context decides which one shows. Nothing is written until
        save() runs (the row's action, or the page's Save through saveAll).
      `,
      requires: [ 'foam.core.theme.customisation.CSSTokenOverride' ],
      properties: [
        { name: 'override', hidden: true },
        { name: 'dao', hidden: true },
        { name: 'owner', hidden: true },
        {
          class: 'String',
          name: 'source',
          label: 'Token',
          view: {
            class: 'foam.u2.view.ModeAltView',
            readView: { class: 'com.foamdev.grammaticvisualizer.theme.TokenCellView', asName: true },
            writeView: { class: 'foam.u2.TextField' }
          }
        },
        {
          class: 'String',
          name: 'light',
          view: {
            class: 'foam.u2.view.ModeAltView',
            readView: { class: 'com.foamdev.grammaticvisualizer.theme.TokenCellView' },
            writeView: { class: 'foam.u2.view.ColorEditView' }
          }
        },
        {
          class: 'String',
          name: 'dark',
          view: {
            class: 'foam.u2.view.ModeAltView',
            readView: { class: 'com.foamdev.grammaticvisualizer.theme.TokenCellView' },
            writeView: { class: 'foam.u2.view.ColorEditView' }
          }
        },
        { class: 'Boolean', name: 'enabled' },
        {
          class: 'Boolean',
          name: 'dirty',
          documentation: 'The row differs from the stored override. Case-blind for hex: a colour input reports lower case.',
          expression: function(override, source, light, dark, enabled) {
            var lc = function(v) { return ( v || '' ).toLowerCase(); };
            return source !== override.source || lc(light) !== lc(override.target) ||
              lc(dark) !== lc(override.variants && override.variants.dark) || enabled !== override.enabled;
          }
        }
      ],
      methods: [
        function reset() {
          var o = this.override;
          this.copyFrom({ source: o.source, light: o.target, dark: ( o.variants && o.variants.dark ) || '', enabled: o.enabled });
        },

        async function save() {
          var source = this.source.trim().replace(/^\$/, '');
          if ( ! this.dirty || ! source || ! ( this.light || this.dark ) ) return;   // nothing to store, or incomplete
          var o = this.CSSTokenOverride.create({
            theme: this.override.theme,
            source: source,
            target: this.light,
            variants: this.dark ? { dark: this.dark } : {},
            enabled: this.enabled
          });
          // source is part of the id: a rename is a new row, so drop the old one.
          if ( source !== this.override.source ) await this.dao.remove(this.override);
          this.override = await this.dao.put(o);
          this.owner.recolour();
        }
      ],
      actions: [
        {
          name: 'saveOverride',
          label: '✓ Save override',
          toolTip: 'Store this row\'s changes',
          buttonStyle: 'SECONDARY',
          isEnabled: function(dirty) { return dirty; },
          code: function() { return this.save(); }
        },
        {
          name: 'remove',
          // Icon only, as foam's own row deletes (TitledArrayView, DAOSummaryView): the theme's trash glyph.
          label: '',
          themeIcon: 'trash',
          toolTip: 'Remove this override',
          buttonStyle: 'TERTIARY',
          code: async function() { await this.dao.remove(this.override); this.owner.recolour(); }
        },
        {
          name: 'discard',
          label: '↺ Discard',
          toolTip: 'Put this row back to its stored values',
          buttonStyle: 'TERTIARY',
          isEnabled: function(dirty) { return dirty; },
          code: function() { this.reset(); }
        }
      ]
    }
  ],

  messages: [
    { name: 'HELP', message: 'Dark replaces Light in dark mode. Leave Dark empty to use Light in both.' },
    { name: 'NO_DAO', message: 'cssTokenOverrideDAO is not available to this user.' },
    { name: 'EMPTY', message: 'No overrides yet.' },
    { name: 'COL_SOURCE', message: 'Token' },
    { name: 'COL_LIGHT', message: 'Light' },
    { name: 'COL_DARK', message: 'Dark' },
    { name: 'COL_ENABLED', message: 'Enabled' },
    { name: 'UNSAVED', message: 'Unsaved' }
  ],

  css: `
    << { display: flex; flex-direction: column; gap: $space-2; }
    <<help { color: $textSecondary; }
    <<table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    <<table th:first-child { width: 40%; }
    <<table th:last-child { width: 30rem; }
    <<actions { display: flex; flex-wrap: nowrap; gap: $space-2; align-items: center; white-space: nowrap; }
    <<table th { text-align: left; padding: $space-1 $space-2; border-bottom: 1px solid $borderDefault; }
    <<table td { padding: $space-1 $space-2; border-bottom: 1px solid $borderLight; vertical-align: middle; }
    <<token { font-family: monospace; }
    <<table td input[type=text] { width: 100%; font-family: monospace; }
    <<table .foam-u2-view-ColorEditView input[type=text] { width: 8rem; }
    <<empty { color: $textTertiary; }
    <<unsaved { color: $textSecondary; }
  `,

  properties: [
    { class: 'String', name: 'themeId' },
    {
      class: 'Boolean',
      name: 'editable',
      documentation: 'Rows are inputs and have a remove action only while the theme is being edited.',
      value: true
    },
    {
      class: 'Int',
      name: 'dirtyCount',
      documentation: 'Rows with unsaved changes; ThemeTokensView sums it into its status line.'
    },
    {
      class: 'Array',
      name: 'editors',
      documentation: 'The Row objects on screen, for saveAll.'
    },
    {
      class: 'Array',
      name: 'rows',
      documentation: 'CSSTokenOverride rows for themeId, refreshed on every DAO event.'
    }
  ],

  methods: [
    function render() {
      var self = this;
      this.addClass(this.myClass())
        .start().addClass('p', this.myClass('help')).add(this.HELP).end();
      if ( ! this.cssTokenOverrideDAO ) {
        this.start().addClass('p', this.myClass('empty')).add(this.NO_DAO).end();
        return;
      }
      this.onDetach(this.cssTokenOverrideDAO.on.sub(this.refresh));
      this.refresh();
      this
        .add(this.slot(function(rows, editable) {
          self.editors = [];
          self.onDirty();
          if ( ! rows.length ) return this.E().addClass('p', self.myClass('empty')).add(self.EMPTY);
          return this.E('table').addClass(self.myClass('table'))
            .start('thead').start('tr')
              .start('th').add(self.COL_SOURCE).end()
              .start('th').add(self.COL_LIGHT).end()
              .start('th').add(self.COL_DARK).end()
              .start('th').add(self.COL_ENABLED).end()
              .start('th').end()
            .end().end()
            .start('tbody').forEach(rows, function(o) {
              var row = self.Row.create({
                override: o, dao: self.cssTokenOverrideDAO, owner: self,
                source: o.source, light: o.target, dark: ( o.variants && o.variants.dark ) || '', enabled: o.enabled
              });
              self.editors.push(row);
              this.onDetach(row.dirty$.sub(self.onDirty));
              // The row's ControllerMode picks each cell's read or edit view (ModeAltView).
              this.start('tr').addClass(self.myClass('row'))
                .startContext({ data: row, controllerMode: editable ? self.ControllerMode.EDIT : self.ControllerMode.VIEW })
                  .start('td').addClass(self.myClass('token')).add(row.SOURCE)
                    .start('div').addClass('p-sm', self.myClass('unsaved')).show(row.dirty$).add('● ' + self.UNSAVED).end()
                  .end()
                  .start('td').add(row.LIGHT).end()
                  .start('td').add(row.DARK).end()
                  .start('td').add(row.ENABLED).end()
                  .start('td').show(editable).start().addClass(self.myClass('actions')).add(row.SAVE_OVERRIDE, row.DISCARD, row.REMOVE).end().end()
                .endContext()
              .end();
            }).end();
        }));
    },

    function discardAll() {
      this.editors.forEach(function(r) { r.reset(); });
    },

    function saveAll() {
      /** Store every changed row; the page's Save calls this through ThemeTokensView. */
      return Promise.all(this.editors.map(function(r) { return r.save(); }));
    },

    function recolour() {
      /** CSSTokenOverrideService reloads its cache on a DAO event, but installed CSS is only re-expanded on themeChange. */
      if ( this.ctrl && this.ctrl.pub ) this.ctrl.pub('themeChange');
    }
  ],

  listeners: [
    {
      name: 'onDirty',
      code: function() { this.dirtyCount = this.editors.filter(function(r) { return r.dirty; }).length; }
    },
    {
      name: 'refresh',
      isMerged: true,
      mergeDelay: 50,
      code: async function() {
        var s = await this.cssTokenOverrideDAO.where(this.EQ(this.CSSTokenOverride.THEME, this.themeId)).select();
        this.rows = s.array;
      }
    }
  ]
});
