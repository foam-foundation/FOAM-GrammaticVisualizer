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
      var isObj = function(v) { return !! v && typeof v === 'object' && ! Array.isArray(v); };
      if ( ! isObj(m) || ! isObj(m.states) ) return { machine: null, error: '"states" must be an object' };
      for ( var n of Object.keys(m.states) ) {
        var st = m.states[n];
        if ( ! isObj(st) ) return { machine: null, error: 'State "' + n + '" must be an object' };
        if ( st.on === undefined ) continue;
        if ( ! isObj(st.on) ) return { machine: null, error: '"on" of state "' + n + '" must be an object' };
        for ( var e of Object.keys(st.on) ) {
          if ( typeof st.on[e] !== 'string' ) return { machine: null, error: n + ' on ' + e + ': the target must be a state name' };
        }
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

    function unknownKeys(machine) {
      /** Keys outside the subset the studio draws: kept and written back, but not shown. */
      var top = [ 'id', 'initial', 'states', 'description' ], per = [ 'on', 'type', 'description' ], out = [];
      Object.keys(machine).forEach(function(k) { if ( top.indexOf(k) < 0 ) out.push(k); });
      Object.keys(machine.states || {}).forEach(function(n) {
        Object.keys(machine.states[n] || {}).forEach(function(k) { if ( per.indexOf(k) < 0 ) out.push(n + '.' + k); });
      });
      return out;
    },

    function reservedValueNames_() {
      /** Constant names a foam.FSM class already has (one per property, plus VALUES): a value may not reuse them. */
      var cls = foam.lookup('com.foamdev.grammaticvisualizer.fsm.MachineCodec');
      if ( ! cls.reserved_ ) {
        var r = { VALUES: true };
        // Properties only, converted by hand: foam.String.constantize memoizes into a plain object,
        // so constantize('hasOwnProperty') (a method axiom) would break every later call.
        foam.lang.StateMachineEnum.getAxiomsByClass(foam.lang.Property).forEach(function(a) {
          r[a.name.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()] = true;
        });
        cls.reserved_ = r;
      }
      return cls.reserved_;
    },

    function valueNames(machine) {
      /**
       * State name -> foam.FSM value name: the UPPER_SNAKE of the name, made unique and
       * kept clear of the enum's own constants (VIEW, NAME, LABEL, ON, VALUES ...).
       */
      var self = this, reserved = this.reservedValueNames_(), taken = {}, out = {};
      this.stateNames(machine).forEach(function(n, i) {
        var base = self.upperSnake(n), v = base;
        if ( reserved[v] ) v = 'S_' + base;
        for ( var k = 2 ; taken[v] || reserved[v] ; k++ ) v = base + '_' + k;
        taken[v] = true;
        out[n] = v;
      });
      return out;
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

      // Two names that differ only by case are almost always a typo. (Value names are made unique by valueNames.)
      for ( var i = 0 ; i < names.length ; i++ ) {
        for ( var j = i + 1 ; j < names.length ; j++ ) {
          if ( names[i].toLowerCase() === names[j].toLowerCase() ) {
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

    // ---- foam.FSM ---------------------------------------------------------

    function toFoamFSMSpec(machine, pkg, name) {
      /**
       * The object to pass to foam.FSM(). A value's name is the UPPER_SNAKE of the
       * state name and its label the state name itself, so fromFoamFSM restores it.
       * Needs the app's events refinement (FSMEvents.js) for on.
       */
      var self = this, names = this.stateNames(machine), vnames = this.valueNames(machine);
      var vname = function(n) { return vnames[n] || n; };
      return {
        package: pkg,
        name: name,
        documentation: machine.description || '',
        values: names.map(function(n) {
          var v = { name: vnames[n], label: n }, on = self.on_(machine, n), targets = [], evs = {};
          if ( machine.initial === n ) v.isInitial = true;
          Object.keys(on).forEach(function(e) {
            var t = vname(on[e]);
            evs[e] = t;
            if ( targets.indexOf(t) < 0 ) targets.push(t);
          });
          v.transitions = targets;
          if ( Object.keys(evs).length ) v.on = evs;
          return v;
        })
      };
    },

    function toFoamFSMSource(machine, pkg, name) {
      /** toFoamFSMSpec as readable code: one line per value, single quotes. */
      var js = function(v) {
        if ( Array.isArray(v) ) return v.length ? '[ ' + v.map(js).join(', ') + ' ]' : '[]';
        if ( v && typeof v === 'object' ) {
          var ks = Object.keys(v);
          return ks.length ? '{ ' + ks.map(function(k) { return ( /^[A-Za-z_$][\w$]*$/.test(k) ? k : js(k) ) + ': ' + js(v[k]); }).join(', ') + ' }' : '{}';
        }
        if ( typeof v === 'string' ) return "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
        return String(v);
      };
      var spec = this.toFoamFSMSpec(machine, pkg, name), out = [ 'foam.FSM({' ];
      out.push('  package: ' + js(spec.package) + ',');
      out.push('  name: ' + js(spec.name) + ',');
      if ( spec.documentation ) out.push('  documentation: ' + js(spec.documentation) + ',');
      out.push('  values: [');
      spec.values.forEach(function(v, i) { out.push('    ' + js(v) + ( i < spec.values.length - 1 ? ',' : '' )); });
      out.push('  ]');
      out.push('});');
      return out.join('\n') + '\n';
    },

    function fromFoamFSM(cls) {
      /**
       * A machine from a foam.FSM class, and notes on what did not carry over.
       * State name: the value's label, else its name. A transition with no event
       * in on gets the event TO_<TARGET>. A state with no transitions is final.
       */
      var values = cls.VALUES, notes = [], byName = {}, states = {}, finals = 0;
      values.forEach(function(v) { byName[v.name] = v.label || v.name; });
      var sname = function(t) { return byName[t] || t; };
      values.forEach(function(v) {
        var s = {}, on = {}, covered = [], ev = v.on || {};
        Object.keys(ev).forEach(function(e) { on[e] = sname(ev[e]); covered.push(ev[e]); });
        v.transitions.forEach(function(t) { if ( covered.indexOf(t) < 0 ) on['TO_' + t] = sname(t); });
        if ( v.transitions.length === 0 ) { s.type = 'final'; finals++; }
        else s.on = on;
        states[byName[v.name]] = s;
      });
      var machine = { id: cls.model_.name.charAt(0).toLowerCase() + cls.model_.name.slice(1) };
      if ( cls.model_.documentation ) machine.description = cls.model_.documentation;
      var initials = values.filter(function(v) { return v.isInitial; });
      if ( initials.length ) machine.initial = byName[initials[0].name];
      if ( initials.length > 1 ) notes.push('More than one initial state; using "' + machine.initial + '".');
      if ( initials.length === 0 ) notes.push('No initial state.');
      machine.states = states;
      if ( finals ) notes.push(finals + ' states with no way out are marked final.');
      return { machine: machine, notes: notes };
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
