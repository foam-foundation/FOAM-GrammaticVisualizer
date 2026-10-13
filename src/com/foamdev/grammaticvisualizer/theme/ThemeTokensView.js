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
    tokens to pick from (TokenCatalogueView). Not a Theme section of its own;
    ThemeDetailView adds a transient section for it next to Colours.
  `,

  requires: [
    'com.foamdev.grammaticvisualizer.theme.TokenCatalogueView',
    'com.foamdev.grammaticvisualizer.theme.TokenOverridesView',
    'foam.u2.ControllerMode'
  ],

  messages: [
    { name: 'HELP', message: 'Views are styled with $tokens (foam.u2.CSSTokens plus each class\'s own). A theme recolours them with override rows; everything else keeps the base value.' },
    { name: 'OVERRIDES_TITLE', message: 'Overrides for this theme' },
    { name: 'CATALOGUE_TITLE', message: 'Base tokens' }
  ],

  css: `
    << { display: flex; flex-direction: column; gap: $space-3; }
    <<help { color: $textSecondary; }
  `,

  properties: [
    'section',
    'of',
    { class: 'Boolean', name: 'showTitle' },
    { class: 'Boolean', name: 'selected' },
    {
      class: 'Boolean',
      name: 'editable',
      documentation: 'Overrides may be added or removed only while the record is being edited (ControllerMode EDIT or CREATE); VIEW is read-only, as the mode guide requires.',
      expression: function(controllerMode) { return controllerMode !== this.ControllerMode.VIEW; }
    }
  ],

  methods: [
    function render() {
      var self = this;
      // foam.u2.View's controllerMode is a property; keep it on the context's, as SectionView does.
      if ( this.__subContext__.controllerMode$ ) this.controllerMode$.follow(this.__subContext__.controllerMode$);
      this.addClass(this.myClass())
        .start().addClass('p', this.myClass('help')).add(this.HELP).end()
        .add(this.slot(function(data) {
          if ( ! data ) return;
          var overrides = self.TokenOverridesView.create({ themeId: data.id, editable$: self.editable$ }, self);
          var catalogue = self.TokenCatalogueView.create({
            theme: data,
            editable$: self.editable$,
            onPick: function(name, light, dark) { overrides.copyFrom({ source: name, light: light, dark: dark }); }
          }, self);
          return this.E()
            .start().addClass('h500').add(self.OVERRIDES_TITLE).end()
            .add(overrides)
            .start().addClass('h500').add(self.CATALOGUE_TITLE).end()
            .add(catalogue);
        }));
    }
  ]
});
