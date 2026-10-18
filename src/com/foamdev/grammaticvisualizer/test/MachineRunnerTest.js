/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.test',
  name: 'MachineRunnerTest',
  extends: 'foam.core.test.JSTest',

  requires: [ 'com.foamdev.grammaticvisualizer.fsm.MachineRunner' ],

  documentation: `
    MachineRunner steps a machine on a runtime foam.FSM class built from it,
    through the app's send<Name>(event) refinement.
  `,

  methods: [
    async function runTest(x) {
      // A throw inside the body would lose every result already recorded; report it as one failure instead.
      try { await this.runTest_(x); }
      catch (e) { x.test(false, 'test body threw: ' + (e && e.stack || e)); }
    },

    async function runTest_(x) {
      var save = function() {
        return {
          id: 'saveButton', initial: 'clean',
          states: {
            clean:  { on: { EDIT: 'dirty' } },
            dirty:  { on: { SAVE: 'saving', DISCARD: 'clean' } },
            saving: { on: { SUCCESS: 'clean', FAIL: 'error' } },
            error:  { on: { RETRY: 'saving' } }
          }
        };
      };

      var r = this.MachineRunner.create({ machine: save() }, x);
      x.test(r.current === 'clean', 'starts at the initial state');
      x.test(r.handles('EDIT') === true && r.handles('SAVE') === false, 'handles: EDIT yes, SAVE no at clean');

      for ( var e of [ 'EDIT', 'SAVE', 'FAIL', 'RETRY', 'SUCCESS' ] ) await r.send(e);
      x.test(r.current === 'clean', 'EDIT, SAVE, FAIL, RETRY, SUCCESS ends at clean (got ' + r.current + ')');
      x.test(r.history.length === 5, 'history has 5 steps');
      x.test(JSON.stringify(r.history[2]) === JSON.stringify({ from: 'saving', event: 'FAIL', to: 'error' }), 'a history step is { from, event, to }');
      x.test(r.error === '', 'no error after valid steps');

      await r.send('SAVE');
      x.test(r.current === 'clean' && r.error.indexOf('"SAVE" is not handled') >= 0, 'an unhandled event sets error and stays: ' + r.error);

      r.machine = { initial: 'a', states: { a: { on: { GO: 'done' } }, done: { type: 'final' } } };
      x.test(r.history.length === 0 && r.current === 'a', 'a new machine restarts from its initial state');
      await r.send('GO');
      x.test(r.current === 'done' && r.finished === true && r.handles('GO') === false, 'a final state: finished, nothing handled');

      r.machine = { states: { a: { type: 'final' } } };
      x.test(r.error === 'No initial state.' && r.current === '', 'a machine with a blocking problem does not start');

      // Editing mid-step: the old step must not land on the new machine.
      r.machine = save();
      var pending = r.send('EDIT');
      r.machine = { initial: 'x', states: { x: { on: { EDIT: 'y' } }, y: { type: 'final' } } };
      await pending;
      x.test(r.current === 'x' && r.history.length === 0, 'a step started before an edit does not land on the new machine (current ' + r.current + ')');
      x.test(r.busy === false, 'not busy after the stale step ends');

      r.machine = { initial: 'loading data', states: { 'loading data': { on: { GO: '2fa' } }, '2fa': { type: 'final' } } };
      await r.send('GO');
      x.test(r.current === '2fa', 'state names that are not identifiers step and come back by their own name');

      r.start();
      x.test(r.current === 'loading data' && r.history.length === 0, 'start() resets to the initial state');
    }
  ]
});
