#!/usr/bin/env node
// Batch bridge: host I/O only; all program semantics are the real MoonBit engine.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const digest = relative => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');
const hashes = () => ({engine_sha256: digest('dist/engine.mjs'), raw_engine_sha256: digest('dist/engine.raw.mjs')});
const before = hashes();
const {analyze} = await import('../dist/engine.mjs');
const requests = JSON.parse(fs.readFileSync(0, 'utf8'));
if (!Array.isArray(requests) || requests.length === 0) throw new Error('Nonempty requests required');
const results = requests.map(request => {
  const result = JSON.parse(analyze(request.source, request.model, 'bfs', 100000, 1024));
  // Every observed location is retained; only bulky witness paths are omitted.
  if (Array.isArray(result.outcomes)) {
    result.outcomes = result.outcomes.map(({memory, registers}) => ({memory, registers}));
  }
  return {case: request.case, model: request.model, result};
});
const after = hashes();
if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Engine changed during comparison; rebuild and rerun');
console.log(JSON.stringify({node: process.version, ...before, results}));
