#!/usr/bin/env node

/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

// Rebuild foam-bin-3.js from a foam3 checkout. Only needed if you want a newer FOAM;
// the starter ships with a bin already built.
//   FOAM3=/path/to/foam3 node tools/build-bin.mjs
// Needs uglify-js reachable by node (npm i -g uglify-js, then NODE_PATH=$(npm root -g)).
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const foam3 = path.resolve(process.env.FOAM3 || path.join(process.cwd(), '..', 'foam3'));
const tools = path.join(foam3, 'tools');
if ( ! fs.existsSync(path.join(tools, 'pmake.js')) ) { console.error('foam3 not found at', foam3, '- set FOAM3=/path/to/foam3'); process.exit(1); }

const outdir = path.resolve(process.cwd(), process.env.OUT || '..');   // the bin is shared with the diagram pages one folder up
const req = createRequire(path.join(tools, 'x.js'));
const lib = req('./buildlib'), pmake = req('./pmake');
const ctx = Object.assign({}, lib, { verbose: () => {}, info: () => {}, log: () => {}, error: console.error, warning: () => {} });
const cwd = process.cwd(); process.chdir(tools);
pmake.bind(ctx, `-makers=JS -flags=web,js,debug -pom=../src/pom -outdir=${outdir} -builddir=${outdir}`)();
process.chdir(cwd);
const bin = path.join(outdir, 'foam-bin-3.js');
if ( ! fs.existsSync(bin) ) { console.error('no bin produced (uglify-js missing? set NODE_PATH)'); process.exit(1); }
console.log('built', bin, (fs.statSync(bin).size / 1e6).toFixed(1) + ' MB');
