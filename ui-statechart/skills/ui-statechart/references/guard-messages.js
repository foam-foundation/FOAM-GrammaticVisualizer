/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// ui-statechart helper: read the Java `checkGuard` bodies out of a foam.FSM source file at page load and
// return every `throw new ValidationException("…")` message, grouped by state and by the target state
// (`n.getName()`) the guard tests. Zero hand-copying, zero drift: the page shows what the code refuses.
//
//   var G = await GuardMessages.load('../../../src/demo/SellerOrderStatus.js');
//   G['PAID']['SHIPPED']   // -> [ 'Address is missing; the order cannot ship.', ... ]
//   G['PAID']['*']                     // -> messages thrown regardless of target (rare)
//
// Recognised shapes (each seen in real foam.FSM machines):
//   if ( ! "T".equals(n.getName()) ) return;                    every later throw is for T
//   boolean alias = "T".equals(n.getName()) && …;                alias means T in later conditions
//   if ( ( "T".equals(n.getName()) || alias ) && … ) throw …    targets named in the same condition
//   helperName(…)                                               a method on the enum whose javaCode throws; its own
//                                                               `if ( ! "T".equals(n.getName()) ) return;` names the target,
//                                                               else the calling line's condition/alias/gate does
//   if ( newState == T ) return;                                 enum compare: every later throw is for every target EXCEPT T,
//                                                               stored under the key '!T'; the shells resolve it against the real transitions
//   if ( n == A || n == B ) return;  /  if ( n != A && n != B ) return;    multi-target exclusion ('!A!B') and inclusion ([A, B]) gates
//                                                               (the parameter name is read off the checkGuard signature: n, newState, toState)
//   if ( newState == T ) { throw … }  throw …                    nested blocks: the inner throw is for T, the outer one for the rest
//   throw new ValidationException(this.MSG_NAME)                 message constant: resolved from the file's `messages: [ { name, message | messageMap.en } ]`
// Message text: string literals of the throw joined, `" + expr + "` shown as …
window.GuardMessages = {
  cache_: {},

  load: async function(url) {
    if ( this.cache_[url] ) return this.cache_[url];
    // a packed folder opened from disk (file://) cannot fetch: pack-spike.mjs bakes parse() output into machines/guards.js as window.GUARD_BAKED, keyed by file name
    var baked = window.GUARD_BAKED && window.GUARD_BAKED[url.split('/').pop()];
    if ( baked ) return ( this.cache_[url] = baked );
    var src = await (await fetch(url, { cache: 'reload' })).text();
    return ( this.cache_[url] = this.parse(src) );
  },

  message_: function(stmt, msgs) {
    var i = stmt.indexOf('ValidationException('); if ( i < 0 ) return null;
    var arg = stmt.slice(i + 'ValidationException('.length).replace(/\)\s*;?\s*$/, '');
    var c = /^\s*this\.([A-Z_0-9]+)\s*$/.exec(arg); if ( c ) return ( msgs && msgs[c[1]] ) || c[1];
    arg = arg.replace(/this\.([A-Z_0-9]+)/g, function(_, n) { return '"' + ( ( msgs && msgs[n] ) || n ) + '"'; });   // constant inside a concatenation: inline its text
    arg = arg.replace(/"\s*\+[\s\S]*?\+\s*"/g, '…').replace(/^\s*"/, '').replace(/"\s*$/, '').replace(/"\s*\+[\s\S]*$/, '…').replace(/^[\s\S]*?\+\s*"/, '…');
    return arg.replace(/\\"/g, '"').trim();
  },

  // statements = the body split into ';'-terminated chunks with their preceding `if (…)` kept attached
  statements_: function(body) {
    var out = [], cur = '', depth = 0;
    for ( var i = 0 ; i < body.length ; i++ ) {
      var ch = body[i];
      if ( ch === '(' ) depth++; if ( ch === ')' ) depth--;
      cur += ch;
      if ( ch === ';' && depth === 0 ) { out.push(cur.trim()); cur = ''; }
      if ( ch === '{' && depth === 0 ) { out.push(cur.trim()); cur = ''; }   // block opener: keep its condition as a statement of its own
      if ( ch === '}' && depth === 0 ) { out.push(cur.trim()); cur = ''; }   // block closer: its own statement, so a throw after it is not read as inside
    }
    if ( cur.trim() ) out.push(cur.trim());
    return out.filter(Boolean).map(function(s) { return s.replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' ').trim(); }).filter(Boolean);
  },

  targetsIn_: function(text, aliases, param) {
    var t = [], m, re = /"([A-Z_]+)"\.equals\(\s*n\.getName\(\)\s*\)/g;
    while ( ( m = re.exec(text) ) ) t.push(m[1]);
    if ( param ) {
      var re2 = new RegExp('\\b' + param + '\\s*==\\s*([A-Z][A-Z_0-9]+)\\b', 'g'); while ( ( m = re2.exec(text) ) ) t.push(m[1]);
      var re3 = new RegExp('\\b([A-Z][A-Z_0-9]+)\\s*==\\s*' + param + '\\b', 'g');  while ( ( m = re3.exec(text) ) ) t.push(m[1]);   // Yoda: SHIPPED == n
    }
    Object.keys(aliases).forEach(function(a) { if ( new RegExp('\\b' + a + '\\b').test(text) ) t.push(aliases[a]); });
    return t.filter(function(x, i, arr) { return arr.indexOf(x) === i; });
  },

  // -> { T: [msg], '!T': [msg], '*': [msg] }   ('!T' = every transition except T; '*' = regardless of target)
  walk_: function(body, helpers, msgs, param) {
    var self = this, aliases = {}, gate = null, out = {};
    var add = function(targets, msg) { (targets.length ? targets : ['*']).forEach(function(t) { (out[t] = out[t] || []).push(msg); }); };
    var stmts = this.statements_(body);
    var stack = [];                                       // open blocks: { targets: [T] from the condition, consumed: [T], threw: bool }
    var enclosing = function() { for ( var i = stack.length - 1 ; i >= 0 ; i-- ) if ( stack[i].targets.length ) return stack[i].targets; return null; };
    var consumed = function() { return stack.length ? stack[stack.length - 1].consumed : []; };
    stmts.forEach(function(st) {
      var m;
      if ( ( m = /boolean\s+(\w+)\s*=\s*"([A-Z_]+)"\.equals\(\s*n\.getName\(\)\s*\)/.exec(st) ) ) { aliases[m[1]] = m[2]; return; }
      if ( ( m = /if\s*\(\s*!\s*"([A-Z_]+)"\.equals\(\s*n\.getName\(\)\s*\)\s*\)\s*return\s*;/.exec(st) ) ) { gate = [m[1]]; return; }
      if ( param ) {
        // if ( n == A || n == B ) return;   -> every target except A and B (one key '!A!B', so a message lands once per target)
        if ( ( m = new RegExp('if\\s*\\(\\s*((?:' + param + '\\s*==\\s*[A-Z][A-Z_0-9]+\\s*(?:\\|\\|\\s*)?)+)\\)\\s*return\\s*;').exec(st) ) ) {
          var exc = m[1].match(/[A-Z][A-Z_0-9]+/g).map(function(t) { return '!' + t; }).join('');
          gate = (gate || []).concat(exc); return;
        }
        // if ( n != A && n != B ) return;   -> only A and B (inclusion gate, same meaning as the string-compare gate above)
        if ( ( m = new RegExp('if\\s*\\(\\s*((?:' + param + '\\s*!=\\s*[A-Z][A-Z_0-9]+\\s*(?:&&\\s*)?)+)\\)\\s*return\\s*;').exec(st) ) ) { gate = m[1].match(/[A-Z][A-Z_0-9]+/g); return; }
      }
      var closes = /^\}/.test(st), opens = /\{$/.test(st);   // "} else if ( T == n ) {" both closes the last block and opens a new one
      if ( closes ) { var f = stack.pop(); if ( f && f.threw && f.targets.length && stack.length ) stack[stack.length - 1].consumed = stack[stack.length - 1].consumed.concat(f.targets); }
      if ( opens ) { stack.push({ targets: self.targetsIn_(st, aliases, param), consumed: [], threw: false }); return; }
      if ( closes ) return;
      var here = self.targetsIn_(st, aliases, param);
      if ( ! here.length ) here = enclosing() || [];
      if ( ! here.length && gate ) here = gate.map(function(g) { return consumed().length && g[0] === '!' ? g + consumed().map(function(c) { return '!' + c; }).join('') : g; });
      if ( /throw new (foam\.lang\.)?ValidationException\(/.test(st) && ! /^\}?\s*catch\b/.test(st) ) {   /* `catch (ValidationException e)` is not a throw */ var msg = self.message_(st, msgs); if ( msg ) { add(here, msg); if ( stack.length ) stack[stack.length - 1].threw = true; } }
      Object.keys(helpers).forEach(function(h) {
        if ( new RegExp('\\b' + h + '\\s*\\(').test(st) && ! /throw new/.test(st) ) {
          var hv = helpers[h];
          var targets = hv.gate || ( here.length ? here : [] );
          hv.msgs.forEach(function(msg) { add(targets, msg); });
        }
      });
    });
    return out;
  },

  // `messages: [ { name, message | messageMap: { en } } ]` -> { NAME: text }
  messages_: function(src) {
    var out = {}, re = /\{\s*name:\s*'([A-Z_0-9]+)'\s*,\s*(?:message:\s*(['"`])([\s\S]*?)\2|messageMap:\s*\{\s*en:\s*(['"`])([\s\S]*?)\4)/g, m;
    while ( ( m = re.exec(src) ) ) out[m[1]] = m[3] || m[5];
    return out;
  },

  parse: function(src) {
    var self = this, msgs = this.messages_(src);
    // 1. helper methods: name + javaCode, only those that throw
    var helpers = {}, re = /name:\s*'(\w+)'[\s\S]*?javaCode:\s*`([\s\S]*?)`/g, m;
    var methodsStart = src.indexOf('methods: ['), valuesStart = src.indexOf('values: [');
    if ( methodsStart >= 0 ) {
      // methods may sit before or after values (some machines put them first): never let a value's javaCode pass as a helper,
      // or a log line such as `"-> SHIPPED (carrier" ` would count as a call to a helper named SHIPPED
      var tail = src.slice(methodsStart, methodsStart < valuesStart ? valuesStart : undefined);
      while ( ( m = re.exec(tail) ) ) {
        if ( ! /ValidationException\(/.test(m[2]) ) continue;
        var gm = /if\s*\(\s*!\s*"([A-Z_]+)"\.equals\(\s*n\.getName\(\)\s*\)\s*\)\s*return\s*;/.exec(m[2]);
        helpers[m[1]] = { gate: gm ? [gm[1]] : null, msgs: self.statements_(m[2]).filter(function(s) { return /throw new (foam\.lang\.)?ValidationException/.test(s); }).map(function(s) { return self.message_(s, msgs); }).filter(Boolean) };
      }
    }
    // 2. each value's checkGuard body
    var out = {};
    var blocks = src.slice(valuesStart, methodsStart > valuesStart ? methodsStart : undefined).split(/\n    \{\s*\n?\s*name:\s*'/);
    blocks.slice(1).forEach(function(b) {
      var name = /^([A-Z_]+)'/.exec(b); if ( ! name ) return;
      var g = b.indexOf('public void checkGuard('); if ( g < 0 ) return;
      // body = the text between checkGuard's own braces (one javaCode block may also hold onEnter/onExit after it)
      var open = b.indexOf('{', g), depth = 0, close = -1;
      for ( var i = open ; i < b.length ; i++ ) { if ( b[i] === '{' ) depth++; if ( b[i] === '}' && --depth === 0 ) { close = i; break; } }
      var pm = /checkGuard\([^)]*StateMachineEnum\s+(\w+)\s*\)/.exec(b.slice(g, open + 1)); var param = pm ? pm[1] : 'n';
      var body = b.slice(open + 1, close < 0 ? undefined : close);
      out[name[1]] = self.walk_(body, helpers, msgs, param);
    });
    return out;
  }
};
