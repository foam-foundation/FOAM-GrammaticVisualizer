/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.fsm',
  name: 'MachineCodec',

  documentation: `
    Reads and writes a state machine in the XState machine-config shape (flat
    subset: id, initial, states, description; per state on and type "final"),
    and checks it. A machine is a plain JSON object; keys outside the subset are
    kept as they are. Stateless: create once and call.
  `,

  methods: [
    // ---- JSON -------------------------------------------------------------

    function parse(text) {
      /** Returns { machine, error }; machine is null when error is set. */
      var m;
      try { m = JSON.parse(text); }
      catch (e) { return { machine: null, error: e.message }; }
      if ( ! m || typeof m !== 'object' || Array.isArray(m) || ! m.states || typeof m.states !== 'object' || Array.isArray(m.states) ) {
        return { machine: null, error: '"states" must be an object' };
      }
      return { machine: m, error: '' };
    },

    function stringify(machine) {
      return JSON.stringify(machine, null, 2);
    },

    // ---- reading ----------------------------------------------------------

    function stateNames(machine) {
      return Object.keys(machine.states || {});
    },

    function on_(machine, name) {
      var s = machine.states[name];
      return ( s && s.on && typeof s.on === 'object' ) ? s.on : {};
    },

    function arrows(machine) {
      /** Every arrow as { from, event, to }, in state order then event order. */
      var self = this, out = [];
      this.stateNames(machine).forEach(function(from) {
        var on = self.on_(machine, from);
        Object.keys(on).forEach(function(event) { out.push({ from: from, event: event, to: on[event] }); });
      });
      return out;
    },

    function events(machine) {
      /** Distinct event names, in first-seen order. */
      var seen = [];
      this.arrows(machine).forEach(function(a) { if ( seen.indexOf(a.event) < 0 ) seen.push(a.event); });
      return seen;
    },

    function isFinal(machine, name) {
      var s = machine.states[name];
      return !! s && s.type === 'final';
    },

    function upperSnake(name) {
      /** A foam.FSM value name: camelCase split, every other run of non-alphanumerics an underscore. */
      var s = String(name)
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[^A-Za-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toUpperCase();
      if ( ! s ) return 'STATE';
      return /^[0-9]/.test(s) ? 'S_' + s : s;
    },

    // ---- checks -----------------------------------------------------------

    function check(machine) {
      /**
       * Problems, each { kind, message, state?, event?, blocking }. Blocking ones
       * stop the machine from running as a foam.FSM.
       */
      var self = this, out = [], names = this.stateNames(machine);
      var add = function(kind, message, blocking, extra) { out.push(Object.assign({ kind: kind, message: message, blocking: blocking }, extra || {})); };

      var hasInitial = machine.initial !== undefined && machine.initial !== null && machine.initial !== '';
      if ( ! hasInitial ) add('no-initial', 'No initial state.', true);
      else if ( names.indexOf(machine.initial) < 0 ) add('unknown-initial', 'Initial state "' + machine.initial + '" does not exist.', true, { state: machine.initial });

      this.arrows(machine).forEach(function(a) {
        if ( names.indexOf(a.to) < 0 ) {
          add('unknown-target', a.from + ' on ' + a.event + ' goes to "' + a.to + '", which does not exist.', true, { state: a.from, event: a.event });
        }
      });

      // Two names clash when they differ only by case, or give the same foam.FSM value name.
      for ( var i = 0 ; i < names.length ; i++ ) {
        for ( var j = i + 1 ; j < names.length ; j++ ) {
          if ( names[i].toLowerCase() === names[j].toLowerCase() || this.upperSnake(names[i]) === this.upperSnake(names[j]) ) {
            add('case-clash', 'States "' + names[i] + '" and "' + names[j] + '" differ only by case.', true, { state: names[j] });
          }
        }
      }

      if ( hasInitial && names.indexOf(machine.initial) >= 0 ) {
        var reached = {}, queue = [ machine.initial ];
        reached[machine.initial] = true;
        while ( queue.length ) {
          var on = this.on_(machine, queue.shift());
          Object.keys(on).forEach(function(e) {
            var t = on[e];
            if ( ! reached[t] && names.indexOf(t) >= 0 ) { reached[t] = true; queue.push(t); }
          });
        }
        names.forEach(function(n) {
          if ( ! reached[n] ) add('unreachable', '"' + n + '" can never be reached from the initial state.', false, { state: n });
        });
      }

      names.forEach(function(n) {
        if ( ! self.isFinal(machine, n) && Object.keys(self.on_(machine, n)).length === 0 ) {
          add('dead-end', '"' + n + '" has no way out and is not marked final.', false, { state: n });
        }
      });

      var evs = this.events(machine);
      for ( var a = 0 ; a < evs.length ; a++ ) {
        for ( var b = a + 1 ; b < evs.length ; b++ ) {
          if ( evs[a].toLowerCase() === evs[b].toLowerCase() ) {
            add('event-case-clash', 'Events "' + evs[a] + '" and "' + evs[b] + '" differ only by case.', false, { event: evs[b] });
          }
        }
      }
      return out;
    },

    // ---- Mermaid ----------------------------------------------------------

    function toMermaid(machine) {
      /** A stateDiagram-v2; names that are not identifiers are declared with an id first. */
      var lines = [ 'stateDiagram-v2' ], ids = {};
      this.stateNames(machine).forEach(function(n, i) {
        if ( /^[A-Za-z_]\w*$/.test(n) ) { ids[n] = n; return; }
        ids[n] = 's' + i;
        lines.push('  state "' + n.replace(/"/g, '#quot;') + '" as s' + i);
      });
      var id = function(n) { return ids[n] || n; };
      if ( machine.initial ) lines.push('  [*] --> ' + id(machine.initial));
      this.arrows(machine).forEach(function(a) { lines.push('  ' + id(a.from) + ' --> ' + id(a.to) + ' : ' + a.event); });
      var self = this;
      this.stateNames(machine).forEach(function(n) { if ( self.isFinal(machine, n) ) lines.push('  ' + id(n) + ' --> [*]'); });
      return lines.join('\n') + '\n';
    }
  ]
});
