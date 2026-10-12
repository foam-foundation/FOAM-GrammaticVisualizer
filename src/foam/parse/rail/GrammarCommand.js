/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.rail',
  name: 'GrammarCommand',
  extends: 'foam.core.reflow.cmd.Command',

  documentation: `
    The console command "grammar <symbols() text>": a block whose value is a
    GrammarTag, so the grammar is saved with the flow and shown as code or as
    its railroad diagram. Listing this command in cmds.jrl also loads the
    GrammarTag class when the console starts, which registers the <grammar>
    markdown tag for every flow (a class file loads on first reference).
  `,

  requires: [ 'foam.parse.rail.GrammarTag' ],

  imports: [ 'currentBlock', 'out' ],

  methods: [
    function execute(text) {
      var tag = this.GrammarTag.create({ grammarText: text || '' });
      this.currentBlock.value = tag;
      this.out.tag(tag);
    }
  ]
});
