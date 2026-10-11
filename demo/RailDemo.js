/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.demos.rail',
  name: 'RailDemo',
  extends: 'foam.u2.View',

  documentation: `
    Mounts the railroad viewer with typed grammar text enabled (dev only), the
    window.__rail debug hook, and the toy preset loaded. Query parameters load
    files instead of the preset: ?grammar=URL (a symbols() body as text) and
    ?input=URL (the text to parse); ?presets=URL merges a JSON object of
    { name: { input, grammar } } into the preset list, so local or private
    grammars can sit in the dropdown without living in this repo; &doc opens
    the document view.

    Grammar text is JavaScript, and a dev build serves this page on the same
    origin as the running app. So a link must not run code on its own: every
    URL has to be same-origin, ?grammar= text waits in the editor until Load
    is pressed, and a presets file cannot replace a built-in preset (the toy
    one loads on open).
  `,

  requires: [ 'foam.parse.rail.RailDiagramView' ],

  methods: [
    function render() {
      var self = this, q = new URLSearchParams(location.search), g = q.get('grammar'), i = q.get('input'), p = q.get('presets');
      var get = function(url) {
        if ( ! url ) return Promise.resolve(null);
        return Promise.resolve().then(function() {
          // Same origin only, and no redirects: a redirect could leave the origin after this check.
          if ( new URL(url, location.href).origin !== location.origin ) throw new Error('only same-origin URLs are loaded: ' + url);
          return fetch(url, { redirect: 'error' });
        }).then(function(r) { if ( ! r.ok ) throw new Error(r.status + ' ' + url); return r.text(); });
      };
      // Extra presets come first: the preset list is built when the view renders.
      get(p).then(function(json) {
        var D = self.RailDiagramView.DEFAULT_PRESETS;
        var presets = Object.assign({}, D, json ? JSON.parse(json) : {}, D);   // built-ins keep their text: the toy one runs on open
        var view = self.RailDiagramView.create({ allowTypedGrammar: true, debugHook: true, presets: presets });
        self.add(view);
        if ( ! g && ! i ) { view.usePreset('comma list (toy)'); if ( q.has('doc') ) view.documentShown = true; return; }
        return Promise.all([ get(g), get(i) ]).then(function(a) {
          if ( a[1] !== null ) view.setInput(a[1]);
          if ( a[0] !== null ) {
            // Shown, not run: Load is the user's decision to execute it.
            view.grammarText = a[0]; view.syncGrammarEl(); view.grammarShown = true;
            view.status = 'grammar from ?grammar= is in the editor; read it, then press Load to run it';
          }
          if ( q.has('doc') ) view.documentShown = true;
        }).catch(function(x) { view.status = 'load failed: ' + x.message; });
      }).catch(function(x) { self.add('presets load failed: ' + x.message); });
    }
  ]
});
