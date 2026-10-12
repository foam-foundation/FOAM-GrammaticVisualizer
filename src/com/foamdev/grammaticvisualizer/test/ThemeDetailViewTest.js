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
    The Theme detail screen: one tab per section; Colours shows a swatch per
    colour field plus the theme's token overrides; Icons / Images keeps every
    picture inside its preview box; Inputs shows a sample at the given sizes;
    every control is a u2 view.
  `,

  methods: [
    async function runTest(x) {
      var wait  = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };
      // Section visibility and slot rendering settle asynchronously; poll instead of guessing a delay.
      var until = async function(fn, ms) {
        for ( var t = 0 ; t < ( ms || 3000 ) ; t += 50 ) { if ( fn() ) return true; await wait(50); }
        return false;
      };
      var dao  = this.MDAO.create({ of: this.CSSTokenOverride }, x);
      var y    = x.createSubContext({ controllerMode: this.ControllerMode.EDIT, cssTokenOverrideDAO: dao });
      var svg  = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#0a4ac6"/></svg>');
      var theme = this.Theme.create({ id: 't1', name: 't1', primary1: '#ff0000', logo: svg, inputHeight: '40px' }, y);
      await dao.put(this.CSSTokenOverride.create({ theme: 't1', source: 'primary500', target: '#123456', variants: { dark: '#abcdef' } }, y));
      await dao.put(this.CSSTokenOverride.create({ theme: 'other', source: 'primary500', target: '#000000' }, y));

      // The tabs must render once: count foam's "detached parent" warnings while the view settles.
      var detached = 0, origWarn = console.warn;
      console.warn = function(m) { if ( /detached parent/.test(String(m)) ) detached++; origWarn.apply(console, arguments); };
      var v = this.ThemeDetailView.create({ data: theme, of: this.Theme }, y);
      v.write();
      var root = v.element_;
      var tabEls = function() { return Array.from(root.querySelectorAll('.foam-u2-SegmentedTabs-tabRow > *')); };
      await until(function() { return tabEls().length >= 10; });
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
      x.test(tabLabels.indexOf('Legacy CSS') >= 0 && tabLabels.indexOf('CSS tokens') === tabLabels.indexOf('Legacy CSS') + 1 && tabLabels.indexOf('Icons / Images') >= 0 && tabLabels.indexOf('Inputs') >= 0, 'one tab per Theme section: ' + tabLabels.join(', '));

      // Colours: a card per colour field, the swatch carries the value, unset ones say so.
      await select('Legacy CSS', function() { return root.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-ThemeColoursView-card').length > 0; });
      var cards = root.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-ThemeColoursView-card');
      x.test(cards.length >= 30, 'a swatch card per colour field: ' + cards.length);
      var p1 = Array.from(cards).find(function(c) { return /primary1\b/i.test(c.textContent) || /Primary 1/.test(c.textContent); });
      x.test(!! p1, 'primary1 has a card');
      var sw = p1 && p1.querySelector('.com-foamdev-grammaticvisualizer-theme-ThemeColoursView-swatch');
      x.test(sw && /255, 0, 0/.test(getComputedStyle(sw).backgroundColor), 'the swatch shows the field value: ' + (sw && getComputedStyle(sw).backgroundColor));
      var unset = root.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-ThemeColoursView-unset');
      x.test(unset.length === cards.length - 1, 'every other colour is marked unset: ' + unset.length);
      theme.primary2 = '#00ff00';
      await wait(50);
      x.test(root.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-ThemeColoursView-unset').length === cards.length - 2, 'a swatch follows its field');

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

      // Token catalogue: every base token with a light and a dark value; search filters; a click prefills the form.
      var cat = function() { return root.querySelector('.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView'); };
      x.test(!! cat(), 'the CSS tokens tab hosts the catalogue');
      var catRows = function() { return cat().querySelectorAll('tr.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView-row'); };
      x.test(catRows().length >= 200, 'lists the base tokens: ' + catRows().length);
      var p500 = Array.from(catRows()).find(function(r) { return r.querySelector('td').textContent === '$primary500'; });
      x.test(!! p500, 'primary500 is listed');
      var vals = p500 && Array.from(p500.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView-value')).map(function(e) { return e.textContent; });
      x.test(vals && /^#/.test(vals[0]) && /^#/.test(vals[1]), 'primary500 resolves to hex values in both modes: ' + vals);
      var bgd = Array.from(catRows()).find(function(r) { return r.querySelector('td').textContent === '$backgroundDefault'; });
      var bvals = bgd && Array.from(bgd.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView-value')).map(function(e) { return e.textContent; });
      x.test(bvals && bvals[0] !== bvals[1], 'a token with a dark variant shows two different values: ' + bvals);
      x.test(p500.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView-swatch').length === 2, 'colour tokens get a swatch per mode');
      var ih = Array.from(catRows()).find(function(r) { return r.querySelector('td').textContent === '$inputHeight'; });
      x.test(ih && ih.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView-swatch').length === 0 && /34px/.test(ih.textContent), 'a size token shows its value without a swatch');
      var filterEl = cat().querySelector('input');
      filterEl.value = 'borderBrand';
      filterEl.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(100);
      x.test(catRows().length === 4 && Array.from(catRows()).every(function(r) { return /borderBrand/.test(r.textContent); }), 'search filters the catalogue: ' + catRows().length);
      catRows()[0].click();
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

      // Inputs: fields with help plus a live sample at the theme's height.
      await select('Inputs', function() { return !! root.querySelector('.com-foamdev-grammaticvisualizer-theme-InputSizingView-sample'); });
      var sample = root.querySelector('.com-foamdev-grammaticvisualizer-theme-InputSizingView-sample');
      x.test(sample && sample.getBoundingClientRect().height === 40, 'the sample box takes inputHeight: ' + (sample && sample.getBoundingClientRect().height));
      theme.inputHeight = '48px';
      await wait(50);
      x.test(sample.getBoundingClientRect().height === 48, 'the sample follows the field');

      // Chrome rule: every button and input is a u2 view.
      var rawButtons = Array.from(root.querySelectorAll('button')).filter(function(b) { return ! /foam-u2-ActionView/.test(b.className); });
      var rawInputs  = Array.from(root.querySelectorAll('input, select, textarea')).filter(function(e) { return ! /foam-u2-/.test(e.className); });
      x.test(rawButtons.length === 0, 'every button is an ActionView: ' + rawButtons.length);
      x.test(rawInputs.length === 0, 'every input is a u2 view: ' + rawInputs.map(function(e) { return e.outerHTML.slice(0, 50); }).join(' | '));

      v.remove();
    }
  ]
});
