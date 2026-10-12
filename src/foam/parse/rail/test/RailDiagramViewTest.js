/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.rail.test',
  name: 'RailDiagramViewTest',
  extends: 'foam.core.test.JSTest',

  requires: [
    'foam.lang.Action',
    'foam.parse.rail.RailDiagramView'
  ],

  documentation: `
    The viewer's chrome is built from FOAM widgets: every button is an Action,
    every control is a u2 view bound to a property on the view, and the
    properties drive the scene. Setting a property does what clicking did.
  `,

  methods: [
    async function runTest(x) {
      var v = this.RailDiagramView.create({ allowTypedGrammar: true }, x);
      v.write();
      v.usePreset('comma list (toy)');
      var root = v.element_;
      var names = function() { return v.scene.strips.map(function(s) { return s.name; }); };

      // Every clickable control in the chrome is a FOAM widget, not raw HTML.
      var raw = function(tag, cls) {
        return Array.from(root.querySelectorAll(tag)).filter(function(el) {
          // The scene's SVG and the ribbon canvas are not chrome; a control inside them is not counted.
          if ( el.closest('.foam-parse-rail-RailScene') ) return false;
          return ! new RegExp('\\b' + cls + '\\b').test(el.className);
        }).map(function(el) { return el.outerHTML.slice(0, 60); });
      };
      var rawButtons = raw('button', 'foam-u2-ActionView');
      x.test(rawButtons.length === 0, 'every button is an ActionView: ' + rawButtons.join(' | '));
      var rawInputs = Array.from(root.querySelectorAll('input, select, textarea')).filter(function(el) {
        return ! /foam-u2-/.test(el.className);
      }).map(function(el) { return el.outerHTML.slice(0, 60); });
      x.test(rawInputs.length === 0, 'every input, select and textarea is a u2 view: ' + rawInputs.join(' | '));
      x.test(! root.querySelector('[style*="color"], [style*="background"]') ||
             ! Array.from(root.querySelectorAll('[style*="color"], [style*="background"]')).some(function(el) { return ! el.closest('.foam-parse-rail-RailScene'); }),
             'no inline colour styles in the chrome');

      // Buttons are actions on the view, with tooltips where the old buttons had title=.
      var isAction = function(n) { var a = v.cls_.getAxiomByName(n); return !! a && foam.lang.Action.isInstance(a); };
      [ 'fitWidth', 'fitAll', 'unfoldPath', 'foldAll', 'loadTyped', 'parse', 'stepBack', 'stepOne', 'stepOver', 'nextRule', 'togglePlay', 'runToEnd' ]
        .forEach(function(n) { x.test(isAction(n), 'action ' + n + ' is declared'); });
      x.test(!! v.cls_.getAxiomByName('parse').toolTip, 'parse carries its tooltip');
      var style = v.cls_.getAxiomByName('parse').buttonStyle;
      x.test(( style.name || style ) === 'PRIMARY', 'parse is the one primary action');

      // Progressive disclosure: the second toolbar row and the extra grammar sources start folded.
      var hidden = function(el) { return !! el && el.getClientRects().length === 0; };
      var bar2 = root.querySelector('.foam-parse-rail-RailDiagramView-bar2');
      x.test(! v.moreShown && hidden(bar2), 'More row starts hidden');
      v.toggleMore();
      x.test(v.moreShown && ! hidden(bar2), 'toggleMore unfolds the row');
      v.toggleMore();
      x.test(root.querySelectorAll('.foam-parse-rail-RailDiagramView-bar > .foam-u2-ActionView').length <= 6, 'first toolbar row keeps few buttons');

      // Empty state: before a grammar the column says what to do; the hint goes once one is loaded.
      var fresh = this.RailDiagramView.create({}, x);
      fresh.write();
      x.test(/Pick a preset/.test(fresh.element_.textContent), 'empty state tells the user what to do');
      fresh.usePreset('comma list (toy)');
      x.test(hidden(fresh.element_.querySelector('.foam-parse-rail-RailDiagramView-emptyHint')), 'hint hidden once a grammar is loaded');
      x.test(fresh.needsParse && /press Parse/.test(fresh.status), 'a loaded grammar asks for Parse');
      fresh.remove();

      // Properties drive the scene: the rule filter, the unreachable toggle, the value toggles.
      var all = names().length;
      v.findText = 'number';
      x.test(names().join(',') === 'number', 'findText filters the strips: ' + names().join(','));
      v.findText = '';
      x.test(names().length === all, 'clearing findText restores every strip');
      v.showValues = true;
      x.test(v.scene.showValues === true, 'showValues reaches the scene');
      v.showLanes = true;
      x.test(v.scene.showLanes === true, 'showLanes reaches the scene');

      // Grammar sources are properties too: picking a preset swaps grammar and input together.
      v.preset = 'key=value pairs';
      x.test(v.input === 'name=alex;city="new york";tz=est' && names().indexOf('pair') >= 0, 'preset property loads the preset: ' + v.input);
      v.preset = 'comma list (toy)';

      // The trace: parse is an action; the slider's range follows the trace; moving the slider moves the step.
      x.test(v.traceLength === 0 && ! v.trace, 'no trace before parse');
      v.parse();
      x.test(!! v.trace && v.traceLength === v.trace.length(), 'parse records a trace and publishes its length: ' + v.traceLength);
      v.step = 3;
      x.test(/^step 3\//.test(v.status), 'setting step moves the trace: ' + v.status.split('\n')[0]);
      v.runToEnd();
      x.test(v.step === v.traceLength, 'runToEnd lands on the last step');
      v.togglePlay();
      x.test(v.playing === true, 'togglePlay starts playing');
      v.stopPlay();
      x.test(v.playing === false, 'stopPlay stops');

      // Editing the input drops the trace.
      x.test(v.needsParse === false, 'after parse nothing is pending');
      v.input = 'x';
      x.test(! v.trace && v.traceLength === 0 && v.status === v.NOT_PARSED, 'input change invalidates the trace');
      x.test(v.needsParse === true, 'input change asks for Parse again');

      // Typed grammar: the text is a property bound to the editor; loadTyped compiles it.
      v.grammarText = "{ START: seq(literal('x'), eof()) }";
      v.loadTyped();
      x.test(names().join(',') === 'START', 'loadTyped compiles grammarText: ' + names().join(','));
      v.runToEnd();
      x.test(/✓/.test(v.status), 'the typed grammar parses the input: ' + v.status.split('\n')[0]);

      v.remove();
    }
  ]
});
