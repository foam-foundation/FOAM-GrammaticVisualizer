/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.fsm',
  name: 'MachineStepRow',
  extends: 'foam.u2.View',

  documentation: `
    One button per event in the machine, for stepping a MachineRunner. Events
    the current state does not handle stay visible but disabled, with a
    tooltip saying so: seeing what is ignored is part of learning a machine.
    The buttons are foam.lang.Action objects made per event, since a class's
    actions: are fixed and the events are data.
  `,

  requires: [
    'com.foamdev.grammaticvisualizer.fsm.MachineCodec',
    'foam.lang.Action',
    'foam.u2.ActionView'
  ],

  messages: [
    { name: 'NOT_HANDLED', message: 'is not handled in' },
    { name: 'FINISHED_MSG', message: 'Finished: a final state.' },
    { name: 'NO_EVENTS',   message: 'No events yet. Add an arrow to step.' },
    { name: 'STEP',        message: 'Step' }
  ],

  css: `
    ^ { display: flex; flex-wrap: wrap; align-items: center; gap: $space-2; }
    ^label { color: $textSecondary; }
    ^status { color: $textSecondary; }
    ^status.error { color: $textDestructive; }
  `,

  properties: [
    { name: 'runner', documentation: 'The MachineRunner to step.' },
    // Mirrors of the runner's state, so dynamic() below can name them as arguments.
    { name: 'machine' },
    { class: 'String',  name: 'current' },
    { class: 'Boolean', name: 'busy' },
    { class: 'Boolean', name: 'finished' },
    { class: 'String',  name: 'error' },
    { name: 'codec', hidden: true, factory: function() { return this.MachineCodec.create(); } }
  ],

  methods: [
    function render() {
      var self = this, r = this.runner;
      [ 'machine', 'current', 'busy', 'finished', 'error' ].forEach(function(p) { self[p + '$'].follow(r[p + '$']); });
      this.addClass().attrs({ 'data-step-row': true });
      this.add(this.dynamic(function(machine, current, busy, finished, error) {
        var m = machine;
        this.start('span').addClass(self.myClass('label'), 'p-label').add(self.STEP).end();
        var events = m && m.states ? self.codec.events(m) : [];
        if ( ! events.length ) this.start('span').addClass(self.myClass('status')).add(self.NO_EVENTS).end();
        events.forEach(function(ev, i) {
          var handled = r.handles(ev);
          var action = self.Action.create({
            name: 'step' + i,
            label: ev,
            toolTip: handled ? ev : '"' + ev + '" ' + self.NOT_HANDLED + ' ' + ( current || '-' ),
            isEnabled: function() { return handled; },
            code: function() { r.send(ev); }
          });
          this.tag(self.ActionView, { action: action, data: self, buttonStyle: 'SECONDARY' });
        }, this);
        if ( finished ) this.start('span').addClass(self.myClass('status')).add(self.FINISHED_MSG).end();
        else if ( error && current ) this.start('span').addClass(self.myClass('status'), 'error').add(error).end();
      }));
    }
  ]
});
