/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.test',
  name: 'FSMEventsTest',
  extends: 'foam.core.test.JSTest',

  documentation: `
    The app's events refinement of foam.FSM (fsm/FSMEvents.js): each state has
    an on map (event -> target), and a record gets send<Name>(event), which
    moves through foam3's own transition<Name>To so history records the event.
  `,

  methods: [
    async function runTest(x) {
      // A throw inside the body would lose every result already recorded; report it as one failure instead.
      try { await this.runTest_(x); }
      catch (e) { x.test(false, 'test body threw: ' + (e && e.stack || e)); }
    },

    async function runTest_(x) {
      var rejects = async function(p) { try { await p; return ''; } catch (e) { return e.message; } };

      foam.FSM({
        package: 'com.foamdev.grammaticvisualizer.test',
        name: 'EventsTestFSM',
        values: [
          { name: 'CLEAN',  isInitial: true, transitions: [ 'DIRTY' ], on: { EDIT: 'DIRTY' } },
          { name: 'DIRTY',  transitions: [ 'SAVING', 'CLEAN' ], on: { SAVE: 'SAVING', DISCARD: 'CLEAN' } },
          { name: 'SAVING', transitions: [] },
          { name: 'BROKEN', transitions: [], on: { GO: 'CLEAN' } }
        ]
      });
      foam.CLASS({
        package: 'com.foamdev.grammaticvisualizer.test',
        name: 'EventsTestHolder',
        properties: [ { class: 'StateMachine', of: 'com.foamdev.grammaticvisualizer.test.EventsTestFSM', name: 'status' } ]
      });
      var F = foam.lookup('com.foamdev.grammaticvisualizer.test.EventsTestFSM');
      var H = foam.lookup('com.foamdev.grammaticvisualizer.test.EventsTestHolder');

      x.test(F.DIRTY.on && F.DIRTY.on.SAVE === 'SAVING', 'a state keeps its on map (DIRTY.on.SAVE is SAVING)');

      var h = H.create({ status: F.CLEAN }, x);
      x.test(typeof h.sendStatus === 'function', 'a StateMachine property named status adds sendStatus');

      await h.sendStatus('EDIT');
      x.test(h.status === F.DIRTY, 'EDIT moves CLEAN to DIRTY');
      x.test(h.statusHistory.length === 1 && h.statusHistory[0].note === 'EDIT', 'the history note records the event');

      var msg = await rejects(h.sendStatus('NOPE'));
      x.test(msg.indexOf('"NOPE" is not handled in state DIRTY') >= 0, 'an unknown event fails with a clear message: ' + msg);
      x.test(h.status === F.DIRTY, 'a failed send leaves the state alone');

      var b = H.create({ status: F.BROKEN }, x);
      msg = await rejects(b.sendStatus('GO'));
      x.test(msg.indexOf('not in transitions of BROKEN') >= 0, 'an on target missing from transitions fails: ' + msg);
    }
  ]
});
