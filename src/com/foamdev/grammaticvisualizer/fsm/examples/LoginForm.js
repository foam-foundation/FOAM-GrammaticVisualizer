/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// A login form, after David Khourshid's "The (Switch)-Case for State Machines in User Interfaces" (24ways, 2018).
// Uses the app's events refinement (fsm/FSMEvents.js) for on.
foam.FSM({
  package: 'com.foamdev.grammaticvisualizer.fsm.examples',
  name: 'LoginForm',
  values: [
    { name: 'START',   label: 'start',   isInitial: true, transitions: [ 'LOADING' ], on: { SUBMIT: 'LOADING' } },
    { name: 'LOADING', label: 'loading', transitions: [ 'SUCCESS', 'ERROR' ], on: { RESOLVE: 'SUCCESS', REJECT: 'ERROR' } },
    { name: 'ERROR',   label: 'error',   transitions: [ 'LOADING' ], on: { SUBMIT: 'LOADING' } },
    { name: 'SUCCESS', label: 'success', transitions: [] }
  ]
});
