/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.test',
  name: 'MachineCodecTest',
  extends: 'foam.core.test.JSTest',

  requires: [
    'com.foamdev.grammaticvisualizer.fsm.MachineCodec',
    'com.foamdev.grammaticvisualizer.fsm.MachineOps'
  ],

  documentation: `
    The state machine studio's pure helpers: MachineCodec (parse, checks,
    Mermaid, foam.FSM export and import) and MachineOps (edits). Machines are
    XState-shaped JSON objects; ops never mutate their input.
  `,

  constants: {
    SAVE_BUTTON: `{
  "id": "saveButton",
  "initial": "clean",
  "states": {
    "clean":  { "on": { "EDIT": "dirty" } },
    "dirty":  { "on": { "SAVE": "saving", "DISCARD": "clean" } },
    "saving": { "on": { "SUCCESS": "clean", "FAIL": "error" } },
    "error":  { "on": { "RETRY": "saving" } }
  }
}`
  },

  methods: [
    async function runTest(x) {
      // A throw inside the body would lose every result already recorded; report it as one failure instead.
      try { await this.runTest_(x); }
      catch (e) { x.test(false, 'test body threw: ' + (e && e.stack || e)); }
    },

    function canon(v) {
      /** JSON with sorted keys, for deep equality that ignores key order. */
      var self = this;
      if ( Array.isArray(v) ) return '[' + v.map(function(e) { return self.canon(e); }).join(',') + ']';
      if ( v && typeof v === 'object' ) return '{' + Object.keys(v).sort().map(function(k) { return JSON.stringify(k) + ':' + self.canon(v[k]); }).join(',') + '}';
      return JSON.stringify(v);
    },

    async function runTest_(x) {
      var self  = this;
      var codec = this.MachineCodec.create({}, x);
      var ops   = this.MachineOps.create({}, x);
      var save  = function() { return codec.parse(self.SAVE_BUTTON).machine; };
      var same  = function(a, b) { return self.canon(a) === self.canon(b); };
      var has   = function(list, kind, message, blocking) {
        return list.some(function(c) { return c.kind === kind && c.message === message && c.blocking === blocking; });
      };

      // ---- parse / stringify ------------------------------------------------
      var p = codec.parse(this.SAVE_BUTTON);
      x.test(p.error === '' && Object.keys(p.machine.states).length === 4, 'parse: the Save button has 4 states and no error');
      p = codec.parse('{');
      x.test(p.error !== '' && p.machine === null, 'parse: invalid JSON gives an error and no machine');
      x.test(codec.parse('[]').error === '"states" must be an object', 'parse: an array is not a machine');
      x.test(codec.parse('{"states":5}').error === '"states" must be an object', 'parse: states must be an object');
      x.test(codec.parse('{"states":{}}').error === '', 'parse: an empty machine is valid');
      x.test(codec.parse('{"states":{"a":5}}').error === 'State "a" must be an object', 'parse: a state must be an object');
      x.test(codec.parse('{"states":{"a":null}}').error === 'State "a" must be an object', 'parse: a null state is refused');
      x.test(codec.parse('{"states":{"a":{"on":"GO"}}}').error === '"on" of state "a" must be an object', 'parse: on must be an object');
      x.test(codec.parse('{"states":{"a":{"on":{"GO":{"target":"b"}}}}}').error === 'a on GO: the target must be a state name', 'parse: object-form targets are refused with a message');
      x.test(JSON.stringify(codec.unknownKeys(codec.parse('{"initial":"a","meta":1,"states":{"a":{"entry":"x","on":{"GO":"a"}},"b":{"type":"final","tags":[]}}}').machine)) === JSON.stringify([ 'meta', 'a.entry', 'b.tags' ]), 'unknownKeys lists keys the studio does not draw');
      x.test(codec.unknownKeys(save()).length === 0, 'unknownKeys: none in the Save button');
      var kept = codec.stringify(codec.parse('{"initial":"a","states":{"a":{"x":1}},"meta":{"k":2}}').machine);
      x.test(kept.indexOf('"meta"') >= 0 && kept.indexOf('"x"') >= 0, 'stringify keeps unknown keys');

      // ---- names ----------------------------------------------------------
      x.test(same(codec.stateNames(save()), [ 'clean', 'dirty', 'saving', 'error' ]), 'stateNames in order');
      x.test(same(codec.events(save()), [ 'EDIT', 'SAVE', 'DISCARD', 'SUCCESS', 'FAIL', 'RETRY' ]), 'events in first-seen order');
      x.test(codec.arrows(save()).length === 6 && same(codec.arrows(save())[2], { from: 'dirty', event: 'DISCARD', to: 'clean' }), 'arrows: from, event, to');
      [ [ 'saving', 'SAVING' ], [ 'loadingData', 'LOADING_DATA' ], [ 'loading data', 'LOADING_DATA' ], [ '2fa', 'S_2FA' ], [ 'é', 'STATE' ] ].forEach(function(c) {
        x.test(codec.upperSnake(c[0]) === c[1], 'upperSnake(' + c[0] + ') is ' + c[1] + ' (got ' + codec.upperSnake(c[0]) + ')');
      });

      // ---- checks ---------------------------------------------------------
      x.test(codec.check(save()).length === 0, 'check: the Save button has no problems');
      var chk = function(text) { return codec.check(codec.parse(text).machine); };
      x.test(has(chk('{"states":{"a":{"type":"final"}}}'), 'no-initial', 'No initial state.', true), 'check: no initial state');
      x.test(has(chk('{"initial":"x","states":{"a":{"type":"final"}}}'), 'unknown-initial', 'Initial state "x" does not exist.', true), 'check: unknown initial');
      x.test(has(chk('{"initial":"a","states":{"a":{"on":{"GO":"zz"}}}}'), 'unknown-target', 'a on GO goes to "zz", which does not exist.', true), 'check: unknown target');
      x.test(has(chk('{"initial":"a","states":{"a":{"on":{"X":"A"}},"A":{"type":"final"}}}'), 'case-clash', 'States "a" and "A" differ only by case.', true), 'check: states differ only by case');
      x.test(chk('{"initial":"loadingData","states":{"loadingData":{"on":{"X":"loading_data"}},"loading_data":{"type":"final"}}}').every(function(c) { return ! c.blocking; }), 'check: names that give the same foam.FSM name do not block (each gets its own value name)');
      x.test(has(chk('{"initial":"a","states":{"a":{"type":"final"},"b":{"type":"final"}}}'), 'unreachable', '"b" can never be reached from the initial state.', false), 'check: unreachable state');
      x.test(has(chk('{"initial":"a","states":{"a":{"on":{"GO":"b"}},"b":{}}}'), 'dead-end', '"b" has no way out and is not marked final.', false), 'check: dead end');
      x.test(has(chk('{"initial":"a","states":{"a":{"on":{"GO":"b"}},"b":{"on":{"go":"a"}}}}'), 'event-case-clash', 'Events "GO" and "go" differ only by case.', false), 'check: events differ only by case');
      x.test(chk('{"initial":"a","states":{"a":{"on":{"GO":"zz"}}}}').every(function(c) { return c.kind !== 'dead-end' || c.state !== 'a'; }), 'check: a state with an arrow is not a dead end, even a broken arrow');

      // ---- Mermaid --------------------------------------------------------
      var expected = [
        'stateDiagram-v2',
        '  [*] --> clean',
        '  clean --> dirty : EDIT',
        '  dirty --> saving : SAVE',
        '  dirty --> clean : DISCARD',
        '  saving --> clean : SUCCESS',
        '  saving --> error : FAIL',
        '  error --> saving : RETRY'
      ].join('\n') + '\n';
      x.test(codec.toMermaid(save()) === expected, 'toMermaid: exact text for the Save button');
      var odd = codec.toMermaid(codec.parse('{"initial":"loading data","states":{"loading data":{"type":"final"}}}').machine);
      x.test(odd.indexOf('state "loading data" as s0') >= 0 && odd.indexOf('[*] --> s0') >= 0 && odd.indexOf('s0 --> [*]') >= 0, 'toMermaid: a name with a space is declared with an id');

      // ---- ops ------------------------------------------------------------
      var m = save(), before = codec.stringify(m);
      var r = ops.renameState(m, 'dirty', 'clean');
      x.test(r.error === 'A state named "clean" already exists.' && same(r.machine, m), 'renameState refuses an existing name and returns the machine unchanged');
      x.test(ops.renameState(m, 'dirty', '').error !== '', 'renameState refuses an empty name');
      r = ops.renameState(m, 'saving', 'busy');
      x.test(r.error === '' && r.machine.states.dirty.on.SAVE === 'busy' && r.machine.states.error.on.RETRY === 'busy' && r.machine.states.busy && ! r.machine.states.saving, 'renameState rewrites every target');
      x.test(ops.renameState(m, 'clean', 'start').machine.initial === 'start', 'renameState rewrites initial');
      x.test(codec.stringify(m) === before, 'ops never change their input');

      r = ops.deleteState(m, 'clean');
      x.test(! r.machine.states.clean && ! r.machine.states.dirty.on.DISCARD && ! r.machine.states.saving.on.SUCCESS && r.machine.initial === undefined, 'deleteState drops the state, arrows into it and initial');
      x.test(has(codec.check(r.machine), 'no-initial', 'No initial state.', true), 'after deleting the initial state, check reports no initial');

      r = ops.addState(codec.parse('{"states":{}}').machine);
      x.test(r.machine.states.state1 && r.machine.initial === 'state1', 'addState: the first state is state1 and becomes initial');
      r = ops.addState(r.machine);
      x.test(r.machine.states.state2 && r.machine.initial === 'state1', 'addState: the next free name is state2');
      x.test(ops.addState(m, 'dirty').error === 'A state named "dirty" already exists.', 'addState refuses an existing name');

      x.test(ops.setInitial(m, 'error').machine.initial === 'error', 'setInitial');
      r = ops.setFinal(m, 'error', true);
      x.test(r.machine.states.error.type === 'final' && r.machine.states.error.on === undefined, 'setFinal(true) marks final and drops on');
      x.test(ops.setFinal(r.machine, 'error', false).machine.states.error.type === undefined, 'setFinal(false) drops type');

      x.test(ops.addArrow(m, 'clean', 'EDIT', 'error').error === 'clean already handles EDIT.', 'addArrow refuses a duplicate event in that state');
      x.test(ops.addArrow(m, 'clean', undefined, 'error').machine.states.clean.on.EVENT1 === 'error', 'addArrow: the default event is EVENT1');
      r = ops.renameEvent(m, 'dirty', 'SAVE', 'STORE');
      x.test(r.machine.states.dirty.on.STORE === 'saving' && r.machine.states.dirty.on.SAVE === undefined, 'renameEvent');
      x.test(ops.renameEvent(m, 'dirty', 'SAVE', 'DISCARD').error === 'dirty already handles DISCARD.', 'renameEvent refuses a duplicate');
      x.test(ops.retarget(m, 'dirty', 'SAVE', 'error').machine.states.dirty.on.SAVE === 'error', 'retarget');
      x.test(ops.deleteArrow(m, 'dirty', 'SAVE').machine.states.dirty.on.SAVE === undefined, 'deleteArrow');

      var layout = { clean: { x: 1, y: 2 }, dirty: { x: 3, y: 4 } };
      x.test(same(ops.renameLayoutKey(layout, 'clean', 'start'), { start: { x: 1, y: 2 }, dirty: { x: 3, y: 4 } }) && layout.clean, 'renameLayoutKey returns a new map');
      x.test(same(ops.dropLayoutKey(layout, 'clean'), { dirty: { x: 3, y: 4 } }) && layout.clean, 'dropLayoutKey returns a new map');

      this.testFoamFSM(x, codec, ops, save, same);
    },

    function testFoamFSM(x, codec, ops, save, same) {
      // Class names are fresh per run so a second run in the same page does not redefine a class.
      var pkg = 'com.foamdev.grammaticvisualizer.test.gen', n = Date.now();
      var withoutId = function(m) { var c = JSON.parse(JSON.stringify(m)); delete c.id; return c; };

      var spec = codec.toFoamFSMSpec(save(), pkg, 'SaveSpec' + n);
      x.test(same(spec.values[1], { name: 'DIRTY', label: 'dirty', transitions: [ 'SAVING', 'CLEAN' ], on: { SAVE: 'SAVING', DISCARD: 'CLEAN' } }), 'toFoamFSMSpec: a state becomes a value with name, label, transitions and on');
      x.test(spec.values[0].isInitial === true && spec.values[1].isInitial === undefined, 'toFoamFSMSpec: only the initial state has isInitial');
      x.test(spec.package === pkg && spec.name === 'SaveSpec' + n, 'toFoamFSMSpec: package and name');

      var src = codec.toFoamFSMSource(save(), pkg, 'SaveSrc' + n);
      x.test(src.indexOf('foam.FSM({') === 0, 'toFoamFSMSource starts with foam.FSM({');
      var finalSrc = codec.toFoamFSMSource({ initial: 'a', states: { a: { on: { GO: 'b' } }, b: { type: 'final' } } }, pkg, 'FinalSrc' + n);
      x.test(finalSrc.indexOf("transitions: [] }") >= 0, 'toFoamFSMSource writes an empty list as []: ' + finalSrc.split('\n')[5]);
      eval(src);
      var Src = foam.lookup(pkg + '.SaveSrc' + n, true);
      x.test(Src && Src.CLEAN.on.EDIT === 'DIRTY', 'toFoamFSMSource evaluates to a working class: ' + src.split('\n').slice(0, 4).join(' '));

      foam.FSM(codec.toFoamFSMSpec(save(), pkg, 'SaveTrip' + n));
      var back = codec.fromFoamFSM(foam.lookup(pkg + '.SaveTrip' + n));
      x.test(same(withoutId(back.machine), withoutId(save())) && back.notes.length === 0, 'round trip: JSON to foam.FSM and back gives the same machine: ' + codec.stringify(back.machine));
      x.test(back.machine.id === 'saveTrip' + n, 'fromFoamFSM: id is the class name with a lowercase first letter');

      var oddText = '{"initial":"loading data","states":{"loading data":{"on":{"GO":"2fa"}},"2fa":{"type":"final"}}}';
      var odd = JSON.parse(oddText), built = true;
      try { foam.FSM(codec.toFoamFSMSpec(odd, pkg, 'Odd' + n)); } catch (e) { built = false; }
      x.test(built, 'a state name that is not an identifier still builds a foam.FSM class');
      var oddBack = built && codec.fromFoamFSM(foam.lookup(pkg + '.Odd' + n)).machine;
      x.test(oddBack && oddBack.initial === 'loading data' && oddBack.states['2fa'] && oddBack.states['loading data'].on.GO === '2fa', 'round trip keeps the names "loading data" and "2fa"');

      // Names that are also enum fields (view, name, label, on, values, ordinal) and names with no ASCII letters still build and round-trip.
      var risky = { initial: 'view', states: { view: { on: { EDIT: 'name' } }, name: { on: { GO: 'label' } }, label: { on: { GO: 'on' } }, on: { on: { GO: 'values' } }, values: { on: { GO: 'ordinal' } }, ordinal: { on: { GO: 'é' } }, 'é': { on: { GO: 'ü' } }, 'ü': { on: { GO: '日本' } }, '日本': { on: { GO: '中文' } }, '中文': { type: 'final' } } };
      x.test(codec.check(risky).every(function(c) { return ! c.blocking; }), 'check: field-like and non-Latin names do not block: ' + JSON.stringify(codec.check(risky)));
      var riskyBuilt = true;
      try { foam.FSM(codec.toFoamFSMSpec(risky, pkg, 'Risky' + n)); } catch (e) { riskyBuilt = e.message; }
      x.test(riskyBuilt === true, 'a machine with field-like and non-Latin state names builds a foam.FSM class: ' + riskyBuilt);
      var riskyBack = riskyBuilt === true && codec.fromFoamFSM(foam.lookup(pkg + '.Risky' + n)).machine;
      x.test(riskyBack && same(withoutId(riskyBack), withoutId(risky)), 'and round-trips every name');
      x.test(new Set(Object.values(codec.valueNames(risky))).size === 10, 'valueNames: every state gets its own value name: ' + JSON.stringify(codec.valueNames(risky)));

      var t = codec.fromFoamFSM(foam.lang.test.TestStateMachine);
      x.test(t.machine.initial === 'New', 'fromFoamFSM(TestStateMachine): initial is the label New');
      x.test(t.machine.states.New.on.TO_ACTIVE === 'Active', 'fromFoamFSM: an arrow with no on event is named TO_<TARGET>');
      x.test(t.machine.states.Done.type === 'final', 'fromFoamFSM: a state with no transitions is final');
      x.test(t.notes.indexOf('1 states with no way out are marked final.') >= 0, 'fromFoamFSM: a note counts the states marked final: ' + t.notes.join(' | '));

      var two = codec.fromFoamFSM(foam.lookup(pkg + '.SaveSrc' + n)); // one initial: no note
      x.test(two.notes.length === 0, 'fromFoamFSM: no notes for a clean class');
      foam.FSM({ package: pkg, name: 'TwoStarts' + n, values: [ { name: 'A', isInitial: true, transitions: [ 'B' ] }, { name: 'B', isInitial: true, transitions: [ 'A' ] } ] });
      x.test(codec.fromFoamFSM(foam.lookup(pkg + '.TwoStarts' + n)).notes.indexOf('More than one initial state; using "A".') >= 0, 'fromFoamFSM: more than one initial state is noted');
      foam.FSM({ package: pkg, name: 'NoStart' + n, values: [ { name: 'A', transitions: [ 'B' ] }, { name: 'B', transitions: [ 'A' ] } ] });
      x.test(codec.fromFoamFSM(foam.lookup(pkg + '.NoStart' + n)).notes.indexOf('No initial state.') >= 0, 'fromFoamFSM: no initial state is noted');

      var ex = 'com.foamdev.grammaticvisualizer.fsm.examples.';
      [ 'SaveButton', 'LoginForm' ].forEach(function(name) {
        var r = codec.fromFoamFSM(foam.lookup(ex + name));
        x.test(codec.check(r.machine).length === 0, 'example ' + name + ' opens as a machine with no problems: ' + JSON.stringify(codec.check(r.machine)));
      });
      x.test(same(withoutId(codec.fromFoamFSM(foam.lookup(ex + 'SaveButton')).machine), withoutId(save())), 'the SaveButton example is the Save button machine');
      var login = codec.fromFoamFSM(foam.lookup(ex + 'LoginForm')).machine;
      x.test(login.initial === 'start' && login.states.loading.on.REJECT === 'error' && login.states.success.type === 'final', 'the LoginForm example: start, loading, error, success');

      // ---- Empty names --------------------------------------------------------
      x.test(codec.parse('{ "initial": "a", "states": { "a": {}, "": {} } }').error === 'A state needs a name.', 'parse refuses an empty state name');
      x.test(codec.parse('{ "initial": "a", "states": { "a": { "on": { "": "a" } } } }').error === 'State "a": an event needs a name.', 'parse refuses an empty event name');

      // ---- Names every object inherits ----------------------------------------
      var proto = '{ "initial": "a", "states": { "a": {}, "__proto__": {} } }';
      x.test(codec.parse(proto).error === 'The name "__proto__" is not allowed.', 'parse refuses a state named __proto__');
      x.test(codec.parse('{ "initial": "a", "states": { "a": { "on": { "__proto__": "a" } } } }').error === 'The name "__proto__" is not allowed.', 'parse refuses an event named __proto__');
      x.test(ops.addState(save(), '__proto__').error === 'The name "__proto__" is not allowed.', 'addState refuses __proto__');
      x.test(ops.renameState(save(), 'error', '__proto__').error === 'The name "__proto__" is not allowed.', 'renameState refuses __proto__');
      x.test(ops.addArrow(save(), 'error', '__proto__', 'clean').error === 'The name "__proto__" is not allowed.', 'addArrow refuses __proto__');
      x.test(ops.renameEvent(save(), 'error', 'RETRY', '__proto__').error === 'The name "__proto__" is not allowed.', 'renameEvent refuses __proto__');

      var ctor = { initial: 'a', states: { a: { on: { GO: 'constructor' } }, constructor: { type: 'final' } } };
      x.test(codec.check(ctor).length === 0, 'a state named constructor is reachable, not a problem: ' + JSON.stringify(codec.check(ctor)));
      var lostCtor = codec.check({ initial: 'a', states: { a: { type: 'final' }, constructor: { type: 'final' } } });
      x.test(lostCtor.some(function(c) { return c.kind === 'unreachable' && c.state === 'constructor'; }),'an unreachable state named constructor is reported: ' + JSON.stringify(lostCtor));
      var toCtor = ops.renameState(save(), 'error', 'constructor');
      x.test(toCtor.error === '' && toCtor.machine.states.saving.on.FAIL === 'constructor', 'renameState to constructor works: ' + toCtor.error);
      var ctorArrow = ops.addArrow(save(), 'error', 'constructor', 'clean');
      x.test(ctorArrow.error === '' && ctorArrow.machine.states.error.on.constructor === 'clean', 'addArrow with the event constructor works: ' + ctorArrow.error);
      var toStr = ops.renameEvent(save(), 'error', 'RETRY', 'toString');
      x.test(toStr.error === '' && toStr.machine.states.error.on.toString === 'saving', 'renameEvent to toString works: ' + toStr.error);

      // ---- Layout follows edits made in the JSON ------------------------------
      var oldM = { initial: 'a', states: { a: { on: { GO: 'b' } }, b: {} } };
      var renamedM = { initial: 'a', states: { a: { on: { GO: 'c' } }, c: {} } };
      var lay = { a: { x: 1, y: 2 }, b: { x: 3, y: 4 } };
      x.test(same(ops.syncLayout(lay, oldM, renamedM), { a: { x: 1, y: 2 }, c: { x: 3, y: 4 } }), 'syncLayout: one state gone and one new is a rename; the box keeps its place');
      x.test(lay.b && ! lay.c, 'syncLayout does not change its input');
      x.test(same(ops.syncLayout(lay, oldM, { initial: 'a', states: { a: {} } }), { a: { x: 1, y: 2 } }), 'syncLayout drops the position of a removed state');
      x.test(same(ops.syncLayout(lay, oldM, { initial: 'a', states: { a: {}, c: {}, d: {} } }), { a: { x: 1, y: 2 } }), 'syncLayout: two new names for one gone is not a rename');
      x.test(same(ops.syncLayout({ a: { x: 1, y: 2 }, junk: { x: 9, y: 9 } }, oldM, oldM), { a: { x: 1, y: 2 } }), 'syncLayout drops keys for states that do not exist');

      // ---- Per-state description ---------------------------------------------
      var described = { initial: 'a', states: { a: { description: 'Waiting for input', on: { GO: 'b' } }, b: { type: 'final' } } };
      var dspec = codec.toFoamFSMSpec(described, pkg, 'Described' + n);
      x.test(dspec.values[0].documentation === 'Waiting for input' && dspec.values[1].documentation === undefined, 'toFoamFSMSpec: a state description becomes the value documentation');
      foam.FSM(dspec);
      var dback = codec.fromFoamFSM(foam.lookup(pkg + '.Described' + n)).machine;
      x.test(dback.states.a.description === 'Waiting for input' && dback.states.b.description === undefined, 'fromFoamFSM: value documentation comes back as the state description');
      x.test(codec.toMermaid(described).indexOf('  note right of a : Waiting for input\n') >= 0, 'toMermaid: a state description is a note: ' + codec.toMermaid(described));

      // ---- Import: two values with one label ----------------------------------
      foam.FSM({ package: pkg, name: 'SameLabel' + n, values: [
        { name: 'OPEN', label: 'Open', isInitial: true, transitions: [ 'DONE_OK', 'DONE_FAIL' ], on: { OK: 'DONE_OK', FAIL: 'DONE_FAIL' } },
        { name: 'DONE_OK',   label: 'Done', transitions: [] },
        { name: 'DONE_FAIL', label: 'Done', transitions: [] }
      ] });
      var sl = codec.fromFoamFSM(foam.lookup(pkg + '.SameLabel' + n));
      x.test(codec.stateNames(sl.machine).length === 3, 'fromFoamFSM: two values with one label stay two states: ' + JSON.stringify(sl.machine.states));
      x.test(sl.machine.states.Open.on.OK === 'DONE_OK' && sl.machine.states.Open.on.FAIL === 'DONE_FAIL', 'they are named by their value names, and the arrows follow');
      x.test(sl.notes.indexOf('DONE_OK and DONE_FAIL share the label "Done"; using their names.') >= 0, 'and a note says so: ' + sl.notes.join(' | '));

      // ---- What a check row selects ------------------------------------------
      var bad = { initial: 'a', states: { a: { on: { GO: 'nowhere', go: 'b' } }, b: { on: { GO: 'a' } }, lost: { type: 'final' } } };
      var target = function(kind) { return codec.checkTarget(bad, codec.check(bad).filter(function(c) { return c.kind === kind; })[0]); };
      x.test(same(target('unknown-target'), { kind: 'arrow', from: 'a', event: 'GO' }), 'checkTarget: an arrow to a missing state selects that arrow: ' + JSON.stringify(target('unknown-target')));
      x.test(same(target('event-case-clash'), { kind: 'arrow', from: 'a', event: 'go' }), 'checkTarget: an event case clash selects the first arrow with that event: ' + JSON.stringify(target('event-case-clash')));
      x.test(same(target('unreachable'), { kind: 'state', state: 'lost' }), 'checkTarget: an unreachable state selects the state');
      x.test(codec.checkTarget({ initial: 'zz', states: { a: {} } }, codec.check({ initial: 'zz', states: { a: {} } })[0]) === null, 'checkTarget: a missing initial state selects nothing');
    }
  ]
});
