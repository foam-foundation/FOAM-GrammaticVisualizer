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
        for ( var t = 0 ; t < ( ms || 3000 ) ; t += 50 ) { if ( await fn() ) return true; await wait(50); }
        return false;
      };
      var dao  = this.MDAO.create({ of: this.CSSTokenOverride }, x);
      // DAOBrowserView (the catalogue) imports auth and ctrl; the test page has no app behind it.
      var stubs = { auth: { check: async function() { return true; } }, ctrl: { notify: function() {}, pub: function() {}, sub: function() {}, add: function() { return this; } } };
      // themeDAO: the page's Save puts the theme there; ThemeTokensView stores staged row changes on that put.
      var themeDAO = this.MDAO.create({ of: this.Theme }, x);
      var y    = x.createSubContext(Object.assign({ controllerMode: this.ControllerMode.EDIT, cssTokenOverrideDAO: dao, themeDAO: themeDAO }, stubs));
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
      // EDIT mode: the cells are inputs (ModeAltView write views) holding the row's values.
      // Colour cells are ColorEditView (hex field + picker on one value): read the fields, not the pickers.
      var cellInputs = function(r) { return Array.from(r.querySelectorAll('input:not([type=color])')).map(function(i) { return i.type === 'checkbox' ? String(i.checked) : i.value; }); };
      x.test(rows().length === 1 && cellInputs(rows()[0]).join(' ') === 'primary500 #123456 #abcdef true',
        'EDIT mode: each row is editable in place, inputs hold token, light, dark, enabled: ' + (rows()[0] && cellInputs(rows()[0]).join(' ')));
      // Edit a value in the row: staged until the row's Save override.
      var ovBtn = function(r, re) { return Array.from(r.querySelectorAll('.foam-u2-ActionView')).find(function(b) { return re.test(b.textContent); }); };
      x.test(ovBtn(rows()[0], /Save override/) && ovBtn(rows()[0], /Save override/).disabled, 'an override row has Save override, disabled until a change');
      var lightIn = rows()[0].querySelectorAll('input:not([type=color])')[1];
      lightIn.value = '#654321'; lightIn.dispatchEvent(new Event('change'));
      var findRow = async function(src) { return ( await dao.select() ).array.find(function(o) { return o.theme === 't1' && o.source === src; }); };
      var stored = async function() { return ( await findRow('primary500') ) || {}; };
      await wait(300);
      x.test(( await stored() ).target === '#123456', 'a change is staged, not stored, until Save override');
      await until(function() { return ! ovBtn(rows()[0], /Save override/).disabled; });
      ovBtn(rows()[0], /Save override/).click();
      await until(async function() { return ( await stored() ).target === '#654321'; });
      x.test(( await stored() ).target === '#654321' && ( await stored() ).variants.dark === '#abcdef', 'Save override stores the row\'s light value and keeps dark');
      await until(function() { return rows()[0] && cellInputs(rows()[0])[1] === '#654321'; });
      // Rename in place: source is part of the id, so the old row goes and a new one comes.
      var srcIn = rows()[0].querySelectorAll('input:not([type=color])')[0];
      srcIn.value = 'primary400'; srcIn.dispatchEvent(new Event('change'));
      await until(function() { return ! ovBtn(rows()[0], /Save override/).disabled; });
      ovBtn(rows()[0], /Save override/).click();
      await until(async function() { return !! ( await findRow('primary400') ); });
      x.test(!! ( await findRow('primary400') ) && ! ( await findRow('primary500') ), 'renaming a row\'s token moves the override to the new name');
      await until(function() { return rows().length === 1 && cellInputs(rows()[0])[0] === 'primary400'; });
      // reach the view object through the DAO: put a row and the table follows.
      await dao.put(this.CSSTokenOverride.create({ theme: 't1', source: 'textDefault', target: '#222222' }, y));
      await until(function() { return rows().length === 2; });
      x.test(rows().length === 2, 'a DAO put adds a row: ' + rows().length);
      // The icon is drawn a moment after the row appears; checking at once failed now and then.
      await until(function() { return rows()[1] && rows()[1].querySelector('.foam-u2-ActionView-remove svg, .foam-u2-ActionView-remove img'); });
      var removeBtn = rows()[1].querySelector('.foam-u2-ActionView-remove');
      x.test(!! removeBtn && !! removeBtn.querySelector('svg, img'), 'each row has a remove action, drawn as the trash icon');
      removeBtn.click();
      await until(function() { return rows().length === 1; });
      x.test(rows().length === 1, 'the row action removes the override: ' + rows().length);
      x.test(! tov().querySelector('.com-foamdev-grammaticvisualizer-theme-TokenOverridesView-form'), 'no separate add form: overrides are added from the catalogue');

      // Token catalogue: foam's DAO table over TokenRow; group tabs are canned queries; search; cells edit in place in EDIT mode.
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
      // EDIT mode: value cells are inputs holding the resolved values.
      var catInputs = function(r) { return Array.from(r.querySelectorAll('input:not([type=color])')).map(function(i) { return i.value; }); };
      var p500 = rowNamed('primary500');
      x.test(!! p500, 'primary500 is listed');
      var vals = p500 && catInputs(p500);
      x.test(vals && vals.length === 2 && /^#/.test(vals[0]) && /^#/.test(vals[1]) && p500.querySelectorAll('input[type=color]').length === 2, 'EDIT mode: a colour token\'s light and dark are a hex field plus a colour picker: ' + vals);
      var bgd = rowNamed('backgroundDefault');
      var bvals = bgd && catInputs(bgd);
      x.test(bvals && bvals[0] !== bvals[1], 'a token with a dark variant shows two different values: ' + bvals);
      var ih = rowNamed('inputHeight');
      x.test(ih && ih.querySelectorAll('input[type=color]').length === 0 && catInputs(ih)[0] === '34px', 'EDIT mode: a size token is a text field: ' + (ih && catInputs(ih)));
      // Natural order: primary50 before primary100.
      var names = Array.from(catRows()).map(function(r) { var m = r.textContent.match(/\$(primary\d+)/); return m && m[1]; }).filter(Boolean);
      x.test(names.indexOf('primary50') >= 0 && names.indexOf('primary50') < names.indexOf('primary100'), 'tokens sort in natural order: ' + names.slice(0, 3).join(', '));
      // Group tab: Borders alone.
      Array.from(cat().querySelectorAll('.foam-u2-view-TabChoiceView label')).find(function(l) { return l.textContent.trim() === 'Borders'; }).querySelector('input').click();
      await until(function() { return catRows().length > 0 && catRows().length < 20; }, 5000);
      x.test(catRows().length === 8 && Array.from(catRows()).every(function(r) { return /\$border/.test(r.textContent); }), 'a group tab filters to that group: ' + catRows().length);
      Array.from(cat().querySelectorAll('.foam-u2-view-TabChoiceView label')).find(function(l) { return l.textContent.trim() === 'Status'; }).querySelector('input').click();
      await until(function() { return !! rowNamed('info'); }, 5000);
      x.test(!! rowNamed('info'), '$info is in the Status group');
      Array.from(cat().querySelectorAll('.foam-u2-view-TabChoiceView label')).find(function(l) { return l.textContent.trim() === 'Borders'; }).querySelector('input').click();
      await until(function() { return !! rowNamed('borderBrand'); }, 5000);
      // Search: the catalogue's own field (a plain TextField with onKey) sets the table's searchPredicate to a KEYWORD.
      var searchEl = cat().querySelector('.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView-search input, input.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView-search');
      x.test(!! searchEl && ! cat().querySelector('.foam-u2-filter-FilterView'), 'the catalogue has its own search field and no foam query bar');
      searchEl.value = 'borderBrand';
      searchEl.dispatchEvent(new Event('input', { bubbles: true }));
      await until(function() { return catRows().length === 4; }, 6000);
      x.test(catRows().length === 4 && Array.from(catRows()).every(function(r) { return /borderBrand/.test(r.textContent); }), 'a bare word filters the catalogue: ' + catRows().length);
      // The row's action: Add override, enabled once a value changes; it stores the override, then reads Save override.
      var bb = function() { return rowNamed('borderBrand'); };
      var rowBtn = function(re) { return Array.from(bb().querySelectorAll('.foam-u2-ActionView')).find(function(b) { return re.test(b.textContent) && b.getClientRects().length > 0; }); };
      // A freshly drawn row shows both buttons until each action's isAvailable settles: wait for that.
      await until(function() { return !! rowBtn(/Add override/) && ! rowBtn(/Save override/); });
      var addB = rowBtn(/Add override/);
      x.test(!! addB && addB.disabled && ! rowBtn(/Save override/), 'a row without an override offers Add override, disabled until a value changes: add=' + !! addB + ' disabled=' + ( addB && addB.disabled ) + ' save=' + !! rowBtn(/Save override/) + ' values=' + catInputs(bb()).join(',') + ' dbg=' + Array.from(bb().querySelectorAll('.foam-u2-ActionView')).map(function(b) { return b.textContent.trim() + '[' + b.className.replace(/foam-u2-ActionView-?/g, '') + '|' + getComputedStyle(b).display + ']'; }).join(' '));
      var bbLight = bb().querySelector('input[type=color]');
      bbLight.value = '#112233'; bbLight.dispatchEvent(new Event('change'));
      await until(function() { return rowBtn(/Add override/) && ! rowBtn(/Add override/).disabled; });
      x.test(rowBtn(/Add override/) && ! rowBtn(/Add override/).disabled, 'changing a value enables Add override');
      x.test(/^#112233$/i.test(catInputs(bb())[0]), 'the hex field next to the picker follows it: ' + catInputs(bb())[0]);
      rowBtn(/Add override/).click();
      await until(async function() { return !! ( await findRow('borderBrand') ); });
      var bbStored = await findRow('borderBrand');
      x.test(bbStored && bbStored.target === '#112233', 'Add override stores the row\'s values: ' + (bbStored && bbStored.target));
      await until(function() { return !! rowBtn(/Save override/) && ! rowBtn(/Add override/); });
      x.test(!! rowBtn(/Save override/) && ! rowBtn(/Add override/) && rowBtn(/Save override/).disabled, 'an overridden row offers Save override, disabled until changed again');
      // The page's Save (a put of this theme on themeDAO) stores staged row changes too.
      bbLight = bb().querySelector('input[type=color]');
      bbLight.value = '#445566'; bbLight.dispatchEvent(new Event('change'));
      await until(function() { return rowBtn(/Save override/) && ! rowBtn(/Save override/).disabled; });
      // Status line and row marker while a change is staged.
      var status = function() { return root.querySelector('.com-foamdev-grammaticvisualizer-theme-ThemeTokensView-status'); };
      var statusShown = function() { return !! status() && status().getClientRects().length > 0; };
      // The label is a mapped slot and can paint a frame after the show class: wait for both.
      await until(function() { return statusShown() && /1 unsaved change/.test(status().textContent); });
      x.test(statusShown() && /1 unsaved change/.test(status().textContent) && /Save all/.test(status().textContent) && /Discard all/.test(status().textContent),
        'a staged change shows the status line with Save all and Discard all: ' + ( status() && status().textContent ) + ' n=' + root.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-ThemeTokensView-status').length + ' cls=' + Array.from(root.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-ThemeTokensView-status')).map(function(e) { return e.className + '|' + getComputedStyle(e).display + '|' + e.textContent.slice(0, 20); }).join(' ; '));
      var marker = function() { return bb().querySelector('.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView-unsaved'); };
      x.test(marker() && marker().getClientRects().length > 0, 'the changed row is marked Unsaved');
      await themeDAO.put(theme);
      await until(async function() { var o = await findRow('borderBrand'); return o && o.target === '#445566'; });
      var bbPaged = await findRow('borderBrand');
      x.test(bbPaged && bbPaged.target === '#445566', 'the page\'s Save stores a staged catalogue change: ' + (bbPaged && bbPaged.target));
      await until(function() { return ! statusShown(); });
      x.test(! statusShown(), 'after saving, the status line goes away');
      // Discard on a row puts it back.
      bbLight = bb().querySelector('input[type=color]');
      bbLight.value = '#778899'; bbLight.dispatchEvent(new Event('change'));
      await until(function() { return rowBtn(/Discard/) && ! rowBtn(/Discard/).disabled; });
      rowBtn(/Discard/).click();
      await until(function() { return /^#445566$/i.test(catInputs(bb())[0]); });
      x.test(/^#445566$/i.test(catInputs(bb())[0]) && rowBtn(/Discard/).disabled, 'Discard puts the row back to its stored value: ' + catInputs(bb())[0]);
      // Discard all from the status line.
      bbLight = bb().querySelector('input[type=color]');
      bbLight.value = '#778899'; bbLight.dispatchEvent(new Event('change'));
      await until(statusShown);
      Array.from(status().querySelectorAll('.foam-u2-ActionView')).find(function(b) { return /Discard all/.test(b.textContent); }).click();
      await until(function() { return ! statusShown(); });
      x.test(! statusShown() && /^#445566$/i.test(catInputs(bb())[0]), 'Discard all drops every staged change');
      x.test(( await findRow('borderBrand') ).target === '#445566', 'discarding never touches the stored override');

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

      // ControllerMode: in VIEW the overrides and the catalogue are read-only (read views, no actions).
      var yv = x.createSubContext(Object.assign({ controllerMode: this.ControllerMode.VIEW, cssTokenOverrideDAO: dao }, stubs));
      var vv = this.ThemeDetailView.create({ data: theme, of: this.Theme }, yv);
      vv.write();
      var rootV = vv.element_;
      await until(function() { return rootV.querySelectorAll('.foam-u2-SegmentedTabs-tabRow > *').length >= 9; });
      Array.from(rootV.querySelectorAll('.foam-u2-SegmentedTabs-tabRow > *')).find(function(e) { return e.textContent.trim() === 'CSS tokens'; }).click();
      await until(function() { return rootV.querySelectorAll('tr.com-foamdev-grammaticvisualizer-theme-TokenOverridesView-row').length > 0; });
      var shown = function(el) { return !! el && el.getClientRects().length > 0; };
      var rowV = Array.from(rootV.querySelectorAll('tr.com-foamdev-grammaticvisualizer-theme-TokenOverridesView-row')).find(function(r) { return /primary400/.test(r.textContent); });
      x.test(! rowV.querySelector('input[type=text], input[type=color]') && /\$primary400/.test(rowV.textContent) && /#654321/i.test(rowV.textContent) && /#abcdef/i.test(rowV.textContent),
        'VIEW mode: cells are read views (token name, swatch and value), no inputs: ' + rowV.textContent);
      x.test(rowV.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-TokenCellView-swatch').length === 2, 'VIEW mode: light and dark show a swatch');
      x.test(! shown(rootV.querySelector('tr.com-foamdev-grammaticvisualizer-theme-TokenOverridesView-row .foam-u2-ActionView')), 'VIEW mode: no remove action on rows');
      var catV = rootV.querySelector('.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView');
      await until(function() { return catV.querySelectorAll('.foam-u2-table-TableView-tbody .foam-u2-table-TableView-tr').length >= 20; }, 5000);
      x.test(!! catV.querySelector('.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView-search input, input.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView-search'), 'VIEW mode: the search box is still an input');
      x.test(! catV.querySelector('.foam-u2-table-TableView-tbody input') && ! /Add override|Save override/.test(catV.textContent), 'VIEW mode: catalogue cells are read views, no inputs or row actions');
      var p400V = Array.from(catV.querySelectorAll('.foam-u2-table-TableView-tbody .foam-u2-table-TableView-tr')).find(function(r) { return /\$primary400/.test(r.textContent); });
      x.test(p400V && /Overridden/.test(p400V.textContent) && p400V.querySelectorAll('.com-foamdev-grammaticvisualizer-theme-TokenCellView-swatch').length === 2, 'VIEW mode: an overridden token says so and shows a swatch per mode');
      var sw = p400V && p400V.querySelector('.com-foamdev-grammaticvisualizer-theme-TokenCellView-swatch');
      await until(function() { return sw && sw.getBoundingClientRect().width > 0; });
      var swW = sw ? sw.getBoundingClientRect().width : 0;
      x.test(swW >= 15, 'VIEW mode: the swatch is at least 15px wide: ' + swW);
      x.test(/Press Edit/.test(rootV.querySelector('.com-foamdev-grammaticvisualizer-theme-TokenCatalogueView-help').textContent), 'VIEW mode: the help says to press Edit');
      vv.remove();

      // Chrome rule: every button and input is a u2 view.
      // The catalogue is foam's own DAOBrowserView (tab radios, column-resize handles): not our chrome.
      var ours = function(el) { return ! el.closest('.foam-comics-v2-DAOBrowserView') && ! el.closest('.foam-u2-borders-ClearableSearchBorder'); };
      var rawButtons = Array.from(root.querySelectorAll('button')).filter(ours).filter(function(b) { return ! /foam-u2-ActionView/.test(b.className); });
      var rawInputs  = Array.from(root.querySelectorAll('input, select, textarea')).filter(ours).filter(function(e) { return ! /foam-u2-/.test(e.className); });
      x.test(rawButtons.length === 0, 'every button is an ActionView: ' + rawButtons.length);
      x.test(rawInputs.length === 0, 'every input is a u2 view: ' + rawInputs.map(function(e) { return e.outerHTML.slice(0, 50); }).join(' | '));

      v.remove();
    }
  ]
});
