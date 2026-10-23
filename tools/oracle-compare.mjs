#!/usr/bin/env node
// Compare complete engine outcomes with an external herd7 run, including every
// memory cell and every named register. A budget exhaustion never counts as pass.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {analyze} from '../dist/engine.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidence = JSON.parse(execFileSync('python3', [path.join(root, 'tools/evidence.py'), 'snapshot', 'oracle'], {encoding: 'utf8'}));
const oraclePath = path.join(root, 'reports/oracle-herd7.json');
const oracleBytes = fs.readFileSync(oraclePath);
const oracle = JSON.parse(oracleBytes);
const expectedPairs = new Set(['SB', 'LB', 'MP', 'fence', 'FIFO', 'forwarding'].flatMap(name => ['SC', 'TSO'].map(model => `${name}:${model}`)));
if (!Array.isArray(oracle.runs) || oracle.runs.length !== 12 ||
    new Set(oracle.runs.map(run => `${run.case}:${run.model}`)).size !== 12 ||
    oracle.runs.some(run => !expectedPairs.has(`${run.case}:${run.model}`))) {
  throw new Error('External oracle must contain exactly the 12 distinct required case/model pairs');
}
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  }
  return value;
};
const key = outcome => JSON.stringify(canonical({memory: outcome.memory, registers: outcome.registers}));
const runs = oracle.runs.map(external => {
  const source = fs.readFileSync(path.join(root, `tests/oracle/${external.case}.litmuslab`), 'utf8');
  if (digest(source) !== external.dsl_input_sha256) {
    throw new Error(`${external.case}: current DSL does not match the externally executed input; rerun tools/oracle-run.py`);
  }
  const result = JSON.parse(analyze(source, external.model, 'bfs', 100000, 1024));
  const expected = new Set(external.outcomes.map(key));
  const actual = new Set((result.outcomes ?? []).map(key));
  const missing = [...expected].filter(x => !actual.has(x)).map(JSON.parse);
  const unexpected = [...actual].filter(x => !expected.has(x)).map(JSON.parse);
  const matched = result.status === 'complete' && external.complete === true && missing.length === 0 && unexpected.length === 0;
  const run = {case: external.case, model: external.model, source_sha256: digest(source),
    engine_status: result.status, expected_count: expected.size, actual_count: actual.size,
    matched, missing, unexpected};
  if (result.status === 'error') run.error = result.error ?? result;
  console.log(`${run.case.padEnd(12)} ${run.model}: ${matched ? 'PASS' : 'FAIL'} (herd=${expected.size}, engine=${actual.size}, ${result.status})`);
  return run;
});
execFileSync('python3', [path.join(root, 'tools/evidence.py'), 'verify', 'oracle'], {input: JSON.stringify(evidence), encoding: 'utf8'});
const report = {schema_version: 1, kind: 'external-oracle-full-outcome-set-comparison', evidence,
  run_at: new Date().toISOString(), oracle_version: oracle.version,
  oracle_report_sha256: digest(oracleBytes), engine_sha256: digest(fs.readFileSync(path.join(root, 'dist/engine.mjs'))),
  raw_engine_sha256: digest(fs.readFileSync(path.join(root, 'dist/engine.raw.mjs'))),
  command: 'node tools/oracle-compare.mjs', cases: runs.length,
  passed: runs.filter(r => r.matched).length, all_matched: runs.every(r => r.matched), runs};
fs.writeFileSync(path.join(root, 'reports/oracle-comparison.json'), JSON.stringify(report, null, 2) + '\n');
if (!report.all_matched) process.exitCode = 1;
