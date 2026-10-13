/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.test',
  name: 'ThemeDetailViewTest',
  extends: 'foam.core.test.JSTest',

  requires: [
    'com.foamdev.grammaticvisualizer.theme.ThemeDetailView',
    'com.foamdev.grammaticvisualizer.theme.TokenOverridesView',
    'foam.core.theme.Theme',
    'foam.core.theme.customisation.CSSTokenOverride',
    'foam.dao.MDAO',
    'foam.u2.ControllerMode'
  ],

  documentation: `
    The Theme detail screen: one tab per section, minus the legacy Colours
    one; CSS tokens holds the theme's overrides and the catalogue; Icons / Images keeps every
    picture inside its preview box; Inputs shows a sample at the given sizes;
    every control is a u2 view.
  `,

  methods: [
    async function runTest(x) {
      // A throw inside the body would lose every result already recorded; report it as one failure instead.
      try { await this.runTest_(x); }
      catch (e) { x.test(false, 'test body threw: ' + (e && e.stack || e)); }
    },

    async function runTest_(x) {
      var wait  = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };
      // Section visibility and slot rendering settle asynchronously; poll instead of guessing a delay.
      var until = async function(fn, ms) {
        for ( var t = 0 ; t < ( ms || 3000 ) ; t += 50 ) { if ( fn() ) return true; await wait(50); }
        return false;
      };
      var dao  = this.MDAO.create({ of: this.CSSTokenOverride }, x);
      // DAOBrowserView (the catalogue) imports auth and ctrl; the test page has no app behind it.
      var stubs = { auth: { check: async function() { return true; } }, ctrl: { notify: function() {}, pub: function() {}, sub: function() {}, add: function() { return this; } } };
      var y    = x.createSubContext(Object.assign({ controllerMode: this.ControllerMode.EDIT, cssTokenOverrideDAO: dao }, stubs));
      var svg  = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#0a4ac6"/></svg>');
      var theme = this.Theme.create({ id: 't1', name: 't1', primary1: '#ff0000', logo: svg, inputHeight: '40px' }, y);
      await dao.put(this.CSSTokenOverride.create({ theme: 't1', source: 'primary500', target: '#123456', variants: { dark: '#abcdef' } }, y));
      await dao.put(this.CSSTokenOverride.create({ theme: 'other', source: 'primary500', target: '#000000' }, y));

      // The tabs must render once: count foam's "detached parent" warnings while the view settles.
      var detached = 0, origWarn = console.warn;
      console.warn = function(m) { if ( /detached parent/.test(String(m)) ) detached++; origWarn.apply(console, arguments); };
      var v;
      try { v = this.ThemeDetailView.create({ data: theme, of: this.Theme }, y); v.write(); }
      catch (e) { x.test(false, 'the view renders: ' + (e.stack || e)); console.warn = origWarn; return; }
      var root = v.element_;
      var tabEls = function() { return Array.from(root.querySelectorAll('.foam-u2-SegmentedTabs-tabRow > *')); };
      await until(function() { return tabEls().length >= 9; });
      var tabLabels = tabEls().map(function(e) { return e.textContent.trim(); });
      var select = async function(label, readyFn) {
        var tab = tabEls().find(function(e) { return e.textContent.trim() === label; });
        tab.click();
        await until(readyFn);
      };
      x.test(!! root.querySelector('.foam-u2-SegmentedTabs'), 'sections render as segmented tabs');
      await wait(300);
      console.warn = origWarn;
      x.test(detached === 0, 'the tabs render once, nothing is added to a detached tree: ' + detached);
      x.test(tabLabels.indexOf('Colours') < 0 && tabLabels.indexOf('Legacy CSS') < 0 && tabLabels.indexOf('CSS tokens') === 1 && tabLabels.indexOf('CSS') < 0 && tabLabels.indexOf('Custom CSS') > tabLabels.indexOf('Inputs') && tabLabels.indexOf('Icons / Images') === 2, 'tabs renamed and ordered by use: ' + tabLabels.join(', '));

      // CSS tokens tab. Overrides: this theme's rows only; add through the form; remove through the row action.
      await select('CSS tokens', function() { return root.querySelectorAll('tr.com-foamdev-grammaticvisualizer-theme-TokenOverridesView-row').length > 0; });
      // Re-query on every use: TabbedDetailView renders the tab content again once section visibility settles,
      // and an element captured before that is a detached copy whose listeners are gone.
      var tov = function() { return root.querySelector('.com-foamdev-grammaticvisualizer-theme-TokenOverridesView'); };
      x.test(root.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-TokenOverridesView').length === 1, 'one override table in the DOM');
      var rows = function() { return tov().querySelectorAll('tr.com-foamdev-grammaticvisualizer-theme-TokenOverridesView-row'); };
      x.test(rows().length === 1 && /\$primary500/.test(rows()[0].textContent) && /#123456/.test(rows()[0].textContent) && /#abcdef/.test(rows()[0].textContent),
        'lists the theme\'s overrides with light and dark values: ' + (rows()[0] && rows()[0].textContent));
      // reach the view object through the DAO: put a row and the table follows.
      await dao.put(this.CSSTokenOverride.create({ theme: 't1', source: 'textDefault', target: '#222222' }, y));
      await until(function() { return rows().length === 2; });
      x.test(rows().length === 2, 'a DAO put adds a row: ' + rows().length);
      var removeBtn = rows()[1].querySelector('.foam-u2-ActionView');
      x.test(!! removeBtn, 'each row has a remove action');
      removeBtn.click();
      await until(function() { return rows().length === 1; });
      x.test(rows().length === 1, 'the row action removes the override: ' + rows().length);
      var addBtn = function() { return Array.from(tov().querySelectorAll('.foam-u2-ActionView')).find(function(b) { return /Add override/.test(b.textContent); }); };
      x.test(!! addBtn() && addBtn().disabled, 'Add override is disabled until a token and a value are given');

      // Token catalogue: foam's DAO table over TokenRow; group tabs are canned queries; search; a row click prefills the form.
      var cat = function() { return root.querySelector('.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView'); };
      x.test(!! cat(), 'the CSS tokens tab hosts the catalogue');
      // foam's table pages its rows through LazyScrollManager; count what is rendered, not the DAO.
      var catRows = function() { return cat().querySelectorAll('.foam-u2-table-TableView-tbody .foam-u2-table-TableView-tr'); };
      var rowNamed = function(n) { return Array.from(catRows()).find(function(r) { return r.textContent.indexOf('$' + n) >= 0; }); };
      await until(function() { return catRows().length >= 20; }, 5000);
      x.test(catRows().length >= 20, 'All shows the base tokens in a foam table (first page): ' + catRows().length);
      x.test(!! cat().querySelector('.foam-u2-table-TableView'), 'the catalogue is foam.u2.table.TableView');
      var tabs = Array.from(cat().querySelectorAll('.foam-u2-view-TabChoiceView label')).map(function(l) { return l.textContent.trim(); });
      x.test(tabs[0] === 'All' && tabs.indexOf('Brand') > 0 && tabs.indexOf('Palette ramps') > 0, 'one canned-query tab per group, All first: ' + tabs.join(', '));
      var p500 = rowNamed('primary500');
      x.test(!! p500, 'primary500 is listed');
      var vals = p500 && Array.from(p500.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView-value')).map(function(e) { return e.textContent; });
      x.test(vals && /^#/.test(vals[0]) && /^#/.test(vals[1]), 'primary500 resolves to hex values in both modes: ' + vals);
      var bgd = rowNamed('backgroundDefault');
      var bvals = bgd && Array.from(bgd.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView-value')).map(function(e) { return e.textContent; });
      x.test(bvals && bvals[0] !== bvals[1], 'a token with a dark variant shows two different values: ' + bvals);
      x.test(p500.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView-swatch').length === 2, 'colour tokens get a swatch per mode');
      var ih = rowNamed('inputHeight');
      x.test(ih && ih.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView-swatch').length === 0 && /34px/.test(ih.textContent), 'a size token shows its value without a swatch');
      // Group tab: Borders alone.
      Array.from(cat().querySelectorAll('.foam-u2-view-TabChoiceView label')).find(function(l) { return l.textContent.trim() === 'Borders'; }).querySelector('input').click();
      await until(function() { return catRows().length > 0 && catRows().length < 20; }, 5000);
      x.test(catRows().length === 8 && Array.from(catRows()).every(function(r) { return /\$border/.test(r.textContent); }), 'a group tab filters to that group: ' + catRows().length);
      // The search box is foam's own (FilterView over SmartView). It is there; driving SmartView with
      // synthetic events is not reliable headless, so the DAO path is proven through the group tab above.
      x.test(!! cat().querySelector('input[type=search]'), 'the catalogue has foam\'s search box');
      await until(function() { return Array.from(catRows()).some(function(r) { return /borderBrand/.test(r.textContent); }); }, 3000);
      Array.from(catRows()).find(function(r) { return /borderBrand/.test(r.textContent); }).click();
      await wait(50);
      var srcEl = tov().querySelector('input[name=source]');
      x.test(srcEl && /^borderBrand/.test(srcEl.value), 'clicking a row prefills the override form: ' + (srcEl && srcEl.value));
      x.test(addBtn() && ! addBtn().disabled, 'the form is ready to add after a pick');

      // Icons / Images: the 1200x900 logo stays inside its preview box, on a light and a dark surface.
      await select('Icons / Images', function() { return root.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-ThemeImagesView-box img, .com-foamdev-grammaticvisualizer-theme-ThemeImagesView-box svg').length > 0; });
      var boxes = root.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-ThemeImagesView-box');
      x.test(boxes.length >= 10, 'two preview boxes per image field: ' + boxes.length);
      var box = boxes[0];
      var pic = box.querySelector('img, svg');
      x.test(!! pic, 'the logo renders in its box');
      var bb = box.getBoundingClientRect(), pb = pic ? pic.getBoundingClientRect() : null;
      x.test(pb && pb.width <= bb.width + 1 && pb.height <= bb.height + 1 && bb.width < 400, 'the picture is bounded by the box: ' + (pb && Math.round(pb.width) + 'x' + Math.round(pb.height)) + ' in ' + Math.round(bb.width) + 'x' + Math.round(bb.height));
      x.test(boxes[1].classList.contains('dark'), 'the second box is the dark surface');
      x.test(root.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-ThemeImagesView-card textarea').length >= 5, 'each image has its value editor');
      var ta = root.querySelector('.com-foamdev-grammaticvisualizer-theme-ThemeImagesView-card textarea');
      x.test(ta.getBoundingClientRect().height <= 60, 'the value box starts one line tall: ' + Math.round(ta.getBoundingClientRect().height));
      x.test(/Logo/.test(root.querySelector('.com-foamdev-grammaticvisualizer-theme-ThemeImagesView-cardTitle').textContent), 'the field name titles the card');

      // Navigation: the side-nav view spec gets a code box.
      await select('Navigation', function() { return !! root.querySelector('textarea[name=sideNav]'); });
      x.test(!! root.querySelector('textarea[name=sideNav]'), 'sideNav is edited in a textarea');

      // Inputs: fields with help plus a live sample at the theme's height.
      await select('Inputs', function() { return !! root.querySelector('.com-foamdev-grammaticvisualizer-theme-InputSizingView-sample'); });
      var sample = root.querySelector('.com-foamdev-grammaticvisualizer-theme-InputSizingView-sample');
      x.test(sample && sample.getBoundingClientRect().height === 40, 'the sample box takes inputHeight: ' + (sample && sample.getBoundingClientRect().height));
      theme.inputHeight = '48px';
      await wait(50);
      x.test(sample.getBoundingClientRect().height === 48, 'the sample follows the field');

      // ControllerMode: in VIEW the overrides are read-only (no form, no remove, rows not pickable); EDIT has them.
      var yv = x.createSubContext(Object.assign({ controllerMode: this.ControllerMode.VIEW, cssTokenOverrideDAO: dao }, stubs));
      var vv = this.ThemeDetailView.create({ data: theme, of: this.Theme }, yv);
      vv.write();
      var rootV = vv.element_;
      await until(function() { return rootV.querySelectorAll('.foam-u2-SegmentedTabs-tabRow > *').length >= 9; });
      Array.from(rootV.querySelectorAll('.foam-u2-SegmentedTabs-tabRow > *')).find(function(e) { return e.textContent.trim() === 'CSS tokens'; }).click();
      await until(function() { return rootV.querySelectorAll('tr.com-foamdev-grammaticvisualizer-theme-TokenOverridesView-row').length > 0; });
      var shown = function(el) { return !! el && el.getClientRects().length > 0; };
      x.test(! shown(rootV.querySelector('.com-foamdev-grammaticvisualizer-theme-TokenOverridesView-form')), 'VIEW mode: no add form');
      x.test(! shown(rootV.querySelector('tr.com-foamdev-grammaticvisualizer-theme-TokenOverridesView-row .foam-u2-ActionView')), 'VIEW mode: no remove action on rows');
      x.test(! rootV.querySelector('.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView-pickable'), 'VIEW mode: catalogue rows are not pickable');
      x.test(/Press Edit/.test(rootV.querySelector('.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView-help').textContent), 'VIEW mode: the help says to press Edit');
      // The EDIT view sits on another tab now, so test presence and the display rule rather than client rects.
      var editForm = root.querySelector('.com-foamdev-grammaticvisualizer-theme-TokenOverridesView-form');
      x.test(!! editForm && getComputedStyle(editForm).display !== 'none' && !! root.querySelector('.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView-pickable'), 'EDIT mode: form and pickable rows');
      vv.remove();

      // Chrome rule: every button and input is a u2 view.
      // The catalogue is foam's own DAOBrowserView (tab radios, column-resize handles): not our chrome.
      var ours = function(el) { return ! el.closest('.foam-comics-v2-DAOBrowserView'); };
      var rawButtons = Array.from(root.querySelectorAll('button')).filter(ours).filter(function(b) { return ! /foam-u2-ActionView/.test(b.className); });
      var rawInputs  = Array.from(root.querySelectorAll('input, select, textarea')).filter(ours).filter(function(e) { return ! /foam-u2-/.test(e.className); });
      x.test(rawButtons.length === 0, 'every button is an ActionView: ' + rawButtons.length);
      x.test(rawInputs.length === 0, 'every input is a u2 view: ' + rawInputs.map(function(e) { return e.outerHTML.slice(0, 50); }).join(' | '));

      v.remove();
    }
  ]
});
