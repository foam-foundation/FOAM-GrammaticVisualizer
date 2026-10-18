/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// A Save button: nothing changed, unsaved changes, waiting for the server, the save failed.
// Uses the app's events refinement (fsm/FSMEvents.js) for on.
foam.FSM({
  package: 'com.foamdev.grammaticvisualizer.fsm.examples',
  name: 'SaveButton',
  values: [
    { name: 'CLEAN',  label: 'clean',  isInitial: true, transitions: [ 'DIRTY' ],           on: { EDIT: 'DIRTY' } },
    { name: 'DIRTY',  label: 'dirty',  transitions: [ 'SAVING', 'CLEAN' ], on: { SAVE: 'SAVING', DISCARD: 'CLEAN' } },
    { name: 'SAVING', label: 'saving', transitions: [ 'CLEAN', 'ERROR' ],  on: { SUCCESS: 'CLEAN', FAIL: 'ERROR' } },
    { name: 'ERROR',  label: 'error',  transitions: [ 'SAVING' ],          on: { RETRY: 'SAVING' } }
  ]
});
