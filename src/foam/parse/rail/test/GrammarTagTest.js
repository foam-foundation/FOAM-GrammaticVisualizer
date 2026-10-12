/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.rail.test',
  name: 'GrammarTagTest',
  extends: 'foam.core.test.JSTest',

  requires: [
    'foam.parse.rail.GrammarTag',
    'foam.u2.view.MarkdownView'
  ],

  documentation: 'The <grammar> tag: registered as an element, body is the grammar, tabs switch source and diagram, input comes from the attribute or a flow block.',

  methods: [
    async function runTest(x) {
      var wait = function(ms) { return new Promise(function(r) { setTimeout(r, ms); }); };
      var G = "{ START: seq(sym('word'), eof()), word: plus(range('a', 'z')) }";

      // Rendered from markdown (which proves the element registration): the body reaches grammarText, the attribute reaches input.
      var md = this.MarkdownView.create({ data: 'Before\n<grammar input="abc">\n' + G + '\n</grammar>\nAfter\n' }, x);
      md.write();
      await wait(50);
      var tagEl = md.element_.querySelector('.foam-parse-rail-GrammarTag');
      x.test(!! tagEl, 'markdown renders the tag');
      x.test(tagEl && tagEl.querySelector('textarea').value === G, 'the body is the grammar text');
      md.remove();
      var md2 = this.MarkdownView.create({ data: '<grammar inputs="abc|xyz">\n' + G + '\n</grammar>\n' }, x);
      md2.write();
      await wait(80);
      var ex2 = md2.element_.querySelector('.foam-parse-rail-GrammarTag-examples');
      x.test(ex2 && ex2.getClientRects().length > 0 && ex2.querySelectorAll('tr.row').length === 2, 'inputs from markdown open the Examples tab with a row per input');
      md2.remove();

      // Direct: Code tab by default, Diagram tab mounts the viewer with the compiled grammar and the input.
      var t = this.GrammarTag.create({ grammarText: G, input: 'abc' }, x);
      t.write();
      x.test(t.mode === 'code' && ! t.element_.querySelector('.foam-parse-rail-RailDiagramView'), 'starts on the Code tab, no viewer yet');
      t.mode = 'diagram';
      await wait(50);
      var strips = t.viewer && t.viewer.scene.strips.map(function(s) { return s.name; });
      x.test(!! t.element_.querySelector('.foam-parse-rail-RailDiagramView'), 'Diagram tab mounts the viewer');
      x.test(strips && strips.join(',') === 'START,word', 'the grammar is compiled into strips: ' + strips);
      x.test(t.viewer.input === 'abc', 'the input attribute reaches the viewer');
      t.viewer.runToEnd();
      x.test(/✓/.test(t.viewer.status), 'and parses: ' + t.viewer.status.split('\n')[0]);

      // Tab switches keep the viewer and its trace; the second Diagram open must not rebuild it.
      var viewer = t.viewer, step = t.viewer.step;
      t.mode = 'code'; await wait(20); t.mode = 'diagram'; await wait(50);
      x.test(t.viewer === viewer && t.viewer.step === step && !! t.element_.querySelector('.foam-parse-rail-RailDiagramView'), 'Code → Diagram again keeps the same viewer at the same step');

      // A broken grammar reports instead of throwing.
      t.grammarText = '{ START: nope( }';
      t.compile();
      x.test(/grammar error/.test(t.error), 'a bad grammar shows an error: ' + t.error);
      t.remove();

      // inputs: an Examples tab, one row per input; a row click opens the diagram on that input.
      var ex = this.GrammarTag.create({ grammarText: G, inputs: 'abc|123' }, x);
      ex.write(); await wait(50);
      x.test(ex.mode === 'examples', 'with inputs the Examples tab comes first');
      var rows = ex.element_.querySelectorAll('.foam-parse-rail-GrammarTag-examples tr.row');
      x.test(rows.length === 2, 'one row per input: ' + rows.length);
      var cells = r => Array.from(r.querySelectorAll('td')).map(td => td.textContent);
      x.test(cells(rows[0])[1] === 'abc' && cells(rows[0])[2] === '[["a","b","c"],""]', 'abc parses, value shown as JSON: ' + cells(rows[0]).join(' | '));
      x.test(cells(rows[1])[2] === 'undefined' && rows[1].querySelector('.fail'), '123 fails, in red: ' + cells(rows[1]).join(' | '));
      rows[1].click(); await wait(80);
      x.test(ex.mode === 'diagram' && ex.viewer && ex.viewer.input === '123' && /✗/.test(ex.viewer.status), 'row click shows that input in the diagram, parsed: ' + (ex.viewer && ex.viewer.status.split('\n')[0]));
      ex.remove();

      // input-from: the text comes from a block of the surrounding flow.
      var scoped = x.createSubContext({ scope: { sample: 'xyz', blk: { value: 'qq' } } });
      var t2 = this.GrammarTag.create({ grammarText: G, inputFrom: 'sample' }, scoped);
      t2.write(); t2.mode = 'diagram'; await wait(50);
      x.test(t2.viewer.input === 'xyz', 'input-from reads a string block from the flow scope');
      t2.remove();
      var t3 = this.GrammarTag.create({ grammarText: G, inputFrom: 'blk' }, scoped);
      t3.write(); t3.mode = 'diagram'; await wait(50);
      x.test(t3.viewer.input === 'qq', 'input-from reads a block value');
      t3.remove();
      var t4 = this.GrammarTag.create({ grammarText: G, inputFrom: 'missing' }, scoped);
      t4.write(); t4.mode = 'diagram'; await wait(50);
      x.test(/input-from/.test(t4.error), 'a missing block is reported: ' + t4.error);
      t4.remove();
    }
  ]
});
