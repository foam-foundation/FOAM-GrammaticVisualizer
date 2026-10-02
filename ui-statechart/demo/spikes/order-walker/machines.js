/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Demo machines for the ui-statechart examples: one online order.
// demo.OrderStatus is the whole order as one machine (the walker page).
// demo.BuyerOrderStatus and demo.SellerOrderStatus are the same order seen by each party (the conversation page).
// A guard returns the reason a move is REFUSED ('' allows it); the pages show that reason.

foam.FSM({
  package: 'demo',
  name: 'OrderStatus',
  values: [
    { name: 'CART', label: 'In the cart', isInitial: true, transitions: [ 'CHECKOUT', 'CANCELLED' ],
      documentation: 'The buyer is still choosing items. Nothing is reserved yet.' },
    { name: 'CHECKOUT', label: 'At checkout', transitions: [ 'PAID', 'CART', 'CANCELLED' ],
      documentation: 'The buyer entered a delivery address and is paying, or goes back to the cart.',
      guards: { PAID: function(x, obj) { return obj && obj.address === '' ? 'Add a delivery address first.' : ''; } } },
    { name: 'PAID', label: 'Paid', transitions: [ 'SHIPPED', 'CANCELLED' ],
      documentation: 'Payment is taken. The seller has 3 days to ship, or the order is cancelled and refunded.' },
    { name: 'SHIPPED', label: 'Shipped', transitions: [ 'DELIVERED' ],
      documentation: 'The parcel is with the carrier. It cannot be cancelled now, only returned after delivery.' },
    { name: 'DELIVERED', label: 'Delivered', transitions: [ 'RETURN_REQUESTED', 'COMPLETED' ],
      documentation: 'The buyer has the parcel. A return can be asked for within 30 days, then the order completes.' },
    { name: 'RETURN_REQUESTED', label: 'Return requested', transitions: [ 'RETURN_RECEIVED', 'COMPLETED' ],
      documentation: 'The buyer asked to send it back. If nothing arrives within 14 days, the order completes.' },
    { name: 'RETURN_RECEIVED', label: 'Return received', transitions: [ 'REFUNDED' ],
      documentation: 'The seller has the parcel back and refunds the buyer.' },
    { name: 'REFUNDED', label: 'Refunded', documentation: 'The money went back to the buyer. Finished.' },
    { name: 'COMPLETED', label: 'Completed', documentation: 'Kept by the buyer. Finished.' },
    { name: 'CANCELLED', label: 'Cancelled', documentation: 'Stopped before shipping; any payment was refunded. Finished.' }
  ]
});

foam.FSM({
  package: 'demo',
  name: 'BuyerOrderStatus',
  values: [
    { name: 'CART', label: 'In the cart', isInitial: true, transitions: [ 'WAITING', 'CANCELLED' ],
      documentation: 'Choosing items.' },
    { name: 'WAITING', label: 'Waiting for the parcel', transitions: [ 'RECEIVED', 'CANCELLED' ],
      documentation: 'Paid. The seller holds the turn: they must ship within 3 days.' },
    { name: 'RECEIVED', label: 'Received', transitions: [ 'RETURNING', 'KEPT' ],
      documentation: 'The parcel arrived. The buyer holds the turn: return within 30 days, or keep it.' },
    { name: 'RETURNING', label: 'Sending it back', transitions: [ 'REFUNDED', 'KEPT' ],
      documentation: 'The buyer asked for a return and must post the parcel within 14 days.' },
    { name: 'REFUNDED', label: 'Refunded', documentation: 'Money back. Finished.' },
    { name: 'KEPT', label: 'Kept', documentation: 'The buyer keeps the item. Finished.' },
    { name: 'CANCELLED', label: 'Cancelled', documentation: 'Stopped before shipping, money back. Finished.' }
  ]
});

foam.FSM({
  package: 'demo',
  name: 'SellerOrderStatus',
  values: [
    { name: 'TO_SHIP', label: 'To ship', isInitial: true, transitions: [ 'SHIPPED', 'CANCELLED' ],
      documentation: 'A paid order arrived. Ship within 3 days, or it is cancelled and refunded.' },
    { name: 'SHIPPED', label: 'Shipped', transitions: [ 'RETURN_EXPECTED', 'REFUND_SENT', 'DONE' ],
      documentation: 'The parcel is on its way. Nothing to do unless the buyer asks for a return; a goodwill refund is allowed.' },
    { name: 'RETURN_EXPECTED', label: 'Return expected', transitions: [ 'REFUND_SENT', 'DONE' ],
      documentation: 'The buyer asked for a return. Refund once the parcel is back.' },
    { name: 'REFUND_SENT', label: 'Refund sent', documentation: 'Money returned. Finished.' },
    { name: 'DONE', label: 'Done', documentation: 'The buyer kept the item. Finished.' },
    { name: 'CANCELLED', label: 'Cancelled', documentation: 'Not shipped in time; refunded. Finished.' }
  ]
});
