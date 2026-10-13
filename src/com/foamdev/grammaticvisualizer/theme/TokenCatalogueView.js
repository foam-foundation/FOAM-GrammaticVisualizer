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
    in light and in dark, grouped by what it is for, with a search box. A colour
    token shows a swatch per mode; any other token shows its value. Clicking a
    row hands (name, light, dark) to onPick, which the overrides form uses to
    prefill itself. Resolution goes through foam.CSS.returnTokenValue with the
    theme (and its activeVariants) in a sub-context, so the running theme's
    CSSTokenOverride rows show through.
  `,

  requires: [
    'foam.u2.CSSToken',
    'foam.u2.CSSTokens',
    'foam.u2.TextField'
  ],

  messages: [
    { name: 'HELP', message: 'Base tokens from foam.u2.CSSTokens, resolved for this theme. Click a row to prefill the override form.' },
    { name: 'HELP_RO', message: 'Base tokens from foam.u2.CSSTokens, resolved for this theme. Press Edit to add overrides.' },
    { name: 'COL_NAME', message: 'Token' },
    { name: 'COL_LIGHT', message: 'Light' },
    { name: 'COL_DARK', message: 'Dark' },
    { name: 'NO_MATCH', message: 'No token matches.' },
    { name: 'COLLAPSED_HINT', message: 'click to show' },
    { name: 'TOKENS_WORD', message: 'tokens' }
  ],

  constants: [
    {
      name: 'GROUP_RULES',
      documentation: 'First matching prefix wins; order is display order.',
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
    /* The search row stays put while the 260 rows scroll under it; the chips jump to a group. */
    <<search { position: sticky; top: 0; z-index: 1; display: flex; flex-wrap: wrap; align-items: center; gap: $space-2; padding: $space-1 0; background: $backgroundDefault; border-bottom: 1px solid $borderLight; }
    <<search input { width: 16rem; }
    <<chip { cursor: pointer; padding: 0 $space-2; border: 1px solid $borderLight; border-radius: $radius-full; color: $textSecondary; }
    <<chip:hover { background: $backgroundHover; }
    <<group { color: $textSecondary; margin-top: $space-2; cursor: pointer; }
    <<group:hover { color: $textDefault; }
    <<caret { display: inline-block; width: 1.2rem; }
    <<count { color: $textTertiary; }
    <<table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    <<table th:first-child { width: 40%; }
    <<table th { text-align: left; padding: $space-1 $space-2; border-bottom: 1px solid $borderDefault; }
    <<table td { padding: $space-1 $space-2; border-bottom: 1px solid $borderLight; }
    <<pickable { cursor: pointer; }
    <<pickable:hover { background: $backgroundHover; }
    <<token { font-family: monospace; }
    <<value { font-family: monospace; color: $textSecondary; }
    <<swatch { display: inline-block; width: 1rem; height: 1rem; border-radius: $radius; border: 1px solid $borderLight; vertical-align: middle; margin-right: $space-1; }
    <<empty { color: $textTertiary; }
  `,

  properties: [
    {
      name: 'theme',
      documentation: 'The foam.core.theme.Theme the values are resolved for.'
    },
    {
      class: 'String',
      name: 'filter',
      view: { class: 'foam.u2.TextField', placeholder: 'Search tokens', onKey: true }
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
      class: 'Map',
      name: 'collapsed',
      documentation: 'Groups folded to a heading. The palette ramps start folded: reference, not choices. A search unfolds everything it matches.',
      factory: function() { return { 'Palette ramps': true }; }
    },
    {
      name: 'tokens',
      documentation: 'Every base token with its light and dark value for the theme.',
      expression: function(theme) {
        var self   = this;
        var light  = this.contextFor('light');
        var dark   = this.contextFor('dark');
        var axioms = this.CSSTokens.getAxiomsByClass(this.CSSToken);
        return axioms.map(function(a) {
          var isColor = a.cls_.id === 'foam.u2.ColorToken';
          return {
            name:    a.name,
            group:   self.groupOf(a.name),
            isColor: isColor,
            light:   self.resolve(a.name, light),
            dark:    self.resolve(a.name, dark)
          };
        });
      }
    },
    {
      name: 'groups',
      documentation: 'Display groups, each with its tokens, after the filter.',
      expression: function(tokens, filter) {
        var f = filter.trim().toLowerCase();
        var byGroup = {};
        tokens.forEach(function(t) {
          if ( f && t.name.toLowerCase().indexOf(f) < 0 ) return;
          ( byGroup[t.group] || ( byGroup[t.group] = [] ) ).push(t);
        });
        return this.GROUP_RULES.map(function(g) { return g[0]; }).concat([ 'Other' ])
          .filter(function(name) { return byGroup[name]; })
          .map(function(name) { return { name: name, tokens: byGroup[name] }; });
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
        .start().addClass('p', this.myClass('help')).add(this.editable$.map(function(e) { return e ? self.HELP : self.HELP_RO; })).end()
        .startContext({ data: this })
          .start().addClass(this.myClass('search'))
            .add(this.FILTER)
            .start(this.EXPAND_ALL, { buttonStyle: 'LINK', size: 'SMALL' }).end()
            .start(this.COLLAPSE_ALL, { buttonStyle: 'LINK', size: 'SMALL' }).end()
            .start('span').addClass('p-sm', this.myClass('count'))
              .add(this.slot(function(groups) {
                return groups.reduce(function(n, g) { return n + g.tokens.length; }, 0) + ' ' + self.TOKENS_WORD;
              }))
            .end()
            .add(this.slot(function(groups) {
              return this.E().forEach(groups, function(g) {
                this.start('span').addClass('p-sm', self.myClass('chip')).add(g.name)
                  .on('click', function() { self.jumpTo(g.name); })
                .end();
              });
            }))
          .end()
        .endContext()
        .add(this.slot(function(groups, filter, collapsed) {
          if ( ! groups.length ) return this.E().addClass('p', self.myClass('empty')).add(self.NO_MATCH);
          return this.E().forEach(groups, function(g) {
            var folded = ! filter.trim() && !! collapsed[g.name];
            this.start().addClass('p-label', self.myClass('group')).attrs({ 'data-group': g.name })
                .on('click', function() { self.toggle(g.name); })
                .start('span').addClass(self.myClass('caret')).add(folded ? '▸' : '▾').end()
                .add(g.name, ' ')
                .start('span').addClass(self.myClass('count')).add(g.tokens.length + ( folded ? ' · ' + self.COLLAPSED_HINT : '' )).end()
              .end()
              .callIf(folded, function() { return; })
              .callIf(! folded, function() { self.renderTable(this, g); });
          });
        }));
    },

    function setAll(folded) {
      var c = {};
      this.GROUP_RULES.forEach(function(g) { c[g[0]] = folded; });
      c['Other'] = folded;
      this.collapsed = c;
    },

    function toggle(name) {
      var c = Object.assign({}, this.collapsed);
      c[name] = ! c[name];
      this.collapsed = c;
    },

    function jumpTo(name) {
      var c = Object.assign({}, this.collapsed);
      if ( c[name] ) { c[name] = false; this.collapsed = c; }
      var el = this.element_ && this.element_.querySelector('[data-group="' + name + '"]');
      if ( el ) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    },

    function renderTable(e, g) {
      var self = this;
      e.start('table').addClass(self.myClass('table'))
                .start('thead').start('tr')
                  .start('th').add(self.COL_NAME).end()
                  .start('th').add(self.COL_LIGHT).end()
                  .start('th').add(self.COL_DARK).end()
                .end().end()
                .start('tbody').forEach(g.tokens, function(t) {
                  this.start('tr').addClass(self.myClass('row')).enableClass(self.myClass('pickable'), self.editable$)
                    .on('click', function() { if ( self.editable ) self.onPick(t.name, t.light, t.dark); })
                    .start('td').addClass(self.myClass('token')).add('$' + t.name).end()
                    .start('td').call(function() { self.renderValue(this, t, t.light); }).end()
                    .start('td').call(function() { self.renderValue(this, t, t.dark); }).end()
                  .end();
                }).end()
              .end();
    },

    function renderValue(td, t, v) {
      if ( t.isColor && v ) td.start('span').addClass(this.myClass('swatch')).style({ 'background-color': v }).end();
      td.start('span').addClass(this.myClass('value')).add(v).end();
    }
  ],

  actions: [
    { name: 'expandAll',   label: 'expand all',   code: function() { this.setAll(false); } },
    { name: 'collapseAll', label: 'collapse all', code: function() { this.setAll(true); } }
  ]
});
