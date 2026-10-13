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
    The CSSTokenOverride rows of one theme, as a table with a swatch per value,
    and a one-line form to add or replace one. A row's target is the value for
    every colour mode; variants.dark wins in dark mode. foam3 keeps these rows
    in cssTokenOverrideDAO and CSSTokenOverrideService reads them live, so a
    put here recolours the running app.
  `,

  implements: [ 'foam.mlang.Expressions' ],

  imports: [ 'cssTokenOverrideDAO?' ],

  requires: [
    'foam.core.theme.customisation.CSSTokenOverride',
    'foam.u2.view.ColorPicker'
  ],

  classes: [
    {
      name: 'Row',
      properties: [ 'override', 'dao' ],
      actions: [
        {
          name: 'remove',
          label: '✕',
          toolTip: 'Remove this override',
          buttonStyle: 'TERTIARY',
          code: function() { this.dao.remove(this.override); }
        }
      ]
    }
  ],

  messages: [
    { name: 'HELP', message: 'Each row replaces one $token for this theme. Light is the value for every mode; Dark, when set, wins in dark mode. 261 base tokens live in foam.u2.CSSTokens (primary500, backgroundDefault, textDefault, ...).' },
    { name: 'NO_DAO', message: 'cssTokenOverrideDAO is not available to this user.' },
    { name: 'EMPTY', message: 'No overrides yet. This theme uses every token\'s default value.' },
    { name: 'COL_SOURCE', message: 'Token' },
    { name: 'COL_LIGHT', message: 'Light' },
    { name: 'COL_DARK', message: 'Dark' },
    { name: 'COL_ENABLED', message: 'Enabled' },
    { name: 'DASH', message: '—' }
  ],

  css: `
    << { display: flex; flex-direction: column; gap: $space-2; }
    <<help { color: $textSecondary; }
    <<table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    <<table th:first-child { width: 40%; }
    <<table th:last-child { width: 4rem; }
    <<table th { text-align: left; padding: $space-1 $space-2; border-bottom: 1px solid $borderDefault; }
    <<table td { padding: $space-1 $space-2; border-bottom: 1px solid $borderLight; vertical-align: middle; }
    <<token { font-family: monospace; }
    <<swatch { display: inline-block; width: 1rem; height: 1rem; border-radius: $radius; border: 1px solid $borderLight; vertical-align: middle; margin-right: $space-1; }
    <<value { font-family: monospace; }
    <<form { display: flex; flex-wrap: wrap; gap: $space-2; align-items: flex-end; }
    <<cell { display: flex; flex-direction: column; gap: $space-1; }
    <<cell input[type=text] { width: 14rem; }
    <<empty { color: $textTertiary; }
  `,

  properties: [
    { class: 'String', name: 'themeId' },
    {
      class: 'Boolean',
      name: 'editable',
      documentation: 'Add form and per-row remove shown only while the theme is being edited.',
      value: true
    },
    {
      class: 'Array',
      name: 'rows',
      documentation: 'CSSTokenOverride rows for themeId, refreshed on every DAO event.'
    },
    {
      class: 'String',
      name: 'source',
      label: 'Token',
      view: { class: 'foam.u2.TextField', placeholder: 'primary500', onKey: true }
    },
    {
      class: 'String',
      name: 'light',
      view: { class: 'foam.u2.view.ColorPicker', onKey: true }
    },
    {
      class: 'String',
      name: 'dark',
      view: { class: 'foam.u2.view.ColorPicker', onKey: true }
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
        .add(this.slot(function(rows) {
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
              var row = self.Row.create({ override: o, dao: self.cssTokenOverrideDAO });
              this.start('tr').addClass(self.myClass('row'))
                .start('td').addClass(self.myClass('token')).add('$' + o.source).end()
                .start('td').call(function() { self.renderValue(this, o.target); }).end()
                .start('td').call(function() { self.renderValue(this, o.variants && o.variants.dark); }).end()
                .start('td').add(o.enabled ? '✓' : self.DASH).end()
                .start('td').show(self.editable$).startContext({ data: row }).add(row.REMOVE).endContext().end()
              .end();
            }).end();
        }))
        .startContext({ data: this })
          .start().addClass(this.myClass('form')).show(this.editable$)
            .call(function() { self.renderCell(this, self.COL_SOURCE, self.SOURCE); })
            .call(function() { self.renderCell(this, self.COL_LIGHT, self.LIGHT); })
            .call(function() { self.renderCell(this, self.COL_DARK, self.DARK); })
            .add(this.ADD_OVERRIDE)
          .end()
        .endContext();
    },

    function renderCell(form, label, prop) {
      // A labelled control; .add(PROP) alone gives the bare input, no PropertyBorder.
      form.start().addClass(this.myClass('cell'))
        .start('span').addClass('p-label').add(label).end()
        .add(prop)
      .end();
    },

    function renderValue(td, v) {
      if ( ! v ) { td.add(this.DASH); return; }
      td.start('span').addClass(this.myClass('swatch')).style({ 'background-color': v }).end()
        .start('span').addClass(this.myClass('value')).add(v).end();
    }
  ],

  actions: [
    {
      name: 'addOverride',
      label: 'Add override',
      buttonStyle: 'PRIMARY',
      isAvailable: function(editable) { return editable; },
      isEnabled: function(source, light, dark) { return !! source.trim() && !! ( light || dark ); },
      code: async function() {
        var o = this.CSSTokenOverride.create({
          theme: this.themeId,
          source: this.source.trim().replace(/^\$/, ''),
          target: this.light,
          variants: this.dark ? { dark: this.dark } : {}
        });
        await this.cssTokenOverrideDAO.put(o);
        this.source = ''; this.light = ''; this.dark = '';
      }
    }
  ],

  listeners: [
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
