/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// foam.FSM moves by target state (transitionStatusTo('SAVING')); an arrow has no
// event name, so two events to the same target merge. These refinements add named
// events app-side, without touching foam3. See docs/foam3-design-system-gaps.md.

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.fsm',
  name: 'StateMachineEnumEventsRefinement',
  refines: 'foam.lang.StateMachineEnum',

  properties: [
    {
      name: 'on',
      documentation: 'Map of event name -> target state name. Each target must also be in transitions.',
      transient: true,
      generateJava: false,
      factory: function() { return {}; }
    }
  ]
});


// In a refinement, SUPER reaches the parent class's method, not the method being
// refined, so keep foam3's own installInProto and call it by hand.
var installStateMachineInProto_ = foam.lang.StateMachine.prototype.installInProto;

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.fsm',
  name: 'StateMachineEventsRefinement',
  refines: 'foam.lang.StateMachine',

  documentation: `
    Adds send<Name>(event, opt_note) next to foam3's transition<Name>To. It looks
    the event up in the current state's on map and moves through
    transition<Name>To, so guards, permissions and history still apply; the
    history note defaults to the event name.
  `,

  methods: [
    function installInProto(proto) {
      installStateMachineInProto_.call(this, proto);

      var name = this.name;
      var Name = foam.String.capitalize(name);

      Object.defineProperty(proto, 'send' + Name, {
        value: async function(event, opt_note) {
          var state  = this[name];
          var target = state.on && state.on[event];
          if ( ! target ) {
            throw new Error('Event "' + event + '" is not handled in state ' + state.name);
          }
          if ( ! state.transitions.includes(target) ) {
            throw new Error('Event "' + event + '" goes to ' + target + ', which is not in transitions of ' + state.name);
          }
          return this['transition' + Name + 'To'](target, opt_note === undefined ? event : opt_note);
        },
        configurable: true,
        writable: true
      });
    }
  ]
});
