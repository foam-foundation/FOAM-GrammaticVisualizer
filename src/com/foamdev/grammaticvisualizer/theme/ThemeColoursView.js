/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.theme',
  name: 'ThemeColoursView',
  extends: 'foam.u2.View',

  documentation: `
    The Colours section of a Theme. Two halves:
    1. the theme's own Color fields (primary1..5, grey1..5, black, white, ...)
       as a swatch grid, one card per field, grouped by family. These are the
       legacy CSS macros (/*%PRIMARY1%*/) that ApplicationController expands;
       views written with $tokens never read them.
    2. the theme's CSSTokenOverride rows, the mechanism that actually re-colours
       token-based views per theme (TokenOverridesView), and under them the
       catalogue of base tokens to pick from (TokenCatalogueView).
  `,

  requires: [
    'com.foamdev.grammaticvisualizer.theme.TokenCatalogueView',
    'com.foamdev.grammaticvisualizer.theme.TokenOverridesView',
    'foam.u2.ControllerMode'
  ],

  messages: [
    { name: 'LEGACY_TITLE', message: 'Legacy CSS macros' },
    { name: 'LEGACY_HELP', message: 'These fields fill /*%PRIMARY1%*/-style macros in old CSS. Views built on $tokens ignore them; use the token overrides below for those.' },
    { name: 'UNSET', message: 'unset' },
    { name: 'TOKENS_TITLE', message: 'Token overrides' },
    { name: 'CATALOGUE_TITLE', message: 'Token catalogue' }
  ],

  css: `
    << { display: flex; flex-direction: column; gap: $space-4; }
    <<help { color: $textSecondary; }
    <<family { display: flex; flex-direction: column; gap: $space-2; }
    <<familyName { text-transform: capitalize; color: $textSecondary; }
    <<grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: $space-3; }
    <<card { border: 1px solid $borderLight; border-radius: $radius; overflow: hidden; background: $backgroundDefault; }
    <<swatch {
      height: 3.5rem;
      display: flex; align-items: flex-end; justify-content: flex-end;
      padding: $space-1;
      font-family: monospace;
    }
    <<swatch span { background: $backgroundDefault; color: $textDefault; padding: 0 $space-1; border-radius: $radius; }
    <<unset { background: repeating-linear-gradient(45deg, $backgroundSecondary 0 6px, $backgroundTertiary 6px 12px); }
    <<name { padding: $space-1 $space-2 0; }
    <<field { padding: 0 $space-2 $space-2; }
    <<field .foam-u2-view-DualView { display: flex; gap: $space-1; align-items: center; }
    <<field input[type=text] { width: 100%; }
  `,

  properties: [
    'section',
    'of',
    { class: 'Boolean', name: 'showTitle' },
    { class: 'Boolean', name: 'selected' },
    {
      name: 'families',
      documentation: 'Colour properties grouped by name without its trailing digit: primary, secondary, grey, black, white.',
      expression: function(section) {
        var order = [], byName = {};
        ( section ? section.properties : [] ).forEach(function(p) {
          if ( ! foam.lang.Color.isInstance(p) ) return;
          var fam = p.name.replace(/\d+$/, '');
          if ( ! byName[fam] ) { byName[fam] = []; order.push(fam); }
          byName[fam].push(p);
        });
        return order.map(function(f) { return { name: f, props: byName[f] }; });
      }
    }
  ],

  methods: [
    function render() {
      var self = this;
      // foam.u2.View owns a controllerMode property; keep it on the context's, as SectionView does.
      if ( this.__subContext__.controllerMode$ ) this.controllerMode$.follow(this.__subContext__.controllerMode$);
      this.addClass(this.myClass())
        .start().addClass('h500').add(this.LEGACY_TITLE).end()
        .start().addClass('p', this.myClass('help')).add(this.LEGACY_HELP).end()
        .add(this.slot(function(families, data) {
          return this.E().forEach(families, function(fam) {
            this.start().addClass(self.myClass('family'))
              .start().addClass('p-label', self.myClass('familyName')).add(fam.name).end()
              .start().addClass(self.myClass('grid'))
                .forEach(fam.props, function(p) { self.renderCard(this, p); })
              .end()
            .end();
          });
        }))
        .add(this.slot(function(data) {
          if ( ! data ) return;
          var overrides = self.TokenOverridesView.create({ themeId: data.id }, self);
          var catalogue = self.TokenCatalogueView.create({
            theme: data,
            onPick: function(name, light, dark) { overrides.copyFrom({ source: name, light: light, dark: dark }); }
          }, self);
          return this.E()
            .start().addClass('h500').add(self.TOKENS_TITLE).end()
            .add(overrides)
            .start().addClass('h500').add(self.CATALOGUE_TITLE).end()
            .add(catalogue);
        }));
    },

    function renderCard(parent, p) {
      var self  = this;
      var value = this.data$.dot(p.name);
      parent.start().addClass(this.myClass('card'))
        .start().addClass(this.myClass('swatch'))
          .enableClass(this.myClass('unset'), value.map(function(v) { return ! v; }))
          .style({ 'background-color': value })
          .start('span').add(value.map(function(v) { return v || self.UNSET; })).end()
        .end()
        .start().addClass('p-label', this.myClass('name')).add(p.label || p.name).end()
        .start().addClass(this.myClass('field'))
          // In view mode the swatch says it all; the text + picker pair only appears while editing.
          .show(this.slot(function(controllerMode) { return controllerMode !== self.ControllerMode.VIEW; }))
          .add(p.clone().copyFrom({
            label: '',
            view: {
              class: 'foam.u2.view.DualView',
              viewa: 'foam.u2.TextField',
              viewb: { class: 'foam.u2.view.ColorPicker', onKey: true }
            }
          }).toPropertyView({ data$: this.data$ }, this.__subContext__))
        .end()
      .end();
    }
  ]
});
