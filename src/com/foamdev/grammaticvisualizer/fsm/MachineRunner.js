/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.fsm',
  name: 'MachineRunner',

  documentation: `
    Steps a machine on the real thing: the first send(event) after a start
    defines a foam.FSM class from the machine (MachineCodec.toFoamFSMSpec) and a
    holder class with a StateMachine property, then each send goes through the
    app's sendStatus(event) refinement, so foam3's own transition checks run.
    Setting machine restarts. Classes are built only to step, since typing in
    the JSON sets a new machine on every key, and the same machine reuses its
    classes: the registry keeps every class it has seen.
  `,

  requires: [ 'com.foamdev.grammaticvisualizer.fsm.MachineCodec' ],

  constants: {
    RUN_PACKAGE: 'com.foamdev.grammaticvisualizer.fsm.run'
  },

  properties: [
    {
      name: 'machine',
      documentation: 'The machine JSON object. Setting it restarts the run.',
      postSet: function() { this.start(); }
    },
    {
      class: 'String',
      name: 'current',
      documentation: 'The current state name; empty when the machine cannot run.'
    },
    {
      class: 'Array',
      name: 'history',
      documentation: 'Steps taken since start, each { from, event, to }.'
    },
    {
      class: 'Boolean',
      name: 'busy',
      documentation: 'True while a send is running (foam.FSM transitions are async).'
    },
    {
      class: 'String',
      name: 'error',
      documentation: 'Why the machine cannot run, or why the last send failed.'
    },
    {
      class: 'Boolean',
      name: 'finished',
      expression: function(machine, current) {
        var s = machine && current && machine.states && machine.states[current];
        return !! s && s.type === 'final';
      }
    },
    {
      name: 'codec',
      hidden: true,
      factory: function() { return this.MachineCodec.create(); }
    },
    {
      name: 'holder_',
      hidden: true
    },
    {
      class: 'Int',
      name: 'runToken_',
      documentation: 'Bumped by start(); a send that began under an older token drops its result.'
    }
  ],

  methods: [
    function start() {
      this.runToken_++;
      this.history = [];
      this.busy    = false;
      this.holder_ = null;
      var m = this.machine;
      if ( ! m ) { this.current = ''; this.error = ''; return; }

      var blocking = this.codec.check(m).filter(function(c) { return c.blocking; });
      if ( blocking.length ) { this.current = ''; this.error = blocking[0].message; return; }

      this.current = m.initial;
      this.error   = '';
    },

    function holder() {
      /** The holder to step, built on first use; null (with error set) when the classes cannot be built. */
      if ( this.holder_ ) return this.holder_;
      var m = this.machine, cls = this.cls_;
      var key = JSON.stringify(this.codec.toFoamFSMSpec(m, '', ''));
      cls.classCache_ = cls.classCache_ || {};
      try {
        var n = cls.classCache_[key];
        if ( ! n ) {
          // Class ids are never reused: the registry keeps every class it has seen.
          n = cls.runCount_ = ( cls.runCount_ || 0 ) + 1;
          foam.FSM(this.codec.toFoamFSMSpec(m, this.RUN_PACKAGE, 'Machine' + n));
          foam.CLASS({
            package: this.RUN_PACKAGE,
            name: 'Holder' + n,
            properties: [ { class: 'StateMachine', of: this.RUN_PACKAGE + '.Machine' + n, name: 'status' } ]
          });
          cls.classCache_[key] = n;
        }
        var F = foam.lookup(this.RUN_PACKAGE + '.Machine' + n), H = foam.lookup(this.RUN_PACKAGE + '.Holder' + n);
        this.holder_ = H.create({ status: F[this.codec.valueNames(m)[m.initial]] }, this);
      } catch (e) {
        // Never leave the screen half-updated: show why it cannot run instead.
        this.holder_ = null; this.current = ''; this.error = e.message;
      }
      return this.holder_;
    },

    function handles(event) {
      if ( this.busy || this.finished || ! this.current ) return false;
      var s = this.machine.states[this.current];
      return !! ( s && s.on && Object.prototype.hasOwnProperty.call(s.on, event) );
    },

    async function send(event) {
      if ( ! this.current ) return;
      var token = this.runToken_, holder = this.holder(), from = this.current;
      if ( ! holder ) return;
      this.busy = true;
      try {
        await holder.sendStatus(event);
        if ( token !== this.runToken_ ) return;
        var to = holder.status.label || holder.status.name;
        this.history = this.history.concat([ { from: from, event: event, to: to } ]);
        this.current = to;
        this.error   = '';
      } catch (e) {
        if ( token === this.runToken_ ) this.error = e.message;
      } finally {
        if ( token === this.runToken_ ) this.busy = false;
      }
    }
  ]
});
