/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Two-party config for the demo order: the buyer (side a) and the seller (side b) each have their own machine
// (../order-walker/machines.js) and share one order record. Data only; the shell is two-party.template.js.
window.SPIKE_CONVERSATION = {
  title: 'Online order: buyer and seller, step by step',
  subtitle: 'joint state = the shared order record; moves = the messages each side sends, plus two timers',
  middleLabel: 'Carrier / the clock can',
  sides: {
    a: { fsm: 'demo.BuyerOrderStatus',  title: 'Buyer',  short: 'buyer',  tag: 'B', initial: 'CART' },
    b: { fsm: 'demo.SellerOrderStatus', title: 'Seller', short: 'seller', tag: 'S', initial: null }   // no seller record until the buyer pays
  },
  row: {
    initial: function() { return { paid: false, shipped: false, returnAsked: false, parcelBack: false, refunded: false }; },
    fields:  function(r) { return [
      [ 'Payment taken?',      r.paid ? 'yes' : 'not yet' ],
      [ 'Parcel shipped?',     r.shipped ? 'yes' : 'not yet' ],
      [ 'Return asked?',       r.returnAsked ? 'yes' : 'no' ],
      [ 'Parcel back?',        r.parcelBack ? 'yes' : 'no' ],
      [ 'Money returned?',     r.refunded ? 'yes' : 'no' ]
    ]; }
  },
  events: [
    { id: 'pay', who: 'a', how: 'wired', label: 'Pay for the order',
      when: function(r, A, B) { return A === 'CART'; },
      row: function(r) { r.paid = true; },
      a: 'WAITING', b: 'TO_SHIP', text: 'The buyer pays; the seller gets a paid order to ship.' },
    { id: 'ship', who: 'b', how: 'wired', label: 'Ship the parcel',
      when: function(r, A, B) { return B === 'TO_SHIP'; },
      row: function(r) { r.shipped = true; },
      a: null, b: 'SHIPPED', text: 'The seller hands the parcel to the carrier. The buyer only learns of it on delivery.' },
    { id: 'deliver', who: 'third', how: 'wired', label: 'Carrier delivers',
      when: function(r, A, B) { return A === 'WAITING' && r.shipped; },
      row: function(r) {},
      a: 'RECEIVED', b: null, text: 'The parcel arrives.' },
    { id: 'no-ship', who: 'third', how: 'clock', label: '3 days pass, nothing shipped',
      when: function(r, A, B) { return B === 'TO_SHIP'; },
      row: function(r) { r.refunded = true; },
      a: 'CANCELLED', b: 'CANCELLED', text: 'The seller missed the shipping window: the order is cancelled and the buyer refunded.' },
    { id: 'ask-return', who: 'a', how: 'wired', label: 'Ask for a return',
      when: function(r, A, B) { return A === 'RECEIVED'; },
      row: function(r) { r.returnAsked = true; },
      a: 'RETURNING', b: 'RETURN_EXPECTED', text: 'The buyer asks to send it back; the seller now expects the parcel.' },
    { id: 'keep', who: 'third', how: 'clock', label: '30 days pass, no return asked',
      when: function(r, A, B) { return A === 'RECEIVED'; },
      row: function(r) {},
      a: 'KEPT', b: 'DONE', text: 'The return window closes; both sides finish.' },
    { id: 'parcel-back', who: 'a', how: 'local', label: 'Post the parcel back',
      when: function(r, A, B) { return A === 'RETURNING' && ! r.parcelBack; },
      row: function(r) { r.parcelBack = true; },
      a: null, b: null, text: 'The buyer posts the parcel. Nothing moves until the seller refunds.' },
    { id: 'refund', who: 'b', how: 'wired', label: 'Refund the buyer',
      when: function(r, A, B) { return B === 'RETURN_EXPECTED' && r.parcelBack; },
      row: function(r) { r.refunded = true; },
      a: 'REFUNDED', b: 'REFUND_SENT', text: 'The seller refunds; both sides finish.' },
    { id: 'refund-early', who: 'b', how: 'manual', label: 'Refund before the parcel is back',
      when: function(r, A, B) { return B === 'SHIPPED'; },
      row: function(r) { r.refunded = true; },
      a: 'REFUNDED', b: 'REFUND_SENT', text: 'A goodwill refund while the parcel is still out. The seller may refund here, but the buyer machine has no edge from WAITING to REFUNDED, so the buyer side shows ⚠: the design has a gap.' }
  ],
  stories: {
    happy:   { label: 'Bought and kept',        warn: false, steps: [ 'pay', 'ship', 'deliver', 'keep' ] },
    returned:{ label: 'Bought and returned',    warn: false, steps: [ 'pay', 'ship', 'deliver', 'ask-return', 'parcel-back', 'refund' ] },
    late:    { label: 'Seller never ships',     warn: false, steps: [ 'pay', 'no-ship' ] },
    gap:     { label: 'Refund while in transit', warn: true, steps: [ 'pay', 'ship', 'refund-early' ] }
  },
  legend: 'A small public demo, not a real product. "wired" = a message the other side receives; "local" = only one side changes; "clock" = a timer fires; "manual" = a person does it outside any code path.'
};
