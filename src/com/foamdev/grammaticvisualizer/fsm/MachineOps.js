/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.fsm',
  name: 'MachineOps',

  documentation: `
    Edits to a machine (see MachineCodec). Every op returns { machine, error }
    and never changes its input: on success machine is a new object; on error
    it is the input, unchanged. Keys the studio does not know are kept.
  `,

  methods: [
    function copy_(m) { return JSON.parse(JSON.stringify(m)); },
    function ok_(m)   { return { machine: m, error: '' }; },
    function no_(m, error) { return { machine: m, error: error }; },

    function has_(o, key) {
      /** Own keys only: every object inherits names like constructor and toString. */
      return !! o && Object.prototype.hasOwnProperty.call(o, key);
    },

    function reserved_(name) {
      /** __proto__ cannot be a key of a plain object: assigning it replaces the prototype. */
      return name === '__proto__' ? 'The name "__proto__" is not allowed.' : '';
    },

    function freeName_(taken, prefix) {
      for ( var i = 1 ; ; i++ ) if ( taken.indexOf(prefix + i) < 0 ) return prefix + i;
    },

    function forEachOn_(m, fn) {
      Object.keys(m.states).forEach(function(n) {
        var on = m.states[n].on;
        if ( on && typeof on === 'object' ) Object.keys(on).forEach(function(e) { fn(on, e, n); });
      });
    },

    function addState(m, opt_name) {
      var names = Object.keys(m.states);
      var name  = opt_name === undefined ? this.freeName_(names, 'state') : String(opt_name);
      if ( ! name ) return this.no_(m, 'A state needs a name.');
      if ( this.reserved_(name) ) return this.no_(m, this.reserved_(name));
      if ( names.indexOf(name) >= 0 ) return this.no_(m, 'A state named "' + name + '" already exists.');
      var c = this.copy_(m);
      c.states[name] = {};
      if ( names.length === 0 && ! c.initial ) c.initial = name;
      return this.ok_(c);
    },

    function renameState(m, from, to) {
      to = String(to === undefined ? '' : to);
      if ( ! to ) return this.no_(m, 'A state needs a name.');
      if ( this.reserved_(to) ) return this.no_(m, this.reserved_(to));
      if ( to === from ) return this.ok_(m);
      if ( this.has_(m.states, to) ) return this.no_(m, 'A state named "' + to + '" already exists.');
      var c = this.copy_(m), states = {};
      // Rebuild states so the renamed one keeps its place in the order.
      Object.keys(c.states).forEach(function(n) { states[n === from ? to : n] = c.states[n]; });
      c.states = states;
      if ( c.initial === from ) c.initial = to;
      this.forEachOn_(c, function(on, e) { if ( on[e] === from ) on[e] = to; });
      return this.ok_(c);
    },

    function deleteState(m, name) {
      var c = this.copy_(m);
      delete c.states[name];
      if ( c.initial === name ) delete c.initial;
      this.forEachOn_(c, function(on, e) { if ( on[e] === name ) delete on[e]; });
      return this.ok_(c);
    },

    function setInitial(m, name) {
      var c = this.copy_(m);
      c.initial = name;
      return this.ok_(c);
    },

    function setFinal(m, name, isFinal) {
      var c = this.copy_(m), s = c.states[name];
      if ( isFinal ) { s.type = 'final'; delete s.on; }
      else delete s.type;
      return this.ok_(c);
    },

    function addArrow(m, from, opt_event, to) {
      var on = m.states[from].on || {};
      var event = opt_event === undefined ? this.freeName_(Object.keys(on), 'EVENT') : String(opt_event);
      if ( ! event ) return this.no_(m, 'An event needs a name.');
      if ( this.reserved_(event) ) return this.no_(m, this.reserved_(event));
      if ( this.has_(on, event) ) return this.no_(m, from + ' already handles ' + event + '.');
      var c = this.copy_(m), s = c.states[from];
      delete s.type; // a state with a way out is no longer final
      s.on = s.on || {};
      s.on[event] = to;
      return this.ok_(c);
    },

    function renameEvent(m, from, oldEvent, newEvent) {
      newEvent = String(newEvent === undefined ? '' : newEvent);
      if ( ! newEvent ) return this.no_(m, 'An event needs a name.');
      if ( this.reserved_(newEvent) ) return this.no_(m, this.reserved_(newEvent));
      if ( newEvent === oldEvent ) return this.ok_(m);
      var on = m.states[from].on || {};
      if ( this.has_(on, newEvent) ) return this.no_(m, from + ' already handles ' + newEvent + '.');
      var c = this.copy_(m), next = {}, old = c.states[from].on;
      // Rebuild on so the renamed event keeps its place.
      Object.keys(old).forEach(function(e) { next[e === oldEvent ? newEvent : e] = old[e]; });
      c.states[from].on = next;
      return this.ok_(c);
    },

    function retarget(m, from, event, to) {
      var c = this.copy_(m);
      c.states[from].on[event] = to;
      return this.ok_(c);
    },

    function deleteArrow(m, from, event) {
      var c = this.copy_(m);
      delete c.states[from].on[event];
      return this.ok_(c);
    },

    function renameLayoutKey(layout, from, to) {
      var out = {};
      Object.keys(layout || {}).forEach(function(k) { out[k === from ? to : k] = layout[k]; });
      return out;
    },

    function syncLayout(layout, oldMachine, newMachine) {
      /**
       * The layout after an edit made in the JSON: positions of states that are gone
       * are dropped, and when exactly one state went and one came, that is a rename,
       * so the new name takes the old box's place.
       */
      var self = this, out = {}, olds = Object.keys(( oldMachine && oldMachine.states ) || {}), news = Object.keys(newMachine.states);
      news.forEach(function(n) { if ( self.has_(layout, n) ) out[n] = layout[n]; });
      var gone  = olds.filter(function(n) { return ! self.has_(newMachine.states, n); });
      var added = news.filter(function(n) { return olds.indexOf(n) < 0; });
      if ( gone.length === 1 && added.length === 1 && this.has_(layout, gone[0]) && ! this.has_(out, added[0]) ) out[added[0]] = layout[gone[0]];
      return out;
    },

    function dropLayoutKey(layout, name) {
      var out = {};
      Object.keys(layout || {}).forEach(function(k) { if ( k !== name ) out[k] = layout[k]; });
      return out;
    }
  ]
});
