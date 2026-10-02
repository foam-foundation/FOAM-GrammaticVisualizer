/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// ui-statechart: the spike SHELL. Every design spike page mounts its design inside this, so the tool around the design
// follows the same rules the designs do: the design gets the page; everything else is one control bar above it and
// tabs below it, each tab label carrying its own status ("Ask the expert · 4 open").
//
// Load after spike-diagram.js. Use from the spike view's render():
//
//   this.tag(fsmstudio.SpikeShell, {
//     title:    'Checkout: one page instead of eight',
//     question: 'Can the 8-page checkout become 3 steps with pieces side by side?',   // what this page answers
//     round:    'Round 2',
//     controls: [                                                          // spike controls, never part of the design
//       { kind: 'choice', label: 'Sample basket', choices: [...keys], data$: this.preset$, help$: this.presetHelp$ },
//       { kind: 'radio',  label: 'Layout', choices: [['A', 'A · canvas'], ['B', 'B · flow + rail']], data$: this.layout$ },
//       { kind: 'check',  label: 'next submit fails', data$: this.submitShouldFail$ },
//       { kind: 'action', action: this.START_OVER, data: this }
//     ],
//     design:      function(e) { ... },                                    // renders the design into e
//     checklist:   [ 'Hard-reload (Cmd+Shift+R).', 'Link two transactions: ...' ],   // what to click this round
//     assumptions: [ { id: 'A1', question, assumes, today } ],             // the spec's "Ask the domain expert" rows
//     legend:      function(e) { ... },
//     log$:        this.log$,
//     diagram:     function() { return { src, edges, opts } }              // SpikeDiagram.source(...) + render opts
//   }, this.shell$);
//   // then call this.shell.redraw() whenever the diagram's inputs change.

foam.CLASS({
  package: 'fsmstudio',
  name: 'SpikeIcon',
  extends: 'foam.u2.Element',
  documentation: `A 24px line icon drawn in currentColor, so it takes its colour (and dark mode) from the text around it.
    name: one of ICONS (the tool's own small set).
    src:  an image file of your product ('/images/review.svg'), embedded inline (foam.u2.tag.Image embedSVG), so a spike can use the product's own icons.
    text: optional words after the icon. An icon never carries meaning alone: pass text, or label for screen readers.`,

  requires: [ 'foam.u2.HTMLView', 'foam.u2.tag.Image' ],

  css: `
    ^ { display: inline-flex; align-items: center; gap: 0.35em; vertical-align: -0.2em; }
    ^svg { display: inline-flex; width: 1.2em; height: 1.2em; flex: none; }
    ^svg svg { width: 100%; height: 100%; display: block; }
    ^svg .foam-u2-HTMLView, ^svg .foam-u2-tag-Image { padding: 0; display: contents; }
  `,

  constants: {
    ICONS: {
      "done": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><polyline points="5,12.5 10,17 19,7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "problem": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><polygon points="12,4.5 20,18.5 4,18.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="9.5" x2="12" y2="13.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="16" r="0.6" fill="currentColor"/></svg>',
      "waiting": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><polyline points="12,8 12,12 15,14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "todo": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="6.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "partial": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="6.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 5.25a6.75 6.75 0 0 0 0 13.5Z" fill="currentColor"/></svg>',
      "checklist": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><rect x="5.25" y="5.25" width="13.5" height="13.5" rx="2.25" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.75 12.25l2.25 2.25 4.25-4.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "statechart": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><rect x="3.75" y="8.75" width="6.5" height="6.5" rx="1.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><rect x="13.75" y="8.75" width="6.5" height="6.5" rx="1.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.25 12h3.5M12 10.25 13.75 12 12 13.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "ask": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M12 5.25a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.75 9.75a2.25 2.25 0 1 1 3.1 2.08c-.5.2-.85.66-.85 1.2v.22M12 15.75h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "legend": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M9.25 8h9M9.25 12h9M9.25 16h9M5.75 8h.01M5.75 12h.01M5.75 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "log": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M7.75 4.75h5.5l3 3v9.5a2 2 0 0 1-2 2h-6.5a2 2 0 0 1-2-2V6.75a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.25 4.75v3h3M9 12h6M9 15h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "back": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M14.25 6.75 9 12l5.25 5.25" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "next": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M9.75 6.75 15 12l-5.25 5.25" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "close": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M7.5 7.5l9 9M16.5 7.5l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "restart": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M5.9 14.25A6.75 6.75 0 1 0 6.5 8.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 4.75v3.75h3.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "edit": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M5.75 18.25l.75-3.5 8.9-8.9a1.77 1.77 0 0 1 2.5 2.5l-8.9 8.9-3.25 1Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "flag": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M6.75 19.25V5.25M6.75 5.75h9.5l-2 3.5 2 3.5h-9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "code": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M9 8.25 5.25 12 9 15.75M15 8.25 18.75 12 15 15.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    }
  },

  properties: [ 'name', 'src', 'text', 'label' ],

  methods: [
    function render() {
      var self = this;
      this.addClass();
      if ( ! this.text ) this.attrs({ role: 'img', 'aria-label': this.label || this.name || '' });
      this.start('span').addClass(this.myClass('svg')).attrs({ 'aria-hidden': 'true' })
        .call(function() {
          if ( self.src ) this.tag(self.Image, { data: self.src, embedSVG: true });
          else this.tag(self.HTMLView, { data: self.ICONS[self.name] || '' });
        })
      .end();
      if ( this.text ) this.start('span').add(this.text).end();
    }
  ]
});

foam.CLASS({
  package: 'fsmstudio',
  name: 'SpikeShell',
  extends: 'foam.u2.Element',

  requires: [
    'foam.u2.ActionView',
    'foam.u2.CheckBox',
    'foam.u2.Tab',
    'foam.u2.Tabs',
    'foam.u2.view.ChoiceView',
    'foam.u2.view.RadioView'
  ],

  css: `
    /* Colour tokens for the shell AND the design inside it. FOAM widgets follow the OS dark mode (the theme's
       useVariants is on, foam/lang/Window.js:164-189), so the page must too, or dark selects sit on a light page. */
    :root {
      color-scheme: light dark;
      --sp-bg: #fafafa; --sp-card: #ffffff; --sp-soft: #f3f3f3; --sp-text: #222222; --sp-muted: #555555;
      --sp-border: #d0d0d0; --sp-grey: #8a8a8a;
      --sp-strip: #26282c; --sp-strip-text: #f0f2f5; --sp-strip-muted: #b8bcc4; --sp-strip-edge: #26282c;
      --sp-blue: #0072B2; --sp-blue-soft: #eaf3fb; --sp-on-blue: #ffffff;
      --sp-green: #009E73; --sp-green-soft: #eefaf5;
      --sp-amber: #E69F00; --sp-amber-soft: #fff8ea;
      --sp-red: #D55E00; --sp-red-soft: #fdf0ea;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --sp-bg: #0f0f0f; --sp-card: #1a1b1e; --sp-soft: #232529; --sp-text: #f0f2f5; --sp-muted: #aeb2b9;
        --sp-border: #3b3e44; --sp-grey: #8f959e;
        --sp-strip: #2a303b; --sp-strip-text: #f0f2f5; --sp-strip-muted: #aeb6c4; --sp-strip-edge: #56B4E9;
        --sp-blue: #56B4E9; --sp-blue-soft: #16303f; --sp-on-blue: #0b1b26;
        --sp-green: #2FBF8F; --sp-green-soft: #12302a;
        --sp-amber: #E69F00; --sp-amber-soft: #33280f;
        --sp-red: #F0823E; --sp-red-soft: #3a2014;
      }
    }
    body { background: var(--sp-bg); color: var(--sp-text); font-family: system-ui, sans-serif; }
    /* A disabled u2 button must look disabled in both modes; the theme's disabled PRIMARY is near-identical to enabled in
       dark mode (measured 2026-09-25). Dashed outline + fade + no-entry cursor: never fade alone. */
    .foam-u2-ActionView[disabled] { opacity: 0.45; cursor: not-allowed; outline: 1.5px dashed var(--sp-grey); outline-offset: 2px; }

    /* centred: auto margins split the spare width evenly; 1280 still fits a 300px rail + four 240px pieces */
    ^ { max-width: 1280px; margin: 0 auto; }
    ^head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
    ^title { font-size: 20px; font-weight: 700; }
    ^round { font-size: 12px; border: 1px solid var(--sp-muted); border-radius: 10px; padding: 1px 8px; }
    ^question { font-size: 13px; color: var(--sp-muted); flex-basis: 100%; }

    /* Spike controls: dark strip, labelled, so nobody mistakes them for the design. */
    ^bar { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; background: var(--sp-strip); color: var(--sp-strip-text); border-radius: 8px; padding: 8px 12px; font-size: 13px; border-left: 4px solid var(--sp-strip-edge); }
    ^barTag { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sp-strip-muted); border-right: 1px solid var(--sp-muted); padding-right: 12px; }
    ^ctl { display: flex; align-items: center; gap: 6px; }
    ^ctl > b { font-weight: 600; }
    ^bar select { font-size: 13px; }
    ^bar label { color: var(--sp-strip-text); }
    ^help { font-size: 12px; color: var(--sp-muted); margin: 6px 0 0 16px; white-space: pre-wrap; overflow-wrap: anywhere; }

    ^design { margin: 16px 0 24px; padding: 16px; background: var(--sp-card); border: 1px solid var(--sp-border); border-radius: 10px; min-width: 0; }

    ^tabs { background: var(--sp-soft); border: 1px solid var(--sp-border); border-radius: 10px; padding: 4px 16px 16px; }
    /* the tool recedes so the design is the hero: small tab labels on no band, selected = glyph + underline + tint */
    ^tabs .foam-u2-Tabs-tabRow { background: transparent; padding: 0; border-bottom: 1px solid var(--sp-border); flex-wrap: wrap; }
    ^tabs .foam-u2-Tabs-tab { font-size: 13px; }
    ^tabs .foam-u2-Tabs-tab.selected { background: var(--sp-blue-soft); color: var(--sp-text); box-shadow: inset 0 -3px 0 var(--sp-blue); }
    @media (max-width: 600px) { ^barTag { flex-basis: 100%; border-right: 0; padding-right: 0; } }
    ^pane { padding-top: 10px; font-size: 13px; }
    ^diagram { overflow-x: auto; max-width: 100%; }
    ^diagram svg { max-width: 100%; height: auto; }
    ^check { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 6px; align-items: start; margin: 6px 0; cursor: pointer; }
    ^check.done span { text-decoration: line-through; color: var(--sp-grey); }
    ^ask { border-collapse: collapse; width: 100%; }
    ^ask th, ^ask td { text-align: left; vertical-align: top; border-bottom: 1px solid var(--sp-border); padding: 5px 8px; }
    ^ask th { font-weight: 600; background: var(--sp-soft); }
    ^log { font-family: monospace; font-size: 12px; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 240px; overflow-y: auto; }
    ^hint { font-size: 12px; color: var(--sp-muted); margin-bottom: 6px; }
  `,

  properties: [
    { class: 'String', name: 'title' },
    { class: 'String', name: 'question' },
    { class: 'String', name: 'round' },
    { name: 'controls', factory: function() { return []; } },
    { class: 'Function', name: 'design' },
    { name: 'checklist', factory: function() { return []; } },
    { name: 'assumptions', factory: function() { return []; } },
    { class: 'Function', name: 'legend' },
    { name: 'log' },
    { class: 'Function', name: 'diagram', documentation: 'Returns { src, edges, opts } for SpikeDiagram.render, or null.' },
    { name: 'ticks', factory: function() { return this.loadTicks_(); } },
    { name: 'diagramEl_' }
  ],

  methods: [
    function storeKey_() { return 'spike-checklist:' + location.pathname + ':' + this.round; },
    function loadTicks_() {
      try { return JSON.parse(localStorage.getItem(this.storeKey_()) || '{}'); } catch (x) { return {}; }
    },
    function saveTicks_() {
      try { localStorage.setItem(this.storeKey_(), JSON.stringify(this.ticks)); } catch (x) { /* private window: ticks just don't persist */ }
    },

    function render() {
      var self = this;
      this.addClass()
        .start().addClass(this.myClass('head'))
          .start('span').addClass(this.myClass('title')).add(this.title).end()
          .callIf(this.round, function() { this.start('span').addClass(self.myClass('round')).add(self.round).end(); })
          .start('span').addClass(this.myClass('question')).add(this.question).end()
        .end()
        .start().addClass(this.myClass('bar'))
          .start('span').addClass(this.myClass('barTag')).add('Spike controls').end()
          .forEach(this.controls, function(c) { self.control_(this, c); })
        .end()
        .forEach(this.controls.filter(function(c) { return c.help$; }), function(c) {
          this.start().addClass(self.myClass('help')).add(c.help$).end();
        })
        .start().addClass(this.myClass('design')).call(function() { self.design && self.design(this); }).end()
        .start().addClass(this.myClass('tabs'))
          .start(this.Tabs)
            .callIf(this.checklist.length, function() {
              this.start(self.Tab, { label: { class: 'fsmstudio.SpikeIcon', name: 'checklist', text: 'Try this round · ' + self.checklist.length + ' steps' }, mementoLabel: 'try' })
                .start().addClass(self.myClass('pane'))
                  .start().addClass(self.myClass('hint')).add('Tick as you go (kept in this browser only). Reply in chat with one line or a screenshot.').end()
                  .add(self.dynamic(function(ticks) {
                    var e = this;
                    self.checklist.forEach(function(text, i) {
                      var on = !! ticks[i];
                      e.start().addClass(self.myClass('check')).enableClass('done', on)
                        .on('click', function() { var t = Object.assign({}, self.ticks); t[i] = ! on; self.ticks = t; self.saveTicks_(); })
                        .start('span').style({ color: on ? 'var(--sp-green)' : 'var(--sp-grey)' }).tag(fsmstudio.SpikeIcon, { name: on ? 'done' : 'todo', label: on ? 'done' : 'not done' }).end()
                        .start('span').add(( i + 1 ) + '. ' + text).end()
                      .end();
                    });
                  }))
                .end()
              .end();
            })
            .callIf(this.diagram, function() {
              this.start(self.Tab, { label: { class: 'fsmstudio.SpikeIcon', name: 'statechart', text: 'Statechart' }, mementoLabel: 'statechart' })
                .start().addClass(self.myClass('pane'))
                  .start().addClass(self.myClass('hint')).add('Blue thick box = where the design is now. Hover a state: it and its neighbours light up amber. Click a lit state to make that move.').end()
                  .start().addClass(self.myClass('diagram')).start('div', null, self.diagramEl_$).end().end()
                .end()
              .end();
            })
            .callIf(this.assumptions.length, function() {
              this.start(self.Tab, { label: { class: 'fsmstudio.SpikeIcon', name: 'ask', text: 'Ask the expert · ' + self.assumptions.length + ' open' }, mementoLabel: 'ask' })
                .start().addClass(self.myClass('pane'))
                  .start().addClass(self.myClass('hint')).add('The design rests on these. Each needs a domain expert’s answer before the design is settled.').end()
                  // Plain u2 table: both u2 TableViews fail in a spike page (gotchas.md), and this is four rows.
                  .start('table').addClass(self.myClass('ask'))
                    .start('tr').forEach([ 'Id', 'Question for the domain expert', 'This page assumes', 'What today\u2019s code does' ], function(h) { this.start('th').add(h).end(); }).end()
                    .forEach(self.assumptions, function(a) {
                      this.start('tr').forEach([ a.id, a.question, a.assumes, a.today ], function(c) { this.start('td').add(c).end(); }).end();
                    })
                  .end()
                .end()
              .end();
            })
            .callIf(this.legend, function() {
              this.start(self.Tab, { label: { class: 'fsmstudio.SpikeIcon', name: 'legend', text: 'Legend' }, mementoLabel: 'legend' }).start().addClass(self.myClass('pane')).call(function() { self.legend(this); }).end().end();
            })
            .callIf(this.log, function() {
              this.start(self.Tab, { label: { class: 'fsmstudio.SpikeIcon', name: 'log', text: 'Log' }, mementoLabel: 'log' }).start().addClass(self.myClass('pane'))
                .start().addClass(self.myClass('log')).add(self.log).end().end().end();
            })
          .end()
        .end();
      this.redraw();
    },

    function control_(e, c) {
      var self = this;
      e.start().addClass(this.myClass('ctl')).call(function() {
        if ( c.kind !== 'action' && c.kind !== 'check' ) this.start('b').add(c.label).end();
        if ( c.kind === 'choice' ) this.tag(self.ChoiceView, { choices: c.choices, data$: c.data$ });
        if ( c.kind === 'radio' )  this.tag(self.RadioView, { choices: c.choices, data$: c.data$, isHorizontal: true });
        if ( c.kind === 'check' )  this.start('label').tag(self.CheckBox, { data$: c.data$ }).add(' ' + c.label).end();
        if ( c.kind === 'action' ) this.tag(self.ActionView, { action: c.action, data: c.data, buttonStyle: 'SECONDARY', size: 'SMALL' });
      }).end();
    }
  ],

  listeners: [
    {
      name: 'redraw',
      isFramed: true,
      code: async function() {
        if ( ! this.diagram || ! this.diagramEl_ || typeof SpikeDiagram === 'undefined' ) return;
        var d = this.diagram();
        if ( ! d ) return;
        await SpikeDiagram.render(await this.diagramEl_.el(), d.src, d.edges, d.opts || {});
      }
    }
  ]
});
