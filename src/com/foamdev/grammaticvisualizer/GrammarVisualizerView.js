foam.CLASS({
  package: 'com.foamdev.grammaticvisualizer',
  name: 'GrammarVisualizerView',
  extends: 'foam.u2.View',

  documentation: `
    App screen for the railroad grammar viewer. Mounts foam.parse.rail.RailDiagramView
    with the toy preset loaded so the page is not empty; the "registered in this page"
    dropdown then lists every foam.parse grammar the app has loaded.
  `,

  requires: [ 'foam.parse.rail.RailDiagramView' ],

  css: `
    ^ { height: 100%; min-height: 0; display: flex; flex-direction: column; }
    /* The viewer sizes itself to the window for the standalone demo; inside the app it fills the content area instead. */
    ^ .foam-parse-rail-RailDiagramView { height: 100%; flex: 1; min-height: 0; }
  `,

  methods: [
    function render() {
      this.addClass();
      var view = this.RailDiagramView.create({ allowTypedGrammar: true });
      this.add(view);
      view.usePreset('comma list (toy)');
    }
  ]
});
