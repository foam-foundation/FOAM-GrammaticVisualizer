/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Shared spike helper: render a mermaid stateDiagram and make it interactive.
//   hover a state  -> that state, every state connected to it, and the connecting arrows light up; everything else dims
//   click a state  -> opts.onClick(name)   (the page decides whether the move is allowed)
// Mermaid only numbers edges (edge0, edge1, ...) in the order the source lists them, so the caller passes
// `edges` in that same order; if the counts disagree the arrows are left alone and only nodes highlight.
window.SpikeDiagram = {
  css: `
    .spike-dim { opacity: 0.22; transition: opacity 120ms; }
    .spike-hi rect, .spike-hi path.outer-path { stroke: #E69F00 !important; stroke-width: 3px !important; }
    .spike-hi-edge { stroke: #E69F00 !important; stroke-width: 3px !important; }
    .spike-hi-edge-label rect { fill: #fff3d6 !important; }
    .spike-allowed { cursor: pointer; }
    .spike-allowed:hover rect { fill: #fff3d6 !important; }
  `,

  // One tooltip for the whole page: light on near-black, 13px, follows the pointer. Anything with data-tip gets it.
  // The text is plain with a line syntax the renderer lays out (no HTML, so a guard message can never inject markup):
  //   "# heading"      bold first line (what this is)          "• item" / "⛔ item"   list rows, glyph in its own column
  //   "~ note"         muted line (asides, "you are here")     "@ cite"               monospace muted line (file:line, api names)
  //   ""               a gap between blocks                    `code`                 inline monospace chip anywhere in a line
  ensureTip: function() {
    if ( this.tipEl_ ) return this.tipEl_;
    var t = document.createElement('div'); t.id = 'spike-tip';
    t.style.cssText = 'position:fixed; z-index:9999; max-width:380px; padding:9px 11px; border-radius:8px; background:#1c1c1c; color:#f3f3f3; font:13px/1.4 sans-serif; pointer-events:none; display:none; box-shadow:0 2px 10px rgba(0,0,0,.35);';
    document.body.appendChild(t);
    var self = this;
    var show = function(text, x, y) { if ( ! text ) return; self.fillTip_(t, text); t.style.display = 'block'; self.moveTip(x, y); };
    document.addEventListener('mouseover', function(e) { var el = e.target.closest && e.target.closest('[data-tip]'); if ( el ) show(el.getAttribute('data-tip'), e.clientX, e.clientY); });
    document.addEventListener('mouseout',  function(e) { var el = e.target.closest && e.target.closest('[data-tip]'); if ( el ) t.style.display = 'none'; });
    document.addEventListener('mousemove', function(e) { if ( t.style.display === 'block' ) self.moveTip(e.clientX, e.clientY); });
    this.tipEl_ = t; this.showTip = show;
    return t;
  },
  // inline: `code` becomes a monospace chip; everything else is a text node
  inline_: function(el, text) {
    text.split(/(`[^`]+`)/).forEach(function(part) {
      if ( ! part ) return;
      if ( part[0] === '`' && part.length > 2 ) { var c = document.createElement('code'); c.style.cssText = 'font: 12px/1.3 monospace; background: rgba(255,255,255,.14); border-radius: 4px; padding: 0 4px;'; c.textContent = part.slice(1, -1); el.appendChild(c); }
      else el.appendChild(document.createTextNode(part));
    });
  },
  fillTip_: function(t, text) {
    var self = this; t.textContent = '';
    String(text).split('\n').forEach(function(line) {
      var d = document.createElement('div'), m;
      if ( line === '' ) { d.style.height = '6px'; }
      else if ( ( m = /^# (.*)$/.exec(line) ) ) { d.style.cssText = 'font-weight: 700; font-size: 13.5px; margin-bottom: 2px;'; self.inline_(d, m[1]); }
      else if ( ( m = /^~ (.*)$/.exec(line) ) ) { d.style.cssText = 'color: #b9b9b9; font-style: italic;'; self.inline_(d, m[1]); }
      else if ( ( m = /^@ (.*)$/.exec(line) ) ) { d.style.cssText = 'color: #b9b9b9; font: 11.5px/1.4 monospace; overflow-wrap: anywhere;'; d.textContent = m[1]; }
      else if ( ( m = /^([•⛔⚡◌⏱✎→✓⚠]|\d+\.) (.*)$/.exec(line) ) ) {
        d.style.cssText = 'display: grid; grid-template-columns: 22px 1fr; gap: 0 2px; align-items: start;';
        var g = document.createElement('span'); g.textContent = m[1]; g.style.cssText = 'text-align: center;' + (m[1] === '⛔' ? ' filter: saturate(1.3);' : ''); d.appendChild(g);
        var b = document.createElement('span'); self.inline_(b, m[2]); d.appendChild(b);
      }
      else { d.style.cssText = 'overflow-wrap: anywhere; white-space: pre-wrap;'; self.inline_(d, line); }
      t.appendChild(d);
    });
  },
  moveTip: function(x, y) {
    var t = this.tipEl_, w = t.offsetWidth, h = t.offsetHeight;
    var left = x + 14, top = y + 14;
    if ( left + w > window.innerWidth - 8 ) left = x - w - 14;
    if ( top + h > window.innerHeight - 8 ) top = y - h - 14;
    t.style.left = left + 'px'; t.style.top = top + 'px';
  },

  ensureCss: function() {
    if ( document.getElementById('spike-diagram-css') ) return;
    var s = document.createElement('style'); s.id = 'spike-diagram-css'; s.textContent = this.css; document.head.appendChild(s);
  },

  stateNameOf: function(g) {
    // id looks like "<render-id>-state-<NAME>-<n>"; group boxes (clusters) look like "<render-id>-<NAME>" or just "<NAME>"
    var m = /-state-(.+)-\d+$/.exec(g.id);
    return m ? m[1] : null;
  },

  // Build a stateDiagram-v2 source from plain data, folding grouped states into one composite box.
  //   states: [{ name, label, initial, terminal, classes: [...] }]
  //   edges:  [{ from, to, label }]           groups: { GROUP: { label, members: [...] } }
  // Fold rule: an edge every member shares (same target, same label) becomes one GROUP edge; a source that fans
  // into two or more members with the same label becomes one edge into GROUP. Returns { src, edges } with edges in
  // emission order, which is what render() needs for hover highlighting.
  //   opts.fold === false keeps every edge state-to-state (no GROUP edges): for pages where a box is only a drawer and each
  //   card's own arrows are the point (scheme-form); the default folds, which also folds every one-member group.
  source: function(states, edges, groups, extraClassLines, opts) {
    groups = groups || {};
    var groupOf = {}; Object.keys(groups).forEach(function(g) { groups[g].members.forEach(function(m) { groupOf[m] = g; }); });
    edges = edges.map(function(e) { return { from: e.from, to: e.to, label: e.label || '' }; });
    if ( opts && opts.fold === false ) {
      groups = Object.assign({}, groups);
      Object.keys(groups).forEach(function(g) { groups[g] = Object.assign({}, groups[g], { noFold: true }); });
    }
    Object.keys(groups).forEach(function(g) {
      if ( groups[g].noFold ) return;
      var ms = groups[g].members, byKey = {};
      edges.filter(function(e) { return groupOf[e.from] === g && groupOf[e.to] !== g; })
           .forEach(function(e) { var k = e.to + '|' + e.label; (byKey[k] = byKey[k] || []).push(e); });
      Object.keys(byKey).forEach(function(k) {
        if ( byKey[k].length === ms.length ) { byKey[k].forEach(function(e) { e.drop = true; }); edges.push({ from: g, to: byKey[k][0].to, label: byKey[k][0].label }); }
      });
      var bySrc = {};
      edges.filter(function(e) { return ! e.drop && groupOf[e.to] === g && groupOf[e.from] !== g && e.from !== g; })
           .forEach(function(e) { var k = e.from + '|' + e.label; (bySrc[k] = bySrc[k] || []).push(e); });
      Object.keys(bySrc).forEach(function(k) {
        if ( bySrc[k].length >= 2 ) { bySrc[k].forEach(function(e) { e.drop = true; }); edges.push({ from: bySrc[k][0].from, to: g, label: bySrc[k][0].label }); }
      });
    });
    var lines = ['stateDiagram-v2', '  direction LR'], emitted = [];
    var emit = function(indent, e) { emitted.push({ from: e.from, to: e.to }); lines.push(indent + e.from + ' --> ' + e.to + (e.label ? ': ' + e.label : '')); };
    var byName = {}; states.forEach(function(st) { byName[st.name] = st; });
    states.forEach(function(st) { if ( ! groupOf[st.name] ) lines.push('  ' + st.name + ': ' + (st.label || st.name)); });
    Object.keys(groups).forEach(function(g) {
      lines.push('  state "' + groups[g].label + '" as ' + g + ' {');
      groups[g].members.forEach(function(m) { lines.push('    ' + m + ': ' + ((byName[m] || {}).label || m)); });
      edges.filter(function(e) { return groupOf[e.from] === g && groupOf[e.to] === g; }).forEach(function(e) { e.drop = true; emit('    ', e); });
      lines.push('  }');
    });
    states.filter(function(st) { return st.initial; }).forEach(function(st) { emit('  ', { from: '[*]', to: st.name }); });
    edges.filter(function(e) { return ! e.drop; }).forEach(function(e) { emit('  ', e); });
    states.filter(function(st) { return st.terminal; }).forEach(function(st) { emit('  ', { from: st.name, to: '[*]' }); });
    (extraClassLines || []).forEach(function(l) { lines.push('  ' + l); });
    return { src: lines.join('\n'), edges: emitted };
  },

  render: async function(el, src, edges, opts) {
    this.ensureCss(); this.ensureTip();
    opts = opts || {};
    var out = await mermaid.render('fsm' + Date.now() + Math.floor(Math.random() * 1e6), src);
    el.innerHTML = out.svg;
    var svg = el.querySelector('svg');
    var nodes = {};
    svg.querySelectorAll('g.node').forEach(function(g) { var n = this.stateNameOf(g); if ( n ) nodes[n] = g; }.bind(this));
    // composite states (expanded groups): mermaid 10 tags them g.cluster with id "…-<NAME>", mermaid 11 g.statediagram-cluster with
    // id "…-state-<NAME>-<n>". Only the header label is the click/hover target, so a click on a member state is not also a collapse.
    var clusterHeaders = {};
    svg.querySelectorAll('g.cluster, g.statediagram-cluster').forEach(function(g) {
      Object.keys(opts.groups || {}).forEach(function(gname) {
        if ( ! ( g.id.endsWith('-' + gname) || g.id.endsWith(gname) || g.id.indexOf('-state-' + gname + '-') >= 0 ) ) return;
        var head = g.querySelector('g.cluster-label, text, foreignObject') || g;
        head.style.cursor = 'pointer';
        clusterHeaders[gname] = head;
      });
    });
    var paths = [...svg.querySelectorAll('g.edgePaths path')];
    var labels = [...svg.querySelectorAll('g.edgeLabels g.edgeLabel')];
    var edgeOk = edges && paths.length === edges.length;
    var labelOk = edges && labels.length === edges.length;

    var neighbours = function(name) {
      var set = new Set([name]), idx = [];
      (edges || []).forEach(function(e, i) {
        if ( e.from === name || e.to === name ) { set.add(e.from); set.add(e.to); idx.push(i); }
      });
      return { names: set, edgeIdx: idx };
    };
    var clear = function() {
      svg.querySelectorAll('.spike-dim, .spike-hi, .spike-hi-edge, .spike-hi-edge-label').forEach(function(x) {
        x.classList.remove('spike-dim', 'spike-hi', 'spike-hi-edge', 'spike-hi-edge-label');
      });
    };
    var focus = function(name) {
      clear();
      var nb = neighbours(name);
      Object.keys(nodes).forEach(function(n) { nodes[n].classList.add(nb.names.has(n) ? 'spike-hi' : 'spike-dim'); });
      if ( edgeOk ) paths.forEach(function(p, i) { p.classList.add(nb.edgeIdx.indexOf(i) >= 0 ? 'spike-hi-edge' : 'spike-dim'); });
      if ( labelOk ) labels.forEach(function(l, i) { l.classList.add(nb.edgeIdx.indexOf(i) >= 0 ? 'spike-hi-edge-label' : 'spike-dim'); });
    };

    var self = this;
    Object.keys(clusterHeaders).forEach(function(name) {
      var h = clusterHeaders[name];
      if ( opts.nodeTip ) { var t = opts.nodeTip(name); if ( t ) h.setAttribute('data-tip', t); }
      h.addEventListener('click', function(ev) { ev.stopPropagation(); if ( opts.onClick ) opts.onClick(name); });
    });
    Object.keys(nodes).forEach(function(name) {
      var g = nodes[name];
      if ( opts.allowed && opts.allowed(name) ) g.classList.add('spike-allowed');
      if ( opts.nodeTip ) { var nt = opts.nodeTip(name); if ( nt ) g.setAttribute('data-tip', nt); }
      g.addEventListener('mouseenter', function() { focus(name); });
      g.addEventListener('mouseleave', clear);
      g.addEventListener('click', function() { if ( opts.onClick ) opts.onClick(name); });
    });
    // arrows: fat invisible hit area so thin paths are hoverable; tooltip = from → to + helper text
    if ( edgeOk && opts.edgeTip ) paths.forEach(function(p, i) {
      var e = edges[i], tip = opts.edgeTip(e.from, e.to);
      if ( ! tip ) return;
      p.style.pointerEvents = 'stroke';
      var hit = p.cloneNode(false); hit.removeAttribute('id'); hit.removeAttribute('marker-end'); hit.removeAttribute('class');
      hit.setAttribute('stroke', 'transparent'); hit.setAttribute('stroke-width', '14'); hit.setAttribute('fill', 'none'); hit.style.pointerEvents = 'stroke';
      hit.setAttribute('data-tip', tip);
      hit.addEventListener('mouseenter', function() { p.classList.add('spike-hi-edge'); if ( labelOk ) labels[i].classList.add('spike-hi-edge-label'); });
      hit.addEventListener('mouseleave', function() { p.classList.remove('spike-hi-edge'); if ( labelOk ) labels[i].classList.remove('spike-hi-edge-label'); });
      p.parentNode.appendChild(hit);
      if ( labelOk ) labels[i].setAttribute('data-tip', tip);
    });
    return { svg: svg, nodes: nodes, edgeOk: edgeOk, focus: focus, clear: clear };
  }
};
