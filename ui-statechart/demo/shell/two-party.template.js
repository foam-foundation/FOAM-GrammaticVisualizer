/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// ui-statechart template: TWO PARTIES, ONE CONVERSATION. Two live foam.FSM machines that are two ends of the same exchange,
// driven by one shared record and a catalogue of events (messages, pollers, clocks). Load as-is after a config.js that sets
// window.SPIKE_CONVERSATION:
//
//   window.SPIKE_CONVERSATION = {
//     title: 'Online order, buyer and seller, step by step',      // plain words: a tester reads this
//     subtitle: 'joint state = the shared order record, moves = the messages and timers',   // optional, the developer sentence
//     sides: {                                  // keys are always 'a' (left) and 'b' (right)
//       a: { fsm: 'demo.BuyerOrderStatus',  title: 'Buyer side',  short: 'buyer',  tag: 'B', initial: 'CART' },
//       b: { fsm: 'demo.SellerOrderStatus', title: 'Seller side', short: 'seller', tag: 'S', initial: null }   // null = no record until an event creates it
//                                                                     // tag (optional, default first letter of short): the letter badge that marks every card, chip and entry of that side
//     },
//     groups: [ { side: 'a', prefix: 'RETURN_', name: 'RETURN', label: 'Return (5 states)', min: 3 },             // optional: collapse a sub-machine to one box (click to expand)
//               { side: 'a', members: ['CART','CHECKOUT'], name: 'BEFORE', label: 'Before paying' } ],        //   by prefix or by explicit member list
//     row: {                                    // the shared record both sides read
//       initial: function() { return { paid: false, outcome: '—', ... }; },
//       fields:  function(r) { return [ ['payment', r.paid ? 'taken' : 'none'], ... ]; },   // what to show
//       queues:  function(r, A, B) { return { a: 'Open orders', b: 'To ship' }; }  // optional derived view per side; A/B = current state names
//       queueLabel: 'queue'                                                                 // optional word after the side name (default 'queue')
//     },
//     events: [ { id, who: 'a'|'b'|'third' (a third party, or the clock), how: 'wired'|'local'|'clock'|'manual', label: 'Verb (apiName)',
//                 when: function(row, A, B) {...}, row: function(row) {...}, a: 'TARGET'|['HOP','TARGET']|null, b: 'TARGET'|null, text, cite }, ... ],
//               // an array is a path the row walks in one click (cancel after shipping: SHIPPED -> RETURN_REQUESTED -> CANCELLED); every hop is checked
//     stories: { happy: { label, warn: false, steps: ['pay', ...] }, ... },
//     guardSources: { b: '../../../src/demo/SellerOrderStatus.js' },   // optional: Java checkGuard refusals read at load (guard-messages.js)
//     clocks: { b: [ { state: 'PAID', anchor: '…', windows: ['shipWindow'], expiry: 'CANCELLED (NOT_SHIPPED)', family: 'ours → CANCELLED, guess short' } ] },   // optional clock card rows
//     calendar: { note: 'illustrative, seed values as of …', deadline: function(side, state, row) { return 'later of … → 15 Jun'; } },   // optional dates on the banner and clock card
//     middleLabel: 'Carrier / the clock can',   // optional: heading of the middle column (default 'Third party / the clock can')
//     strictPairs: true,     // optional: hide events whose effect is not a legal edge on either side (use when both rows always move together)
//     legend: 'extra caveat text',              // optional: shown behind a "sources and caveats" toggle
//     stageOf: function(state) { return 'PAID'; },   // optional: a variant-agnostic stage name shown as a chip after "now:" on each lane, so a tester can
//     stageTip: function(stage) { return '• turn: seller'; },   //   compare variants by one vocabulary; stageTip (optional) is the chip's tooltip (line syntax)
//     dimOffStory: true                          // optional (default true): while a story plays, states it never visits are greyed
//   };
//
// Every effect is checked against the real FSM transitions; an illegal one is shown with ⚠ instead of hidden.

foam.CLASS({
  package: 'fsmstudio',
  name: 'TwoPartyConversation',
  extends: 'foam.u2.View',

  css: `
    ^ { --ink:#1c1c1c; --muted:#666; --line:#d9d9d9; --blue:#0072B2; --blue-bg:#eaf3fb; --amber:#E69F00; --amber-bg:#fff3d6; --green:#009E73; --green-bg:#d8f0e6; --red:#D55E00; --red-bg:#f8dcd0; --pink:#CC79A7; --pink-bg:#fbeaf3;
        color: var(--ink); display: flex; flex-direction: column; gap: 12px; }
    ^ h1 { font-size: 17px; margin: 0; color: var(--ink); font-weight: 700; display: flex; gap: 12px; align-items: baseline; }
    ^home { font-size: 12px; font-weight: 400; color: var(--blue); text-decoration: none; border: 1px solid var(--blue); border-radius: 12px; padding: 2px 10px; white-space: nowrap; }
    ^home:hover { background: var(--blue-bg); }
    ^subtitle { font-size: 12px; color: var(--muted); margin: -8px 0 0; }
    ^banner { border: 1px solid var(--green); border-radius: 8px; padding: 8px 10px; background: var(--green-bg); font-size: 13px; display: flex; gap: 6px 10px; align-items: baseline; flex-wrap: wrap; margin-bottom: 10px; }
    ^banner.warn { border-color: var(--red); background: var(--red-bg); }
    ^banner.start { border-color: #999; border-style: dashed; background: #f6f6f6; }
    ^banner .n { font-family: monospace; color: var(--muted); font-size: 11px; }
    ^banner b { font-size: 14px; }
    ^banner .plain { color: #333; flex-basis: 100%; }
    ^banner .deadline { font-family: monospace; font-size: 12px; background: var(--amber-bg); border: 1px solid var(--amber); border-radius: 8px; padding: 2px 8px; }
    ^story { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px 16px; border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px; background: #fff; }
    ^story .stories { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    ^story .controls { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
    ^story .controls button { border: 1px solid #555; background: #fff; border-radius: 8px; padding: 6px 10px; cursor: pointer; font-size: 13px; }
    ^story .controls button[disabled] { opacity: .35; cursor: default; }
    ^story .lbl { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
    ^pill { border: 1px solid var(--blue); border-radius: 14px; padding: 5px 12px; background: var(--blue-bg); cursor: pointer; font-size: 13px; }
    ^pill.on { border-color: var(--ink); background: #f1f1f1; font-weight: 600; }
    ^pill.warn { border-color: var(--red); }
    ^story button.play { border: 1px solid var(--blue); background: var(--blue-bg); border-radius: 8px; padding: 6px 12px; cursor: pointer; font-weight: 600; }
    ^story button.play[disabled] { opacity: .35; cursor: default; }
    ^story .progress { font-size: 12px; color: var(--muted); }
    ^lanes { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    ^lane { border: 1px solid var(--line); border-radius: 10px; padding: 10px; background: #fff; min-width: 0; }
    ^lane.a { border-left: 5px solid var(--blue); }
    ^lane.b { border-left: 5px solid var(--pink); }
    ^lanehead { display: flex; align-items: center; gap: 10px; margin: -10px -10px 8px; padding: 8px 10px; flex-wrap: wrap; border-bottom: 1px solid var(--line); }
    ^lane.a ^lanehead { background: var(--blue-bg); }
    ^lane.b ^lanehead { background: var(--pink-bg); }
    ^tag { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 5px; border: 2px solid; font-weight: 800; font-size: 12px; font-family: sans-serif; flex: none; }
    ^tag.a { border-color: var(--blue); background: var(--blue); color: #fff; }
    ^tag.b { border-color: var(--pink); background: var(--pink); color: #fff; }
    ^tag.sm { width: 16px; height: 16px; font-size: 10px; border-width: 1px; }
    ^lanehead b { font-size: 14px; }
    ^now { border-radius: 14px; padding: 3px 12px; font-weight: 700; font-size: 13px; }
    ^now.a { background: var(--blue-bg); border: 2px solid var(--blue); }
    ^now.b { background: var(--pink-bg); border: 2px solid var(--pink); }
    ^now.none { background: #f1f1f1; border: 2px dashed #999; color: var(--muted); font-weight: normal; }
    ^was { font-size: 12px; color: var(--muted); }
    ^stage { font-size: 11px; border: 1px dashed var(--ink); border-radius: 10px; padding: 1px 8px; background: #fff; color: var(--ink); }   /* neutral on purpose: the stage is shared, not a side */
    ^code { font-family: monospace; font-size: 11px; color: var(--muted); margin-left: auto; }
    ^toggle { font-size: 11px; color: var(--blue); background: none; border: none; cursor: pointer; padding: 0; }
    ^chooser { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; font-size: 12px; background: var(--amber-bg); border: 1px solid var(--amber); border-radius: 8px; padding: 6px 8px; margin-bottom: 6px; }
    ^chooser button { border: 1px solid #555; background: #fff; border-radius: 6px; padding: 3px 8px; cursor: pointer; font-size: 12px; }
    ^chooser button.x { border: none; background: none; color: var(--muted); }
    ^clock { border: 1px solid var(--amber); background: var(--amber-bg); border-radius: 8px; padding: 6px 10px; margin-bottom: 6px; font-size: 12px; }
    ^clock .t { font-weight: 700; margin-right: 6px; }
    ^clock .fam { display: inline-block; border-radius: 10px; padding: 0 8px; border: 1px solid #a66; background: #fff; font-size: 11px; margin-left: 6px; }
    ^clock .fam.theirs { border-color: #388; }
    ^clock .row { display: grid; grid-template-columns: auto 1fr; gap: 1px 10px; margin-top: 4px; }
    ^clock .k { color: var(--muted); font-size: 10px; letter-spacing: .06em; text-transform: uppercase; }
    ^clock .date { font-family: monospace; margin-top: 4px; }
    ^clock details { margin-top: 4px; }
    ^clock details summary { cursor: pointer; color: var(--muted); font-size: 11px; }
    ^clock table { font-size: 11px; border-collapse: collapse; margin-top: 4px; }
    ^clock td, ^clock th { border-bottom: 1px solid var(--line); padding: 2px 6px; text-align: left; vertical-align: top; }
    ^guards { margin: 2px 0 0 30px; padding-left: 12px; font-size: 10px; color: #333; line-height: 1.3; }
    ^guards li { list-style: '⛔ '; }
    ^ev .nguards { font-size: 10px; color: var(--red); }
    ^diagram { overflow-x: auto; }
    ^diagram svg { max-width: 100%; height: auto; }
    ^next { display: grid; grid-template-columns: 1fr 1.3fr 1fr; gap: 12px; align-items: start; }
    ^record { display: grid; grid-template-columns: minmax(220px, 1fr) 3fr; gap: 12px; align-items: start; }
    ^sources { font-size: 11px; color: var(--muted); }
    ^sources summary { cursor: pointer; }
    ^col { border: 1px solid var(--line); border-radius: 10px; padding: 10px; background: #fff; min-width: 0; }
    ^col.a { border-left: 5px solid var(--blue); }
    ^col.b { border-left: 5px solid var(--pink); }
    ^eyebrow { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin: 0 0 6px; display: flex; align-items: center; gap: 6px; }
    ^col.a ^eyebrow, ^col.b ^eyebrow { margin: -10px -10px 8px; padding: 6px 10px; border-bottom: 1px solid var(--line); color: var(--ink); }
    ^col.a ^eyebrow { background: var(--blue-bg); }
    ^col.b ^eyebrow { background: var(--pink-bg); }
    ^events { display: flex; flex-direction: column; gap: 6px; }
    ^ev { display: grid; grid-template-columns: 22px 1fr; gap: 2px 8px; border: 1px solid var(--line); border-radius: 8px; padding: 7px 9px; background: #fff; cursor: pointer; text-align: left; align-items: center; }
    ^ev:hover { background: #f6f6f6; }
    ^ev.a { border-color: var(--blue); background: var(--blue-bg); }
    ^ev.b { border-color: var(--pink); background: var(--pink-bg); }
    ^ev.third { border-color: #888; }
    ^ev.clock { border-style: dashed; }
    ^ev .ico { font-size: 14px; text-align: center; grid-row: span 2; }
    ^ev .verb { font-size: 13px; font-weight: 600; }
    ^ev .api { font-family: monospace; font-size: 10px; color: var(--muted); }
    ^ev.off { opacity: .55; cursor: default; background: #fff; border-color: var(--line); }
    ^ev.off .verb { font-weight: normal; }
    ^none { font-size: 12px; color: var(--muted); font-style: italic; }
    ^more { font-size: 12px; }
    ^more summary { cursor: pointer; color: var(--muted); margin: 6px 0; }
    ^kv { display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; font-size: 12px; font-family: monospace; }
    ^kv .k { color: var(--muted); }
    ^queues { display: flex; gap: 8px; margin: 6px 0 10px; }
    ^queue { flex: 1; font-size: 11px; border-radius: 6px; padding: 4px 6px; background: #fafafa; border: 1px solid var(--line); }
    ^queue.a { border-left: 3px solid var(--blue); }
    ^queue.b { border-left: 3px solid var(--pink); }
    ^queue b { display: block; font-family: monospace; font-size: 11px; }
    ^timeline { display: flex; flex-direction: column; gap: 6px; max-height: 480px; overflow-y: auto; }
    ^entry { border-left: 3px solid var(--line); padding: 5px 8px; background: #fafafa; border-radius: 0 6px 6px 0; font-size: 12px; }
    ^entry.a { border-left-color: var(--blue); }
    ^entry.b { border-left-color: var(--pink); }
    ^entry.third { border-left-color: #888; }
    ^entry.warn { background: var(--red-bg); border-left-color: var(--red); }
    ^entry .head { display: flex; gap: 8px; align-items: center; }
    ^entry .who { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; font-family: monospace; font-size: 11px; color: var(--muted); }
    ^entry .n { font-family: monospace; color: var(--muted); font-size: 11px; }
    ^entry .head b { font-size: 13px; }
    ^fx { display: flex; gap: 6px; flex-wrap: wrap; margin: 4px 0; }
    ^chip { font-family: monospace; font-size: 11px; border-radius: 10px; padding: 1px 8px; border: 1px solid; }
    ^chip.a { color: var(--blue); border-color: var(--blue); background: #fff; }
    ^chip.b { color: var(--pink); border-color: var(--pink); background: #fff; }
    ^chip.warn { color: #fff; background: var(--red); border-color: var(--red); font-weight: 700; }
    ^entry .why { color: #333; }
    ^entry .cite { color: var(--muted); font-size: 11px; font-family: monospace; }
    ^legend { font-size: 11px; color: var(--muted); }
  `,

  constants: {
    ICON: { wired: '⚡', local: '◌', clock: '⏱', manual: '✎' },
    HOW: { wired: 'wired: a caller and a poller exist in the code', local: 'local only: one side moves, no message crosses', clock: 'clock: a window in the docs', manual: 'no writer in the code: admin edit or test only' }
  },

  properties: [
    { name: 'CONFIG',  factory: function() { return window.SPIKE_CONVERSATION || {}; } },
    { name: 'EVENTS',  factory: function() { return this.CONFIG.events || []; } },
    { name: 'STORIES', factory: function() { return this.CONFIG.stories || {}; } },
    { name: 'row' },
    { name: 'a' }, { name: 'b' },
    { name: 'prev', factory: function() { return { a: null, b: null }; } },
    { name: 'entries', factory: function() { return []; } },
    { name: 'undo_', factory: function() { return []; }, documentation: 'snapshots taken before each fire; undo pops one' },
    { name: 'redo_', factory: function() { return []; }, documentation: 'snapshots undone; redo pops one; any new step clears it' },
    { name: 'expanded_', factory: function() { return {}; }, documentation: 'group name -> true when the sub-machine is expanded' },
    { class: 'String', name: 'storyId' },
    { class: 'Int', name: 'storyIdx' },
    { class: 'Int', name: 'tick' },
    { name: 'choice', documentation: 'A clicked state reachable by several events: { side, name, events } until the user picks one.' },
    { name: 'GUARDS', factory: function() { return { a: {}, b: {} }; }, documentation: 'side -> state -> target -> [refusal messages], read from the Java checkGuard bodies at load' },
    { name: 'aEl_' }, { name: 'bEl_' }
  ],

  methods: [
    function init() {
      this.SUPER();
      window.__spike = { view: this, hit: function() { return null; } };
      this.reset();
      this.onDetach(this.tick$.sub(this.redraw));
      var self = this, gs = this.CONFIG.guardSources || {};
      Object.keys(gs).forEach(function(k) {
        if ( typeof GuardMessages === 'undefined' ) return;
        GuardMessages.load(gs[k]).then(function(g) { self.GUARDS[k] = g; self.tick++; }, function(err) { console.warn('guard source not readable', gs[k], err); });
      });
    },

    function guardsFor(k, from, to) {
      var g = this.GUARDS[k] && this.GUARDS[k][from]; if ( ! g ) return [];
      var ex = Object.keys(g).filter(function(k) { return k[0] === '!' && k.split('!').filter(Boolean).indexOf(to) < 0; });   // '!T' or '!T!U' = every target except those
      return (g[to] || []).concat(g['*'] || []).concat(ex.reduce(function(a, k) { return a.concat(g[k]); }, []));
    },

    function side(k) { return this.CONFIG.sides[k]; },
    function hops(t) { return t == null ? [] : Array.isArray(t) ? t : [t]; },        // an effect is one target or a path of targets
    function landing(t) { var h = this.hops(t); return h.length ? h[h.length - 1] : null; },
    function machine(k) { return foam.lookup(this.side(k).fsm); },
    function other(k) { return k === 'a' ? 'b' : 'a'; },
    function eventById(id) { return this.EVENTS.find(function(e) { return e.id === id; }); },
    function split(label) { var m = /^(.*?)\s*\((.*)\)\s*$/.exec(label); return m ? { verb: m[1], api: m[2] } : { verb: label, api: '' }; },
    function whoLabel(e) { return e.who === 'third' ? (e.how === 'clock' ? 'clock' : 'third party') : this.side(e.who).short; },
    function tagOf(k) { var S = this.side(k); return S.tag || S.short.charAt(0).toUpperCase(); },
    // the side badge: letter + hue + border, so a reader can tell the sides apart without reading a word
    function tag_(el, k, small) { el.start('span').addClass(this.myClass('tag')).addClass(k).enableClass('sm', !! small).attrs({ 'data-tip': this.side(k).title }).add(this.tagOf(k)).end(); },

    function reset() {
      this.undo_ = []; this.redo_ = [];
      this.row = this.CONFIG.row.initial();
      this.a = this.side('a').initial; this.b = this.side('b').initial;
      this.prev = { a: null, b: null };
      this.entries = []; this.storyIdx = 0; this.choice = null; this.tick++;
    },

    function pickStory(id) { this.storyId = id; this.reset(); },

    function playNext() {
      var st = this.STORIES[this.storyId]; if ( ! st || this.storyIdx >= st.steps.length ) return;
      var ev = this.eventById(st.steps[this.storyIdx]);
      this.undo_.push(this.snapshot_()); this.redo_ = [];          // before the index moves, so undo replays this step; a new step forgets redo
      this.storyIdx++;
      if ( this.canFire(ev) ) this.fire(ev, true);
      else { this.entries = [{ ev: ev, fx: [{ side: 'third', text: 'blocked: precondition not met', warn: '' }], blocked: true }].concat(this.entries); this.tick++; }
    },

    function canFire(ev) {
      if ( ! ev.when(this.row, this.a, this.b) ) return false;
      if ( ! this.CONFIG.strictPairs ) return true;
      // strictPairs: offer an event only when BOTH its effects are legal edges from where each side is now (no record yet or
      // already there also counts). Keeps ⚠ for real defects instead of pairs the two rows can never be in together.
      var self = this, legal = function(k, target) {
        var cur = self[k]; if ( ! target || cur === null ) return true;
        var M = self.machine(k);
        return self.hops(target).every(function(t) { var ok = cur === t || ( M[cur] && M[cur].transitions.indexOf(t) >= 0 ); cur = t; return !! ok; });
      };
      return legal('a', ev.a) && legal('b', ev.b);
    },
    function eventsTo(k, name) { var self = this; return this.EVENTS.filter(function(e) { return self.landing(e[k]) === name && self.canFire(e); }); },
    function clickState(k, name) {
      if ( this.groupNames(k).indexOf(name) >= 0 ) { this.expanded_[name] = ! this.expanded_[name]; this.tick++; return; }
      var evs = this.eventsTo(k, name);
      if ( evs.length === 1 ) { this.choice = null; this.fire(evs[0]); }
      else if ( evs.length > 1 ) { this.choice = { side: k, name: name, events: evs }; this.tick++; }
    },

    function snapshot_() { return { a: this.a, b: this.b, prev: { a: this.prev.a, b: this.prev.b }, row: structuredClone(this.row), entries: this.entries, storyIdx: this.storyIdx }; },
    function restore_(s) { this.a = s.a; this.b = s.b; this.prev = s.prev; this.row = s.row; this.entries = s.entries; this.storyIdx = s.storyIdx; this.choice = null; this.tick++; },
    function undo() { var s = this.undo_.pop(); if ( ! s ) return; this.redo_.push(this.snapshot_()); this.restore_(s); },
    function redo() { var s = this.redo_.pop(); if ( ! s ) return; this.undo_.push(this.snapshot_()); this.restore_(s); },

    function fire(ev, snapped) {
      var self = this, fx = [];
      if ( ! snapped ) { this.undo_.push(this.snapshot_()); this.redo_ = []; }
      var move = function(k, target) {
        var path = self.hops(target); if ( ! path.length ) return;
        var cur = self[k], M = self.machine(k);
        self.prev[k] = cur;
        if ( cur === null ) { self[k] = path[path.length - 1]; fx.push({ side: k, text: 'record created → ' + path.join(' → ') }); return; }
        if ( path.length === 1 && cur === path[0] ) { fx.push({ side: k, text: 'stays ' + cur }); return; }
        var warns = [], from = cur;
        path.forEach(function(t) {   // every hop of a path must be an edge; the first illegal one is reported
          if ( from !== t && ! ( M[from] && M[from].transitions.indexOf(t) >= 0 ) ) warns.push('⚠ ' + from + ' has no edge to ' + t + ' in ' + M.name + ' (allows ' + (M[from] ? M[from].transitions.join(', ') : '?') + ')');
          from = t;
        });
        self[k] = from;
        fx.push({ side: k, text: cur + ' → ' + path.join(' → '), warn: warns[0] || '' });
      };
      this.choice = null;
      ev.row(this.row);
      move('a', ev.a); move('b', ev.b);
      this.entries = [{ ev: ev, fx: fx }].concat(this.entries);
      this.tick++;
    },

    // ---- diagrams -----------------------------------------------------------
    function groupsFor(k) { return (this.CONFIG.groups || []).filter(function(g) { return g.side === k; }); },
    function groupNames(k) { return this.groupsFor(k).map(function(g) { return g.name; }); },

    function diagram(k) {
      var M = this.machine(k), cur = this[k], self = this, states = [], edges = [], groups = {}, seen = {};
      var gs = this.groupsFor(k);
      var inGroup = function(g, n) { return g.members ? g.members.indexOf(n) >= 0 : n.indexOf(g.prefix) === 0; };
      var groupOf = function(n) { if ( ! n ) return null; for ( var i = 0 ; i < gs.length ; i++ ) if ( inGroup(gs[i], n) && ! self.expanded_[gs[i].name] ) return gs[i].name; return null; };
      M.VALUES.forEach(function(v) { if ( ! groupOf(v.name) ) states.push({ name: v.name, label: v.label || v.name, initial: v.isInitial, terminal: ! v.transitions.length }); });
      gs.forEach(function(g) {
        var ms = M.VALUES.filter(function(v) { return inGroup(g, v.name); }).map(function(v) { return v.name; });
        if ( ms.length < (g.min || 2) ) return;
        if ( self.expanded_[g.name] ) groups[g.name] = { label: g.label + ' · click header text to collapse', members: ms };
        else states.push({ name: g.name, label: g.label });
      });
      M.VALUES.forEach(function(v) {
        v.transitions.forEach(function(t) {
          var a = groupOf(v.name) || v.name, b = groupOf(t) || t;
          if ( a === b && groupOf(v.name) ) return;
          var key = a + '>' + b; if ( seen[key] ) return; seen[key] = true;
          edges.push({ from: a, to: b });
        });
      });
      var cls = ['classDef current fill:#eaf3fb,stroke:#0072B2,stroke-width:4px,font-weight:bold', 'classDef pink fill:#fbeaf3,stroke:#CC79A7,stroke-width:4px,font-weight:bold', 'classDef prev fill:#f1f1f1,stroke:#555,stroke-width:2px', 'classDef sub fill:#fff,stroke:#999,stroke-dasharray:4 2', 'classDef dim fill:#fff,stroke:#ccc,color:#aaa'];
      var story = this.STORIES[this.storyId];
      if ( story && this.CONFIG.dimOffStory !== false ) {
        var visited = {}; if ( this.side(k).initial ) visited[this.side(k).initial] = true;
        story.steps.forEach(function(id) { var e = self.eventById(id); if ( e ) self.hops(e[k]).forEach(function(t) { visited[groupOf(t) || t] = true; }); });
        states.forEach(function(st) { if ( ! visited[st.name] && st.name !== (groupOf(cur) || cur) && st.name !== (groupOf(self.prev[k]) || self.prev[k]) ) cls.push('class ' + st.name + ' dim'); });
      }
      gs.forEach(function(g) { if ( ! self.expanded_[g.name] ) cls.push('class ' + g.name + ' sub'); });
      var curNode = cur && (groupOf(cur) || cur), prevNode = this.prev[k] && (groupOf(this.prev[k]) || this.prev[k]);   // a state inside a folded group lights the group box
      if ( prevNode && prevNode !== curNode ) cls.push('class ' + prevNode + ' prev');
      if ( curNode ) cls.push('class ' + curNode + ' ' + (k === 'a' ? 'current' : 'pink'));
      var d = SpikeDiagram.source(states, edges, groups, cls); d.groups = groups; return d;
    },

    // ---- render -------------------------------------------------------------
    function renderEvents_(el, who) {
      var self = this, evs = this.EVENTS.filter(function(e) { return e.who === who; });
      var on = evs.filter(function(e) { return self.canFire(e); }), off = evs.filter(function(e) { return ! self.canFire(e); });
      var btn = function(e, enabled) {
        var sp = self.split(e.label);
        var guards = [];
        ['a', 'b'].forEach(function(k) { if ( e[k] && self[k] ) self.guardsFor(k, self[k], self.hops(e[k])[0]).forEach(function(m) { guards.push({ side: k, msg: m }); }); });
        this.start('button').addClass(self.myClass('ev')).addClass(e.who).enableClass('clock', e.how === 'clock').enableClass('off', ! enabled)
          .attrs({ 'data-tip': '# ' + sp.verb + (sp.api ? ' `' + sp.api + '`' : '') + '\n' + e.text + '\n\n' + self.ICON[e.how] + ' ' + self.HOW[e.how] + '\n@ ' + e.cite + (guards.length ? '\n\nThe code refuses this when:\n' + guards.map(function(g) { return '⛔ ' + g.msg; }).join('\n') : '') })
          .start('span').addClass('ico').attrs({ 'data-tip': self.ICON[e.how] + ' ' + self.HOW[e.how] }).add(self.ICON[e.how]).end()
          .start('span').addClass('verb').add(sp.verb).end()
          .callIf(!! sp.api || guards.length > 0, function() {
            this.start('span').addClass('api').add(sp.api).callIf(guards.length > 0, function() { this.start('span').addClass('nguards').add((sp.api ? ' · ' : '') + '⛔ ' + guards.length + ' guard check' + (guards.length > 1 ? 's' : '')).end(); }).end();
          })
          .on('click', function() { if ( enabled ) self.fire(e); })
        .end();
        if ( enabled && guards.length ) this.start('ul').addClass(self.myClass('guards')).forEach(guards, function(g) { this.start('li').add(g.msg).end(); }).end();
      };
      if ( ! on.length ) el.start().addClass(this.myClass('none')).add(who === 'third' ? 'no clock or third-party move applies yet' : 'no move for the ' + (who === 'a' || who === 'b' ? this.side(who).short : who) + ' right now').end();
      el.start().addClass(this.myClass('events')).forEach(on, function(e) { btn.call(this, e, true); }).end();
      if ( off.length ) el.start('details').addClass(this.myClass('more'))
        .start('summary').add(off.length + ' more, not possible now').end()
        .start().addClass(this.myClass('events')).forEach(off, function(e) { btn.call(this, e, false); }).end()
      .end();
    },

    function renderLane_(el, k) {
      var self = this, M = this.machine(k), S = this.side(k);
      el.start().addClass(this.myClass('lane')).addClass(k)
        .start().addClass(this.myClass('lanehead'))
          .call(function() { self.tag_(this, k); })
          .start('b').add(S.title).end()
          .add(this.dynamic(function(tick) {
            var cur = self[k], prev = self.prev[k];
            this.start('span').addClass(self.myClass('now')).addClass(cur ? k : 'none').add(cur ? 'now: ' + (M[cur].label || cur) : 'no record yet').end();
            var stage = cur && self.CONFIG.stageOf ? self.CONFIG.stageOf(cur) : null;   // the variant-agnostic name of the current state, same word on every page
            if ( stage ) this.start('span').addClass(self.myClass('stage')).attrs({ 'data-tip': '# Generic stage `' + stage + '`\n' + (self.CONFIG.stageTip ? self.CONFIG.stageTip(stage) : '') + '\n~ the same stage names on every variant\'s page' }).add('stage: ' + stage).end();
            if ( prev && prev !== cur ) this.start('span').addClass(self.myClass('was')).add('← was ' + (M[prev].label || prev)).end();
          }))
          .forEach(this.groupsFor(k), function(g) {
            this.start('button').addClass(self.myClass('toggle')).add(self.tick$.map(function() { return self.expanded_[g.name] ? 'collapse ' + g.name : 'expand ' + g.label; })).on('click', function() { self.expanded_[g.name] = ! self.expanded_[g.name]; self.tick++; }).end();
          })
          .start('span').addClass(this.myClass('code')).add(M.name).end()
        .end()
        .add(this.dynamic(function(tick) {
          var c = self.choice; if ( ! c || c.side !== k ) return;
          this.start().addClass(self.myClass('chooser'))
            .add('Reach ' + (M[c.name].label || c.name) + ' by: ')
            .forEach(c.events, function(e) {
              this.start('button').add(self.ICON[e.how] + ' ' + self.split(e.label).verb).attrs({ 'data-tip': '# ' + self.split(e.label).verb + '\n' + e.text + '\n@ ' + e.cite }).on('click', function() { self.fire(e); }).end();
            })
            .start('button').addClass('x').add('✕').on('click', function() { self.choice = null; self.tick++; }).end()
          .end();
        }))
        .add(this.dynamic(function(tick) { self.renderClock_(this, k); }))
        .start().addClass(this.myClass('diagram')).start('div', null, this[k + 'El_$']).end().end()
      .end();
    },

    function renderClock_(el, k) {
      var self = this, rows = (this.CONFIG.clocks || {})[k]; if ( ! rows || ! rows.length ) return;
      var cur = this[k], row = rows.find(function(r) { return r.state === cur; }), M = this.machine(k);
      var cal = this.CONFIG.calendar, dl = cal && cal.deadline && cur ? cal.deadline(k, cur, this.row) : '';
      el.start().addClass(this.myClass('clock'))
        .callIf(!! row, function() {
          this.start('span').addClass('t').add('⏱ clock in ' + (M[cur].label || cur)).end()
            .start('span').addClass('fam').enableClass('theirs', /theirs/i.test(row.family)).add(row.family).end();
          this.start().addClass('row')
            .start('span').addClass('k').add('anchor').end().start('span').add(row.anchor).end()
            .start('span').addClass('k').add('window').end().start('span').add(row.windows.join(' · ')).end()
            .start('span').addClass('k').add('expiry').end().start('span').add(row.expiry).end()
          .end();
          if ( dl ) this.start().addClass('date').add(dl).end();
          if ( cal && cal.note ) this.start('span').addClass(self.myClass('code')).style({ 'margin-left': 0 }).add(cal.note).end();
        })
        .callIf(! row, function() { this.start('span').addClass('t').add('⏱ no clock in ' + (cur ? (M[cur].label || cur) : 'this state')).end(); })
        .start('details').start('summary').add('all ' + rows.length + ' clocked states').end()
          .start('table').start('tr').start('th').add('state').end().start('th').add('anchor').end().start('th').add('window').end().start('th').add('expiry').end().start('th').add('family').end().end()
            .forEach(rows, function(r) { this.start('tr').enableClass('cur', r.state === cur).start('td').add(M[r.state] ? (M[r.state].label || r.state) : r.state).end().start('td').add(r.anchor).end().start('td').add(r.windows.join(' · ')).end().start('td').add(r.expiry).end().start('td').add(r.family).end().end(); })
          .end()
        .end()
      .end();
    },

    // One line under the story bar: what the last step did, or where to start. QA reads top-down; this is the first thing after the controls.
    function renderBanner_(el) {
      var self = this, e = this.entries[0];
      if ( ! e ) {
        var st = this.STORIES[this.storyId];
        el.start().addClass(this.myClass('banner')).addClass('start')
          .start('b').add(st ? 'Ready: press ▶ above to play "' + st.label + '" one step at a time' : 'Start here').end()
          .start('span').addClass('plain').add(st ? 'Each step moves both sides and explains itself here.' : 'Pick a story above, or press a move under "' + this.side('a').short + ' can". Click a state on a diagram to see which move reaches it.').end()
        .end();
        return;
      }
      var warn = e.fx.some(function(f) { return f.warn; }), n = this.entries.length;
      var moves = e.fx.filter(function(f) { return f.side !== 'third'; });
      el.start().addClass(this.myClass('banner')).enableClass('warn', warn)
        .start('span').addClass('n').add('step ' + n + ' done').end()
        .start('b').add(this.split(e.ev.label).verb).end()
        .callIf(e.ev.who === 'a' || e.ev.who === 'b', function() { self.tag_(this, e.ev.who, true); })
        .callIf(e.ev.who === 'third', function() { this.start('span').addClass('n').add(self.whoLabel(e.ev)).end(); })
        .start('span').addClass(this.myClass('fx')).style({ margin: 0 })
          .forEach(moves, function(f) { this.start('span').addClass(self.myClass('chip')).addClass(f.side).add(self.tagOf(f.side) + ': ' + f.text.replace('record created → ', 'record created at ')).end(); })
          .callIf(! moves.length, function() { this.start('span').add('no state change').end(); })
        .end()
        .callIf(warn, function() { this.start('span').addClass(self.myClass('chip')).addClass('warn').add('⚠ not a legal transition; see the timeline').end(); })
        .start('span').addClass('plain').add(e.ev.text).end()
        .call(function() {
          var cal = self.CONFIG.calendar; if ( ! cal || ! cal.deadline ) return;
          var parts = ['a', 'b'].map(function(k) { return self[k] ? cal.deadline(k, self[k], self.row) : ''; }).filter(Boolean);
          if ( parts.length ) this.start('span').addClass('deadline').attrs({ 'data-tip': cal.note ? '# Illustrative dates\n~ ' + cal.note : '' }).add(parts.join('   |   ')).end();
        })
      .end();
    },

    function render() {
      var self = this, C = this.CONFIG;
      this.addClass()
        .start('h1')
          .start('a').addClass(this.myClass('home')).attrs({ href: C.home || '../../index.html', 'data-tip': '# All spikes\n~ the doorway page that lists every FSM page' }).add('← all FSMs').end()
          .start('a').addClass(this.myClass('home')).attrs({ href: '../../how-to-use.html', 'data-tip': '# How to use this page\n~ reading the diagram, the buttons, opening a shared folder' }).add('? how to use').end()
          .add(C.title || 'Two parties, one conversation')
        .end()
        .callIf(!! C.subtitle, function() { this.start().addClass(self.myClass('subtitle')).add(C.subtitle + ' · read-only page, nothing here writes to any system').end(); })
        .start().addClass(this.myClass('story'))
          .start().addClass('stories')
            .start('span').addClass('lbl').add('Story').end()
            .forEach(Object.keys(this.STORIES), function(id) {
              var st = self.STORIES[id];
              this.start('button').addClass(self.myClass('pill')).enableClass('warn', !! st.warn).enableClass('on', self.storyId$.map(function(x) { return x === id; }))
                .attrs({ 'data-tip': '# ' + st.label + '\n' + st.steps.map(function(id, i) { var e = self.eventById(id); return (i + 1) + '. ' + (e ? self.split(e.label).verb : id); }).join('\n') }).add(st.label).on('click', function() { self.pickStory(id); }).end();
            })
          .end()
          .start().addClass('controls')
            .add(this.dynamic(function(storyId, storyIdx, tick) {
              var st = self.STORIES[storyId];
              if ( ! st ) { this.start('span').addClass('progress').add('pick a story, or click a move below').end(); return; }
              var done = storyIdx >= st.steps.length, next = done ? null : self.eventById(st.steps[storyIdx]);
              this.start('button').addClass('play').attrs({ disabled: done, 'data-tip': done ? '' : '# Next: ' + self.split(next.label).verb + ' (' + self.whoLabel(next) + ')\n' + next.text }).add(done ? '✓ story finished' : '▶ ' + (storyIdx + 1) + ' of ' + st.steps.length + ': ' + self.split(next.label).verb).on('click', function() { self.playNext(); }).end();
            }))
            .add(this.dynamic(function(tick) {
              this.start('button').attrs({ disabled: ! self.undo_.length, 'data-tip': 'take back the last step' }).add('↶ undo').on('click', function() { self.undo(); }).end();
              this.start('button').attrs({ disabled: ! self.redo_.length, 'data-tip': 'put back the step you undid' }).add('↷ redo').on('click', function() { self.redo(); }).end();
            }))
            .start('button').attrs({ 'data-tip': 'back to the start, story stays picked' }).add('⟲ reset').on('click', function() { self.reset(); }).end()
          .end()
        .end()
        // one row: what A can do | what just happened + what the third party/clock can do | what B can do. The banner used to be a
        // full-width row of its own and left two thirds of the page empty; the sides now sit beside it, always A left, B right.
        .start().addClass(this.myClass('next'))
          .start().addClass(this.myClass('col')).addClass('a')
            .start().addClass(this.myClass('eyebrow')).call(function() { self.tag_(this, 'a', true); }).add(self.side('a').short + ' can').end()
            .add(this.dynamic(function(tick) { self.renderEvents_(this, 'a'); }))
          .end()
          .start().addClass(this.myClass('col'))
            .add(this.dynamic(function(tick, storyId) { self.renderBanner_(this); }))
            .start().addClass(this.myClass('eyebrow')).add(this.CONFIG.middleLabel || 'Third party / the clock can').end()
            .add(this.dynamic(function(tick) { self.renderEvents_(this, 'third'); }))
          .end()
          .start().addClass(this.myClass('col')).addClass('b')
            .start().addClass(this.myClass('eyebrow')).call(function() { self.tag_(this, 'b', true); }).add(self.side('b').short + ' can').end()
            .add(this.dynamic(function(tick) {
              if ( self.b === null && self.side('b').initial === null ) { this.start().addClass(self.myClass('none')).add('no ' + self.side('b').short + ' record yet; it appears once the ' + self.side('a').short + ' acts').end(); return; }
              self.renderEvents_(this, 'b');
            }))
          .end()
        .end()
        .start().addClass(this.myClass('lanes'))
          .call(function() { self.renderLane_(this, 'a'); self.renderLane_(this, 'b'); })
        .end()
        .start().addClass(this.myClass('record'))
          .start().addClass(this.myClass('col'))
            .start().addClass(this.myClass('eyebrow')).add('Shared record').end()
            .add(this.dynamic(function(tick) {
              var r = self.row, fields = C.row.fields(r), q = C.row.queues ? C.row.queues(r, self.a, self.b) : null;   // (row, stateA, stateB)
              this.start().addClass(self.myClass('kv')).forEach(fields, function(f) { this.start('span').addClass('k').add(f[0]).end().start('span').add(String(f[1])).end(); }).end();
              if ( q ) this.start().addClass(self.myClass('queues'))
                .start().addClass(self.myClass('queue')).addClass('a').call(function() { self.tag_(this, 'a', true); }).add(' ' + self.side('a').short + ' ' + (C.row.queueLabel || 'queue')).start('b').add(q.a).end().end()
                .start().addClass(self.myClass('queue')).addClass('b').call(function() { self.tag_(this, 'b', true); }).add(' ' + self.side('b').short + ' ' + (C.row.queueLabel || 'queue')).start('b').add(q.b).end().end()
              .end();
            }))
            .start('details').addClass(this.myClass('sources')).style({ 'margin-top': '8px' })
              .start('summary').add('legend, sources and caveats').end()
              .start().call(function() { self.tag_(this, 'a', true); }).add(' ' + self.side('a').short + ', always left, blue · ').call(function() { self.tag_(this, 'b', true); }).add(' ' + self.side('b').short + ', always right, pink · ⚡ wired: a caller and a poller exist in the code · ◌ local only: one side moves · ⏱ clock: a window expires · ✎ no writer in the code · red chip = the effect is not a legal transition in that FSM' + (C.stageOf ? ' · stage: the variant-agnostic name of the current state, one vocabulary across variants' : '') + (C.legend ? ' · ' + C.legend : '')).end()
            .end()
          .end()
          .start().addClass(this.myClass('col'))
            .start().addClass(this.myClass('eyebrow')).add('What happened, newest first').end()
            .add(this.dynamic(function(tick) {
              if ( ! self.entries.length ) { this.start().addClass(self.myClass('none')).add('no steps yet').end(); return; }
              this.start().addClass(self.myClass('timeline')).forEach(self.entries, function(e, i) {
                var n = self.entries.length - i, warn = e.fx.some(function(f) { return f.warn; });
                this.start().addClass(self.myClass('entry')).addClass(e.ev.who).enableClass('warn', warn)
                  .start().addClass('head').start('span').addClass('n').add('#' + n).end().start('b').add(self.split(e.ev.label).verb).end()
                    .start('span').addClass('who').callIf(e.ev.who === 'a' || e.ev.who === 'b', function() { self.tag_(this, e.ev.who, true); }).add(self.whoLabel(e.ev)).end()
                  .end()
                  .start().addClass(self.myClass('fx'))
                    .forEach(e.fx, function(f) {
                      if ( f.side !== 'third' ) this.start('span').addClass(self.myClass('chip')).addClass(f.side).add(self.tagOf(f.side) + ' ' + self.side(f.side).short + ': ' + f.text).end();
                      if ( f.warn ) this.start('span').addClass(self.myClass('chip')).addClass('warn').attrs({ 'data-tip': '# ⚠ Not a legal transition\n' + f.warn }).add(f.warn.slice(0, 70) + (f.warn.length > 70 ? '…' : '')).end();
                      if ( f.side === 'third' ) this.start('span').addClass(self.myClass('chip')).addClass('warn').add(f.text).end();
                    })
                  .end()
                  .start().addClass('why').add(e.ev.text).end()
                  .start().addClass('cite').add(e.ev.cite).end()
                .end();
              }).end();
            }))
          .end()
        .end();
      this.redraw();
    }
  ],

  listeners: [
    {
      name: 'redraw',
      isFramed: true,
      code: async function() {
        if ( typeof mermaid === 'undefined' ) return;
        var self = this;
        for ( var k of ['a', 'b'] ) {
          var elSlot = this[k + 'El_']; if ( ! elSlot ) continue;
          var el = await elSlot.el(), d = this.diagram(k), M = this.machine(k);
          await SpikeDiagram.render(el, d.src, d.edges, (function(k) { return {
            groups: d.groups,
            allowed: function(name) { return self.groupNames(k).indexOf(name) >= 0 || self.eventsTo(k, name).length > 0; },
            nodeTip: function(name) {
              var v = M[name];
              if ( ! v ) { var g = self.groupsFor(k).find(function(g) { return g.name === name; }); return g ? '# ' + g.label + '\n~ ' + (self.expanded_[name] ? 'click the header to collapse' : 'click to expand') : (d.groups[name] || {}).label || ''; }
              var evs = self.eventsTo(k, name);
              return '# ' + (v.label || name) + ' `' + name + '`' + (evs.length ? '\nClick to get here via:\n' + evs.map(function(e) { return '• ' + self.split(e.label).verb; }).join('\n') : name === self[k] ? '\n~ you are here' : '\n~ no possible event leads here right now');
            },
            edgeTip: function(from, to) {
              var evs = self.EVENTS.filter(function(e) { return self.hops(e[k]).indexOf(to) >= 0; }), gs = self.guardsFor(k, from, to);
              return '# ' + (M[from] && M[from].label || from) + ' → ' + (M[to] && M[to].label || to) + '\n@ ' + from + ' → ' + to + (evs.length ? '\nEvents that cause this:\n' + evs.map(function(e) { return '• ' + self.split(e.label).verb; }).join('\n') : '')
                + (gs.length ? '\n\nThe code refuses this when:\n' + gs.map(function(m) { return '⛔ ' + m; }).join('\n') : '');
            },
            onClick: function(name) { self.clickState(k, name); }
          }; })(k));
        }
      }
    }
  ]
});
