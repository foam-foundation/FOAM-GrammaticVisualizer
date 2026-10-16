/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.theme',
  name: 'ThemeTokensView',
  extends: 'foam.u2.View',

  documentation: `
    The CSS tokens tab of a Theme: the current theming system. The theme's
    CSSTokenOverride rows (TokenOverridesView) above the catalogue of base
    tokens, where new overrides are added (TokenCatalogueView). Row changes
    are staged; a row's own action stores it, and the page's Save stores them
    all: foam's update view has no save hook (gap 27), so this listens for the
    put of this theme on themeDAO, which is what that Save does. Not a Theme section of its own;
    ThemeDetailView adds a transient section for it next to Colours.
  `,

  imports: [ 'themeDAO?' ],

  requires: [
    'com.foamdev.grammaticvisualizer.theme.TokenCatalogueView',
    'com.foamdev.grammaticvisualizer.theme.TokenOverridesView',
    'foam.u2.ControllerMode'
  ],

  messages: [
    { name: 'OVERRIDES_TITLE', message: 'Overrides for this theme' },
    { name: 'CATALOGUE_TITLE', message: 'Base tokens' }
  ],

  css: `
    << { display: flex; flex-direction: column; gap: $space-3; }
    <<sections { display: flex; flex-direction: column; gap: $space-2; }
    /* Each title starts a new block: clear space above it, not just the row gap. */
    <<sections > .h500:not(:first-child) { margin-top: $space-6; }
  `,

  properties: [
    'section',
    'of',
    { class: 'Boolean', name: 'showTitle' },
    { class: 'Boolean', name: 'selected' },
    { name: 'overridesView', documentation: 'The current TokenOverridesView, for saveAll.' },
    { name: 'catalogueView', documentation: 'The current TokenCatalogueView, for saveAll.' },
    {
      class: 'Boolean',
      name: 'editable',
      documentation: 'Overrides may be added or removed only while the record is being edited (ControllerMode EDIT or CREATE); VIEW is read-only, as the mode guide requires.',
      expression: function(controllerMode) { return controllerMode !== this.ControllerMode.VIEW; }
    }
  ],

  listeners: [
    {
      name: 'onThemePut',
      documentation: 'The page\'s Save put this theme: store the staged row changes too.',
      code: function(_, __, ___, theme) {
        if ( ! this.editable || ! theme || ! this.data || theme.id !== this.data.id ) return;
        if ( this.overridesView ) this.overridesView.saveAll();
        if ( this.catalogueView ) this.catalogueView.saveAll();
      }
    }
  ],

  methods: [
    function render() {
      var self = this;
      // foam.u2.View's controllerMode is a property; keep it on the context's, as SectionView does.
      if ( this.__subContext__.controllerMode$ ) this.controllerMode$.follow(this.__subContext__.controllerMode$);
      if ( this.themeDAO ) this.onDetach(this.themeDAO.on.put.sub(this.onThemePut));
      this.addClass(this.myClass())
        .add(this.slot(function(data) {
          if ( ! data ) return;
          var overrides = self.TokenOverridesView.create({ themeId: data.id, editable$: self.editable$ }, self);
          var catalogue = self.TokenCatalogueView.create({ theme: data, editable$: self.editable$ }, self);
          self.overridesView = overrides;
          self.catalogueView = catalogue;
          return this.E().addClass(self.myClass('sections'))
            .start().addClass('h500').add(self.OVERRIDES_TITLE).end()
            .add(overrides)
            .start().addClass('h500').add(self.CATALOGUE_TITLE).end()
            .add(catalogue);
        }));
    }
  ]
});
