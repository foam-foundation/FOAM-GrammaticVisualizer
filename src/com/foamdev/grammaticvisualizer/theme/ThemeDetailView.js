/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.theme',
  name: 'ThemeDetailView',
  extends: 'foam.u2.detail.TabbedDetailView',

  documentation: `
    foam.core.theme.Theme with one tab per section, as TabbedDetailView draws it,
    but the Colours, Icons / Images, Inputs and Navigation tabs get a view that
    shows what the fields do: swatches and token overrides, bounded image
    previews, a live input sample, and help on each navigation field. Every
    other section renders as the plain SectionView. Mounted from the
    grammaticVisualizer.theme-all menu through config.detailView.
  `,

  requires: [
    'com.foamdev.grammaticvisualizer.theme.InputSizingView',
    'com.foamdev.grammaticvisualizer.theme.ThemeColoursView',
    'com.foamdev.grammaticvisualizer.theme.ThemeImagesView'
  ],

  messages: [
    { name: 'HELP_DEFAULT_MENU', message: 'Menu the user lands on after login. Falls back to the first menu they may read.' },
    { name: 'HELP_UNAUTH_MENU', message: 'Menu shown before login (sign-in, sign-up, or a public page).' },
    { name: 'HELP_LOGO_REDIRECT', message: 'Menu id opened by a click on the top-nav logo.' },
    { name: 'HELP_TOP_NAV', message: 'Class id of the top bar view. Default foam.core.u2.navigation.ResponsiveTopNav.' },
    { name: 'HELP_FOOTER', message: 'Class id of the footer view. Default foam.core.u2.navigation.FooterView.' },
    { name: 'HELP_SIDE_NAV', message: 'A JSON view spec for the side menu. The default is a ResponsiveAltView: ApplicationSideNav on XS, VerticalMenu from MD up.' }
  ],

  constants: [
    {
      name: 'SECTION_VIEWS',
      documentation: 'Section name to the view spec that replaces SectionView for it.',
      value: {
        colours: { class: 'com.foamdev.grammaticvisualizer.theme.ThemeColoursView' },
        images:  { class: 'com.foamdev.grammaticvisualizer.theme.ThemeImagesView' },
        inputs:  { class: 'com.foamdev.grammaticvisualizer.theme.InputSizingView' }
      }
    }
  ],

  properties: [
    {
      name: 'sections',
      expression: function(of, useSections, propertyWhitelist) {
        var ss = foam.u2.detail.AbstractSectionedDetailView.SECTIONS.expression.call(this, of, useSections, propertyWhitelist);
        ss.forEach(function(s) {
          var v = this.SECTION_VIEWS[s.name];
          if ( v ) s.view = v;
          if ( s.name === 'navigation' ) s.view = { class: 'foam.u2.detail.SectionView', config: this.navigationHelp() };
        }.bind(this));
        return ss;
      }
    }
  ],

  methods: [
    function navigationHelp() {
      return {
        defaultMenu:                { help: this.HELP_DEFAULT_MENU },
        unauthenticatedDefaultMenu: { help: this.HELP_UNAUTH_MENU },
        logoRedirect:               { help: this.HELP_LOGO_REDIRECT },
        topNavigation:              { help: this.HELP_TOP_NAV },
        footerView:                 { help: this.HELP_FOOTER },
        sideNav:                    { help: this.HELP_SIDE_NAV }
      };
    }
  ]
});
