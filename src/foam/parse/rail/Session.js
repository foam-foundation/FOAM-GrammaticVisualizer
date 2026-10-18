/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.rail',
  name: 'Session',

  requires: [ 'foam.parse.rail.ParseTrace' ],

  documentation: `
    One input parsed with one grammar, and where in that parse the user is
    looking: the trace and the current step. A view binds to snapshot. The
    <grammar> tag keeps one Session per example so each can be stepped on its
    own; the one shown in the diagram is mirrored into RailDiagramView.
  `,

  properties: [
    { class: 'String', name: 'input' },
    { name: 'grammar' },
    { class: 'String', name: 'startSymbol', value: 'START' },
    { name: 'trace', documentation: 'The recorded ParseTrace, or null before record().' },
    {
      class: 'Int',
      name: 'step',
      adapt: function(_, n) { var max = this.trace ? this.trace.length() : 0; return Math.max(0, Math.min(max, n)); }
    },
    { class: 'Int',  name: 'traceLength', expression: function(trace) { return trace ? trace.length() : 0; } },
    { name: 'snapshot', expression: function(trace, step) { return trace ? trace.at(step) : null; } },
    { class: 'Boolean', name: 'matched', expression: function(trace) { if ( ! trace ) return false; var end = trace.at(trace.length()); return !! end.matched; } },
    { class: 'String', name: 'error' },
    { class: 'String', name: 'summary', expression: function(snapshot) { return snapshot ? snapshot.summary().split('\n')[0] : ''; } }
  ],

  methods: [
    function record() {
      /** Parse to the end and stand there; an error is kept on the session instead of thrown. */
      this.error = '';
      try {
        this.trace = this.ParseTrace.create({ grammar: this.grammar, startSymbol: this.startSymbol, input: this.input }).record();
        this.step  = this.trace.length();
      } catch (x) {
        this.trace = null;
        this.error = 'could not parse: ' + ( x.message || x );
      }
      return this;
    }
  ],

  actions: [
    { name: 'stepBack', label: '◀',     toolTip: 'one event back',    isEnabled: function(step) { return step > 0; },                 code: function() { this.step = this.step - 1; } },
    { name: 'stepOne',  label: '▶',     toolTip: 'one event forward', isEnabled: function(step, traceLength) { return step < traceLength; }, code: function() { this.step = this.step + 1; } },
    { name: 'restart',  label: '⏮',     toolTip: 'back to the start', isEnabled: function(step) { return step > 0; },                 code: function() { this.step = 0; } },
    { name: 'runToEnd', label: '⏭ end', toolTip: 'to the last event', isEnabled: function(step, traceLength) { return step < traceLength; }, code: function() { this.step = this.traceLength; } }
  ]
});
