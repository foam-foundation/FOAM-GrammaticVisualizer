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
    but the Icons / Images, Inputs and Navigation tabs get a view that shows what
    the fields do: bounded image
    previews, a live input sample, and help on each navigation field. The legacy
    Colours tab is dropped; a CSS tokens tab (no Theme section behind it) takes
    its place with the overrides and the token catalogue. Every other section
    renders as the plain SectionView. Mounted from the
    grammaticVisualizer.theme-all menu through config.detailView.
  `,

  requires: [
    // Segmented control instead of the underlined strip; same UnstyledTabs API, so TabbedDetailView's render is untouched.
    'foam.u2.SegmentedTabs as Tabs',
    'com.foamdev.grammaticvisualizer.theme.InputSizingView',
    'com.foamdev.grammaticvisualizer.theme.ThemeImagesView',
    'com.foamdev.grammaticvisualizer.theme.ThemeTokensView',
    'foam.layout.Section'
  ],

  css: `
    /* TabbedDetailView pads .foam-u2-Tabs-content; the segmented class names differ, so pad them here. */
    << .foam-u2-SegmentedTabs { padding: $space-2_5; }
    << textarea[name=sideNav] { width: 100%; font-family: monospace; box-sizing: border-box; }
    << .foam-u2-SegmentedTabs-content > div {
      padding: $space-3 $space-4;
    }
    /* Ten tabs overflow at narrow widths; keep the scrollbar but quiet it: thin, no track, thumb only on hover. */
    << .foam-u2-SegmentedTabs-tabRow { scrollbar-width: thin; scrollbar-color: transparent transparent; }
    << .foam-u2-SegmentedTabs-tabRow:hover { scrollbar-color: $borderDefault transparent; }
    << .foam-u2-SegmentedTabs-tabRow::-webkit-scrollbar { height: 4px; }
    << .foam-u2-SegmentedTabs-tabRow::-webkit-scrollbar-track { background: transparent; }
    << .foam-u2-SegmentedTabs-tabRow::-webkit-scrollbar-thumb { background: transparent; border-radius: $radius; }
    << .foam-u2-SegmentedTabs-tabRow:hover::-webkit-scrollbar-thumb { background: $borderDefault; }
  `,

  messages: [
    { name: 'TOKENS_TAB', message: 'CSS tokens' },
    { name: 'CUSTOM_CSS_TAB', message: 'Custom CSS' },
    { name: 'HELP_DEFAULT_MENU', message: 'Menu the user lands on after login. Falls back to the first menu they may read.' },
    { name: 'HELP_UNAUTH_MENU', message: 'Menu shown before login (sign-in, sign-up, or a public page).' },
    { name: 'HELP_LOGO_REDIRECT', message: 'Menu id opened by a click on the top-nav logo.' },
    { name: 'HELP_TOP_NAV', message: 'Class id of the top bar view. Default foam.core.u2.navigation.ResponsiveTopNav.' },
    { name: 'HELP_FOOTER', message: 'Class id of the footer view. Default foam.core.u2.navigation.FooterView.' },
    { name: 'HELP_SIDE_NAV', message: 'A JSON view spec for the side menu. The default is a ResponsiveAltView: ApplicationSideNav on XS, VerticalMenu from MD up.' }
  ],

  constants: [
    {
      name: 'TAB_ORDER',
      value: [ 'infoSection', 'tokens', 'images', 'navigation', 'inputs', 'sectionCss', 'urlMapping', 'applicationSection', 'administration' ]
    },
    {
      name: 'SECTION_VIEWS',
      documentation: 'Section name to the view spec that replaces SectionView for it.',
      value: {
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
        // The Colours section is the legacy CSS-macro palette (primary1..5, grey1..5, ...): dead in
        // foam3, slated for removal. Its tab goes; the CSS tokens tab takes its place.
        var at = ss.findIndex(function(s) { return s.name === 'colours'; });
        if ( at >= 0 ) ss.splice(at, 1);
        ss.forEach(function(s) {
          var v = this.SECTION_VIEWS[s.name];
          if ( v ) s.view = v;
          if ( s.name === 'navigation' ) s.view = { class: 'foam.u2.detail.SectionView', config: this.navigationHelp() };
        }.bind(this));
        ss.splice(at < 0 ? ss.length : at, 0, this.Section.create({
          name: 'tokens',
          title: this.TOKENS_TAB,
          view: { class: 'com.foamdev.grammaticvisualizer.theme.ThemeTokensView' }
        }));
        // "CSS" next to "CSS tokens" is a riddle; say what the section holds.
        ss.forEach(function(s) { if ( s.name === 'sectionCss' ) s.title = this.CUSTOM_CSS_TAB; }.bind(this));
        // Tabs in order of how often a theme owner touches them; the model's order is by history.
        var order = this.TAB_ORDER;
        var rank = function(s) { var i = order.indexOf(s.name); return i < 0 ? order.length : i; };
        ss.sort(function(a, b) { return rank(a) - rank(b); });
        return ss;
      }
    }
  ],

  methods: [
    function render() {
      /**
       * TabbedDetailView rebuilds its whole tab tree every time a section's availability
       * settles (updateVis is merged, 100ms), and availability waits on one permission check
       * per property; for Theme that is ~50 round trips, so the tree is rebuilt several times
       * over a few seconds, async views mid-render in a discarded tree throw (FObjectView on
       * Edit), and the console fills with "add child to detached parent". No Theme section is
       * permission-gated, and a section with nothing to show hides its own body, so this view
       * renders every section once and never rebuilds.
       */
      var self = this;
      foam.u2.detail.AbstractSectionedDetailView.prototype.render.call(this);
      // Both class names: TabbedDetailView's CSS keys on its own.
      this.addClass(this.myClass(), 'foam-u2-detail-TabbedDetailView')
        .add(this.slot(function(sections) {
          var titled = sections.filter(function(s) { return s.title; });
          return self.E().start(self.CardBorder).addClass('foam-u2-detail-TabbedDetailView-tab-wrapper')
            .start(self.Tabs, {}, self.tabs$)
              .forEach(titled, function(s) {
                var tab = foam.lang.SimpleSlot.create({}, self);
                this.start(self.Tab, { label: s.title }, tab)
                  .tag(s.view, { data$: self.data$, of$: self.of$, section: s, showTitle: false, selected$: tab.value.selected$ })
                .end();
              })
            .end()
          .end();
        }));
    },

    function navigationHelp() {
      return {
        defaultMenu:                { help: this.HELP_DEFAULT_MENU },
        unauthenticatedDefaultMenu: { help: this.HELP_UNAUTH_MENU },
        logoRedirect:               { help: this.HELP_LOGO_REDIRECT },
        topNavigation:              { help: this.HELP_TOP_NAV },
        footerView:                 { help: this.HELP_FOOTER },
        // A JSON view spec: a code box, not a one-line field that truncates it.
        sideNav:                    { help: this.HELP_SIDE_NAV, view: { class: 'foam.u2.tag.TextArea', rows: 6 } }
      };
    }
  ]
});
