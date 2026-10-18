/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.test',
  name: 'StateMachineStudioViewTest',
  extends: 'foam.core.test.JSTest',

  requires: [
    'com.foamdev.grammaticvisualizer.fsm.Machine',
    'com.foamdev.grammaticvisualizer.fsm.StateMachineStudioView',
    'foam.dao.MDAO',
    'foam.u2.ControllerMode'
  ],

  documentation: `
    The state machine studio screen: loads a machine from machineDAO, keeps the
    JSON and the canvas in sync both ways, steps it, lists checks, shows the
    foam.FSM and Mermaid code, saves, and uses only foam views for controls.
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
        for ( var t = 0 ; t < ( ms || 4000 ) ; t += 50 ) { if ( await fn() ) return true; await wait(50); }
        return false;
      };
      var saveJSON = JSON.stringify({
        id: 'saveButton', initial: 'clean',
        states: {
          clean:  { on: { EDIT: 'dirty' } },
          dirty:  { on: { SAVE: 'saving', DISCARD: 'clean' } },
          saving: { on: { SUCCESS: 'clean', FAIL: 'error' } },
          error:  { on: { RETRY: 'saving' } }
        }
      }, null, 2);

      var dao = this.MDAO.create({ of: this.Machine }, x);
      await dao.put(this.Machine.create({ id: 1, name: 'Save button', description: 'A Save button', definition: saveJSON, layout: '' }, x));
      var stubs = { auth: { check: async function() { return true; } }, ctrl: { notify: function() {}, pub: function() {}, sub: function() {}, add: function() { return this; } } };
      var y = x.createSubContext(Object.assign({ machineDAO: dao, controllerMode: this.ControllerMode.EDIT }, stubs));

      var v = this.StateMachineStudioView.create({}, y);
      v.write();
      var root = v.element_;
      var qa = function(sel) { return Array.from(root.querySelectorAll(sel)); };
      var states = function() { return qa('g.state').length; };
      var text = function() { return root.textContent; };

      x.test(await until(function() { return states() === 4; }), 'the first machine in machineDAO loads: 4 states on the canvas (got ' + states() + ')');
      x.test(v.foamSource.indexOf("on: { EDIT: 'DIRTY' }") >= 0, 'the foam.FSM code shows the on map');
      x.test(v.mermaid.indexOf('stateDiagram-v2') === 0, 'the Mermaid code is a state diagram');

      // Moving a box is an unsaved change; positions placed by the canvas itself are not.
      await wait(200);
      x.test(v.dirty === false, 'a freshly loaded machine is not dirty, though the canvas placed its boxes');
      var drag = function(name, dx, dy) {
        var el = root.querySelector('g.state[data-state="' + name + '"]'), svg = el.ownerSVGElement, r = el.getBoundingClientRect();
        var fire = function(t, type, cx, cy) { t.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: cx, clientY: cy, pointerId: 1, button: 0, isPrimary: true })); };
        fire(el, 'pointerdown', r.left + 5, r.top + 5);
        fire(svg, 'pointermove', r.left + 5 + dx / 2, r.top + 5 + dy / 2);
        fire(svg, 'pointermove', r.left + 5 + dx, r.top + 5 + dy);
        fire(svg, 'pointerup', r.left + 5 + dx, r.top + 5 + dy);
      };
      var placedAt = JSON.stringify(v.layout.clean);
      drag('clean', 60, 40);
      x.test(v.dirty === true && JSON.stringify(v.layout.clean) !== placedAt, 'dragging a box makes the screen dirty');
      v.discardChanges();
      x.test(await until(function() { return v.dirty === false && JSON.stringify(v.layout.clean) === placedAt; }), 'Discard changes puts the box back: ' + JSON.stringify(v.layout.clean));

      // JSON -> canvas
      var m = JSON.parse(saveJSON);
      m.states.extra = { type: 'final' };
      v.definitionText = JSON.stringify(m, null, 2);
      x.test(await until(function() { return states() === 5; }), 'editing the JSON adds a state on the canvas');

      // Broken JSON keeps the last good machine.
      var threw = false;
      try { v.definitionText = '{'; } catch (e) { threw = true; }
      await wait(150);
      x.test(! threw && states() === 5 && v.parseError !== '', 'invalid JSON: no throw, canvas keeps 5 states, error shown: ' + v.parseError);
      v.definitionText = '{"states":5}';
      await wait(150);
      x.test(states() === 5 && v.parseError === '"states" must be an object', 'JSON that is not a machine: canvas unchanged');
      v.definitionText = JSON.stringify(m, null, 2);
      await until(function() { return v.parseError === ''; });

      // canvas -> JSON: rename a state through the inspector.
      v.selection = { kind: 'state', state: 'clean' };
      await until(function() { return v.stateName === 'clean'; });
      x.test(v.stateName === 'clean', 'selecting a state fills the inspector name');
      v.stateName = 'start';
      x.test(await until(function() { return v.definitionText.indexOf('"start"') >= 0 && v.definitionText.indexOf('"initial": "start"') >= 0; }), 'renaming in the inspector rewrites the JSON, initial included');
      x.test(v.selection && v.selection.state === 'start', 'the selection follows the rename');

      var beforeText = v.definitionText;
      v.stateName = 'dirty';
      await wait(100);
      x.test(v.definitionText === beforeText && v.opError === 'A state named "dirty" already exists.', 'a rename to an existing name is refused and shown: ' + v.opError);

      // Stepping
      var stepBtn = function(ev) {
        return qa('.foam-u2-ActionView').filter(function(b) { return b.closest('[data-step-row]') && b.textContent.trim() === ev; })[0];
      };
      await until(function() { return !! stepBtn('EDIT'); });
      x.test(stepBtn('EDIT') && ! stepBtn('EDIT').disabled, 'Step row: EDIT is enabled at the initial state');
      x.test(stepBtn('SAVE') && stepBtn('SAVE').disabled, 'Step row: SAVE is disabled at the initial state');
      stepBtn('EDIT').click();
      x.test(await until(function() { return v.runner.current === 'dirty'; }), 'clicking EDIT steps to dirty');
      x.test(await until(function() { return stepBtn('SAVE') && ! stepBtn('SAVE').disabled; }), 'after EDIT, SAVE is enabled');
      x.test(await until(function() { return qa('[data-step-history] .step').length === 1; }), 'the Steps tab lists one step');
      x.test(await until(function() { return qa('g.state.current[data-state="dirty"]').length === 1; }), 'the canvas marks dirty as current');

      // Checks
      v.selection = { kind: 'state', state: 'start' };
      await until(function() { return v.stateName === 'start'; });
      v.deleteState();
      x.test(await until(function() { return /Checks \(\d+\)/.test(text()) && ! /Checks \(0\)/.test(text()); }), 'deleting the initial state: the Checks tab counts problems');
      var checksTab = qa('.foam-u2-SegmentedTabs-tabRow > *').filter(function(e) { return /Checks/.test(e.textContent); })[0];
      checksTab && checksTab.click();
      x.test(await until(function() { return text().indexOf('No initial state.') >= 0; }), 'opening the Checks tab lists "No initial state."');

      // Save
      v.name = 'Save button 2';
      v.saveMachine();
      var stored = null;
      await until(async function() { stored = await dao.find(1); return stored && stored.name === 'Save button 2'; });
      x.test(stored && stored.name === 'Save button 2' && stored.definition === v.definitionText, 'saveMachine stores the name and JSON');
      x.test(stored && JSON.parse(stored.layout || '{}').dirty, 'saveMachine stores the canvas positions');

      // A state named like an enum field (view) works end to end, and the JSON follows.
      v.selection = { kind: 'state', state: 'dirty' };
      await until(function() { return v.stateName === 'dirty'; });
      v.stateName = 'view';
      x.test(await until(function() { return v.definitionText.indexOf('"view"') >= 0 && !! root.querySelector('g.state[data-state="view"]'); }), 'renaming a state to "view" updates the JSON and the canvas');
      x.test(v.runner.error === '' || v.runner.error === 'No initial state.', 'the runner accepts a state named view: ' + v.runner.error);

      // Keys the studio does not draw are named under the JSON.
      var withMeta = JSON.parse(v.definitionText); withMeta.meta = { k: 1 };
      v.definitionText = JSON.stringify(withMeta, null, 2);
      x.test(await until(function() { return text().indexOf('meta') >= 0 && /not drawn/.test(text()); }), 'unknown keys get a "not drawn" note');

      // Unsaved changes are not thrown away by picking another machine.
      await dao.put(this.Machine.create({ id: 2, name: 'Login form', definition: JSON.stringify({ initial: 'start', states: { start: { on: { SUBMIT: 'done' } }, done: { type: 'final' } } }), layout: '' }, x));
      x.test(v.dirty === true, 'after edits the screen is dirty');
      v.machineId = 2;
      await wait(300);
      x.test(v.machineId === 1 && v.opError === v.UNSAVED_BLOCK, 'picking another machine with unsaved changes is refused: ' + v.opError);
      x.test(v.NEW_MACHINE.confirmationRequired && v.OPEN_FOAM_FSM.confirmationRequired && v.DELETE_MACHINE.confirmationRequired, 'New, Open and Delete ask for confirmation');
      v.discardChanges();
      x.test(await until(function() { return v.dirty === false; }), 'Discard changes reloads the saved machine and clears dirty');
      v.machineId = 2;
      x.test(await until(function() { return v.name === 'Login form' && !! root.querySelector('g.state[data-state="start"]'); }), 'with nothing unsaved, picking another machine loads it');

      // A slow load must not land after a later pick.
      var realFind = dao.find.bind(dao);
      dao.find = function(id) { var p = realFind(id); return id === 1 ? p.then(function(o) { return wait(400).then(function() { return o; }); }) : p; };
      v.machineId = 1;
      v.machineId = 2;
      await wait(700);
      x.test(v.machineId === 2 && v.name === 'Login form', 'a slow earlier load does not overwrite a later pick (name ' + v.name + ')');
      dao.find = realFind;

      // Open a foam.FSM class from the Import tab.
      v.foamClassId = 'no.such.Machine';
      v.openFoamFSM();
      x.test(v.importNotes === v.NOT_A_FSM, 'opening an unknown class id says so: ' + v.importNotes);
      v.foamClassId = 'com.foamdev.grammaticvisualizer.fsm.examples.LoginForm';
      v.openFoamFSM();
      x.test(await until(function() { return qa('g.state').length === 4 && !! root.querySelector('g.state[data-state="loading"]'); }), 'opening the LoginForm example draws its 4 states');
      x.test(v.machineId === 0 && v.machine.initial === 'start', 'an opened class is a new, unsaved machine starting at start');

      // Renaming a state in the JSON keeps its box where it was, and leaves no old key behind.
      await until(function() { return !! ( v.layout && v.layout.success ); });
      var successAt = JSON.stringify(v.layout.success);
      v.definitionText = v.definitionText.replace(/"success"/g, '"done"');
      x.test(await until(function() { return !! root.querySelector('g.state[data-state="done"]'); }), 'renaming success to done in the JSON redraws it');
      x.test(JSON.stringify(v.layout.done) === successAt && ! ( 'success' in v.layout ), 'and done keeps the place success had: ' + JSON.stringify(v.layout));

      // The arrow inspector shows the arrow's current target.
      var inspectorHas = function(s) { return qa('span').some(function(e) { return e.textContent === s; }); };
      v.selection = { kind: 'arrow', from: 'loading', event: 'REJECT' };
      x.test(await until(function() { return inspectorHas('→ error'); }), 'selecting loading on REJECT shows its target error');
      v.definitionText = v.definitionText.replace('"REJECT": "error"', '"REJECT": "start"');
      x.test(await until(function() { return inspectorHas('→ start'); }), 'retargeting it in the JSON updates the inspector to start');

      // A check about an arrow selects the arrow.
      v.definitionText = v.definitionText.replace('"REJECT": "start"', '"REJECT": "nowhere"');
      var checksTab2 = qa('.foam-u2-SegmentedTabs-tabRow > *').filter(function(e) { return /Checks/.test(e.textContent); })[0];
      checksTab2 && checksTab2.click();
      var row = null;
      await until(function() { row = qa('.' + v.myClass('check')).filter(function(e) { return /"nowhere"/.test(e.textContent); })[0]; return !! row; });
      row && row.click();
      x.test(v.selection && v.selection.kind === 'arrow' && v.selection.from === 'loading' && v.selection.event === 'REJECT', 'clicking the "goes to nowhere" check selects that arrow: ' + JSON.stringify(v.selection));
      v.definitionText = v.definitionText.replace('"REJECT": "nowhere"', '"REJECT": "error"');

      // Final asks before it removes arrows.
      v.selection = { kind: 'state', state: 'loading' };
      var ask = v.TOGGLE_FINAL.confirmationView(y, v);
      x.test(ask && ask.body.indexOf('RESOLVE → done') >= 0 && ask.body.indexOf('REJECT → error') >= 0, 'Final on a state with arrows asks first, and names the arrows it removes: ' + JSON.stringify(ask));
      v.selection = { kind: 'state', state: 'done' };
      x.test(v.TOGGLE_FINAL.confirmationView(y, v) === null, 'Final on a state with no arrows does not ask');

      // A file that is not a machine is explained on the Import tab, and the JSON is left alone.
      v.parseError = '';
      v.openText('{ not json');
      x.test(v.importNotes.indexOf(v.FILE_NOT_A_MACHINE) === 0 && v.parseError === '', 'a bad file is explained in the Import notes, not as a JSON error: ' + v.importNotes);

      // Only foam views for controls.
      var raw = qa('button, input, select, textarea').filter(function(e) {
        if ( e.type === 'file' ) return false; // FileUploadTextField's hidden input
        for ( var n = e, i = 0 ; n && i < 3 ; n = n.parentElement, i++ ) {
          if ( Array.from(n.classList || []).some(function(c) { return c.indexOf('foam-u2-') === 0; }) ) return false;
        }
        return true;
      });
      x.test(raw.length === 0, 'no raw controls outside foam views (' + raw.map(function(e) { return e.tagName; }).join(',') + ')');

      v.remove && v.remove();
    }
  ]
});
