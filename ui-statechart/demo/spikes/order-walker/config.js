/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Walker config for the demo order machine (machines.js beside this file). Data only; the shell is fsm-walker.template.js.
window.SPIKE_WALKER = {
  title: 'Online order, read from its state machine',
  machines: [
    { id: 'demo.OrderStatus', title: 'Order', kind: 'one online order, from cart to refund' }
  ],
  groups: [ { prefix: 'RETURN_', name: 'RETURN', label: 'Return', min: 2 } ],
  shorten: function(m) { return m.replace('Status', ''); },
  links: {}
};
