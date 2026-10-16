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
    tabs (one canned query per group) come from the framework. In EDIT mode a
    row's Light and Dark cells are inputs and its Override cell has an Add /
    Save override action that puts a CSSTokenOverride; each row's state lives
    in an Edit object (see TokenEditFormatter). Resolution goes through
    foam.CSS.returnTokenValue with the theme (and its activeVariants) in a
    sub-context, so the running theme's CSSTokenOverride rows show through.
  `,

  imports: [ 'cssTokenOverrideDAO?', 'ctrl?' ],

  requires: [
    'com.foamdev.grammaticvisualizer.theme.TokenRow',
    'foam.core.theme.customisation.CSSTokenOverride',
    'foam.comics.v2.CannedQuery',
    'foam.comics.v2.DAOBrowserView',
    'foam.comics.v2.DAOControllerConfig',
    'foam.dao.EasyDAO',
    'foam.dao.ProxyDAO',
    'foam.mlang.predicate.False',
    'foam.u2.CSSToken',
    'foam.u2.CSSTokens',
    'foam.u2.ControllerMode',
    'foam.u2.memento.Memento'
  ],

  implements: [ 'foam.mlang.Expressions' ],

  classes: [
    {
      name: 'Edit',
      documentation: `
        One catalogue row's editor. light and dark pair a read view (TokenCellView)
        with an input (a colour picker for #rrggbb values, else a text field)
        through ModeAltView, so the ControllerMode in the cell's context picks
        one. Nothing is stored until the row's action runs.
      `,
      properties: [
        { name: 'catalogue', hidden: true },
        { class: 'String', name: 'name' },
        { class: 'String', name: 'savedLight', documentation: 'Light value as resolved for the theme.' },
        { class: 'String', name: 'savedDark', documentation: 'Dark value as resolved for the theme.' },
        { class: 'Boolean', name: 'overridden', documentation: 'The theme has a CSSTokenOverride row for this token.' },
        {
          class: 'String',
          name: 'light',
          view: function(_, X) { return X.data.valueView(); }
        },
        {
          class: 'String',
          name: 'dark',
          view: function(_, X) { return X.data.valueView(); }
        },
        {
          class: 'Boolean',
          name: 'dirty',
          // Case-blind: a colour input reports hex in lower case.
          expression: function(light, dark, savedLight, savedDark) {
            return light.toLowerCase() !== savedLight.toLowerCase() || dark.toLowerCase() !== savedDark.toLowerCase();
          }
        }
      ],
      methods: [
        function valueView() {
          var colour = /^#[0-9a-f]{6}$/i.test(this.savedLight) && ( ! this.savedDark || /^#[0-9a-f]{6}$/i.test(this.savedDark) );
          return {
            class: 'foam.u2.view.ModeAltView',
            readView: { class: 'com.foamdev.grammaticvisualizer.theme.TokenCellView' },
            writeView: colour ? { class: 'foam.u2.view.ColorPicker' } : { class: 'foam.u2.TextField' }
          };
        },
        function reset() {
          this.light = this.savedLight;
          this.dark  = this.savedDark;
        }
      ],
      actions: [
        {
          name: 'addOverride',
          label: '✓ Add override',
          toolTip: 'Store these values as an override for this theme',
          buttonStyle: 'SECONDARY',
          isAvailable: function(overridden) { return ! overridden; },
          isEnabled: function(dirty) { return dirty; },
          code: function() { return this.catalogue.save(this); }
        },
        {
          name: 'saveOverride',
          label: '✓ Save override',
          toolTip: 'Update this theme\'s override with these values',
          buttonStyle: 'SECONDARY',
          isAvailable: function(overridden) { return overridden; },
          isEnabled: function(dirty) { return dirty; },
          code: function() { return this.catalogue.save(this); }
        }
      ]
    }
  ],

  messages: [
    { name: 'HELP', message: 'Change a value, then press Add override.' },
    { name: 'HELP_RO', message: 'Press Edit to change a value.' },
    { name: 'ALL', message: 'All' },
    { name: 'OVERRIDDEN', message: 'Overridden' },
    { name: 'SEARCH_PLACEHOLDER', message: 'Search tokens' }
  ],

  constants: [
    {
      name: 'GROUP_RULES',
      documentation: 'First matching prefix wins; order is the tab order.',
      value: [
        [ 'Brand',        /^primary/ ],
        [ 'Surfaces',     /^background/ ],
        [ 'Text',         /^(text|link$|dropdownIcon$)/ ],
        [ 'Borders',      /^border/ ],
        [ 'Status',       /^(status|success|warn|destructive|info$)/ ],
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
    <<search { max-width: 24rem; }
    /* The table scrolls inside a bounded box; unbounded, LazyScrollManager has no scroll container
       and lays out every row (14,000px for 250 tokens) and the whole page scrolls instead. */
    << .foam-comics-v2-DAOBrowserView { height: 60vh; min-height: 32rem; }
    << .foam-u2-view-ColorPicker { width: 4rem; height: 2.8rem; padding: $space-0_5; }
  `,

  properties: [
    {
      name: 'theme',
      documentation: 'The foam.core.theme.Theme the values are resolved for.'
    },
    {
      class: 'Boolean',
      name: 'editable',
      documentation: 'Cells are inputs and rows have an Add / Save override action only while the theme is being edited.',
      value: true
    },
    {
      class: 'String',
      name: 'filter',
      documentation: 'Bare-word search over the token name; becomes the table\'s searchPredicate.',
      // onKey on the property too: Input.fromProperty copies it over the view's own flag (gap 14).
      onKey: true,
      view: { class: 'foam.u2.ClearableSearchField', onKey: true, placeholder: 'Search tokens' }
    },
    {
      name: 'edits',
      documentation: 'Edit per token name, made on first render of its row and kept so unsaved input survives the table re-rendering rows.',
      factory: function() { return {}; }
    },
    {
      name: 'resolved',
      documentation: 'Resolved row values by token name, filled by the dao factory.',
      factory: function() { return {}; }
    },
    {
      name: 'overriddenNames',
      documentation: 'Token names that have a CSSTokenOverride row for this theme.',
      factory: function() { return {}; }
    },
    {
      name: 'dao',
      documentation: 'In-memory DAO of TokenRow: every base token, resolved once for the theme.',
      factory: function() {
        var self   = this;
        var light  = this.contextFor('light');
        var dark   = this.contextFor('dark');
        var rows   = this.CSSTokens.getAxiomsByClass(this.CSSToken).map(function(a) {
          return self.resolved[a.name] = {
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
      name: 'viewDao',
      documentation: 'What the table reads: the token DAO, or the token DAO narrowed by the search. Swapped in place; DAOBrowserView resets searchPredicate itself on a tab change, so it cannot carry the search.',
      factory: function() { return this.ProxyDAO.create({ delegate: this.sorted() }, this); }
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
          dao: this.viewDao,
          of: this.TokenRow,
          cannedQueries: queries,
          // foam3 falls back to index 1 when nothing is chosen; say 0 (All) explicitly.
          preSelectedCannedQuery: 0,
          // foam's own query bar needs a 'TEXT:' or ':' prefix before a bare word finds anything
          // (gap 25); the catalogue keeps its own search field and sets searchPredicate itself.
          hideQueryBar: true,
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

  listeners: [
    {
      name: 'onFilter',
      isMerged: true,
      mergeDelay: 150,
      code: function() {
        var text = this.filter.trim();
        this.viewDao.delegate = text ? this.sorted().where(this.KEYWORD(text)) : this.sorted();
        this.viewDao.on.reset.pub();
      }
    },
    {
      name: 'onModeChange',
      documentation: 'Leaving EDIT drops unsaved input; the table re-renders its rows so each cell picks its view for the new mode.',
      code: function() {
        if ( ! this.editable ) Object.values(this.edits).forEach(function(e) { e.reset(); });
        this.viewDao.on.reset.pub();
      }
    },
    {
      name: 'onOverrides',
      isMerged: true,
      mergeDelay: 100,
      documentation: 'Override rows changed (here or in the overrides table): reload which tokens are overridden and re-resolve the values.',
      code: async function() {
        var s = await this.cssTokenOverrideDAO.where(this.EQ(this.CSSTokenOverride.THEME, this.theme.id)).select();
        var names = {};
        s.array.forEach(function(o) { names[o.source] = true; });
        this.overriddenNames = names;
        var light = this.contextFor('light');
        var dark  = this.contextFor('dark');
        var rows  = ( await this.dao.select() ).array;
        for ( var i = 0 ; i < rows.length ; i++ ) {
          var r = rows[i];
          var l = this.resolve(r.name, light), d = this.resolve(r.name, dark);
          var e = this.edits[r.name];
          if ( e ) {
            var clean = ! e.dirty;
            e.overridden = !! names[r.name];
            e.savedLight = l; e.savedDark = d;
            if ( clean ) e.reset();
          }
          this.resolved[r.name] = { name: r.name, group: r.group, light: l, dark: d };
          if ( l !== r.light || d !== r.dark ) await this.dao.put(r.clone().copyFrom({ light: l, dark: d }));
        }
      }
    }
  ],

  methods: [
    function init() {
      this.SUPER();
      this.onDetach(this.filter$.sub(this.onFilter));
      this.onDetach(this.editable$.sub(this.onModeChange));
      if ( this.cssTokenOverrideDAO && this.theme ) {
        this.onDetach(this.cssTokenOverrideDAO.on.sub(this.onOverrides));
        this.onOverrides();
      }
    },

    function sorted() {
      // orderBy(NAME) sorts with the property's comparePropertyValues (natural: primary50 before
      // primary100); the MDAO's own id index sorts plain strings.
      return this.dao.orderBy(this.TokenRow.NAME);
    },

    function cellMode() {
      return this.editable ? this.ControllerMode.EDIT : this.ControllerMode.VIEW;
    },

    function editFor(name) {
      var e = this.edits[name];
      if ( e ) return e;
      // The table hands formatters a projection of the visible columns; take the values from the resolved rows.
      var row = this.resolved[name] || {};
      e = this.edits[name] = this.Edit.create({
        catalogue: this, name: name,
        savedLight: row.light || '', savedDark: row.dark || '',
        overridden: !! this.overriddenNames[name]
      });
      e.reset();
      return e;
    },

    async function save(e) {
      // Dark is stored only when it differs from what light alone would give, so a token
      // with no dark value of its own keeps following light.
      var darkOwn = e.dark && ! ( e.dark === e.savedDark && e.savedDark === e.savedLight ) && e.dark !== e.light;
      await this.cssTokenOverrideDAO.put(this.CSSTokenOverride.create({
        theme: this.theme.id,
        source: e.name,
        target: e.light,
        variants: darkOwn ? { dark: e.dark } : {}
      }));
      e.savedLight = e.light;
      e.savedDark  = darkOwn ? e.dark : e.light;
      e.dark       = e.savedDark;
      e.overridden = true;
      // CSSTokenOverrideService reloads on the DAO event; installed CSS is re-expanded only on themeChange.
      if ( this.ctrl && this.ctrl.pub ) this.ctrl.pub('themeChange');
    },

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
        // The search box is a control in every mode, not record data: keep it out of VIEW's read-only views.
        .startContext({ data: this, controllerMode: this.ControllerMode.EDIT })
          .start(this.FILTER).addClass(this.myClass('search')).end()
        .endContext()
        // Own memento root: the search box and the group tabs are memorable and would otherwise
        // write into the page URL and fight the Theme screen's own tabs (gap 16).
        // click: what a table row does (the Clickable mixin imports it); a no-op so a click on a
        // row's input does not open the row. tokenCatalogue: how TokenEditFormatter finds this view.
        .startContext({
          memento_: this.Memento.create(),
          click: function() {},
          tokenCatalogue: this
        })
          .tag(this.DAOBrowserView, { data: this.viewDao, config: this.config })
        .endContext();
    }
  ]
});
