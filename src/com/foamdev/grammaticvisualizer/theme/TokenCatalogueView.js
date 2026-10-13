/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.theme',
  name: 'TokenCatalogueView',
  extends: 'foam.u2.View',

  documentation: `
    Every base token in foam.u2.CSSTokens, resolved for the theme being viewed
    in light and in dark, as foam's own DAO table: an in-memory DAO of TokenRow
    behind a DAOBrowserView, so search, sorting, column hiding and the group
    tabs (one canned query per group) come from the framework. A row click
    hands (name, light, dark) to onPick while the theme is being edited, which
    the overrides form uses to prefill itself. Resolution goes through
    foam.CSS.returnTokenValue with the theme (and its activeVariants) in a
    sub-context, so the running theme's CSSTokenOverride rows show through.
  `,

  requires: [
    'com.foamdev.grammaticvisualizer.theme.TokenRow',
    'foam.comics.v2.CannedQuery',
    'foam.comics.v2.DAOBrowserView',
    'foam.comics.v2.DAOControllerConfig',
    'foam.dao.EasyDAO',
    'foam.mlang.predicate.False',
    'foam.u2.CSSToken',
    'foam.u2.CSSTokens',
    'foam.u2.memento.Memento'
  ],

  implements: [ 'foam.mlang.Expressions' ],

  messages: [
    { name: 'HELP', message: 'Base tokens from foam.u2.CSSTokens, resolved for this theme. Click a row to prefill the override form.' },
    { name: 'HELP_RO', message: 'Base tokens from foam.u2.CSSTokens, resolved for this theme. Press Edit to add overrides.' },
    { name: 'ALL', message: 'All' }
  ],

  constants: [
    {
      name: 'GROUP_RULES',
      documentation: 'First matching prefix wins; order is the tab order.',
      value: [
        [ 'Brand',        /^(primary|info$)/ ],
        [ 'Surfaces',     /^background/ ],
        [ 'Text',         /^(text|link$|dropdownIcon$)/ ],
        [ 'Borders',      /^border/ ],
        [ 'Status',       /^(status|success|warn|destructive)/ ],
        [ 'Hints',        /^hint/ ],
        [ 'Typography',   /^(font-|header-|body-|font1$)/ ],
        [ 'Sizing and shape', /^(input|radius|shadow|colorScheme$|space-)/ ],
        [ 'Palette ramps', /^(blue|yellow|orange|purple|green|red|grey|warmGrey|black|neutral|white$)/ ]
      ]
    }
  ],

  css: `
    << { display: flex; flex-direction: column; gap: $space-2; }
    <<help { color: $textSecondary; }
    <<pickable .foam-u2-table-TableView-tbody .foam-u2-table-TableView-tr { cursor: pointer; }
    /* Cells drawn by TokenValueFormatter (TokenRow.js). */
    <<swatch { display: inline-block; width: 1rem; height: 1rem; border-radius: $radius; border: 1px solid $borderLight; vertical-align: middle; margin-right: $space-1; }
    <<value { font-family: monospace; color: $textSecondary; }
  `,

  properties: [
    {
      name: 'theme',
      documentation: 'The foam.core.theme.Theme the values are resolved for.'
    },
    {
      class: 'Boolean',
      name: 'editable',
      documentation: 'Rows prefill the override form only while the theme is being edited.',
      value: true
    },
    {
      class: 'Function',
      name: 'onPick',
      value: function(name, light, dark) {}
    },
    {
      name: 'dao',
      documentation: 'In-memory DAO of TokenRow: every base token, resolved once for the theme.',
      factory: function() {
        var self   = this;
        var light  = this.contextFor('light');
        var dark   = this.contextFor('dark');
        var rows   = this.CSSTokens.getAxiomsByClass(this.CSSToken).map(function(a) {
          return {
            name:  a.name,
            group: self.groupOf(a.name),
            light: self.resolve(a.name, light),
            dark:  self.resolve(a.name, dark)
          };
        });
        return this.EasyDAO.create({ of: this.TokenRow, daoType: 'MDAO', testData: rows }, this);
      }
    },
    {
      name: 'config',
      documentation: 'One config per catalogue (a context-shared config is a known foam trap): the group tabs as canned queries, name search, no CRUD chrome.',
      factory: function() {
        var self = this;
        var queries = [ this.CannedQuery.create({ label: this.ALL, predicateFactory: function(e) { return e.TRUE; } }) ]
          .concat(this.GROUP_RULES.map(function(g) {
            return self.CannedQuery.create({ label: g[0], predicateFactory: function(e) { return e.EQ(self.TokenRow.GROUP, g[0]); } });
          }));
        return this.DAOControllerConfig.create({
          dao: this.dao,
          of: this.TokenRow,
          cannedQueries: queries,
          // foam3 falls back to index 1 when nothing is chosen; say 0 (All) explicitly.
          preSelectedCannedQuery: 0,
          searchColumns: [ 'name' ],
          // SIMPLE: a bare word is a keyword search. In FULL (the default) a bare word goes to the
          // query parser and matches nothing; full-text needs a 'TEXT:' or ':' prefix (gap 25).
          searchMode: 'SIMPLE',
          createPredicate: this.False.create(),
          editPredicate:   this.False.create(),
          deletePredicate: this.False.create(),
          exportPredicate: this.False.create(),
          importPredicate: this.False.create(),
          refreshPredicate: this.False.create(),
          disableTableRowActions: true
        }, this);
      }
    }
  ],

  methods: [
    function groupOf(name) {
      for ( var i = 0 ; i < this.GROUP_RULES.length ; i++ ) {
        if ( this.GROUP_RULES[i][1].test(name) ) return this.GROUP_RULES[i][0];
      }
      return 'Other';
    },

    function contextFor(mode) {
      // The resolvers read only ctx.theme.id and ctx.theme.activeVariants, so a stub does.
      // Not theme.clone(): cloning reads every property, which fires the record's factories,
      // and each one re-evaluates section visibility and rebuilds the tabs around this view.
      var t = { id: this.theme ? this.theme.id : '', activeVariants: { color: mode } };
      return this.__subContext__.createSubContext({ theme: t });
    },

    function resolve(name, ctx) {
      var v = foam.CSS.returnTokenValue('$' + name, this.CSSTokens, ctx);
      return foam.String.isInstance(v) && v.indexOf('/*') === 0 ? '' : v;
    },

    function render() {
      var self = this;
      this.addClass(this.myClass())
        .enableClass(this.myClass('pickable'), this.editable$)
        .start().addClass('p', this.myClass('help')).add(this.editable$.map(function(e) { return e ? self.HELP : self.HELP_RO; })).end()
        // Own memento root: the search box and the group tabs are memorable and would otherwise
        // write into the page URL and fight the Theme screen's own tabs (gap 16).
        // click: what a table row does; the Clickable mixin imports it from the context.
        .startContext({
          memento_: this.Memento.create(),
          click: function(row) { if ( self.editable && row ) self.onPick(row.name, row.light, row.dark); }
        })
          .tag(this.DAOBrowserView, { data: this.dao, config: this.config })
        .endContext();
    }
  ]
});
