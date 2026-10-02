/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// ui-statechart template: read-only WALKER over one or more live foam.FSM machines.
// Copy nothing: load this file as-is after a small config.js that sets window.SPIKE_WALKER:
//
//   window.SPIKE_WALKER = {
//     title:    'Order lifecycle, read from the code',
//     machines: [ { id: 'demo.OrderStatus', title: 'Order', kind: 'one customer order' }, ... ],
//     groups:   [ { prefix: 'REFUND_', name: 'REFUND', label: 'Refund steps', min: 3 } ],   // optional composite boxes by name prefix
//     links:    { 'OrderStatus.SHIPPED': [ { to: 'ShipmentStatus.IN_TRANSIT', why: '...', proven: true } ], ... },   // optional, keyed "<Machine short name>.<STATE>"
//     guardSources: { OrderStatus: '../../../src/demo/OrderStatus.js' },   // optional: Java checkGuard refusals per machine short name (guard-messages.js)
//     lens: { onlyFor: 'demo.GenericStage', stageOf: function(state) { return 'OPEN'; },   // optional: on a generic machine, a second canvas under the
//             schemes: [ { name: 'Web', a: 'demo.WebOrderStatus', b: 'demo.WebShipmentStatus' }, … ],   //   diagram shows one variant's a/b machines with the
//             sideLabels: [ 'order', 'shipment' ] }          // current stage lit; the generic nodes carry '= WORD' (every variant uses that word) or '≠ n names'
//   };
//
// The page: foam.js (project= foam3 pom + the skill's fsm-pom), the FSM source files, mermaid, spike-diagram.js, this file, config.js,
// then <foam class="fsmstudio.FsmWalker">. Everything shown is read from the foam.FSM declarations at load time.

foam.CLASS({
  package: 'fsmstudio',
  name: 'FsmWalker',
  extends: 'foam.u2.View',

  css: `
    ^ { --ink: #1c1c1c; --muted: #666; --line: #d9d9d9; --blue: #0072B2; --blue-bg: #eaf3fb; --amber: #E69F00; --amber-bg: #fff3d6; --green: #009E73; --green-bg: #d8f0e6;
        color: var(--ink); display: grid; grid-template-columns: 360px 1fr 360px; gap: 20px; align-items: start; }
    ^ h1 { font-size: 16px; margin: 0 0 10px; grid-column: 1 / -1; color: var(--muted); font-weight: 600; display: flex; gap: 12px; align-items: baseline; }
    ^home { font-size: 12px; font-weight: 400; color: var(--blue); text-decoration: none; border: 1px solid var(--blue); border-radius: 12px; padding: 2px 10px; white-space: nowrap; }
    ^home:hover { background: var(--blue-bg); }
    ^rail { display: flex; flex-direction: column; gap: 12px; position: sticky; top: 12px; }
    ^main { min-width: 0; }
    ^peekrail { min-width: 0; position: sticky; top: 12px; }      /* the peek card has its own column on the right, always there, so nothing shifts when a peek opens */
    ^peekempty { border: 1px dashed var(--line); border-radius: 10px; padding: 12px; color: var(--muted); font-size: 12px; }
    ^tabs { grid-column: 1 / -1; display: flex; gap: 6px; flex-wrap: wrap; align-items: stretch; }   /* full-width row above the three columns, never over the canvas */
    ^tab { flex: 0 1 auto; border: 1px solid var(--line); border-radius: 8px; padding: 6px 10px; cursor: pointer; background: #fff; text-align: left; display: flex; flex-direction: column; justify-content: flex-end; }
    ^tab b { display: block; font-size: 12px; white-space: nowrap; }            /* one line each: titles and counts sit on the same baselines */
    ^tab small { display: block; color: var(--muted); font-size: 11px; white-space: nowrap; }
    ^tab.on { border-color: var(--blue); background: var(--blue-bg); box-shadow: inset 0 -3px 0 var(--blue); }
    ^card { border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; background: #fff; }
    ^card.cur { border-left: 5px solid var(--blue); }
    ^card.peek { border-left: 5px solid var(--amber); background: #fffaf0; }
    ^eyebrow { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); display: flex; justify-content: space-between; align-items: center; }
    ^eyebrow .tools button { border: none; background: none; cursor: pointer; color: var(--muted); font-size: 13px; padding: 0 4px; }
    ^eyebrow .tools button:hover { color: var(--ink); }
    ^eyebrow .tools button[disabled] { opacity: .3; cursor: default; }
    ^title { font-size: 20px; font-weight: 700; margin: 4px 0 2px; }
    ^code { font-family: monospace; font-size: 11px; color: var(--muted); }
    ^badges { display: flex; gap: 6px; flex-wrap: wrap; margin: 4px 0 8px; }
    ^badge { font-size: 11px; border-radius: 10px; padding: 1px 8px; border: 1px solid var(--line); background: #f6f6f6; }
    ^badge.step { border-style: dashed; }
    ^badge.end { background: var(--green-bg); border-color: var(--green); }
    ^desc { font-size: 13px; line-height: 1.4; color: #333; }
    ^moves { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
    ^move { display: flex; align-items: center; gap: 10px; border: 1px solid var(--blue); background: var(--blue-bg); border-radius: 8px; padding: 8px 10px; cursor: pointer; text-align: left; font-size: 14px; }
    ^move:hover { filter: brightness(.96); }
    ^move .arrow { font-weight: 700; }
    ^move small { color: var(--muted); margin-left: auto; font-size: 11px; }
    ^move.guarded { border-style: dashed; }
    ^move.end { border-color: var(--green); background: var(--green-bg); }
    ^move.return { border-color: #555; background: #f1f1f1; margin-top: 8px; }
    ^move .body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    ^move .hint { font-size: 11px; color: #444; font-weight: normal; line-height: 1.3; }
    ^none { font-size: 13px; color: var(--muted); margin-top: 8px; }
    ^guards { margin: 0 0 4px 34px; padding-left: 12px; font-size: 11px; color: #333; line-height: 1.3; }
    ^guards li { list-style: '⛔ '; }
    ^facts { display: flex; flex-direction: column; gap: 6px; font-size: 13px; line-height: 1.4; }
    ^fact { display: grid; grid-template-columns: 56px 1fr; gap: 8px; align-items: baseline; }      /* key column, value column: the eye scans keys */
    ^fact .k { font-size: 10px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); padding-top: 3px; }
    ^fact.clock { background: var(--amber-bg); border-radius: 6px; padding: 4px 6px; margin-left: -6px; }
    ^fact.turn .v { font-weight: 700; }
    ^schemes { display: grid; grid-template-columns: 48px 1fr 1fr; gap: 4px 8px; font-size: 12px; align-items: center; margin-top: 6px; }
    ^schemes .h { font-size: 10px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
    ^schemes .s { font-weight: 700; }
    ^schemes .cell { display: flex; flex-wrap: wrap; gap: 4px; }
    ^schemes .none { color: var(--muted); }
    ^chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    ^chip { border: 1px solid #555; border-radius: 14px; padding: 3px 10px; font-size: 12px; background: #fff; cursor: pointer; }
    ^chip:hover { background: #f3f3f3; }
    ^chip.inferred { border-style: dashed; }
    ^chip.reverse { background: #f7f7f7; }
    ^chip .m { color: var(--muted); }
    ^chip.none { cursor: default; color: var(--muted); border-color: var(--line); }
    ^trail { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; font-size: 12px; }
    ^crumb { border-radius: 10px; padding: 1px 8px; background: #f1f1f1; color: #444; }
    ^crumb.cur { background: var(--blue-bg); border: 1px solid var(--blue); font-weight: 600; }
    ^sep { color: #aaa; }
    ^stepper { display: flex; align-items: flex-start; gap: 0; margin: 0 0 10px; overflow-x: auto; }
    ^step { display: flex; flex-direction: column; align-items: center; flex: 1 1 0; min-width: 120px; padding: 0 8px; box-sizing: border-box; position: relative; font-size: 11px; line-height: 1.25; text-align: center; color: var(--muted); cursor: pointer; }
    ^step .dot { width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--line); background: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; margin-bottom: 4px; }
    ^step:not(:last-child)::after { content: ''; position: absolute; top: 12px; left: calc(50% + 12px); width: calc(100% - 24px); height: 2px; background: var(--line); }
    ^step.done .dot { background: #f1f1f1; border-color: #999; }
    ^step.done::after { background: #999; }
    ^step.cur .dot { border-color: var(--blue); background: var(--blue-bg); color: var(--blue); }
    ^step.cur { color: var(--ink); font-weight: 600; }
    ^step:hover .dot { border-color: var(--blue); }
    ^diagram { overflow-x: auto; max-width: 100%; border: 1px solid var(--line); border-radius: 10px; padding: 8px; background: #fff; }
    ^diagram svg { max-width: 100%; height: auto; }
    ^lens { margin-top: 14px; border-top: 2px dashed var(--line); padding-top: 10px; }
    ^lenshead { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 8px; font-size: 13px; }
    ^lenshead .hint { font-size: 11px; color: var(--muted); }
    ^tab.sm { flex: 0 0 auto; padding: 3px 10px; font-size: 12px; }
    ^lensrow { display: grid; grid-template-columns: repeat(auto-fit, minmax(440px, 1fr)); gap: 12px; }
    ^lenspane { min-width: 0; }
    ^lenspane > b { display: block; font-size: 12px; margin-bottom: 4px; }
    ^legendbar { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--muted); margin-bottom: 6px; }
    ^legendbar details summary { cursor: pointer; }
    ^key span { margin-right: 14px; white-space: nowrap; }
    ^swatch { display: inline-block; width: 14px; height: 10px; border: 2px solid var(--blue); background: var(--blue-bg); vertical-align: middle; margin-right: 4px; border-radius: 2px; }
    ^swatch.visited { border-color: #555; background: #f1f1f1; }
    ^swatch.step { border-style: dashed; border-color: #666; background: #fff; }
    ^swatch.hover { border-color: var(--amber); background: #fff; }
    ^swatch.peek { border-color: var(--amber); border-style: dashed; background: #fff3d6; }
    ^badge.peek { border-color: var(--amber); background: #fff3d6; }
    ^badge.here { border-color: var(--blue); background: var(--blue-bg); }
    ^details { font-size: 12px; }
    ^details summary { cursor: pointer; color: var(--muted); }
    ^log { font-family: monospace; font-size: 11px; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 120px; overflow-y: auto; background: #f6f6f6; padding: 6px; margin-top: 4px; }
  `,

  properties: [
    { name: 'CONFIG',   factory: function() { return window.SPIKE_WALKER || {}; } },
    { name: 'MACHINES', factory: function() { return this.CONFIG.machines || []; } },
    { name: 'LINKS',    factory: function() { return this.CONFIG.links || {}; } },
    { class: 'Int', name: 'machineIdx' },
    { name: 'machine' },
    { name: 'current' },
    { name: 'inspect', documentation: 'A state clicked on the diagram that is not an allowed move: shown, not entered.' },
    { class: 'Int', name: 'lensIdx', documentation: 'Which variant the lens canvas shows (index into CONFIG.lens.schemes).' },
    { name: 'history_', factory: function() { return []; } },
    { name: 'jumpStack_', factory: function() { return []; }, documentation: 'Where cross-machine jumps came from, so you can return.' },
    { name: 'visited_', factory: function() { return new Set(); } },
    { class: 'String', name: 'log' },
    { name: 'GUARDS', factory: function() { return {}; }, documentation: 'machine short name -> state -> target -> [refusal messages]' },
    { name: 'diagramEl_' }
  ],

  methods: [
    function init() {
      this.SUPER();
      window.__spike = { view: this, hit: function() { return null; } };
      this.reset();
      var self = this;
      this.onDetach(this.current$.sub(this.redraw));
      this.onDetach(this.inspect$.sub(this.redraw));            // the peeked state is drawn dashed amber on the main diagram
      var onKey = function(ev) { if ( ev.key === 'Escape' && self.inspect ) self.inspect = null; };   // Esc = ✕ on the peek card
      document.addEventListener('keydown', onKey); this.onDetach(function() { document.removeEventListener('keydown', onKey); });
      this.onDetach(this.machineIdx$.sub(function() { self.reset(); }));
      var gs = this.CONFIG.guardSources || {};
      Object.keys(gs).forEach(function(m) {
        if ( typeof GuardMessages === 'undefined' ) return;
        GuardMessages.load(gs[m]).then(function(g) { self.GUARDS[m] = g; self.current = self.current; self.redraw(); }, function(err) { console.warn('guard source not readable', gs[m], err); });
      });
    },

    function guardsFor(from, to) {
      var g = this.GUARDS[this.machine.name] && this.GUARDS[this.machine.name][from]; if ( ! g ) return [];
      var ex = Object.keys(g).filter(function(k) { return k[0] === '!' && k.split('!').filter(Boolean).indexOf(to) < 0; });   // '!T' or '!T!U' = every target except those
      return (g[to] || []).concat(g['*'] || []).concat(ex.reduce(function(a, k) { return a.concat(g[k]); }, []));
    },

    function shortName(m) { return this.CONFIG.shorten ? this.CONFIG.shorten(m) : m.replace('LifecycleStatus', '').replace('Status', ''); },
    function initial() { return this.machine.VALUES.find(function(v) { return v.isInitial; }) || this.machine.VALUES[0]; },

    function reset() {
      this.machine = foam.lookup(this.MACHINES[this.machineIdx].id);   // set here, not as an expression: an expression is still stale inside the machineIdx listener
      this.history_ = []; this.visited_ = new Set(); this.log = '';
      this.current = this.initial();
      this.visited_.add(this.current.name);
    },

    function step(targetName) {
      this.history_.push(this.current);
      var next = this.machine[targetName];
      this.log = this.current.name + ' → ' + next.name + (this.guarded(this.current, targetName) ? '   [JS guard declared]' : '') + '\n' + this.log;
      this.visited_.add(next.name);
      this.current = next;
    },

    function back() { if ( this.history_.length ) { this.log = '↩ back\n' + this.log; this.current = this.history_.pop(); } },

    function guarded(v, t) { return !! ( v.guards && v.guards[t] ); },   // Java checkGuards are invisible in a bare page

    // ---- links to other machines (not transitions) ------------------------
    function linksOf(v) {
      var key = this.machine.name + '.' + v.name, L = this.LINKS, out = [];
      (L[key] || []).forEach(function(l) {
        var parts = l.to.split('.');
        out.push({ machine: parts[0], state: parts[1], why: l.why, proven: l.proven, none: l.to === 'none' });
      });
      Object.keys(L).forEach(function(from) {                 // reverse links: rows elsewhere that point here
        L[from].forEach(function(l) {
          if ( l.to !== key ) return;
          var parts = from.split('.');
          if ( out.some(function(o) { return o.machine === parts[0] && o.state === parts[1]; }) ) return;
          out.push({ machine: parts[0], state: parts[1], why: 'reverse of: ' + l.why, proven: l.proven, none: false, reverse: true });
        });
      });
      return out;
    },

    function jumpTo(machineName, stateName) {
      var idx = this.MACHINES.findIndex(function(m) { return m.id.split('.').pop() === machineName; });
      if ( idx < 0 ) return;
      this.jumpStack_.push({ machineIdx: this.machineIdx, current: this.current, history_: this.history_, visited_: this.visited_, log: this.log, label: this.MACHINES[this.machineIdx].title + ' · ' + (this.current.label || this.current.name) });
      this.machineIdx = idx;                       // reset() runs via the listener
      var M = foam.lookup(this.MACHINES[idx].id);
      this.history_ = []; this.visited_ = new Set([stateName]); this.log = 'jumped in at ' + stateName + '\n';
      this.inspect = null;
      this.current = M[stateName];
    },

    function jumpBack() {
      var f = this.jumpStack_.pop(); if ( ! f ) return;
      this.machineIdx = f.machineIdx;
      this.history_ = f.history_; this.visited_ = f.visited_; this.log = f.log; this.inspect = null;
      this.current = f.current;
    },

    // ---- prose docs into structure ------------------------------------------
    function sentences(v) {
      var d = (v.stepDescription || v.documentation || '').trim().replace(/\s+/g, ' ');
      return d ? d.split(/(?<=[.!?])\s+(?=[A-Z(\-"])/) : [];
    },
    function mentions(sentence, target) {
      var t = this.machine[target], names = [target, (t && t.label) || ''].filter(Boolean);
      return names.some(function(n) { return new RegExp('\\b' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(sentence); });
    },
    function transitionHint(v, target) {
      var self = this, clauses = [];
      this.sentences(v).forEach(function(sn) {                 // split at , ; and "or to X", never inside parentheses
        var depth = 0, cur = '';
        for ( var i = 0 ; i < sn.length ; i++ ) {
          var ch = sn[i]; if ( ch === '(' ) depth++; if ( ch === ')' ) depth--;
          if ( depth === 0 && ( ch === ',' || ch === ';' ) ) { clauses.push(cur.trim()); cur = ''; continue; }
          cur += ch;
        }
        clauses.push(cur.trim());
      });
      clauses = clauses.reduce(function(acc, c) { c.split(/\s+or\s+(?=to\s+[A-Z_]+)/).forEach(function(x) { acc.push(x.trim()); }); return acc; }, []).filter(Boolean);
      var hits = clauses.filter(function(c) { return self.mentions(c, target); });
      var text = hits.join(' ').replace(/^or\s+/i, '').replace(/^(Transitions?\s+(directly\s+)?to\s+[A-Z_]+\s*)/i, '').replace(/^to\s+[A-Z_]+\s*/, '').replace(/^(when|if)\b/i, function(m) { return m.toLowerCase(); }).trim();
      return text.length > 220 ? text.slice(0, 217) + '…' : text;
    },
    function describe(v) {
      var self = this, ss = this.sentences(v), used = new Set();
      v.transitions.forEach(function(t) { ss.forEach(function(sn, i) { if ( self.mentions(sn, t) ) used.add(i); }); });
      var clock = ss.filter(function(sn) { return /clock:|\bdays?\b|hour|SLA/i.test(sn); });
      var rest = ss.filter(function(sn, i) { return ! used.has(i) && clock.indexOf(sn) < 0; });
      return { meaning: rest.shift() || ss[0] || '', clock: clock, other: rest };
    },

    function wizardSteps() {
      var V = this.machine.VALUES;   // isWizardStep defaults to true, so only a machine that wires step views counts
      if ( ! V.some(function(v) { return v.customViewClass || v.stepDescription; }) ) return [];
      return V.filter(function(v) { return v.isWizardStep; });
    },

    function groups() { return this.groupsOf(this.machine); },
    function groupsOf(M) {
      var V = M.VALUES, out = {};
      (this.CONFIG.groups || []).forEach(function(g) {
        var ms = V.filter(function(v) { return v.name.indexOf(g.prefix) === 0; }).map(function(v) { return v.name; });
        if ( ms.length >= (g.min || 2) ) out[g.name] = { label: g.label, members: ms };
      });
      return out;
    },

    function mermaidSource() {
      var M = this.machine, cur = this.current.name, visited = this.visited_, self = this;
      var states = M.VALUES.map(function(v) { return { name: v.name, label: v.label || v.name, initial: v.isInitial, terminal: ! v.transitions.length }; });
      var edges = [];
      M.VALUES.forEach(function(v) { v.transitions.forEach(function(t) { edges.push({ from: v.name, to: t, label: self.guarded(v, t) ? '[guard]' : '' }); }); });
      var groups = this.groups();
      var cls = ['classDef current fill:#eaf3fb,stroke:#0072B2,stroke-width:4px,font-weight:bold', 'classDef visited fill:#f1f1f1,stroke:#555,stroke-width:2px', 'classDef step stroke-dasharray: 4 2'];
      var steps = this.wizardSteps().map(function(v) { return v.name; });
      if ( steps.length ) cls.push('class ' + steps.join(',') + ' step');
      var vis = [...visited].filter(function(n) { return n !== cur; });
      if ( vis.length ) cls.push('class ' + vis.join(',') + ' visited');
      cls.push('class ' + cur + ' current');
      if ( this.inspect && this.inspect.name !== cur && M[this.inspect.name] ) { cls.push('classDef peek fill:#fff3d6,stroke:#E69F00,stroke-width:3px,stroke-dasharray:6 3'); cls.push('class ' + this.inspect.name + ' peek'); }
      if ( this.lensOn() ) M.VALUES.forEach(function(v) { var a = self.lensAgreement(v.name); if ( a ) cls.push(v.name + ': ' + a); });   // second line in the node: '= WORD' or '≠ n names'
      var d = SpikeDiagram.source(states, edges, groups, cls); d.groups = groups; return d;
    },

    // ---- render ---------------------------------------------------------------
    function renderLinks_(el, v) {
      var self = this, links = this.linksOf(v);
      if ( this.lensOn() ) { el.start().addClass(this.myClass('eyebrow')).style({ 'margin-top': '10px' }).add('Same stage, each variant\'s words').end(); this.renderSchemeTable_(el, v.name); return; }
      el.start().addClass(this.myClass('eyebrow')).style({ 'margin-top': '10px' }).add('Elsewhere while here').end();
      if ( ! links.length ) { el.start().addClass(this.myClass('none')).add('no known link to another machine').end(); return; }
      el.start().addClass(this.myClass('chips')).forEach(links, function(l) {
        if ( l.none ) { this.start('span').addClass(self.myClass('chip')).addClass('none').attrs({ 'data-tip': '# No counterpart\n' + l.why }).add('no counterpart · ' + l.why.slice(0, 40) + '…').end(); return; }
        this.start('button').addClass(self.myClass('chip')).enableClass('inferred', ! l.proven).enableClass('reverse', !! l.reverse)
          .attrs({ 'data-tip': (l.proven ? '# ✓ Proven in code' : '# ⚠ Inferred, check me') + '\n' + l.why })
          .start('span').addClass('m').add((l.reverse ? '⇠ ' : '') + self.shortName(l.machine) + ' · ').end()
          .add(l.state + (l.proven ? '' : ' ?'))
          .on('click', function() { self.jumpTo(l.machine, l.state); })
        .end();
      }).end();
    },

    // "The buyer holds the turn: …" (generic machine prose) becomes its own Turn row; any other prose is left as Means
    function splitTurn(meaning) {
      var m = /^The (.+?) holds the turn:\s*/.exec(meaning || '');
      if ( ! m ) return { turn: '', meaning: meaning };
      var rest = meaning.slice(m[0].length);
      return { turn: m[1], meaning: rest.charAt(0).toUpperCase() + rest.slice(1) };
    },
    // one row per variant, one column per side (lens.sideLabels), chips jump into that machine (lens pages only)
    function renderSchemeTable_(el, stage) {
      var self = this, L = this.CONFIG.lens, SL = L.sideLabels || [ 'side a', 'side b' ];
      el.start().addClass(this.myClass('schemes'))
        .start('span').addClass('h').add('').end().start('span').addClass('h').add(SL[0]).end().start('span').addClass('h').add(SL[1]).end()
        .forEach(L.schemes, function(sc) {
          this.start('span').addClass('s').add(sc.name).end();
          ['a', 'b'].forEach(function(k) {
            var id = sc[k], M = id && foam.lookup(id), short = id && id.split('.').pop();
            var names = M ? M.VALUES.filter(function(v) { return L.stageOf(v.name) === stage; }).map(function(v) { return v.name; }) : [];
            var byKey = {}; names.forEach(function(n) { var k = self.groupKey_(n); ( byKey[k] = byKey[k] || [] ).push(n); });
            this.start('span').addClass('cell')
              .callIf(! names.length, function() { this.start('span').addClass('none').add('—').end(); })
              .forEach(Object.keys(byKey), function(k) {
                var ms = byKey[k];
                if ( ms.length === 1 && ms[0] === k ) {
                  this.start('button').addClass(self.myClass('chip')).attrs({ 'data-tip': '# ' + k + '\n@ ' + short + '\n~ click to jump into this machine' }).add(k).on('click', function() { self.jumpTo(short, k); }).end();
                } else {
                  this.start('button').addClass(self.myClass('chip')).attrs({ 'data-tip': '# ' + k + ' ×' + ms.length + '\n' + ms.map(function(n) { return '• ' + n; }).join('\n') + '\n~ click to jump to ' + ms[0] }).add(k + ' ×' + ms.length).on('click', function() { self.jumpTo(short, ms[0]); }).end();
                }
              })
            .end();
          }.bind(this));
        })
      .end();
    },

    function renderStateCard_(el, v, isPeek) {
      var self = this, M = this.machine;
      el.start().addClass(this.myClass('card')).addClass(isPeek ? 'peek' : 'cur')
        .start().addClass(this.myClass('eyebrow'))
          .add(isPeek ? 'Peeking (not entered)' : 'You are here')
          .start('span').addClass('tools')
            .callIf(isPeek, function() { this.start('button').attrs({ 'data-tip': 'close' }).add('✕').on('click', function() { self.inspect = null; }).end(); })
            .callIf(! isPeek, function() {
              this.start('button').attrs({ 'data-tip': 'back one move', disabled: ! self.history_.length }).add('↩ back').on('click', function() { self.back(); }).end()
                  .start('button').attrs({ 'data-tip': 'restart at the initial state' }).add('⟲ reset').on('click', function() { self.reset(); }).end();
            })
          .end()
        .end()
        .start().addClass(this.myClass('title')).add(v.label || v.name).end()
        .start().addClass(this.myClass('code')).add(v.name).end()
        .start().addClass(this.myClass('badges'))
          .callIf(v.isInitial, function() { this.start('span').addClass(self.myClass('badge')).add('initial').end(); })
          .callIf(! v.transitions.length, function() { this.start('span').addClass(self.myClass('badge')).addClass('end').add('terminal').end(); })
          .callIf(self.wizardSteps().indexOf(v) >= 0, function() { this.start('span').addClass(self.myClass('badge')).addClass('step').add('wizard step ' + (self.wizardSteps().indexOf(v) + 1) + ' of ' + self.wizardSteps().length).end(); })
          .callIf(self.lensOn(), function() { var k = self.lensKind(v.name); if ( k ) this.start('span').addClass(self.myClass('badge')).attrs({ 'data-tip': '# ' + k.label + '\n' + k.note }).add(k.label).end(); })
        .end()
        .call(function() {
          var d = self.describe(v), t = self.splitTurn(d.meaning);
          if ( ! d.meaning && ! d.clock.length ) return;
          this.start().addClass(self.myClass('facts'))
            .callIf(!! t.turn, function() { this.start().addClass(self.myClass('fact')).addClass('turn').start('span').addClass('k').add('Turn').end().start('span').addClass('v').add(t.turn).end().end(); })
            .callIf(!! t.meaning, function() { this.start().addClass(self.myClass('fact')).start('span').addClass('k').add('Means').end().start('span').add(t.meaning).end().end(); })
            .forEach(d.clock, function(c) { this.start().addClass(self.myClass('fact')).addClass('clock').start('span').addClass('k').add('⏱ Clock').end().start('span').add(c.replace(/^Clock:\s*/, '')).end().end(); })
            .callIf(d.other.length > 0, function() {
              this.start('details').addClass(self.myClass('details'))
                .start('summary').add('more (' + d.other.length + ' more sentence' + (d.other.length > 1 ? 's' : '') + ')').end()
                .start().addClass(self.myClass('desc')).add(d.other.join(' ')).end()
              .end();
            })
          .end();
        })
        .callIf(! isPeek && self.jumpStack_.length > 0, function() {
          var f = self.jumpStack_[self.jumpStack_.length - 1];
          this.start('button').addClass(self.myClass('move')).addClass('return').attrs({ 'data-tip': 'return to the machine you jumped from, walk restored' })
            .start('span').addClass('arrow').add('⇠').end().add('Return to ' + f.label)
            .on('click', function() { self.jumpBack(); })
          .end();
        })
        .callIf(! isPeek, function() {
          if ( ! v.transitions.length ) { this.start().addClass(self.myClass('none')).add('End of the line for this object.').end(); return; }
          this.start().addClass(self.myClass('eyebrow')).style({ 'margin-top': '10px' }).add('Move to').end();
          this.start().addClass(self.myClass('moves')).forEach(v.transitions, function(t) {
            var target = M[t], g = self.guarded(v, t), end = ! target.transitions.length, hint = self.transitionHint(v, t), gs = self.guardsFor(v.name, t);
            this.start('button').addClass(self.myClass('move')).enableClass('guarded', g || gs.length > 0).enableClass('end', end)
              .attrs({ 'data-tip': '# ' + (target.label || t) + ' `' + t + '`' + (hint ? '\n' + hint : '') + (g ? '\n~ a JS guard decides' : '') + (end ? '\n~ ends the machine' : '') + (gs.length ? '\n\nThe Java guard refuses this when:\n' + gs.map(function(m) { return '⛔ ' + m; }).join('\n') : '') })
              .start('span').addClass('arrow').add('→').end()
              .start('span').addClass('body')
                .start('span').addClass('to').add(target.label || t).end()
                .callIf(!! hint, function() { this.start('span').addClass('hint').add(hint).end(); })
              .end()
              .start('small').add(end ? 'ends' : (g || gs.length) ? '⛔ ' + (gs.length + (g ? 1 : 0)) + ' check' + ((gs.length + (g ? 1 : 0)) > 1 ? 's' : '') : '').end()
              .on('click', function() { self.step(t); })
            .end();
            if ( gs.length ) this.start('ul').addClass(self.myClass('guards')).forEach(gs, function(m) { this.start('li').add(m).end(); }).end();
          }).end();
        })
        .call(function() { self.renderLinks_(this, v); })
      .end();
    },

    function renderTrail_(el) {
      var self = this, trail = this.history_.concat([this.current]);
      el.start().addClass(this.myClass('card'))
        .start().addClass(this.myClass('eyebrow')).add('Your walk').end()
        .start().addClass(this.myClass('trail'))
          .forEach(trail, function(st, i) {
            if ( i ) this.start('span').addClass(self.myClass('sep')).add('›').end();
            this.start('span').addClass(self.myClass('crumb')).enableClass('cur', i === trail.length - 1).attrs({ 'data-tip': '@ ' + st.name }).add(st.label || st.name).end();
          })
        .end()
        .callIf(!! this.log, function() {
          this.start('details').addClass(self.myClass('details')).start('summary').add('raw log').end()
            .start().addClass(self.myClass('log')).add(self.log).end().end();
        })
      .end();
    },

    function renderStepper_(el) {
      var self = this, steps = this.wizardSteps();
      if ( ! steps.length ) return;
      var curIdx = steps.indexOf(this.current);
      el.start().addClass(this.myClass('stepper')).forEach(steps, function(st, i) {
        var done = self.visited_.has(st.name) && i !== curIdx;
        this.start().addClass(self.myClass('step')).enableClass('cur', i === curIdx).enableClass('done', done)
          .attrs({ 'data-tip': '# ' + (st.label || st.name) + ' `' + st.name + '`' + (st.stepDescription ? '\n' + st.stepDescription : '') + '\n~ click to peek' })
          .on('click', function() { if ( st !== self.current ) self.inspect = st; })
          .start('span').addClass('dot').add(done ? '✓' : String(i + 1)).end()
          .add(st.label)
        .end();
      }).end();
    },

    // ---- variant lens: the same stage in each variant's own words (shown on the generic machine only) ----------
    function lensOn() { var L = this.CONFIG.lens; return !! ( L && this.MACHINES[this.machineIdx].id === L.onlyFor ); },
    // a state inside a configured group (CONFIG.groups prefix) collapses to '<prefix>*', so a sub-machine counts once
    function groupKey_(n) {
      var gs = this.CONFIG.groups || [];
      for ( var i = 0 ; i < gs.length ; i++ ) if ( gs[i].prefix && n.indexOf(gs[i].prefix) === 0 ) return gs[i].prefix + '*';
      return n;
    },
    function lensNames(stage) {          // { VariantA: ['OPEN'], VariantB: [...] }; a configured group collapses to one entry
      var self = this, L = this.CONFIG.lens, out = {};
      L.schemes.forEach(function(s) {
        var names = [];
        ['a', 'b'].forEach(function(k) {
          if ( ! s[k] ) return;
          foam.lookup(s[k]).VALUES.forEach(function(v) {
            if ( L.stageOf(v.name) !== stage ) return;
            var n = self.groupKey_(v.name);
            if ( names.indexOf(n) < 0 ) names.push(n);
          });
        });
        out[s.name] = names;
      });
      return out;
    },
    // Three situations, three labels, so the reader does not have to guess what a number means:
    //   '= SHIPPED'      every variant that has the stage uses that one word (variants listed when some lack it)
    //   '≠ 3 words'      same step, one name per variant, the names differ: a translation problem
    //   '4 sub-states'   at least one variant keeps several states inside this stage: the generic stage is coarser than the variant
    function lensKind(stage) {
      var N = this.lensNames(stage), all = [], schemes = Object.keys(N);
      schemes.forEach(function(s) { N[s].forEach(function(n) { if ( all.indexOf(n) < 0 ) all.push(n); }); });
      if ( ! all.length ) return null;
      var has = schemes.filter(function(s) { return N[s].length; });
      if ( has.some(function(s) { return N[s].length > 1; }) ) return { kind: 'sub', label: all.length + ' sub-states', note: 'one stage, ' + all.length + ' variant states inside it; the generic stage is coarser than the variant' };
      if ( all.length > 1 ) return { kind: 'words', label: '≠ ' + all.length + ' words', note: 'same step, ' + all.length + ' words: each variant has one state here and they are named differently' };
      return { kind: 'same', label: '= ' + all[0] + (has.length < schemes.length ? ' (' + has.join(', ') + ')' : ''), note: 'same word everywhere the stage exists' };
    },
    function lensAgreement(stage) { var k = this.lensKind(stage); return k ? k.label : ''; },
    function lensTipLines(stage) {
      var N = this.lensNames(stage), k = this.lensKind(stage);
      return '\n' + Object.keys(N).map(function(s) { return '• ' + s + ': ' + (N[s].length ? N[s].join(', ') : '—'); }).join('\n') + (k ? '\n~ ' + k.note : '');
    },
    function renderLens_(el) {
      if ( ! this.lensOn() ) return;
      var self = this, L = this.CONFIG.lens, sch = L.schemes[this.lensIdx] || L.schemes[0];
      var peek = this.inspect && this.inspect.name !== this.current.name ? this.inspect : null, focus = peek || this.current, stage = focus.name, N = this.lensNames(stage);   // pills name the stage being looked at; the panes light both
      el.start().addClass(this.myClass('lens'))
        .start().addClass(this.myClass('lenshead'))
          .start('span').addClass(this.myClass('eyebrow')).add('In each variant\'s machines').end()
          .start('b').add(this.current.label || this.current.name).end()
          .start('span').addClass(self.myClass('badge')).addClass('here').add('you are here').end()
          .callIf(!! peek, function() { this.start('b').add('· ' + (peek.label || peek.name)).end().start('span').addClass(self.myClass('badge')).addClass('peek').add('peeking').end(); })
          .callIf(!! peek, function() { this.start('button').addClass(self.myClass('tab')).addClass('sm').attrs({ 'data-tip': '# Back to where you are\n~ same as clicking ' + (self.current.label || self.current.name) + ' on the diagram, or ✕ on the peek card' }).add('↩ show ' + (self.current.label || self.current.name)).on('click', function() { self.inspect = null; }).end(); })
          .forEach(L.schemes, function(s, i) {
            this.start('button').addClass(self.myClass('tab')).addClass('sm').enableClass('on', i === (self.lensIdx || 0))
              .attrs({ 'data-tip': '# ' + s.name + '\n' + (N[s.name].length ? N[s.name].map(function(n) { return '• ' + n; }).join('\n') : '~ no state in this stage') })
              .add(s.name + (N[s.name].length ? ' ×' + N[s.name].length : ' —'))
              .on('click', function() { self.lensIdx = i; })
            .end();
          })
          .start('span').addClass('hint').add('solid blue = where you are · dashed amber = peeked · grey = elsewhere · click a state to jump into that machine').end()
        .end()
        .start().addClass(this.myClass('lensrow'))
          .forEach(['a', 'b'], function(k) {
            var id = sch[k]; if ( ! id ) return;
            var M = foam.lookup(id), short = id.split('.').pop(), pane = self.E('div').addClass(self.myClass('diagram'));
            this.start().addClass(self.myClass('lenspane'))
              .start('b').add(sch.name + ' · ' + (L.sideLabels || [ 'side a', 'side b' ])[k === 'a' ? 0 : 1] + ' ' ).start('span').addClass(self.myClass('code')).add(M.name).end().end()
              .add(pane)
            .end();
            pane.el().then(function(node) { self.renderLensPane_(node, M, short, self.current.name, peek ? peek.name : null); });
          })
        .end()
      .end();
    },
    async function renderLensPane_(node, M, short, stage, peekStage) {   // stage = where you are (solid), peekStage = what you are peeking (dashed), both lit at once
      var self = this, L = this.CONFIG.lens, peekSet = {};
      var states = M.VALUES.map(function(v) { return { name: v.name, label: v.label || v.name, initial: v.isInitial, terminal: ! v.transitions.length }; });
      var edges = []; M.VALUES.forEach(function(v) { v.transitions.forEach(function(t) { edges.push({ from: v.name, to: t }); }); });
      var groups = this.groupsOf(M), hitSet = {};
      M.VALUES.forEach(function(v) { var st = L.stageOf(v.name); if ( st === stage ) hitSet[v.name] = true; else if ( peekStage && st === peekStage ) peekSet[v.name] = true; });
      Object.keys(groups).forEach(function(g) {                              // collapse each group to one node so the lens stays small (7 states -> 1)
        var ms = groups[g].members, inG = function(n) { return ms.indexOf(n) >= 0; };
        states = states.filter(function(st) { return ! inG(st.name); }).concat([{ name: g, label: groups[g].label, initial: false, terminal: false }]);
        var seen = {};
        edges = edges.map(function(e) { return { from: inG(e.from) ? g : e.from, to: inG(e.to) ? g : e.to }; })
                     .filter(function(e) { var k = e.from + '>' + e.to; if ( e.from === e.to || seen[k] ) return false; seen[k] = true; return true; });
        if ( ms.some(function(m) { return hitSet[m]; }) ) hitSet[g] = true;
        else if ( ms.some(function(m) { return peekSet[m]; }) ) peekSet[g] = true;
      });
      groups = {};
      var hits = states.filter(function(st) { return hitSet[st.name]; }).map(function(st) { return st.name; });
      var peeks = states.filter(function(st) { return peekSet[st.name]; }).map(function(st) { return st.name; });
      var rest = states.filter(function(st) { return ! hitSet[st.name] && ! peekSet[st.name]; }).map(function(st) { return st.name; });
      var cls = ['classDef lenshit fill:#eaf3fb,stroke:#0072B2,stroke-width:4px,font-weight:bold', 'classDef lenspeek fill:#fff3d6,stroke:#E69F00,stroke-width:3px,stroke-dasharray:6 3', 'classDef lensdim fill:#fafafa,stroke:#c8c8c8,color:#8a8a8a'];
      if ( hits.length ) cls.push('class ' + hits.join(',') + ' lenshit');
      if ( peeks.length ) cls.push('class ' + peeks.join(',') + ' lenspeek');
      if ( rest.length ) cls.push('class ' + rest.join(',') + ' lensdim');
      var d = SpikeDiagram.source(states, edges, groups, cls);
      await SpikeDiagram.render(node, d.src, d.edges, {
        groups: groups,
        nodeTip: function(name) {
          var v = M[name], G = self.groupsOf(M)[name];
          if ( ! v ) return G ? '# ' + G.label + '\n' + G.members.map(function(m) { return '• ' + m + (hitSet[m] ? ' ◀ where you are' : peekSet[m] ? ' ◁ peeked' : ''); }).join('\n') : '';
          var st = L.stageOf(name);
          return '# ' + (v.label || name) + ' `' + name + '`\n• generic stage: ' + (st || '—') + (st === stage ? ' (where you are)' : st === peekStage ? ' (peeked)' : '') + '\n~ click to jump into ' + short;
        },
        onClick: function(name) { if ( M[name] ) self.jumpTo(short, name); }
      });
    },

    function render() {
      var self = this;
      this.addClass()
        .start('h1')
          .start('a').addClass(this.myClass('home')).attrs({ href: this.CONFIG.home || '../../index.html', 'data-tip': '# All spikes\n~ the doorway page that lists every FSM page' }).add('← all FSMs').end()
          .start('a').addClass(this.myClass('home')).attrs({ href: '../../how-to-use.html', 'data-tip': '# How to use this page\n~ reading the diagram, the buttons, opening a shared folder' }).add('? how to use').end()
          .add((this.CONFIG.title || 'State machines') + ' · read-only walker')
        .end()
        .start().addClass(this.myClass('tabs'))
          .forEach(this.MACHINES, function(m, i) {
            this.start('button').addClass(self.myClass('tab')).enableClass('on', self.machineIdx$.map(function(x) { return x === i; }))
              .attrs({ 'data-tip': '# ' + m.title + '\n@ ' + m.id + (m.kind ? '\n~ ' + m.kind : '') })
              .start('b').add(m.title).end()
              .start('small').add(foam.lookup(m.id).VALUES.length + ' states').end()
              .on('click', function() { self.machineIdx = i; })
            .end();
          })
        .end()
        .start().addClass(this.myClass('rail'))
          .add(this.dynamic(function(current, machineIdx) { self.renderStateCard_(this, current, false); }))
          .add(this.dynamic(function(current, machineIdx) { self.renderTrail_(this); }))
        .end()
        .start().addClass(this.myClass('main'))
          .add(this.dynamic(function(current, machineIdx) { self.renderStepper_(this); }))
          .start().addClass(this.myClass('legendbar'))
            .start('details')
              .start('summary').add('legend').end()
              .start().addClass(self.myClass('key'))
                .start('span').start('i').addClass(self.myClass('swatch')).end().add('current').end()
                .start('span').start('i').addClass(self.myClass('swatch')).addClass('visited').end().add('visited this walk').end()
                .callIf(self.wizardSteps().length > 0, function() { this.start('span').start('i').addClass(self.myClass('swatch')).addClass('step').end().add('wizard step').end(); })
                .start('span').start('i').addClass(self.myClass('swatch')).addClass('hover').end().add('hovered state and its neighbours').end()
                .start('span').start('i').addClass(self.myClass('swatch')).addClass('peek').end().add('peeked state (the lens below follows it; click where you are to stop)').end()
                .start('span').add('[guard] = a JS guard decides; Java guards are invisible here').end()
                .callIf(!! self.CONFIG.lens, function() { this.start('span').add('= WORD: every variant uses that one word · ≠ n words: same step, each variant names it differently · n sub-states: a variant keeps several states inside this one stage (hover the state, or read the lens below)').end(); })
              .end()
            .end()
            .start('span').add('hover: see neighbours · click: move if allowed, else peek').end()
          .end()
          .start().addClass(this.myClass('diagram'))
            .start('div', null, this.diagramEl_$).end()
          .end()
          .add(this.dynamic(function(current, machineIdx, lensIdx, inspect) { self.renderLens_(this); }))
        .end()
        .start().addClass(this.myClass('peekrail'))
          .add(this.dynamic(function(inspect) {
            if ( inspect ) { self.renderStateCard_(this, inspect, true); return; }
            this.start().addClass(self.myClass('peekempty'))
              .start().addClass(self.myClass('eyebrow')).add('Peeking (not entered)').end()
              .add('Click any state on the diagram that is not a move from here. It shows up in this column: meaning, clocks, and where it sits in the other machines. Your walk on the left does not change. Esc, ✕, or clicking where you are ends the peek.')
            .end();
          }))
        .end();
      this.redraw();
    }
  ],

  listeners: [
    {
      name: 'redraw',
      isFramed: true,
      code: async function() {
        if ( ! this.diagramEl_ || typeof mermaid === 'undefined' ) return;
        var self = this, el = await this.diagramEl_.el(), d = this.mermaidSource(), M = this.machine;
        var allowed = function(name) { return self.current.transitions.indexOf(name) >= 0; };
        await SpikeDiagram.render(el, d.src, d.edges, {
          groups: d.groups,
          allowed: allowed,
          nodeTip: function(name) {
            var v = M[name]; if ( ! v ) return d.groups[name] ? d.groups[name].label : '';
            var dd = self.describe(v);
            return '# ' + (v.label || name) + ' `' + name + '`' + (dd.meaning ? '\n' + dd.meaning : '') + (self.lensOn() ? self.lensTipLines(name) : '') + (allowed(name) ? '\n~ click to move here' : (name !== self.current.name ? '\n~ click to peek' : (self.inspect ? '\n~ you are here; click to stop peeking' : '\n~ you are here')));
          },
          edgeTip: function(from, to) {
            var v = M[from], t = M[to];
            if ( ! v || ! t ) return from + ' → ' + to;
            var hint = self.transitionHint(v, to), gs = self.guardsFor(from, to);
            return '# ' + (v.label || from) + ' → ' + (t.label || to) + '\n@ ' + from + ' → ' + to + (hint ? '\n' + hint : '\n~ no sentence in the source doc explains this move') + (self.guarded(v, to) ? '\n~ a JS guard decides' : '')
              + (gs.length ? '\n\nThe Java guard refuses this when:\n' + gs.map(function(m) { return '⛔ ' + m; }).join('\n') : '');
          },
          onClick: function(name) { if ( allowed(name) ) { self.inspect = null; self.step(name); } else if ( name === self.current.name ) self.inspect = null; else if ( M[name] ) self.inspect = M[name]; }   // click where you are = stop peeking
        });
      }
    }
  ]
});
