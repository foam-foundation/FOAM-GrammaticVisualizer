/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer.fsm',
  name: 'StateMachineStudioView',
  extends: 'foam.u2.View',

  documentation: `
    The state machine studio screen. Left: the machine picker, name, and tabs
    for the JSON, the code (foam.FSM and Mermaid), checks, steps and import.
    Right: the selection inspector, the canvas and the Step row.

    machine (a JSON object) is the one source of truth. Editing the JSON parses
    into it; every canvas or inspector edit goes through MachineOps and writes
    the JSON back. Positions live in layout, saved next to the JSON.
  `,

  requires: [
    'com.foamdev.grammaticvisualizer.fsm.Machine',
    'com.foamdev.grammaticvisualizer.fsm.MachineCanvas',
    'com.foamdev.grammaticvisualizer.fsm.MachineCodec',
    'com.foamdev.grammaticvisualizer.fsm.MachineOps',
    'com.foamdev.grammaticvisualizer.fsm.MachineRunner',
    'com.foamdev.grammaticvisualizer.fsm.MachineStepRow',
    'foam.u2.SegmentedTabs as Tabs',
    'foam.u2.Tab'
  ],

  imports: [ 'machineDAO?' ],

  constants: {
    EXAMPLES: [
      [ 'com.foamdev.grammaticvisualizer.fsm.examples.SaveButton', 'Save button' ],
      [ 'com.foamdev.grammaticvisualizer.fsm.examples.LoginForm',  'Login form' ]
    ]
  },

  messages: [
    { name: 'MACHINE_LABEL',     message: 'Machine' },
    { name: 'NAME_LABEL',        message: 'Name' },
    { name: 'DESCRIPTION_LABEL', message: 'Description' },
    { name: 'JSON_TAB',          message: 'JSON' },
    { name: 'CODE_TAB',          message: 'Code' },
    { name: 'CHECKS_TAB',        message: 'Checks' },
    { name: 'STEPS_TAB',         message: 'Steps' },
    { name: 'IMPORT_TAB',        message: 'Import' },
    { name: 'JSON_HELP',         message: 'XState machine JSON. Edit here or on the canvas; both stay in sync.' },
    { name: 'FOAM_FSM_TITLE',    message: 'foam.FSM' },
    { name: 'FOAM_FSM_HELP',     message: 'Uses this app\'s events refinement (on, send<Name>).' },
    { name: 'MERMAID_TITLE',     message: 'Mermaid' },
    { name: 'PACKAGE_LABEL',     message: 'Package' },
    { name: 'NO_PROBLEMS',       message: 'No problems found.' },
    { name: 'NO_STEPS',          message: 'No steps yet. Press an event under the canvas.' },
    { name: 'FOAM_IMPORT_TITLE', message: 'Open a foam.FSM class' },
    { name: 'FILE_IMPORT_TITLE', message: 'Open a JSON file' },
    { name: 'EXPORT_TITLE',      message: 'Export' },
    { name: 'NOT_A_FSM',         message: 'No foam.FSM class with that id is loaded.' },
    { name: 'SELECT_HINT',       message: 'Click a state or an arrow label to edit it. Drag states to move them.' },
    { name: 'CONNECT_HINT',      message: 'Now click the state the new arrow goes to.' },
    { name: 'STATE_LABEL',       message: 'State' },
    { name: 'EVENT_LABEL',       message: 'Event' },
    { name: 'NEW_MACHINE_NAME',  message: 'New machine' }
  ],

  css: `
    ^ { display: grid; grid-template-columns: minmax(40rem, 46rem) minmax(0, 1fr); gap: $space-4;
        height: 100%; min-height: 0; padding: $space-4; box-sizing: border-box; }
    ^side { display: flex; flex-direction: column; gap: $space-3; min-height: 0; overflow: auto; }
    ^main { display: flex; flex-direction: column; gap: $space-3; min-width: 0; min-height: 0; }
    ^canvas { flex: 1; min-height: 30rem; }
    ^row { display: flex; flex-wrap: wrap; align-items: center; gap: $space-2; }
    ^field { display: flex; flex-direction: column; gap: $space-1; }
    ^field > .p-label { color: $textSecondary; }
    ^hint { color: $textSecondary; }
    ^error { color: $textDestructive; white-space: pre-wrap; overflow-wrap: anywhere; }
    ^ pre { margin: 0; padding: $space-3; background: $backgroundSecondary; border-radius: $space-2;
            white-space: pre-wrap; overflow-wrap: anywhere; }
    ^check { padding: $space-2; border-bottom: 1px solid $borderLight; cursor: pointer; }
    ^check.blocking { color: $textDestructive; }
    ^step { padding: $space-1 0; border-bottom: 1px solid $borderLight; }
    ^section { display: flex; flex-direction: column; gap: $space-2; padding-top: $space-2; }
    ^ textarea { width: 100%; box-sizing: border-box; }
    /* Five tabs: SegmentedTabs gives each at least 100px, which cuts the last ones off here. */
    ^ .foam-u2-SegmentedTabs-tabRow { grid-auto-columns: minmax(0, 1fr); }
  `,

  properties: [
    {
      class: 'Long',
      name: 'machineId',
      label: 'Machine',
      view: function(_, X) {
        return {
          class: 'foam.u2.view.ChoiceView',
          dao: X.data.machineDAO,
          objToChoice: function(m) { return [ m.id, m.name ]; },
          placeholder: '-'
        };
      },
      postSet: function(_, n) { if ( ! this.feedback_ && n ) this.loadMachine(n); }
    },
    { class: 'String', name: 'name' },
    { class: 'String', name: 'description' },
    {
      class: 'String',
      name: 'definitionText',
      view: { class: 'foam.u2.tag.TextArea', rows: 18, onKey: true },
      postSet: function(_, n) { if ( ! this.feedback_ ) this.onText(n); }
    },
    { class: 'String', name: 'parseError' },
    {
      name: 'machine',
      documentation: 'The machine JSON object: the one source of truth.',
      postSet: function(_, n) { this.runner.machine = n; }
    },
    { name: 'layout', factory: function() { return {}; } },
    { name: 'selection', value: null, postSet: function() { this.onSelection(); } },
    {
      class: 'String',
      name: 'stateName',
      label: 'State',
      postSet: function(_, n) { if ( ! this.feedback_ ) this.renameSelectedState(n); }
    },
    {
      class: 'String',
      name: 'eventName',
      label: 'Event',
      postSet: function(_, n) { if ( ! this.feedback_ ) this.renameSelectedEvent(n); }
    },
    { class: 'String', name: 'opError' },
    { class: 'String', name: 'foamPackage', value: 'com.example' },
    {
      class: 'String',
      name: 'foamClassName',
      expression: function(name) {
        var s = String(name || '').replace(/[^A-Za-z0-9]+(.)?/g, function(_, c) { return c ? c.toUpperCase() : ''; });
        s = s.charAt(0).toUpperCase() + s.slice(1);
        return /^[A-Za-z]/.test(s) ? s : 'Machine' + s;
      }
    },
    {
      class: 'String',
      name: 'foamSource',
      expression: function(machine, foamPackage, foamClassName) {
        return machine ? this.codec.toFoamFSMSource(machine, foamPackage, foamClassName) : '';
      }
    },
    {
      class: 'String',
      name: 'mermaid',
      expression: function(machine) { return machine ? this.codec.toMermaid(machine) : ''; }
    },
    {
      // Not class 'Array': its default factory ([]) would win over this expression.
      name: 'checks',
      expression: function(machine) { return machine ? this.codec.check(machine) : []; }
    },
    {
      class: 'String',
      name: 'checksLabel',
      expression: function(checks) { return this.CHECKS_TAB + ' (' + checks.length + ')'; }
    },
    {
      class: 'String',
      name: 'foamClassId',
      label: 'Class id',
      factory: function() { return this.EXAMPLES[0][0]; },
      view: function(_, X) { return { class: 'foam.u2.TextField', choices: X.data.EXAMPLES }; }
    },
    { class: 'String', name: 'importNotes' },
    {
      class: 'String',
      name: 'importFile',
      label: 'JSON file',
      view: { class: 'foam.u2.view.FileUploadTextField' },
      postSet: function(_, n) { if ( n ) this.openText(n); }
    },
    { class: 'Array', name: 'steps', documentation: 'Mirror of runner.history for the Steps tab.' },
    { name: 'codec',  hidden: true, factory: function() { return this.MachineCodec.create(); } },
    { name: 'ops',    hidden: true, factory: function() { return this.MachineOps.create(); } },
    { name: 'runner', hidden: true, factory: function() { return this.MachineRunner.create({}, this); } },
    { name: 'canvas', hidden: true },
    { class: 'Boolean', name: 'feedback_', hidden: true }
  ],

  methods: [
    function init() {
      this.SUPER();
      this.steps$.follow(this.runner.history$);
      var self = this;
      if ( ! this.machineDAO ) { this.newMachine(); return; }
      this.machineDAO.limit(1).select().then(function(s) {
        if ( self.machine ) return; // already loaded or started
        var first = s.array[0];
        if ( first ) self.machineId = first.id;
        else self.newMachine();
      });
    },

    function render() {
      var self = this;
      this.canvas = this.MachineCanvas.create({
        machine$:   this.machine$,
        layout$:    this.layout$,
        selection$: this.selection$
      }, this);
      // One-way: a two-way link would write back into checks and replace its expression.
      this.canvas.current$.follow(this.runner.current$);
      this.canvas.problems$.follow(this.checks$);
      this.onDetach(this.canvas.sub('connect', function(_, __, from, to) { self.connect(from, to); }));

      this.addClass()
        .startContext({ data: this })
          .start().addClass(this.myClass('side'))
            .start().addClass(this.myClass('row'))
              .add(this.MACHINE_ID)
              .add(this.NEW_MACHINE, this.SAVE_MACHINE, this.DELETE_MACHINE)
            .end()
            .call(function() { self.field_(this, self.NAME_LABEL, self.NAME); })
            .call(function() { self.field_(this, self.DESCRIPTION_LABEL, self.DESCRIPTION); })
            .start(this.Tabs)
              .start(this.Tab, { label: this.JSON_TAB })
                .start().addClass(this.myClass('section'))
                  .start('span').addClass(this.myClass('hint')).add(this.JSON_HELP).end()
                  .add(this.DEFINITION_TEXT)
                  .start().addClass(this.myClass('error')).show(this.parseError$).add(this.parseError$).end()
                .end()
              .end()
              .start(this.Tab, { label: this.CODE_TAB })
                .start().addClass(this.myClass('section'))
                  .call(function() { self.field_(this, self.PACKAGE_LABEL, self.FOAM_PACKAGE); })
                  .start('span').addClass('p-label').add(this.FOAM_FSM_TITLE).end()
                  .start('span').addClass(this.myClass('hint')).add(this.FOAM_FSM_HELP).end()
                  .start('pre').attrs({ 'data-code': 'foam' }).add(this.foamSource$).end()
                  .start('span').addClass('p-label').add(this.MERMAID_TITLE).end()
                  .start('pre').attrs({ 'data-code': 'mermaid' }).add(this.mermaid$).end()
                .end()
              .end()
              .start(this.Tab, { label$: this.checksLabel$ })
                .start().addClass(this.myClass('section'))
                  .add(this.dynamic(function(checks) {
                    if ( ! checks.length ) { this.start('span').addClass(self.myClass('hint')).add(self.NO_PROBLEMS).end(); return; }
                    checks.forEach(function(c) {
                      this.start().addClass(self.myClass('check')).enableClass('blocking', c.blocking)
                        .add(c.message)
                        .on('click', function() { if ( c.state && self.machine.states[c.state] ) self.selection = { kind: 'state', state: c.state }; })
                      .end();
                    }, this);
                  }))
                .end()
              .end()
              .start(this.Tab, { label: this.STEPS_TAB })
                .start().addClass(this.myClass('section')).attrs({ 'data-step-history': true })
                  .add(this.RESET_STEPS)
                  .add(this.dynamic(function(steps) {
                    if ( ! steps.length ) { this.start('span').addClass(self.myClass('hint')).add(self.NO_STEPS).end(); return; }
                    steps.forEach(function(s, i) {
                      this.start().addClass(self.myClass('step'), 'step').add((i + 1) + '. ' + s.from + '  →  ' + s.event + '  →  ' + s.to).end();
                    }, this);
                  }))
                .end()
              .end()
              .start(this.Tab, { label: this.IMPORT_TAB })
                .start().addClass(this.myClass('section'))
                  .start('span').addClass('p-label').add(this.FOAM_IMPORT_TITLE).end()
                  .start().addClass(this.myClass('row')).add(this.FOAM_CLASS_ID, this.OPEN_FOAM_FSM).end()
                  .start('span').addClass('p-label').add(this.FILE_IMPORT_TITLE).end()
                  .add(this.IMPORT_FILE)
                  .start().addClass(this.myClass('hint')).show(this.importNotes$).add(this.importNotes$).end()
                  .start('span').addClass('p-label').add(this.EXPORT_TITLE).end()
                  .start().addClass(this.myClass('row')).add(this.EXPORT_JSON).end()
                .end()
              .end()
            .end()
          .end()
          .start().addClass(this.myClass('main'))
            .start().addClass(this.myClass('row'))
              .add(this.ADD_STATE)
              .add(this.dynamic(function(selection) { self.inspector_(this, selection); }))
            .end()
            .start().addClass(this.myClass('error')).show(this.opError$).add(this.opError$).end()
            .tag(this.canvas.addClass(this.myClass('canvas')))
            .tag(this.MachineStepRow, { runner: this.runner })
          .end()
        .endContext();
    },

    function field_(e, label, prop) {
      e.start().addClass(this.myClass('field'))
        .start('span').addClass('p-label').add(label).end()
        .add(prop)
      .end();
    },

    function inspector_(e, sel) {
      if ( sel && sel.kind === 'state' ) {
        e.start('span').addClass('p-label').add(this.STATE_LABEL).end()
          .add(this.STATE_NAME, this.MAKE_INITIAL, this.TOGGLE_FINAL, this.ADD_ARROW, this.DELETE_STATE);
        e.start('span').addClass(this.myClass('hint')).show(this.canvas.connectFrom$).add(this.CONNECT_HINT).end();
      } else if ( sel && sel.kind === 'arrow' ) {
        e.start('span').addClass('p-label').add(this.EVENT_LABEL).end()
          .start('span').add(sel.from + ' →').end()
          .add(this.EVENT_NAME)
          .start('span').add('→ ' + ( this.machine && this.machine.states[sel.from] && this.machine.states[sel.from].on ? this.machine.states[sel.from].on[sel.event] : '' )).end()
          .add(this.DELETE_ARROW);
      } else {
        e.start('span').addClass(this.myClass('hint')).add(this.SELECT_HINT).end();
      }
    },

    function quiet_(fn) {
      /** Sets properties without their postSet re-entering the sync. */
      var was = this.feedback_;
      this.feedback_ = true;
      try { fn.call(this); } finally { this.feedback_ = was; }
    },

    function onText(text) {
      var p = this.codec.parse(text);
      this.parseError = p.error;
      if ( p.machine ) { this.machine = p.machine; this.dropMissingSelection_(); }
    },

    function applyOp(r) {
      /** Takes a MachineOps result: shows a refusal, or makes the new machine current and writes the JSON. */
      if ( r.error ) { this.opError = r.error; return false; }
      this.opError = '';
      this.machine = r.machine;
      this.quiet_(function() { this.definitionText = this.codec.stringify(r.machine); });
      this.parseError = '';
      return true;
    },

    function dropMissingSelection_() {
      var s = this.selection, m = this.machine;
      if ( ! s || ! m ) return;
      if ( s.kind === 'state' && ! m.states[s.state] ) this.selection = null;
      if ( s.kind === 'arrow' && ! ( m.states[s.from] && m.states[s.from].on && m.states[s.from].on[s.event] !== undefined ) ) this.selection = null;
    },

    function openText(text) {
      /** Opens JSON text (from a file) as a new, unsaved machine. */
      var p = this.codec.parse(text);
      if ( p.error ) { this.parseError = p.error; return; }
      this.quiet_(function() { this.machineId = 0; });
      this.name = p.machine.id || this.NEW_MACHINE_NAME;
      this.description = p.machine.description || '';
      this.layout = {};
      this.selection = null;
      this.definitionText = this.codec.stringify(p.machine);
    },

    async function loadMachine(id) {
      var m = this.machineDAO && await this.machineDAO.find(id);
      if ( ! m ) return;
      var layout = {};
      try { layout = m.layout ? JSON.parse(m.layout) : {}; } catch (e) { layout = {}; }
      this.name        = m.name;
      this.description = m.description;
      this.selection   = null;
      this.opError     = '';
      this.importNotes = '';
      this.layout      = layout;
      this.definitionText = m.definition;
      if ( this.definitionText === m.definition && ! this.machine ) this.onText(m.definition);
    },

    function renameSelectedState(n) {
      var sel = this.selection;
      if ( ! sel || sel.kind !== 'state' ) return;
      var from = sel.state;
      if ( this.applyOp(this.ops.renameState(this.machine, from, n)) ) {
        this.layout = this.ops.renameLayoutKey(this.layout, from, n);
        this.selection = { kind: 'state', state: n };
      } else {
        this.quiet_(function() { this.stateName = from; });
      }
    },

    function renameSelectedEvent(n) {
      var sel = this.selection;
      if ( ! sel || sel.kind !== 'arrow' ) return;
      if ( this.applyOp(this.ops.renameEvent(this.machine, sel.from, sel.event, n)) ) {
        this.selection = { kind: 'arrow', from: sel.from, event: n };
      } else {
        this.quiet_(function() { this.eventName = sel.event; });
      }
    },

    function connect(from, to) {
      var r = this.ops.addArrow(this.machine, from, undefined, to);
      if ( ! this.applyOp(r) ) return;
      var events = Object.keys(r.machine.states[from].on);
      this.selection = { kind: 'arrow', from: from, event: events[events.length - 1] };
    }
  ],

  listeners: [
    function onSelection() {
      var s = this.selection;
      this.opError = '';
      this.quiet_(function() {
        this.stateName = s && s.kind === 'state' ? s.state : '';
        this.eventName = s && s.kind === 'arrow' ? s.event : '';
      });
      if ( this.canvas && ( ! s || s.kind !== 'state' ) ) this.canvas.connectFrom = '';
    }
  ],

  actions: [
    {
      name: 'newMachine',
      label: 'New',
      code: function() {
        this.quiet_(function() { this.machineId = 0; });
        this.name = this.NEW_MACHINE_NAME;
        this.description = '';
        this.layout = {};
        this.selection = null;
        this.importNotes = '';
        this.definitionText = this.codec.stringify({ id: 'newMachine', initial: 'idle', states: { idle: {} } });
      }
    },
    {
      name: 'saveMachine',
      label: 'Save',
      isEnabled: function(name, parseError) { return !! name && ! parseError; },
      code: async function() {
        var m = this.Machine.create({
          name: this.name,
          description: this.description,
          definition: this.definitionText,
          layout: JSON.stringify(this.layout || {})
        }, this);
        if ( this.machineId ) m.id = this.machineId;
        var stored = await this.machineDAO.put(m);
        this.quiet_(function() { this.machineId = stored.id; });
        return stored;
      }
    },
    {
      name: 'deleteMachine',
      label: 'Delete',
      buttonStyle: 'TERTIARY',
      isEnabled: function(machineId) { return !! machineId; },
      code: async function() {
        var m = await this.machineDAO.find(this.machineId);
        if ( m ) await this.machineDAO.remove(m);
        var s = await this.machineDAO.limit(1).select();
        if ( s.array[0] ) { this.quiet_(function() { this.machineId = 0; }); this.machineId = s.array[0].id; }
        else this.newMachine();
      }
    },
    {
      name: 'addState',
      label: '+ State',
      isEnabled: function(machine) { return !! machine; },
      code: function() {
        var r = this.ops.addState(this.machine);
        if ( ! this.applyOp(r) ) return;
        var names = Object.keys(r.machine.states);
        this.selection = { kind: 'state', state: names[names.length - 1] };
      }
    },
    {
      name: 'makeInitial',
      label: 'Make initial',
      buttonStyle: 'SECONDARY',
      isEnabled: function(selection, machine) { return !! selection && selection.kind === 'state' && !! machine && machine.initial !== selection.state; },
      code: function() { this.applyOp(this.ops.setInitial(this.machine, this.selection.state)); }
    },
    {
      name: 'toggleFinal',
      label: 'Final',
      buttonStyle: 'SECONDARY',
      isEnabled: function(selection) { return !! selection && selection.kind === 'state'; },
      code: function() {
        var n = this.selection.state;
        this.applyOp(this.ops.setFinal(this.machine, n, ! this.codec.isFinal(this.machine, n)));
      }
    },
    {
      name: 'addArrow',
      label: '+ Arrow',
      buttonStyle: 'SECONDARY',
      toolTip: 'Then click the state the arrow goes to.',
      isEnabled: function(selection) { return !! selection && selection.kind === 'state'; },
      code: function() { this.canvas.connectFrom = this.selection.state; }
    },
    {
      name: 'deleteState',
      label: '',
      themeIcon: 'trash',
      buttonStyle: 'TERTIARY',
      toolTip: 'Delete this state and its arrows',
      isEnabled: function(selection) { return !! selection && selection.kind === 'state'; },
      code: function() {
        var n = this.selection.state;
        if ( this.applyOp(this.ops.deleteState(this.machine, n)) ) {
          this.layout = this.ops.dropLayoutKey(this.layout, n);
          this.selection = null;
        }
      }
    },
    {
      name: 'deleteArrow',
      label: '',
      themeIcon: 'trash',
      buttonStyle: 'TERTIARY',
      toolTip: 'Delete this arrow',
      isEnabled: function(selection) { return !! selection && selection.kind === 'arrow'; },
      code: function() {
        var s = this.selection;
        if ( this.applyOp(this.ops.deleteArrow(this.machine, s.from, s.event)) ) this.selection = null;
      }
    },
    {
      name: 'resetSteps',
      label: '↺ Start over',
      buttonStyle: 'SECONDARY',
      code: function() { this.runner.start(); }
    },
    {
      name: 'openFoamFSM',
      label: 'Open',
      buttonStyle: 'SECONDARY',
      code: function() {
        var cls = foam.lookup(this.foamClassId, true);
        if ( ! cls || ! foam.lang.StateMachineEnum.isSubClass(cls) ) { this.importNotes = this.NOT_A_FSM; return; }
        var r = this.codec.fromFoamFSM(cls);
        this.quiet_(function() { this.machineId = 0; });
        this.name = cls.model_.label || cls.model_.name;
        this.description = r.machine.description || '';
        this.layout = {};
        this.selection = null;
        this.definitionText = this.codec.stringify(r.machine);
        this.importNotes = r.notes.join(' ');
      }
    },
    {
      name: 'exportJSON',
      label: 'Download JSON',
      buttonStyle: 'SECONDARY',
      isEnabled: function(parseError, machine) { return ! parseError && !! machine; },
      code: function() {
        var blob = new Blob([ this.definitionText ], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = ( this.machine.id || this.foamClassName || 'machine' ) + '.json';
        a.click();
        setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
      }
    }
  ]
});
