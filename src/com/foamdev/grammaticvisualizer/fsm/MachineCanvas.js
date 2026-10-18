/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.fsm',
  name: 'MachineCanvas',
  extends: 'foam.u2.View',

  documentation: `
    Draws a machine (see MachineCodec) as SVG: a box per state, an arrow per
    event. Click selects a state or an arrow label, drag moves a state, and
    with connectFrom set the next state clicked publishes
    'connect'(from, to). Positions live in layout, never in the machine.
    Colours come from tokens in css; state shows by stroke weight and fill too.
  `,

  requires: [ 'com.foamdev.grammaticvisualizer.fsm.MachineCodec' ],

  constants: {
    BOX_W: 120,
    BOX_H: 44,
    COL_GAP: 200,
    ROW_GAP: 120,
    ORIGIN: 40,
    DRAG_SLOP: 3
  },

  css: `
    ^ { overflow: auto; min-height: 0; background: $backgroundDefault; border: 1px solid $borderLight; border-radius: $space-2; }
    ^ svg { display: block; touch-action: none; user-select: none; }
    ^ .state { cursor: grab; }
    ^connecting .state { cursor: crosshair; }
    ^ .state .box { fill: $backgroundSecondary; stroke: $borderStrong; stroke-width: 1.5; }
    ^ .state .name { fill: $textDefault; font-size: 1.4rem; text-anchor: middle; dominant-baseline: central; }
    ^ .state .ring { fill: none; stroke: $borderStrong; stroke-width: 1; }
    ^ .state.current .box { fill: $backgroundTertiary; stroke: $primary500; stroke-width: 3.5; }
    ^ .state.current .name { font-weight: $font-bold; }
    ^ .state.selected .box { stroke: $primary400; stroke-width: 2.5; stroke-dasharray: 6 3; }
    ^ .state.current.selected .box { stroke-width: 3.5; }
    ^ .state.problem .box { stroke: $destructive500; stroke-width: 2.5; stroke-dasharray: 2 2; }
    ^ .start-dot { fill: $textDefault; }
    ^ .start-line { stroke: $textDefault; stroke-width: 1.5; }
    ^ .arrow { cursor: pointer; }
    ^ .arrow .line { fill: none; stroke: $textSecondary; stroke-width: 1.5; }
    ^ .arrow .head { fill: $textSecondary; }
    ^ .arrow .label { fill: $textSecondary; font-size: 1.2rem; font-weight: $font-medium; text-anchor: middle; dominant-baseline: central;
                      paint-order: stroke; stroke: $backgroundDefault; stroke-width: 4px; }
    ^ .arrow.selected .line { stroke: $primary500; stroke-width: 3; }
    ^ .arrow.selected .head { fill: $primary500; }
    ^ .arrow.selected .label { fill: $primary500; }
  `,

  properties: [
    { name: 'machine', documentation: 'The machine JSON object.' },
    { name: 'layout', documentation: 'State name -> { x, y }, the top-left of its box. Missing states are placed by autoLayout.' },
    { class: 'String', name: 'current', documentation: 'The state to mark as current while stepping.' },
    { name: 'selection', value: null, documentation: "{ kind: 'state', state } | { kind: 'arrow', from, event } | null" },
    { class: 'String', name: 'connectFrom', documentation: 'When set, the next state clicked becomes the target of a new arrow from this state.' },
    { class: 'Array', name: 'problems', documentation: 'Check results; states they name are outlined.' },
    { name: 'codec', hidden: true, factory: function() { return this.MachineCodec.create(); } },
    { name: 'svg_', hidden: true },
    { name: 'drag_', hidden: true }
  ],

  methods: [
    function render() {
      var self = this;
      this.addClass().enableClass(this.myClass('connecting'), this.connectFrom$.map(function(c) { return !! c; }));
      this.svg_ = this.start('svg')
        .on('pointerdown',   function(e) { self.onDown(e); })
        .on('pointermove',   function(e) { self.onMove(e); })
        .on('pointerup',     function(e) { self.onUp(e); })
        .on('pointercancel', function()  { self.drag_ = null; self.redraw(); });
      this.svg_.end();
      [ this.machine$, this.layout$, this.current$, this.selection$, this.problems$ ].forEach(function(s) {
        self.onDetach(s.sub(self.onChange));
      });
      this.redraw();
    },

    function autoLayout(machine, layout) {
      /**
       * Keeps every stored position; places the rest in columns by distance from the
       * initial state (unreachable states in one more column), skipping taken spots.
       */
      var out = Object.assign({}, layout || {}), names = this.codec.stateNames(machine), depth = {}, order = [];
      if ( machine.initial && machine.states[machine.initial] ) {
        depth[machine.initial] = 0;
        order.push(machine.initial);
        for ( var i = 0 ; i < order.length ; i++ ) {
          var s = machine.states[order[i]], on = ( s && s.on ) || {};
          Object.keys(on).forEach(function(e) {
            var t = on[e];
            if ( machine.states[t] && depth[t] === undefined ) { depth[t] = depth[order[i]] + 1; order.push(t); }
          });
        }
      }
      var maxDepth = order.reduce(function(m, n) { return Math.max(m, depth[n]); }, -1);
      names.forEach(function(n) { if ( depth[n] === undefined ) { depth[n] = maxDepth + 1; order.push(n); } });

      // A spot is free when no placed box overlaps it, so saved positions off the grid count too.
      var self = this, placed = Object.keys(out).map(function(k) { return out[k]; });
      var free = function(p) {
        return placed.every(function(q) { return Math.abs(p.x - q.x) >= self.BOX_W + 20 || Math.abs(p.y - q.y) >= self.BOX_H + 20; });
      };
      var rows = {};
      order.forEach(function(n) {
        if ( out[n] ) return;
        var col = depth[n], row = rows[col] || 0, p;
        do { p = { x: this.ORIGIN + col * this.COL_GAP, y: this.ORIGIN + row * this.ROW_GAP }; row++; } while ( ! free(p) );
        rows[col] = row;
        placed.push(p);
        out[n] = p;
      }, this);
      return out;
    },

    function redraw(opt_positions) {
      /** Rebuilds the SVG from machine and layout (or live drag positions). */
      if ( ! this.svg_ ) return;
      var self = this, m = this.machine;
      this.svg_.removeAllChildren();
      if ( ! m || ! m.states ) return;

      var names = this.codec.stateNames(m);
      if ( ! opt_positions && names.some(function(n) { return ! ( self.layout && self.layout[n] ); }) ) {
        this.layout = this.autoLayout(m, this.layout); // fires onChange, which draws
        return;
      }
      var pos = opt_positions || this.layout, W = this.BOX_W, H = this.BOX_H;
      var maxX = 600, maxY = 400;
      names.forEach(function(n) { maxX = Math.max(maxX, pos[n].x + W + self.ORIGIN); maxY = Math.max(maxY, pos[n].y + H + self.ORIGIN); });
      this.svg_.attrs({ width: maxX, height: maxY });

      var problemStates = {};
      ( this.problems || [] ).forEach(function(p) { if ( p.state ) problemStates[p.state] = true; });
      var sel = this.selection || {};

      // Arrows first, so state boxes sit on top of their ends.
      var arrows = this.codec.arrows(m).filter(function(a) { return pos[a.to] && pos[a.from]; });
      var pairs = {};
      arrows.forEach(function(a) { pairs[a.from + '\u0000' + a.to] = ( pairs[a.from + '\u0000' + a.to] || 0 ) + 1; });
      var seen = {};
      arrows.forEach(function(a) {
        var k = a.from + '\u0000' + a.to, idx = seen[k] = ( seen[k] || 0 ) + 1;
        var reverse = !! pairs[a.to + '\u0000' + a.from] && a.from !== a.to;
        var g = self.svg_.start('g').addClass('arrow')
          .enableClass('selected', sel.kind === 'arrow' && sel.from === a.from && sel.event === a.event)
          .attrs({ 'data-from': a.from, 'data-event': a.event, 'data-to': a.to });
        var geo = a.from === a.to ? self.loopGeometry_(pos[a.from], idx) : self.arrowGeometry_(pos[a.from], pos[a.to], reverse, idx);
        g.start('path').addClass('line').attrs({ d: geo.d }).end();
        g.start('path').addClass('head').attrs({ d: geo.head }).end();
        g.start('text').addClass('label').attrs({ x: geo.lx, y: geo.ly }).add(a.event).end();
        g.end();
      });

      names.forEach(function(n) {
        var p = pos[n], isFinal = self.codec.isFinal(m, n);
        var g = self.svg_.start('g').addClass('state')
          .enableClass('initial',  m.initial === n)
          .enableClass('final',    isFinal)
          .enableClass('current',  self.current === n)
          .enableClass('selected', sel.kind === 'state' && sel.state === n)
          .enableClass('problem',  !! problemStates[n])
          .attrs({ 'data-state': n, transform: 'translate(' + p.x + ' ' + p.y + ')' });
        if ( m.initial === n ) {
          g.start('line').addClass('start-line').attrs({ x1: -22, y1: H / 2, x2: -2, y2: H / 2 }).end();
          g.start('circle').addClass('start-dot').attrs({ cx: -26, cy: H / 2, r: 5 }).end();
        }
        g.start('rect').addClass('box').attrs({ width: W, height: H, rx: 10, ry: 10 }).end();
        if ( isFinal ) g.start('rect').addClass('ring').attrs({ x: 4, y: 4, width: W - 8, height: H - 8, rx: 7, ry: 7 }).end();
        g.start('text').addClass('name').attrs({ x: W / 2, y: H / 2 }).add(n).end();
        g.end();
      });
    },

    function edgePoint_(c, tx, ty) {
      /** Where the line from box centre c toward (tx, ty) leaves the box. */
      var dx = tx - c.x, dy = ty - c.y, hw = this.BOX_W / 2, hh = this.BOX_H / 2;
      if ( ! dx && ! dy ) return { x: c.x, y: c.y };
      var s = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
      return { x: c.x + dx * s, y: c.y + dy * s };
    },

    function head_(tip, fromX, fromY) {
      var a = Math.atan2(tip.y - fromY, tip.x - fromX), L = 10, Wd = 5;
      var bx = tip.x - L * Math.cos(a), by = tip.y - L * Math.sin(a);
      var f = function(v) { return Math.round(v * 10) / 10; };
      return 'M' + f(tip.x) + ' ' + f(tip.y) +
        ' L' + f(bx + Wd * Math.sin(a)) + ' ' + f(by - Wd * Math.cos(a)) +
        ' L' + f(bx - Wd * Math.sin(a)) + ' ' + f(by + Wd * Math.cos(a)) + ' Z';
    },

    function arrowGeometry_(pf, pt, curved, idx) {
      /** A straight arrow, or a bent one when the reverse arrow exists or several events share the pair. */
      var W = this.BOX_W, H = this.BOX_H;
      var c1 = { x: pf.x + W / 2, y: pf.y + H / 2 }, c2 = { x: pt.x + W / 2, y: pt.y + H / 2 };
      var bend = ( curved ? 28 : 0 ) + ( idx - 1 ) * 22;
      var mx = ( c1.x + c2.x ) / 2, my = ( c1.y + c2.y ) / 2, dx = c2.x - c1.x, dy = c2.y - c1.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var cx = mx - dy / len * bend, cy = my + dx / len * bend;
      var a = this.edgePoint_(c1, cx, cy), b = this.edgePoint_(c2, cx, cy);
      return {
        d: bend ? 'M' + a.x + ' ' + a.y + ' Q' + cx + ' ' + cy + ' ' + b.x + ' ' + b.y : 'M' + a.x + ' ' + a.y + ' L' + b.x + ' ' + b.y,
        head: this.head_(b, bend ? cx : a.x, bend ? cy : a.y),
        lx: bend ? ( a.x + 2 * cx + b.x ) / 4 : mx,
        ly: bend ? ( a.y + 2 * cy + b.y ) / 4 : my
      };
    },

    function loopGeometry_(p, idx) {
      /** A self-loop above the box; more loops on one state stack higher. */
      var W = this.BOX_W, up = 30 + ( idx - 1 ) * 18;
      var x1 = p.x + W * 0.3, x2 = p.x + W * 0.7, y = p.y;
      var tip = { x: x2, y: y };
      return {
        d: 'M' + x1 + ' ' + y + ' C' + ( x1 - 10 ) + ' ' + ( y - up ) + ' ' + ( x2 + 10 ) + ' ' + ( y - up ) + ' ' + x2 + ' ' + y,
        head: this.head_(tip, x2 + 6, y - 12),
        lx: p.x + W / 2,
        ly: y - up * 0.75 - 6
      };
    },

    function point_(e) {
      var r = this.svg_.element_.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    },

    function onDown(e) {
      var t = e.target && e.target.closest ? e.target : null;
      var st = t && t.closest('g.state'), ar = ! st && t && t.closest('g.arrow');
      var p = this.point_(e);
      this.drag_ = {
        state: st ? st.getAttribute('data-state') : '',
        arrow: ar ? { from: ar.getAttribute('data-from'), event: ar.getAttribute('data-event') } : null,
        x0: p.x, y0: p.y, moved: false
      };
      if ( st && e.target.setPointerCapture && e.pointerId !== undefined ) { try { this.svg_.element_.setPointerCapture(e.pointerId); } catch (x) {} }
    },

    function onMove(e) {
      var d = this.drag_;
      if ( ! d || ! d.state ) return;
      var p = this.point_(e), dx = p.x - d.x0, dy = p.y - d.y0;
      if ( ! d.moved && Math.abs(dx) + Math.abs(dy) < this.DRAG_SLOP ) return;
      d.moved = true;
      var live = Object.assign({}, this.layout), o = this.layout[d.state];
      live[d.state] = { x: Math.round(o.x + dx), y: Math.round(o.y + dy) };
      d.live = live;
      this.redraw(live);
    },

    function onUp(e) {
      var d = this.drag_;
      this.drag_ = null;
      if ( ! d ) return;
      if ( d.moved && d.live ) { this.layout = d.live; return; }
      if ( d.state && this.connectFrom ) {
        var from = this.connectFrom;
        this.connectFrom = '';
        this.pub('connect', from, d.state);
        return;
      }
      if ( d.state )      this.selection = { kind: 'state', state: d.state };
      else if ( d.arrow ) this.selection = { kind: 'arrow', from: d.arrow.from, event: d.arrow.event };
      else                this.selection = null;
    }
  ],

  listeners: [
    {
      name: 'onChange',
      isFramed: true,
      code: function() { if ( ! this.drag_ ) this.redraw(); }
    }
  ]
});
