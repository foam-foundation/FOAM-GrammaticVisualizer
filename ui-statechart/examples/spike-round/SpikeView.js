/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// SPIKE (throwaway): the ui-statechart tool modelled with itself. One design spike's life: frame, statechart, page,
// rounds with the user, settled. It models design work, not a product domain, which shows SpikeShell is generic.
// Spec: spec.md next to this file. Data is faked; presets carry it.

// Machine sanity check. foam.FSM's own validateMachine() throws on main
// (StateMachineEnum.js:421 reads the commented-out onTransition property), so spikes carry this one.
function checkMachine(E) {
  var names = E.VALUES.map(v => v.name), errs = [];
  var initial = E.VALUES.filter(v => v.isInitial);
  if ( ! initial.length ) errs.push('no initial state');
  E.VALUES.forEach(v => {
    v.transitions.forEach(t => { if ( ! names.includes(t) ) errs.push(v.name + ' -> unknown state ' + t); });
    Object.keys(v.guards || {}).forEach(g => { if ( ! v.transitions.includes(g) ) errs.push(v.name + ': guard for ' + g + ' which is not a transition'); });
  });
  var seen = new Set(initial.map(v => v.name)), queue = [...seen];
  while ( queue.length ) { var n = queue.shift(); E[n].transitions.forEach(t => { if ( ! seen.has(t) ) { seen.add(t); queue.push(t); } }); }
  names.forEach(n => { if ( ! seen.has(n) ) errs.push(n + ' unreachable from initial'); });
  return errs;
}

// Guards return the REFUSAL reason ('' = allowed), StateMachineEnum.js:197-201; the reason is the disabled move's text.
foam.FSM({
  package: 'fsmstudio',
  name: 'SpikeRoundState',
  values: [
    { name: 'FRAMING',       label: 'Writing the brief',        isInitial: true, transitions: [ 'CHARTING', 'ABANDONED' ],
      guards: { CHARTING: function(x, obj) { return obj.frameBlock_(); } } },
    { name: 'CHARTING',      label: 'Mapping the moves',       transitions: [ 'BUILDING', 'FRAMING', 'ABANDONED' ],
      guards: { BUILDING: function(x, obj) { return obj.chartBlock_(); } } },
    { name: 'BUILDING',      label: 'Building page',  transitions: [ 'AWAITING_LOOK', 'CHARTING', 'ABANDONED' ],
      guards: { AWAITING_LOOK: function(x, obj) { return obj.pageBlock_(); } } },
    { name: 'AWAITING_LOOK', label: 'Awaiting the user’s look', transitions: [ 'REVISING', 'SETTLED', 'ABANDONED' ],
      guards: { SETTLED: function(x, obj) { return obj.settleBlock_(); } } },
    { name: 'REVISING',      label: 'Revising',       transitions: [ 'AWAITING_LOOK', 'CHARTING', 'ABANDONED' ],
      guards: { AWAITING_LOOK: function(x, obj) { return obj.addendum ? '' : 'Write this round’s addendum first: what was asked, what was tried, what stuck, why.'; } } },
    { name: 'SETTLED',       label: 'Settled',        transitions: [] },
    { name: 'ABANDONED',     label: 'Abandoned',      transitions: [] }
  ]
});

foam.CLASS({
  package: 'fsmstudio',
  name: 'SpikeRoundCell',
  documentation: 'One (state, event) cell of the table being designed.',
  properties: [ 'state', 'event', { class: 'String', name: 'value' } ]
});

foam.CLASS({
  package: 'fsmstudio',
  name: 'SpikeRoundAssumption',
  properties: [ 'id', 'question', { class: 'Boolean', name: 'answered' } ]
});

foam.CLASS({
  package: 'fsmstudio',
  name: 'SpikeRoundView',
  extends: 'foam.u2.View',

  requires: [
    'fsmstudio.SpikeRoundAssumption',
    'fsmstudio.SpikeRoundCell',
    'fsmstudio.SpikeRoundState',
    'foam.u2.ActionView',
    'foam.u2.CheckBox',
    'foam.u2.TextField',
    'foam.u2.view.ChoiceView'
  ],

  css: `
    ^stepper { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
    ^step { padding: 6px 12px; border-radius: 16px; border: 1px solid var(--sp-border); font-size: 13px; }
    ^step.now { border: 3px solid var(--sp-blue); font-weight: 700; }
    ^step.past { border-color: var(--sp-green); }
    ^arrow { color: var(--sp-grey); }
    ^main { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr) 300px; align-items: start; }
    ^pieces { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); align-items: start; grid-auto-flow: row dense; }
    /* an editable piece is about three short ones tall; spanning 3 rows lets the short ones stack beside it (no hole) */
    ^piece:has(input, select, table) { grid-row: span 3; }
    @media (max-width: 900px) { ^main { grid-template-columns: minmax(0, 1fr); } }
    ^piece { background: var(--sp-card); border: 1px solid var(--sp-border); border-top-width: 5px; border-radius: 8px; padding: 10px 12px; min-width: 0; }
    ^piece.quiet { background: var(--sp-soft); }
    ^phead { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
    ^ptitle { font-weight: 700; font-size: 15px; }
    ^glyph { font-size: 16px; font-weight: 700; }
    ^why { font-size: 12px; color: var(--sp-muted); margin: 4px 0 8px; white-space: pre-wrap; overflow-wrap: anywhere; }
    ^field { margin: 6px 0; font-size: 13px; }
    ^field > div { margin-bottom: 2px; }
    ^grid { border-collapse: collapse; font-size: 12px; width: 100%; }
    ^grid th, ^grid td { border: 1px solid var(--sp-border); padding: 3px 4px; text-align: left; }
    ^grid select { width: 100%; }
    ^round { font-size: 12px; border-left: 3px solid var(--sp-border); padding: 2px 8px; margin: 4px 0; }
    ^banner { padding: 12px; border-radius: 8px; border: 2px dashed var(--sp-amber); background: var(--sp-amber-soft); margin-bottom: 12px; }
    ^banner.done { border: 2px solid var(--sp-green); background: var(--sp-green-soft); }
    ^banner .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 8px; font-size: 12px; }
    ^rail { background: var(--sp-card); border: 2px solid var(--sp-text); border-radius: 8px; padding: 10px 12px; position: sticky; top: 8px; min-width: 0; }
    ^rline { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 4px; font-size: 13px; margin: 5px 0; }
    ^rline .d { font-size: 12px; color: var(--sp-muted); white-space: pre-wrap; overflow-wrap: anywhere; }
    ^refusal { font-size: 12px; margin-top: 4px; white-space: pre-wrap; overflow-wrap: anywhere; border-left: 3px solid var(--sp-amber); padding-left: 8px; }
    ^rail h4 { margin: 0; font-size: 15px; }
    ^minor { display: flex; justify-content: space-between; gap: 8px; margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--sp-border); }
    ^minor button { font-size: 12px; color: var(--sp-muted); text-decoration: underline; background: none; border: none; padding: 0; cursor: pointer; }
    ^moves { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
  `,

  constants: {
    STATUS: {
      waiting: { g: '⏸', w: 'waiting', c: 'var(--sp-grey)' },
      todo:    { g: '○', w: 'to do',   c: 'var(--sp-blue)' },
      partial: { g: '◐', w: 'partial', c: 'var(--sp-amber)' },
      done:    { g: '✓', w: 'done',    c: 'var(--sp-green)' },
      problem: { g: '⚠', w: 'problem', c: 'var(--sp-red)' }
    },
    EVENTS: {
      FRAMING:       { CHARTING: 'continue [brief written]', ABANDONED: 'drop' },
      CHARTING:      { BUILDING: 'continue [every move decided]', FRAMING: 'back', ABANDONED: 'drop' },
      BUILDING:      { AWAITING_LOOK: 'hand over [page checks]', CHARTING: 'back', ABANDONED: 'drop' },
      AWAITING_LOOK: { REVISING: 'user asks for a change', SETTLED: 'user says settled [no open assumption]', ABANDONED: 'drop' },
      REVISING:      { AWAITING_LOOK: 'hand back [addendum written]', CHARTING: 'change needs a new situation or action', ABANDONED: 'drop' }
    },
    GROUPS: { LOOP: { label: 'Rounds with the user', members: [ 'AWAITING_LOOK', 'REVISING' ] } },
    FRAME_LINES: [ [ 'does', 'What it does' ], [ 'who', 'Who uses it' ], [ 'done', 'What "done" looks like' ] ],
    PRESETS: {
      'Fresh spike': {
        why: 'Nothing written yet: every piece but the brief waits.', state: 'FRAMING',
        frame: {}, states: [ 'Idle', 'Editing', 'Saved' ], events: [ 'edit', 'save', 'cancel' ], cells: {},
        page: {}, rounds: [], assumptions: []
      },
      'Refund panel': {
        why: 'A finished spike: three rounds done, no open assumption, so "settled" is allowed.', state: 'AWAITING_LOOK',
        frame: { does: 'Finds refund candidates and confirms the refund inline.', who: 'Support staff; managers override.', done: 'Always clear which of nine situations the panel is in.' },
        states: [ 'Searching', 'Browsing', 'Submitting' ], events: [ 'results', 'select', 'confirm' ],
        cells: { 'Searching|results': '→Browsing', 'Searching|select': '✗', 'Searching|confirm': '✗', 'Browsing|results': '—', 'Browsing|select': '→Browsing', 'Browsing|confirm': '→Submitting', 'Submitting|results': '—', 'Submitting|select': '✗', 'Submitting|confirm': '✗' },
        page: { loads: true, machine: true, checklist: true },
        rounds: [ 'Round 0: page built with four presets.', 'Round 1: diagram moved to mermaid; nine states were an unreadable ladder.', 'Round 2: diagram made clickable; hover lights neighbours.' ],
        assumptions: []
      },
      'Checkout redesign': {
        why: 'A wizard redesign: rounds done, but four assumptions are open, so "settled" is refused until an expert answers.', state: 'AWAITING_LOOK',
        frame: { does: 'One checkout page, with what is left always visible.', who: 'Online shoppers.', done: 'Every rail piece done; three steps instead of eight pages.' },
        states: [ 'Basket', 'Delivery', 'Review' ], events: [ 'continue', 'back', 'submit' ],
        cells: { 'Basket|continue': '→Delivery', 'Basket|back': '—', 'Basket|submit': '✗', 'Delivery|continue': '→Review', 'Delivery|back': '→Basket', 'Delivery|submit': '✗', 'Review|continue': '✗', 'Review|back': '→Delivery', 'Review|submit': '→Review' },
        page: { loads: true, machine: true, checklist: true },
        rounds: [ 'Round 0: frame, pain, unlock rule, statechart agreed.', 'Round 1: spike built; guard semantics bug found.', 'Round 2: tool moved into SpikeShell; dark mode fixed.' ],
        assumptions: [ [ 'A1', 'Back during the payment check?' ], [ 'A2', 'Fresh payment check after changes?' ], [ 'A3', 'Delivery price preview before the address?' ], [ 'A4', 'Out-of-stock item drops out or blocks?' ] ]
      }
    },
    CHECKLIST: [
      'Hard-reload (Cmd+Shift+R).',
      'Is anything in the strip, the tabs or the rail about one product domain? It should not be: this page is about design work.',
      '"Fresh spike": write the brief, decide the moves, tick the page checks. Each Continue should say why it is refused until its piece is done.',
      '"Checkout redesign": try "User says settled". It should be refused because four assumptions are open; tick them answered in the Assumptions piece and try again.',
      'Compare the presets: the same shape (steps, a wait on someone else, a rail) whatever the domain. Anything that feels tied to one domain?'
    ],
    PAGE_CHECKS: [ [ 'loads', 'Page loads without console errors' ], [ 'machine', 'checkMachine() returns []' ], [ 'checklist', 'Round checklist written ("Try this round" tab)' ] ]
  },

  properties: [
    { class: 'foam.lang.StateMachine', of: 'fsmstudio.SpikeRoundState', name: 'state', enableHistory: false, enablePayload: false },
    { class: 'String', name: 'preset', value: 'Fresh spike', postSet: function(o, n) { if ( o !== n ) this.load_(); } },
    { class: 'Int', name: 'rev' },
    { class: 'String', name: 'log' },
    { class: 'String', name: 'banner' },
    { name: 'frame', factory: function() { return {}; } },
    { name: 'cells', factory: function() { return []; } },
    { name: 'page', factory: function() { return {}; } },
    { name: 'rounds', factory: function() { return []; } },
    { name: 'assumptions', factory: function() { return []; } },
    { class: 'String', name: 'addendum' },
    { name: 'subs_', factory: function() { return []; } },
    { name: 'shell' }
  ],

  methods: [
    function init() {
      this.SUPER();
      window.__spike = { view: this, hit: function() { return null; } };
      console.log('checkMachine:', JSON.stringify(checkMachine(this.SpikeRoundState)));
      this.load_();
      this.onDetach(this.state$.sub(this.redraw));
      this.onDetach(this.rev$.sub(this.redraw));
      this.onDetach(this.addendum$.sub(this.bump_));
    },

    // Load a preset: each editable value is a slot on a small object, so u2 views bind with data$.
    function load_() {
      var self = this, p = this.PRESETS[this.preset];
      this.subs_.forEach(function(s) { s.detach(); }); this.subs_ = [];
      var watch = function(o) { self.subs_.push(o.propertyChange.sub(self.bump_)); return o; };
      this.frame = watch(this.bagClass_([ 'does', 'who', 'done' ]).create(p.frame));
      this.page  = watch(this.bagClass_([ 'loads', 'machine', 'checklist' ]).create(p.page));
      this.cells = [];
      p.states.forEach(function(st) { p.events.forEach(function(ev) {
        self.cells.push(watch(self.SpikeRoundCell.create({ state: st, event: ev, value: p.cells[st + '|' + ev] || '' })));
      }); });
      this.assumptions = p.assumptions.map(function(a) { return watch(self.SpikeRoundAssumption.create({ id: a[0], question: a[1] })); });
      this.rounds = p.rounds.slice();
      this.addendum = ''; this.banner = ''; this.log = '';
      this.state = this.SpikeRoundState[p.state];
      this.rev++;
    },

    // A tiny model with one property per key, so TextField / CheckBox can bind to its slots with data$.
    function bagClass_(keys) {
      var id = 'fsmstudio.SpikeRoundBag_' + keys.join('_');
      if ( ! foam.maybeLookup(id) ) foam.CLASS({ package: 'fsmstudio', name: 'SpikeRoundBag_' + keys.join('_'), properties: keys });
      return foam.lookup(id);
    },

    // ---- guards and piece status (the reason strings are what the page shows) ----------------------------------

    function frameMissing_() { var f = this.frame; return this.FRAME_LINES.filter(function(k) { return ! ( f[k[0]] || '' ).trim(); }); },
    function frameBlock_() { var m = this.frameMissing_(); return m.length ? 'Write the brief: ' + m.map(function(k) { return k[1].toLowerCase(); }).join(', ') + '.' : ''; },
    function undecided_() { return this.cells.filter(function(c) { return ! c.value; }).length; },
    function chartBlock_() { var n = this.undecided_(); return n ? 'Decide ' + n + ' more move' + ( n > 1 ? 's' : '' ) + ': for each situation and action, say where it goes, — (nothing happens) or ✗ (impossible).' : ''; },
    function pageBlock_() {
      var p = this.page, miss = this.PAGE_CHECKS.filter(function(c) { return ! p[c[0]]; });
      return miss.length ? 'Before handing over: ' + miss.map(function(c) { return c[1]; }).join('; ') + '.' : '';
    },
    function openAssumptions_() { return this.assumptions.filter(function(a) { return ! a.answered; }); },
    function settleBlock_() {
      var o = this.openAssumptions_();
      return o.length ? o.length + ' assumption' + ( o.length > 1 ? 's' : '' ) + ' still open (' + o.map(function(a) { return a.id; }).join(', ') + '): ask the domain expert first.' : '';
    },
    function block_(target) {
      if ( this.state.transitions.indexOf(target) < 0 ) return 'not a move from ' + this.state.label;
      var g = this.state.guards && this.state.guards[target];
      return g ? g.call(this.state, null, this) : '';
    },

    function pieces_() {
      var st = this.state.name, out = [];
      var fm = this.frameMissing_().length;
      out.push({ key: 'frame', title: 'Brief', s: fm === 3 ? 'todo' : fm ? 'partial' : 'done', d: fm ? ( 3 - fm ) + ' of 3 lines: what it does, who uses it, what done looks like' : 'what, who and done written', active: st === 'FRAMING' });
      var n = this.cells.length, u = this.undecided_();
      out.push({ key: 'chart', title: 'Moves table', s: fm ? 'waiting' : u === n ? 'todo' : u ? 'partial' : 'done',
        d: fm ? 'write the brief first' : ( n - u ) + ' of ' + n + ' moves decided: rows are situations the screen can be in, columns are actions', active: st === 'CHARTING' });
      var pc = this.PAGE_CHECKS.filter(function(c) { return this.page[c[0]]; }.bind(this)).length;
      out.push({ key: 'page', title: 'Spike page', s: u || fm ? 'waiting' : pc === 3 ? 'done' : pc ? 'partial' : 'todo',
        d: u || fm ? 'decide every move first' : pc + ' of 3 checks', active: st === 'BUILDING' || st === 'REVISING' });
      var r = this.rounds.length;
      out.push({ key: 'rounds', title: 'Rounds', s: st === 'AWAITING_LOOK' ? 'waiting' : st === 'REVISING' ? ( this.addendum ? 'done' : 'todo' ) : r ? 'done' : 'waiting',
        d: st === 'AWAITING_LOOK' ? 'the user is looking (' + r + ' round' + ( r === 1 ? '' : 's' ) + ' so far)' : st === 'REVISING' ? ( this.addendum ? 'addendum written' : 'write this round’s addendum' ) : r ? r + ' rounds' : 'opens at the first hand-over', active: st === 'REVISING' });
      var a = this.assumptions.length, open = this.openAssumptions_().length;
      out.push({ key: 'ask', title: 'Assumptions', s: ! a ? 'done' : open === a ? 'todo' : open ? 'partial' : 'done',
        d: ! a ? 'none recorded' : ( a - open ) + ' of ' + a + ' answered', active: [ 'SETTLED', 'ABANDONED' ].indexOf(st) < 0 });
      return out;
    },

    // ---- moves ---------------------------------------------------------------------------------------------------

    async function go(target) {
      var from = this.state.name;
      try { await this.transitionStateTo(target); }
      catch (err) { this.log = '✗ ' + from + ' → ' + target + ' refused: ' + err.message + '\n' + this.log; return false; }
      this.log = from + ' → ' + target + '\n' + this.log;
      this.rev++;
      return true;
    },

    async function next_() {
      var st = this.state.name;
      this.banner = '';
      if ( st === 'REVISING' ) {
        if ( await this.go('AWAITING_LOOK') ) { this.rounds = this.rounds.concat([ 'Round ' + this.rounds.length + ': ' + this.addendum ]); this.addendum = ''; this.rev++; }
        return;
      }
      await this.go({ FRAMING: 'CHARTING', CHARTING: 'BUILDING', BUILDING: 'AWAITING_LOOK' }[st]);
    },

    function back() { return this.go({ CHARTING: 'FRAMING', BUILDING: 'CHARTING', REVISING: 'CHARTING' }[this.state.name]); },

    async function userSays_(settled) {
      if ( settled ) {
        var why = this.settleBlock_();
        if ( why ) { this.banner = 'Refused: ' + why; this.rev++; return; }
        await this.go('SETTLED');
      } else {
        await this.go('REVISING');
      }
    },

    // ---- render: design inside the shared SpikeShell (no shell change for a second domain = the genericity test) --

    function render() {
      var self = this;
      this.addClass()
        .start(fsmstudio.SpikeShell, {
          title: 'Spike round: the design tool, modelled with itself',
          question: 'Where is one design spike in its life, and what blocks the next move?',
          round: 'Round 0',
          controls: [
            { kind: 'choice', label: 'Sample spike', choices: Object.keys(this.PRESETS), data$: this.preset$,
              help$: this.preset$.map(function(k) { return 'This sample: ' + self.PRESETS[k].why; }) },
            { kind: 'action', action: this.START_OVER, data: this }
          ],
          design: function(e) { e.add(self.dynamic(function(state, rev, banner) { self.design_(this); })); },
          checklist: this.CHECKLIST,
          assumptions: [
            { id: 'B1', question: 'Can a spike be settled while an assumption is open?', assumes: 'no: settling is refused', today: 'SKILL.md: "not settled while an assumption row is unanswered"' },
            { id: 'B2', question: 'Is a round’s addendum required before handing back?', assumes: 'yes', today: 'SKILL.md loop step 4 appends one addendum per round' }
          ],
          legend: function(e) {
            Object.keys(self.STATUS).forEach(function(k) { var S = self.STATUS[k]; e.start('div').start('b').style({ color: S.c }).tag(fsmstudio.SpikeIcon, { name: k, text: S.w }).end().end(); });
            e.start('div').add('Same glyphs, words and colours on every spike page: they are the tool’s vocabulary, not a domain’s.').end();
          },
          log: this.log$,
          diagram: function() { return self.diagram_(); }
        }, this.shell$).end();
    },

    function design_(e) {
      var self = this, st = this.state.name, pieces = this.pieces_();
      var order = { FRAMING: 0, CHARTING: 0, BUILDING: 1, AWAITING_LOOK: 2, REVISING: 2, SETTLED: 3, ABANDONED: -1 };
      e.start().addClass(this.myClass('stepper')).call(function() {
        var r = this;
        [ [ 'Brief & moves', 'edit' ], [ 'Build page', 'code' ], [ 'Rounds with the user', 'restart' ], [ 'Settled', 'flag' ] ].forEach(function(step, i) {
          var t = step[0];
          var now = order[st] === i, past = order[st] > i;
          r.start('span').addClass(self.myClass('step')).enableClass('now', now).enableClass('past', past).tag(fsmstudio.SpikeIcon, { name: past ? 'done' : step[1], text: t }).end();
          if ( i < 3 ) r.start('span').addClass(self.myClass('arrow')).add('→').end();
        });
      }).end();

      if ( this.banner ) e.start().addClass(this.myClass('banner')).add('ℹ ' + this.banner).end();
      if ( st === 'AWAITING_LOOK' ) {
        e.start().addClass(this.myClass('banner'))
          .start('b').add('⏸ Handed to the user. ').end().add('Nothing to do until they answer: one line or a screenshot.')
          .start().addClass('row').add('Simulate the user’s answer:')
            .tag(this.ActionView, { action: this.USER_ASKS_CHANGE, data: this, buttonStyle: 'SECONDARY', size: 'SMALL' })
            .tag(this.ActionView, { action: this.USER_SAYS_SETTLED, data: this, buttonStyle: 'SECONDARY', size: 'SMALL' })
          .end()
        .end();
      }
      if ( st === 'SETTLED' ) e.start().addClass(this.myClass('banner')).addClass('done').add('✓ Settled. Next: "plan it", an implementation plan for the real view.').end();
      if ( st === 'ABANDONED' ) e.start().addClass(this.myClass('banner')).add('■ Spike dropped. The spec keeps what was learned.').end();

      e.start().addClass(this.myClass('main'))
        .start().addClass(this.myClass('pieces')).call(function() { var g = this; pieces.forEach(function(p) { self.piece_(g, p); }); }).end()
        .call(function() { self.rail_(this, pieces); })
      .end();
    },

    function piece_(e, p) {
      var self = this, S = this.STATUS[p.s], editable = p.active && p.s !== 'waiting';
      e.start().addClass(this.myClass('piece')).enableClass('quiet', ! editable).style({ 'border-top-color': S.c })
        .start().addClass(this.myClass('phead'))
          .start('span').addClass(this.myClass('ptitle')).add(p.title).end()
          .start('span').addClass(this.myClass('glyph')).style({ color: S.c }).tag(fsmstudio.SpikeIcon, { name: p.s, label: S.w }).end()
        .end()
        .start().addClass(this.myClass('why')).add(p.d).end()
        .call(function() { if ( p.s !== 'waiting' || p.key === 'ask' || p.key === 'rounds' ) self[p.key + 'Body_'](this, editable); })
      .end();
    },

    function frameBody_(e, editable) {
      var self = this;
      this.FRAME_LINES.forEach(function(k) {
        e.start().addClass(self.myClass('field')).start('div').add(k[1]).end()
          .call(function() {
            if ( editable ) this.start(self.TextField, { data$: self.frame.slot(k[0]) }).attrs({ 'data-key': 'frame-' + k[0] }).end();
            else this.start('b').add(self.frame[k[0]] || '—').end();
          }).end();
      });
    },

    function chartBody_(e, editable) {
      var self = this, p = this.PRESETS[this.preset];
      var choices = [ [ '', '… undecided' ] ].concat(p.states.map(function(s) { return [ '→' + s, '→ ' + s ]; }), [ [ '—', '— ignored' ], [ '✗', '✗ impossible' ] ]);
      e.start('table').addClass(this.myClass('grid'))
        .start('tr').start('th').add('situation \\ action').end().forEach(p.events, function(ev) { this.start('th').add(ev).end(); }).end()
        .forEach(p.states, function(st) {
          this.start('tr').start('th').add(st).end().call(function() {
            var r = this;
            self.cells.filter(function(c) { return c.state === st; }).forEach(function(c) {
              r.start('td').call(function() {
                if ( editable ) this.start(self.ChoiceView, { choices: choices, data$: c.value$ }).attrs({ 'data-key': 'cell-' + c.state + '-' + c.event }).end();
                else this.add(c.value || '…');
              }).end();
            });
          }).end();
        })
      .end();
    },

    function pageBody_(e, editable) {
      var self = this;
      this.PAGE_CHECKS.forEach(function(c) {
        e.start().addClass(self.myClass('field')).call(function() {
          if ( editable ) this.start('label').tag(self.CheckBox, { data$: self.page.slot(c[0]) }).add(' ' + c[1]).end();
          else this.add(( self.page[c[0]] ? '✓ ' : '○ ' ) + c[1]);
        }).end();
      });
    },

    function roundsBody_(e, editable) {
      var self = this;
      this.rounds.forEach(function(r) { e.start().addClass(self.myClass('round')).add(r).end(); });
      if ( editable ) e.start().addClass(this.myClass('field')).start('div').add('This round’s addendum').end()
        .start(this.TextField, { data$: this.addendum$, placeholder: 'asked… tried… stuck… why…' }).attrs({ 'data-key': 'addendum' }).end().end();
    },

    function askBody_(e, editable) {
      var self = this;
      if ( ! this.assumptions.length ) return;
      this.assumptions.forEach(function(a) {
        e.start().addClass(self.myClass('field')).call(function() {
          if ( editable ) this.start('label').tag(self.CheckBox, { data$: a.answered$ }).add(' ' + a.id + ' ' + a.question + ' (answered)').end();
          else this.add(( a.answered ? '✓ ' : '○ ' ) + a.id + ' ' + a.question);
        }).end();
      });
    },

    function rail_(e, pieces) {
      var self = this, st = this.state.name;
      var done = pieces.filter(function(p) { return p.s === 'done'; }).length;
      var move = { FRAMING: [ 'CHARTING', this.CONTINUE_TO_CHART ], CHARTING: [ 'BUILDING', this.CONTINUE_TO_BUILD ],
                   BUILDING: [ 'AWAITING_LOOK', this.HAND_OVER ], REVISING: [ 'AWAITING_LOOK', this.HAND_BACK ] }[st];
      e.start().addClass(this.myClass('rail'))
        .start('h4').add('Live review').end()
        .start().addClass(this.myClass('why')).add(done + ' of ' + pieces.length + ' pieces done').end()
        .forEach(pieces, function(p) {
          var S = self.STATUS[p.s];
          this.start().addClass(self.myClass('rline'))
            .start('span').style({ color: S.c, 'font-weight': 700 }).tag(fsmstudio.SpikeIcon, { name: p.s, label: S.w }).end()
            .start('div').start('b').add(p.title).end().add(' · ' + S.w).start().addClass('d').add(p.d).end().end()
          .end();
        })
        .start().addClass(this.myClass('moves')).call(function() {
          if ( move ) {
            this.tag(self.ActionView, { action: move[1], data: self, buttonStyle: 'PRIMARY' });
            var why = self.block_(move[0]);
            if ( why ) this.start().addClass(self.myClass('refusal')).start('b').tag(fsmstudio.SpikeIcon, { name: 'waiting', text: 'Why not yet' }).end().start('div').add(why).end().end();
          }
          if ( st === 'AWAITING_LOOK' ) {
            var why2 = self.settleBlock_();
            this.start().addClass(self.myClass('refusal')).add(why2 ? '"Settled" would be refused:\n' + why2 : '"Settled" is allowed when the user says so.').end();
          }
          // Secondary and destructive moves sit quieter than the primary one, on their own ruled line.
          if ( [ 'SETTLED', 'ABANDONED' ].indexOf(st) < 0 ) this.start().addClass(self.myClass('minor')).call(function() {
            if ( [ 'BUILDING', 'REVISING', 'CHARTING' ].indexOf(st) >= 0 ) this.start('button').tag(fsmstudio.SpikeIcon, { name: 'back', text: 'Back' }).on('click', function() { self.back(); }).end();
            else this.start('span').end();
            this.start('button').tag(fsmstudio.SpikeIcon, { name: 'close', text: 'Drop this spike' }).on('click', function() { self.go('ABANDONED'); }).end();
          }).end();
        }).end()
      .end();
    },

    function diagram_() {
      var self = this, E = this.EVENTS, S = this.SpikeRoundState, cur = this.state.name;
      var states = S.VALUES.map(function(v) { return { name: v.name, label: v.label, initial: v.isInitial, terminal: ! v.transitions.length }; });
      var edges = [];
      S.VALUES.forEach(function(v) { v.transitions.forEach(function(t) { edges.push({ from: v.name, to: t, label: ( E[v.name] || {} )[t] || '' }); }); });
      var d = SpikeDiagram.source(states, edges, this.GROUPS, [ 'classDef current fill:#eaf3fb,stroke:#0072B2,stroke-width:4px,font-weight:bold,color:#10222e', 'class ' + cur + ' current' ]);
      var allowed = function(name) {
        if ( cur === 'AWAITING_LOOK' && name !== 'ABANDONED' ) return name === 'REVISING' || ! self.settleBlock_();
        return self.state.transitions.indexOf(name) >= 0 && ! self.block_(name);
      };
      return { src: d.src, edges: d.edges, opts: { groups: this.GROUPS, allowed: allowed, onClick: function(name) {
        if ( ! allowed(name) ) return;
        if ( name === 'ABANDONED' ) return self.go('ABANDONED');
        if ( cur === 'AWAITING_LOOK' ) return self.userSays_(name === 'SETTLED');
        if ( ( cur === 'CHARTING' && name === 'FRAMING' ) || ( cur === 'BUILDING' && name === 'CHARTING' ) || ( cur === 'REVISING' && name === 'CHARTING' ) ) return self.go(name);
        return self.next_();
      } } };
    }
  ],

  actions: [
    { name: 'continueToChart', label: 'Continue to the statechart →', isEnabled: function(rev, state) { return ! this.frameBlock_(); }, code: function() { this.next_(); } },
    { name: 'continueToBuild', label: 'Continue: build the page →',   isEnabled: function(rev, state) { return ! this.chartBlock_(); }, code: function() { this.next_(); } },
    { name: 'handOver',        label: 'Hand to the user →',           isEnabled: function(rev, state) { return ! this.pageBlock_(); }, code: function() { this.next_(); } },
    { name: 'handBack',        label: 'Hand back to the user →',      isEnabled: function(rev, addendum) { return !! addendum; }, code: function() { this.next_(); } },
    { name: 'userAsksChange',  label: 'User asks for a change',       code: function() { this.userSays_(false); } },
    { name: 'userSaysSettled', label: 'User says settled',            code: function() { this.userSays_(true); } },
    { name: 'startOver',       label: '↺ Start over',                 code: function() { this.load_(); } }
  ],

  listeners: [
    // Text inputs commit on blur (foam.u2 default), so by the time this runs focus has moved on (Tab). The rebuild would
    // destroy that element, so remember its data-key and give focus back after the redraw (gotchas.md).
    { name: 'bump_', isMerged: true, mergeDelay: 50, code: function() {
      var a = document.activeElement, host = a && a.closest && a.closest('[data-key]'), k = host && host.getAttribute('data-key');
      this.rev++;
      if ( k ) setTimeout(function() {
        var h = document.querySelector('[data-key="' + k + '"]'); if ( ! h ) return;
        var t = h.matches('input,select,textarea') ? h : h.querySelector('input,select,textarea'); if ( ! t ) return;
        t.focus(); if ( t.setSelectionRange && t.type === 'text' ) t.setSelectionRange(t.value.length, t.value.length);
      }, 60);
    } },
    { name: 'redraw', isFramed: true, code: function() { if ( this.shell ) this.shell.redraw(); } }
  ]
});
