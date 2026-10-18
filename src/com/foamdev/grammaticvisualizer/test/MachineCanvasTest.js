/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.test',
  name: 'MachineCanvasTest',
  extends: 'foam.core.test.JSTest',

  requires: [ 'com.foamdev.grammaticvisualizer.fsm.MachineCanvas' ],

  documentation: `
    The state machine canvas: one group per state and per arrow, the current
    state marked, select by click, move by drag, connect two states, problems
    outlined, and no inline colours.
  `,

  methods: [
    async function runTest(x) {
      // A throw inside the body would lose every result already recorded; report it as one failure instead.
      try { await this.runTest_(x); }
      catch (e) { x.test(false, 'test body threw: ' + (e && e.stack || e)); }
    },

    async function runTest_(x) {
      var wait  = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };
      var until = async function(fn, ms) {
        for ( var t = 0 ; t < ( ms || 3000 ) ; t += 50 ) { if ( await fn() ) return true; await wait(50); }
        return false;
      };
      var save = {
        id: 'saveButton', initial: 'clean',
        states: {
          clean:  { on: { EDIT: 'dirty' } },
          dirty:  { on: { SAVE: 'saving', DISCARD: 'clean' } },
          saving: { on: { SUCCESS: 'clean', FAIL: 'error' } },
          error:  { on: { RETRY: 'saving' } }
        }
      };

      var v = this.MachineCanvas.create({ machine: save, layout: {} }, x);
      v.write();
      var root = v.element_;
      var q  = function(sel) { return root.querySelector(sel); };
      var qa = function(sel) { return Array.from(root.querySelectorAll(sel)); };
      var stateEl = function(n) { return q('g.state[data-state="' + n + '"]'); };
      var svg = q('svg');
      var fire = function(el, type, cx, cy) {
        el.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: cx, clientY: cy, pointerId: 1, button: 0, isPrimary: true }));
      };
      var click = function(el) {
        var r = el.getBoundingClientRect(), cx = r.left + 5, cy = r.top + 5;
        fire(el, 'pointerdown', cx, cy); fire(svg, 'pointerup', cx, cy);
      };

      await until(function() { return qa('g.state').length === 4; });
      x.test(qa('g.state').length === 4, '4 state groups (got ' + qa('g.state').length + ')');
      x.test(qa('g.arrow').length === 6, '6 arrow groups (got ' + qa('g.arrow').length + ')');
      var labels = qa('g.arrow text').map(function(t) { return t.textContent; });
      x.test(labels.indexOf('SAVE') >= 0 && labels.indexOf('RETRY') >= 0, 'arrow labels name their events: ' + labels.join(','));
      x.test(stateEl('clean') && stateEl('clean').classList.contains('initial'), 'the initial state is marked');

      v.current = 'dirty';
      await until(function() { return qa('g.state.current').length === 1; });
      x.test(qa('g.state.current').length === 1 && qa('g.state.current')[0].getAttribute('data-state') === 'dirty', 'exactly one current state: dirty');

      // Layout: every state placed, distinct; a stored position is kept.
      var pos = v.layout, keys = Object.keys(pos);
      var distinct = new Set(keys.map(function(k) { return pos[k].x + ',' + pos[k].y; })).size;
      x.test(keys.length === 4 && distinct === 4, 'autoLayout places all 4 states at distinct points');
      x.test(JSON.stringify(v.autoLayout(save, { clean: { x: 500, y: 500 } }).clean) === JSON.stringify({ x: 500, y: 500 }), 'autoLayout keeps a stored position');

      click(stateEl('clean'));
      x.test(v.selection && v.selection.kind === 'state' && v.selection.state === 'clean', 'clicking a state selects it');
      await until(function() { return stateEl('clean') && stateEl('clean').classList.contains('selected'); });
      x.test(stateEl('clean').classList.contains('selected'), 'the selected state is marked');

      var arrowLabel = qa('g.arrow').filter(function(g) { return g.getAttribute('data-event') === 'RETRY'; })[0];
      click(arrowLabel.querySelector('text'));
      x.test(v.selection && v.selection.kind === 'arrow' && v.selection.from === 'error' && v.selection.event === 'RETRY', 'clicking an arrow label selects the arrow');

      var r0 = svg.getBoundingClientRect();
      fire(svg, 'pointerdown', r0.right - 2, r0.bottom - 2); fire(svg, 'pointerup', r0.right - 2, r0.bottom - 2);
      x.test(v.selection === null, 'clicking empty space clears the selection');

      var before = Object.assign({}, v.layout.clean), el = stateEl('clean'), r = el.getBoundingClientRect();
      fire(el, 'pointerdown', r.left + 5, r.top + 5);
      fire(svg, 'pointermove', r.left + 30, r.top + 20);
      fire(svg, 'pointermove', r.left + 55, r.top + 35);
      fire(svg, 'pointerup', r.left + 55, r.top + 35);
      x.test(v.layout.clean.x === before.x + 50 && v.layout.clean.y === before.y + 30, 'dragging a state moves it by the pointer delta (' + JSON.stringify(before) + ' -> ' + JSON.stringify(v.layout.clean) + ')');

      var got = null;
      v.sub('connect', function(_, __, from, to) { got = [ from, to ]; });
      v.connectFrom = 'error';
      click(stateEl('clean'));
      x.test(got && got[0] === 'error' && got[1] === 'clean', 'with connectFrom set, clicking a state publishes connect(from, to)');
      x.test(v.connectFrom === '', 'connecting clears connectFrom');

      v.problems = [ { kind: 'dead-end', state: 'error', message: 'x', blocking: false } ];
      await until(function() { return !! q('g.state.problem[data-state="error"]'); });
      x.test(!! q('g.state.problem[data-state="error"]'), 'a state named in a problem is outlined');

      v.machine = { initial: 'a', states: { a: { on: { GO: 'a' } }, b: { type: 'final' } } };
      await until(function() { return qa('g.state').length === 2; });
      x.test(qa('g.arrow').length === 1 && stateEl('b').classList.contains('final'), 'a new machine redraws; final states are marked; a self-loop draws');

      var coloured = qa('*').filter(function(e) { return /#[0-9a-f]{3}|rgb|hsl/i.test(e.getAttribute('style') || ''); });
      x.test(coloured.length === 0, 'no inline colours in the canvas (' + coloured.length + ')');

      v.remove && v.remove();
    }
  ]
});
