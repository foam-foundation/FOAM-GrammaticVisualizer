#!/usr/bin/env node

/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// ui-statechart: package one spike page into a folder that needs NO foam3 checkout.
//   node .claude/skills/ui-statechart/references/pack-spike.mjs <spike-name> [--rebuild-bin]     one spike  -> ignored/dist/<spike-name>/
//   node .claude/skills/ui-statechart/references/pack-spike.mjs --all [--rebuild-bin]            every spike -> ignored/dist/all/ (one bin, a doorway index)
//   add --from=<folder> to pack pages kept outside ignored/spikes, e.g. --from=docs/diagrams/spikes. Any depth works; the pages'
//   '← all FSMs' and 'how to use' links expect the doorway two folders up, as ignored/index.html is for ignored/spikes/<name>/.
// Output (single): foam-bin-3.js + machines/ + shell/ + config.js + index.html + how-to-use.html + README.md + pom.js, ~2 MB.
// Output (--all):  index.html (doorway) + how-to-use.html + README.md + foam-bin-3.js + pom.js + shell/ + machines/ (union) + spikes/<name>/…, ~2 MB + a few KB per spike.
// Opens from disk: double-click index.html. Guard refusal text (machines/guards.js) and the doorway's spike list are baked at pack
// time because a page opened as file:// cannot fetch. A server also works: cd ignored/dist/<name or all> && python3 -m http.server 8767
//
// The bin = foam3 core pom + the skill's fsm-pom.js (where foam.FSM and FSMDiagramView load from), built once with foam3's JSMaker into
// ignored/dist/foam-bin-3.js and reused. JSMaker needs uglify-js: point NODE_PATH at a node_modules that has it
// (your app's own, after `npm install`), e.g. NODE_PATH=/path/to/app/node_modules node … pack-spike.mjs order-walker
// Mermaid stays on its CDN; copy mermaid.min.js next to index.html and edit the tag if the page must work offline.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here  = path.dirname(fileURLToPath(import.meta.url));            // .claude/skills/ui-statechart/references
const root  = path.resolve(here, '../../../..');                       // app checkout root
const all   = process.argv.includes('--all');
const name  = process.argv.slice(2).find(a => ! a.startsWith('--'));
const rebuild = process.argv.includes('--rebuild-bin');
const fromArg = process.argv.find(a => a.startsWith('--from='));
const from  = fromArg ? fromArg.slice('--from='.length) : 'ignored/spikes';
if ( ! name && ! all ) { console.error('usage: pack-spike.mjs <spike-name> | --all  [--rebuild-bin] [--from=<folder>]'); process.exit(2); }

const spikesRoot = path.join(root, from);
const bin  = path.join(root, 'ignored/dist/foam-bin-3.js');
const names = all
  // A spike folder holding a .no-pack file stays out of --all: use it for pages that must not leave your machine.
  ? fs.readdirSync(spikesRoot, { withFileTypes: true }).filter(d => d.isDirectory() && fs.existsSync(path.join(spikesRoot, d.name, 'index.html')) && ! fs.existsSync(path.join(spikesRoot, d.name, '.no-pack'))).map(d => d.name).sort()
  : [name];
const dist = path.join(root, 'ignored/dist', all ? 'all' : name);
names.forEach(n => { if ( ! fs.existsSync(path.join(spikesRoot, n, 'index.html')) ) { console.error('no spike at', path.join(spikesRoot, n)); process.exit(1); } });

// 1. the bin (once)
if ( rebuild || ! fs.existsSync(bin) ) {
  const tools = path.join(root, 'foam3/tools');
  const outdir = path.dirname(bin);
  fs.mkdirSync(outdir, { recursive: true });
  const { createRequire } = await import('module');
  const req = createRequire(path.join(tools, 'x.js'));
  const lib = req('./buildlib'), pmake = req('./pmake');
  const ctx = Object.assign({}, lib, { verbose: () => {}, info: () => {}, log: () => {}, error: console.error, warning: () => {} });
  const cwd = process.cwd(); process.chdir(tools);
  pmake.bind(ctx, `-makers=JS -flags=web,js,debug -pom=../src/pom,${path.relative(tools, path.join(here, 'fsm-pom'))} -outdir=${outdir} -builddir=${outdir}`)();
  process.chdir(cwd);
  if ( ! fs.existsSync(bin) ) { console.error('bin build produced nothing (uglify-js missing? set NODE_PATH)'); process.exit(1); }
  console.log('built', bin, (fs.statSync(bin).size / 1e6).toFixed(1) + ' MB');
}

// 2. assemble
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'machines'), { recursive: true });
fs.mkdirSync(path.join(dist, 'shell'), { recursive: true });
fs.copyFileSync(bin, path.join(dist, 'foam-bin-3.js'));
fs.writeFileSync(path.join(dist, 'pom.js'), "foam.POM({ name: 'spike' });\n");

// up = path from the page folder back to the dist root ('' single, '../../' under spikes/<name>/)
function packPage(n, pageDir, up) {
  const src = path.join(spikesRoot, n);
  fs.mkdirSync(pageDir, { recursive: true });
  let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
  // a spike may carry its own pom.js (e.g. a tool version read from foam.poms): keep it and load it after the dist pom
  // Single mode (up === '') has the page in the dist root, where pom.js is the dist pom: the spike pom lands as spike-pom.js there.
  const ownPom = fs.existsSync(path.join(src, 'pom.js')), ownPomName = up ? 'pom' : 'spike-pom';
  if ( ownPom ) fs.copyFileSync(path.join(src, 'pom.js'), path.join(pageDir, ownPomName + '.js'));
  html = html.replace(/<script[^>]*src="[^"]*foam3\/src\/foam\.js"[^>]*><\/script>/, `<script language="javascript" src="${up}foam-bin-3.js" project="${up}pom${ownPom ? ',' + ownPomName : ''}"></script>`);
  // a script borrowed from a sibling spike (../<other-spike>/stages.js) is copied next to the page under a flat name
  html = html.replace(/src="\.\.\/([^"\/]+)\/([^"\/]+\.js)"/g, (_, sib, file) => {
    const abs = path.join(spikesRoot, sib, file); if ( ! fs.existsSync(abs) ) return _;
    const flat = `${sib}.${file}`; fs.copyFileSync(abs, path.join(pageDir, flat)); return `src="${flat}"`;
  });
  html = html.replace(/src="((?:\.\.\/)+src\/[^"]+\/)([^"\/]+\.js)"/g, (_, dir, file) => {
    fs.copyFileSync(path.join(src, dir, file), path.join(dist, 'machines', file)); return `src="${up}machines/${file}"`;
  });
  html = html.replace(/src="[^"]*\.claude\/skills\/ui-statechart\/references\/([^"\/]+\.js)"/g, (_, file) => {
    fs.copyFileSync(path.join(here, file), path.join(dist, 'shell', file));
    // the guard parser gets its baked output (written in step 3 below) loaded right after it
    return `src="${up}shell/${file}"` + ( file === 'guard-messages.js' ? `></script>\n  <script src="${up}machines/guards.js"` : '' );
  });
  html.replace(/src="([^":\/.][^"]*\.js)"/g, (_, file) => { const p = path.join(src, file); if ( fs.existsSync(p) ) fs.copyFileSync(p, path.join(pageDir, file)); return _; });
  // product icons a page names by root path ('/images/review.svg', drawn by SpikeIcon src) are copied to the
  // dist root, which is where '/images/…' resolves when the packed folder is served from its own root
  html.replace(/src="([^":\/.][^"]*\.js)"/g, (_, file) => {
    const p = path.join(src, file); if ( ! fs.existsSync(p) ) return _;
    for ( const m of fs.readFileSync(p, 'utf8').matchAll(/['"]\/(images\/[^'"]+\.svg)['"]/g) ) {
      const from = path.join(root, m[1]); if ( ! fs.existsSync(from) ) continue;
      fs.mkdirSync(path.dirname(path.join(dist, m[1])), { recursive: true }); fs.copyFileSync(from, path.join(dist, m[1]));
    }
    return _;
  });
  // header links "← all FSMs" / "? how to use" point two levels up in the source tree; in the dist they point at its root
  html = html.replace(/href="\.\.\/\.\.\/(index|how-to-use)\.html"/g, (_, page) => `href="${up}${page}.html"`);
  html = html.replace('</head>', '  <!-- packed by ui-statechart pack-spike.mjs: no foam3 checkout needed; double-click index.html, or serve the packed folder from its own root -->\n </head>');
  fs.writeFileSync(path.join(pageDir, 'index.html'), html);
  // the same two links written from JS (the shells, a page's own view file): single mode puts the page at the dist root
  [pageDir, path.join(dist, 'shell')].forEach(d => fs.readdirSync(d).filter(f => f.endsWith('.js')).forEach(f => {
    const p = path.join(d, f), s = fs.readFileSync(p, 'utf8'), t = s.replace(/'\.\.\/\.\.\/(index|how-to-use)\.html'/g, (_, page) => `'${up}${page}.html'`);
    if ( t !== s ) fs.writeFileSync(p, t);
  }));
  const cfg = path.join(pageDir, 'config.js');
  if ( fs.existsSync(cfg) ) {
    let c = fs.readFileSync(cfg, 'utf8');
    c = c.replace(/'((?:\.\.\/)+src\/[^']+\/)([^'\/]+\.js)'/g, (_, dir, file) => {
      const abs = path.join(src, dir, file); if ( fs.existsSync(abs) ) fs.copyFileSync(abs, path.join(dist, 'machines', file)); return `'${up}machines/${file}'`;
    }).replace(/'((?:\.\.\/)+src\/[^']+\/)'/g, `'${up}machines/'`);
    fs.writeFileSync(cfg, c);
  }
}

// the reader-facing page rides along in both modes, next to the doorway
// Pages kept outside ignored/spikes (--from) may bring their own doorway and how-to page one folder above spikesRoot; those win.
const own = f => { const p = path.join(spikesRoot, '..', f); return fromArg && fs.existsSync(p) ? p : null; };
fs.copyFileSync(own('how-to-use.html') || path.join(here, 'how-to-use.template.html'), path.join(dist, 'how-to-use.html'));
// README.md: how to open the folder, for people and for coding agents that are handed it.
fs.copyFileSync(path.join(here, 'dist-readme.template.md'), path.join(dist, 'README.md'));
if ( all ) {
  names.forEach(n => packPage(n, path.join(dist, 'spikes', n), '../../'));
  // doorway: the skill's self-building index normally reads the server's listing of spikes/; here the list is baked in so file:// works
  const rows = names.map(n => {
    const page = fs.readFileSync(path.join(dist, 'spikes', n, 'index.html'), 'utf8'), pick = re => { const m = re.exec(page); return m ? m[1].trim() : ''; };
    return {
      name: n, title: pick(/<title>([^<]*)<\/title>/i) || n,
      desc: pick(/<meta\s+name="description"\s+content="([^"]*)"/i),
      spec: pick(/<meta\s+name="spec"\s+content="([^"]*)"/i),
      category: pick(/<meta\s+name="spike-category"\s+content="([^"]*)"/i),
      scheme: pick(/<meta\s+name="spike-scheme"\s+content="([^"]*)"/i),
    };
  });
  let door = fs.readFileSync(own('index.html') || path.join(here, 'spikes-index.template.html'), 'utf8');
  door = door.replace('  <script>', `  <script>window.SPIKES = ${JSON.stringify(rows)};</script>\n  <script>`);
  fs.writeFileSync(path.join(dist, 'index.html'), door);
  console.log('packed', names.length, 'spikes:', names.join(', '));
} else {
  packPage(name, dist, '');
}

// 3. bake the guard refusal text: run the page's own parser over every packed machine file, in node
{
  const w = {}; new Function('window', fs.readFileSync(path.join(here, 'guard-messages.js'), 'utf8'))(w);
  const baked = {};
  fs.readdirSync(path.join(dist, 'machines')).filter(f => f.endsWith('.js') && f !== 'guards.js').sort().forEach(f => {
    baked[f] = w.GuardMessages.parse(fs.readFileSync(path.join(dist, 'machines', f), 'utf8'));
  });
  fs.writeFileSync(path.join(dist, 'machines', 'guards.js'), '// baked by pack-spike.mjs from machines/*.js so a page opened from disk (file://, no fetch) still shows guard refusal text\nwindow.GUARD_BAKED = ' + JSON.stringify(baked, null, 1) + ';\n');
}
const size = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((n, d) => n + ( d.isDirectory() ? size(path.join(dir, d.name)) : fs.statSync(path.join(dir, d.name)).size ), 0);
console.log('packed', dist, (size(dist) / 1e6).toFixed(1) + ' MB');
console.log('open:   double-click ' + path.relative(root, dist) + '/index.html, or serve: cd ' + path.relative(root, dist) + ' && python3 -m http.server 8767');
