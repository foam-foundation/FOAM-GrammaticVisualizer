/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.fsm',
  name: 'Machine',

  documentation: `
    A state machine saved by the state machine studio. definition is the
    machine as XState-shaped JSON text (see MachineCodec); layout holds the
    canvas positions, kept out of the JSON so the JSON stays plain XState.
  `,

  tableColumns: [ 'id', 'name', 'description' ],

  properties: [
    {
      class: 'Long',
      name: 'id'
    },
    {
      class: 'String',
      name: 'name',
      required: true
    },
    {
      class: 'String',
      name: 'description'
    },
    {
      class: 'String',
      name: 'definition',
      documentation: 'The machine as XState-shaped JSON text.',
      view: { class: 'foam.u2.tag.TextArea', rows: 16 }
    },
    {
      class: 'String',
      name: 'layout',
      documentation: 'Canvas positions as JSON text: state name -> { x, y }.',
      hidden: true
    }
  ]
});
