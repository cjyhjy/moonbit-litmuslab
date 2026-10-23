#!/usr/bin/env node
// Validate experiment APIs through an independent Python transition system and
// recorded herd7 outcome sets. This does not observe real processor hardware.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = path.join(root, 'reports/experiments.json');
const checks = [];
const comparisons = [];
const queries = [];
const mappings = [];
const report = {schemaVersion: 1, status: 'running', startedAt: new Date().toISOString(),
  command: 'node tools/check-experiments.mjs',
  scope: 'Finite query/fence APIs and CLI; independent Python semantics plus recorded herd7 SB/fence sets; no fresh herd7 or real CPU run.',
  checks, queries, comparisons, mappings};
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const key = value => JSON.stringify(canonical(value));
const outcome = value => value && ({memory: value.memory, registers: value.registers});
const keys = values => values.map(value => key(outcome(value))).sort();
const sorted = values => [...values].sort();
const check = (name, condition, detail = {}) => checks.push({name, passed: Boolean(condition), ...detail});
const equal = (name, actual, expected) => check(name, key(actual) === key(expected),
  key(actual) === key(expected) ? {} : {actual, expected});
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const save = () => {
  report.passed = checks.filter(row => row.passed).length;
  report.failed = checks.filter(row => !row.passed).length;
  fs.mkdirSync(path.dirname(reportPath), {recursive: true});
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
};
const python = (args, input) => {
  const child = spawnSync('python3', ['-B', ...args], {cwd: root, input, encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024});
  if (child.status !== 0) throw new Error(`Python failed (${child.status}): ${child.error?.message ?? ''} ${child.stderr}`);
  return JSON.parse(child.stdout);
};
const reference = jobs => python(['tests/experiments/reference_bridge.py'], JSON.stringify(jobs));
const fenceText = locations => locations.map(item => `${item.thread}:${item.index}`).join(',');
const args = (job, target = job.target) => [job.source, job.model, job.strategy ?? 'bfs', job.maxStates ?? 100000, job.maxOutcomes ?? 1024, target];
const matches = (value, clauses) => clauses.every(clause =>
  (clause.kind === 'mem' ? value.memory[clause.name] : value.registers[clause.thread]?.[clause.name]) === clause.value);
const jobLabel = job => `${job.name}/${job.model}/${job.strategy ?? 'bfs'}`;
const normalizeState = value => value && ({step: value.step, action: value.action, memory: value.memory,
  registers: value.threads ? Object.fromEntries(value.threads.map(thread => [thread.name, thread.registers])) : value.registers,
  pcs: value.threads ? Object.fromEntries(value.threads.map(thread => [thread.name, thread.pc])) : value.pcs,
  buffers: value.threads ? Object.fromEntries(value.threads.map(thread => [thread.name, thread.buffer])) : value.buffers,
  terminal: value.terminal});

function verifyQuerySide(label, actual, expected, clauses, replayJobs, source, model) {
  equal(`${label}: search completeness`, actual.search?.status, expected.status);
  equal(`${label}: search stop reason`, actual.search?.reason, expected.reason);
  equal(`${label}: sound reachability verdict`, actual.verdict, expected.verdict);
  equal(`${label}: match availability`, Boolean(actual.match), expected.verdict === 'reachable');
  if (actual.match) {
    check(`${label}: matching terminal observation`, matches(actual.match, clauses) && keys(expected.outcomes).includes(key(outcome(actual.match))));
    replayJobs.push({name: label, source, model, operation: 'replay', witness: actual.match.witness, expectedOutcome: outcome(actual.match)});
  }
}

function cli(commandArgs, source) {
  const child = spawnSync(process.execPath, ['bin/litmuslab.mjs', ...commandArgs], {cwd: root, input: source, encoding: 'utf8', timeout: 20000, maxBuffer: 16 * 1024 * 1024});
  let result;
  try { result = JSON.parse(child.stdout); }
  catch { result = {invalidJSON: true, stdout: child.stdout}; }
  return {code: child.status, error: child.error?.message, stderr: child.stderr, result};
}

save();
try {
  report.evidence = python(['tools/evidence.py', 'snapshot', 'experiments']);
  report.engineHashes = Object.fromEntries(['engine.mjs', 'engine.raw.mjs'].map(name => [name, digest(read(`dist/${name}`))]));
  const engine = await import('../dist/engine.mjs');
  if (typeof engine.query !== 'function' || typeof engine.compareFences !== 'function') throw new Error('Build the query/compareFences MoonBit exports before running experiment checks');
  const fixtures = JSON.parse(read('tests/experiments/cases.json')).cases;
  report.fixtures = fixtures.map(item => ({name: item.name, source: item.source, sourceSha256: digest(item.source), fences: item.fences, target: item.target}));
  const sb = fixtures.find(item => item.name === 'sb');
  const allJobs = fixtures.flatMap(item => ['SC', 'TSO'].flatMap(model => ['bfs', 'dfs'].map(strategy => ({...item, model, strategy}))));
  const queryJobs = [...allJobs,
    {...sb, name: 'requested-partial-target', model: 'TSO', target: 'reg.P0.r0=0 && mem.x=1', clauses: [{kind: 'reg', thread: 'P0', name: 'r0', value: 0}, {kind: 'mem', name: 'x', value: 1}]},
    {...sb, name: 'impossible-memory', model: 'TSO', target: 'mem.x=-7', clauses: [{kind: 'mem', name: 'x', value: -7}]},
    {...sb, name: 'budget-no-hit', model: 'TSO', maxStates: 1},
    {...sb, name: 'budget-observed-hit', model: 'TSO', maxOutcomes: 1, target: 'reg.P0.r0=0 && mem.x=1', clauses: [{kind: 'reg', thread: 'P0', name: 'r0', value: 0}, {kind: 'mem', name: 'x', value: 1}]},
    {...sb, name: 'budget-unobserved-hit', model: 'TSO', maxOutcomes: 1},
    {...sb, name: 'budget-cannot-prove-absence', model: 'SC', maxStates: 1},
    {...sb, name: 'target-whitespace', model: 'TSO', target: ' \t reg.P0.r0 = -0 \r\n && mem.x = 01 ', clauses: [{kind: 'reg', thread: 'P0', name: 'r0', value: 0}, {kind: 'mem', name: 'x', value: 1}]},
    {...sb, name: 'target-4096-codepoints', model: 'TSO', target: 'mem.x=1' + ' '.repeat(4089), clauses: [{kind: 'mem', name: 'x', value: 1}]},
  ];
  // Queries never insert the fixture's proposed fences.
  const expectedQueries = reference(queryJobs.map(job => ({...job, fences: []})));
  const replayJobs = [];
  for (let index = 0; index < queryJobs.length; index += 1) {
    const job = queryJobs[index], expected = expectedQueries[index], label = `query ${jobLabel(job)}`;
    if (expected.ok !== true) throw new Error(`${label}: independent reference failed: ${expected.error}`);
    const actual = JSON.parse(engine.query(...args(job)));
    equal(`${label}: operation status`, actual.status, 'ok');
    equal(`${label}: exit code`, actual.exitCode, expected.verdict === 'unknown' ? 3 : 0);
    verifyQuerySide(label, actual, expected, job.clauses, replayJobs, job.source, job.model);
    queries.push({name: job.name, model: job.model, strategy: job.strategy ?? 'bfs', sourceSha256: digest(job.source), target: job.target,
      maxStates: job.maxStates ?? 100000, maxOutcomes: job.maxOutcomes ?? 1024,
      expected: {search: expected.status, reason: expected.reason, verdict: expected.verdict, outcomes: expected.outcomes.map(outcome)}, actual});
  }

  const compareJobs = [...allJobs,
    {...sb, name: 'one-fence-does-not-forbid-SB', model: 'TSO', fences: [{thread: 'P0', index: 1}]},
    {...sb, name: 'reversed-fence-order', model: 'TSO', fenceInput: ' P1:1,\tP0:1 '},
    {...sb, name: 'compare-budget-no-hit', model: 'TSO', maxStates: 1},
    {...sb, name: 'compare-budget-observed-hit', model: 'TSO', maxOutcomes: 1, target: 'mem.x=1', clauses: [{kind: 'mem', name: 'x', value: 1}]},
    {...fixtures.find(item => item.name === 'tail-store'), name: 'fences-4096-codepoints', model: 'TSO', fenceInput: 'P0:1' + ' '.repeat(4092)},
  ];
  const expectedComparisons = reference(compareJobs.flatMap(job => [{...job, fences: []}, job]));
  const transformationJobs = [], mappingJobs = [];
  for (let index = 0; index < compareJobs.length; index += 1) {
    const job = compareJobs[index], before = expectedComparisons[index * 2], after = expectedComparisons[index * 2 + 1];
    const label = `compare ${jobLabel(job)}`;
    if (before.ok !== true || after.ok !== true) throw new Error(`${label}: independent reference failed: ${before.error ?? after.error}`);
    const actual = JSON.parse(engine.compareFences(...args(job), job.fenceInput ?? fenceText(job.fences)));
    const complete = before.complete && after.complete;
    equal(`${label}: operation status`, actual.status, complete ? 'complete' : 'incomplete');
    equal(`${label}: exit code`, actual.exitCode, complete ? 0 : 3);
    verifyQuerySide(`${label} before`, actual.before ?? {}, before, job.clauses, replayJobs, job.source, job.model);
    verifyQuerySide(`${label} after`, actual.after ?? {}, after, job.clauses, replayJobs, after.source, job.model);
    equal(`${label}: independent complete/observed before set`, keys(actual.before?.outcomes ?? []), keys(before.outcomes));
    equal(`${label}: independent complete/observed after set`, keys(actual.after?.outcomes ?? []), keys(after.outcomes));
    const beforeIDs = new Set(before.outcomes.map(item => item.id)), afterIDs = new Set(after.outcomes.map(item => item.id));
    const common = sorted([...beforeIDs].filter(id => afterIDs.has(id)));
    const removed = sorted([...beforeIDs].filter(id => !afterIDs.has(id)));
    const added = sorted([...afterIDs].filter(id => !beforeIDs.has(id)));
    equal(`${label}: observed common`, sorted(actual.sets?.commonObserved ?? []), common);
    equal(`${label}: observed before-only`, sorted(actual.sets?.beforeOnlyObserved ?? []), removed);
    equal(`${label}: observed after-only`, sorted(actual.sets?.afterOnlyObserved ?? []), added);
    equal(`${label}: difference completeness`, actual.sets?.complete, complete);
    equal(`${label}: definitive removed only when complete`, actual.sets?.removed === null ? null : sorted(actual.sets?.removed ?? []), complete ? removed : null);
    equal(`${label}: definitive added only when complete`, actual.sets?.added === null ? null : sorted(actual.sets?.added ?? []), complete ? added : null);
    if (complete) equal(`${label}: fences never add terminal observations`, added, []);
    if (complete && job.model === 'SC') equal(`${label}: SC fence result equivalence`, keys(after.outcomes), keys(before.outcomes));
    const threadNames = actual.before?.program?.threads?.map(thread => thread.name) ?? [];
    const expectedLocations = [...job.fences].sort((a, b) => threadNames.indexOf(a.thread) - threadNames.indexOf(b.thread) || a.index - b.index)
      .map((item, i, items) => ({thread: item.thread, boundary: item.index,
        instructionIndex: item.index + items.slice(0, i).filter(prior => prior.thread === item.thread).length}));
    equal(`${label}: original boundary indices and stable sorted insertions`, actual.fences, expectedLocations);
    transformationJobs.push({name: label, source: actual.afterSource ?? '', model: job.model, expectedSource: after.source});
    const mapping = actual.mapping;
    equal(`${label}: mapping scope`, mapping?.scope, 'this_ordered_witness_only');
    equal(`${label}: mapping promises original action order`, mapping?.preserveOriginalActions, true);
    if (actual.before?.match) {
      equal(`${label}: selected original witness`, mapping?.originalWitness, actual.before.match.witness);
      mappingJobs.push({...job, operation: 'map', name: label, witness: actual.before.match.witness, actual: mapping});
    } else {
      equal(`${label}: no witness produces no mapping`, {status: mapping?.status, originalWitness: mapping?.originalWitness,
        witness: mapping?.witness, prefix: mapping?.prefix, reason: mapping?.reason, firstBlock: mapping?.firstBlock, outcome: mapping?.outcome},
      {status: 'unavailable', originalWitness: null, witness: null, prefix: '', reason: 'no_matching_witness', firstBlock: null, outcome: null});
    }
    comparisons.push({name: job.name, model: job.model, strategy: job.strategy ?? 'bfs', sourceSha256: digest(job.source),
      expected: {before: before.outcomes.map(outcome), after: after.outcomes.map(outcome), common, removed: complete ? removed : null, added: complete ? added : null}, actual});
  }
  const transformed = reference(transformationJobs);
  transformed.forEach((item, index) => equal(`${transformationJobs[index].name}: exact transformed instructions`, item.source, transformationJobs[index].expectedSource));
  const expectedMappings = reference(mappingJobs);
  expectedMappings.forEach((expected, index) => {
    const job = mappingJobs[index], actual = job.actual;
    equal(`${job.name}: independent mapped status`, actual?.status, expected.status);
    equal(`${job.name}: no extra flushes or reordered original actions`, actual?.prefix, expected.prefix);
    equal(`${job.name}: mapped terminal witness`, actual?.witness, expected.witness);
    equal(`${job.name}: mapped outcome`, outcome(actual?.outcome), outcome(expected.outcome));
    if (expected.status === 'blocked') {
      for (const field of ['originalStep', 'originalAction', 'thread', 'boundary', 'instructionIndex', 'reason', 'pendingWrites'])
        equal(`${job.name}: first block ${field}`, actual?.firstBlock?.[field], expected.firstBlock[field]);
      equal(`${job.name}: exact state before first blocked fence`, normalizeState(actual?.firstBlock?.stateBefore), normalizeState(expected.firstBlock.stateBefore));
      equal(`${job.name}: blocked snapshot has no executed effect`, actual?.firstBlock?.stateBefore?.effect, null);
    } else equal(`${job.name}: no false first block`, actual?.firstBlock, null);
    mappings.push({name: job.name, expected, actual});
  });
  const replayed = reference(replayJobs);
  replayed.forEach((item, index) => {
    check(`${replayJobs[index].name}: witness independently terminates`, item.ok === true, item.ok === true ? {} : {error: item.error});
    equal(`${replayJobs[index].name}: independent witness observation`, outcome(item.outcome), replayJobs[index].expectedOutcome);
  });

  const singleFence = comparisons.find(row => row.name === 'one-fence-does-not-forbid-SB').actual;
  check('A blocked selected witness does not imply global target unreachability', singleFence.mapping?.status === 'blocked' && singleFence.after?.verdict === 'reachable');
  const tail = comparisons.find(row => row.name === 'tail-store' && row.model === 'TSO' && row.strategy === 'bfs').actual;
  check('Tail fence runs only after original final flush', tail.mapping?.status === 'preserved' && tail.mapping.witness === `${tail.mapping.originalWitness} t0`);
  const budgetHit = queries.find(row => row.name === 'budget-observed-hit').actual;
  check('A witnessed hit remains reachable despite incomplete enumeration', budgetHit.search?.status === 'incomplete' && budgetHit.verdict === 'reachable' && budgetHit.exitCode === 0);

  const herdBytes = read('reports/oracle-herd7.json'), herd = JSON.parse(herdBytes);
  report.recordedExternal = {tool: 'herd7', version: herd.version, reportSha256: digest(herdBytes), freshRun: false, hardware: false, pairs: []};
  for (const model of ['SC', 'TSO']) for (const [fixtureName, side] of [['SB', 'before'], ['fence', 'after']]) {
    const external = herd.runs.filter(row => row.case === fixtureName && row.model === model);
    check(`herd7 ${fixtureName}/${model}: one complete matching source run`, external.length === 1 && external[0].complete === true &&
      external[0].dsl_input_sha256 === digest(read(`tests/oracle/${fixtureName}.litmuslab`)));
    if (external.length !== 1) continue;
    const observed = comparisons.find(row => row.name === 'sb' && row.model === model && row.strategy === 'bfs').actual[side].outcomes;
    equal(`herd7 ${fixtureName}/${model}: complete memory/register result set`, keys(observed), keys(external[0].outcomes));
    report.recordedExternal.pairs.push({case: fixtureName, model, side, expected: external[0].outcomes, observed: observed.map(outcome)});
  }

  const invalidTargets = ['', 'true', 'reg.P0.r0==0', 'reg.P0.r0!=0', 'reg.P0.r0=0 || mem.x=1', 'reg.P0.r0=0 &&',
    '&& mem.x=1', 'mem.x=1 & mem.y=1', 'reg.Missing.r0=0', 'reg.P0.missing=0', 'mem.missing=0',
    'mem.x=1 && mem.x=1', 'mem.x=1 && mem.x=0', 'mem.x=32768', 'mem.x=-32769', 'mem.x=1.5', 'mem.x=+1',
    'mem.x=1 # comment', 'mem.x=1\u00a0&& mem.y=1', 'mem.x=1' + ' '.repeat(4090),
    Array(41).fill('mem.x=1').join(' && ')];
  for (const target of invalidTargets) {
    const result = JSON.parse(engine.query(sb.source, 'TSO', 'bfs', 100000, 1024, target));
    check(`query rejects target ${JSON.stringify(target.slice(0, 70))} (${target.length})`, result.status === 'error' && result.exitCode === 2 && result.error?.input === 'target', {error: result.error});
  }
  const invalidFences = ['', 'P0', 'P0:-1', 'P0:3', 'P0:1.0', 'P0:+1', 'Missing:0', 'P0:1,P0:1', 'P0:1,', ',P0:1',
    'P0:1 P1:1', 'P0:1;P1:1', 'P0:1\u00a0,P1:1', 'P0:1' + ' '.repeat(4093)];
  for (const fences of invalidFences) {
    const result = JSON.parse(engine.compareFences(...args({...sb, model: 'TSO'}), fences));
    check(`compare rejects fences ${JSON.stringify(fences.slice(0, 70))} (${fences.length})`, result.status === 'error' && result.exitCode === 2 && result.error?.input === 'fences', {error: result.error});
  }
  const sixteen = 'memory x=0\nthread P0\n' + 'fence\n'.repeat(16) + 'end\n';
  const overLimit = JSON.parse(engine.compareFences(sixteen, 'TSO', 'bfs', 100000, 1024, 'mem.x=0', 'P0:16'));
  check('Inserted fence cannot exceed 16 instructions per thread', overLimit.status === 'error' && overLimit.error?.input === 'fences');
  const fifteen = 'memory x=0\nthread P0\n' + 'fence\n'.repeat(15) + 'end\n';
  const atLimit = JSON.parse(engine.compareFences(fifteen, 'TSO', 'bfs', 100000, 1024, 'mem.x=0', 'P0:15'));
  check('Inserted fence accepts exactly 16 instructions', atLimit.status === 'complete' && atLimit.after?.program?.threads[0].instructions.length === 16);
  const fortySource = 'memory ' + Array.from({length: 8}, (_, i) => `x${i}=0`).join(' ') + '\n' + Array.from({length: 4}, (_, t) =>
    `thread P${t}\n` + Array.from({length: 8}, (_, r) => `load r${r} x${r}\n`).join('') + 'end\n').join('');
  const fortyTarget = [...Array.from({length: 8}, (_, i) => `mem.x${i}=0`), ...Array.from({length: 4}, (_, t) =>
    Array.from({length: 8}, (_, r) => `reg.P${t}.r${r}=0`)).flat()].join(' && ');
  const forty = JSON.parse(engine.query(fortySource, 'SC', 'bfs', 100000, 1024, fortyTarget));
  check('All 40 distinct observables are accepted together', forty.status === 'ok' && forty.search?.status === 'complete' && forty.verdict === 'reachable');
  const unicodeBase = 'memory x=0\nthread P0\nend\n#';
  const unicodeLimit = unicodeBase + '😀'.repeat(32768 - [...unicodeBase].length);
  const unicodeAtLimit = JSON.parse(engine.query(unicodeLimit, 'TSO', 'bfs', 100000, 1024, 'mem.x=0'));
  check('Source limit counts 32768 Unicode code points, not UTF16 units', unicodeAtLimit.status === 'ok' && unicodeAtLimit.verdict === 'reachable');
  const unicodeTooLong = JSON.parse(engine.query(unicodeLimit + '😀', 'TSO', 'bfs', 100000, 1024, 'mem.x=0'));
  check('Source rejects 32769 Unicode code points', unicodeTooLong.status === 'error' && unicodeTooLong.error?.input === 'source');
  for (const [name, replacement] of [['source-type', {index: 0, value: null}], ['model-type', {index: 1, value: null}],
    ['model-invalid', {index: 1, value: 'ARM'}], ['strategy-invalid', {index: 2, value: 'random'}], ['strategy-type', {index: 2, value: []}],
    ['states-zero', {index: 3, value: 0}], ['states-upper', {index: 3, value: 100001}], ['states-fraction', {index: 3, value: 1.5}],
    ['states-string', {index: 3, value: '100'}], ['outcomes-zero', {index: 4, value: 0}], ['outcomes-upper', {index: 4, value: 1025}],
    ['states-Infinity', {index: 3, value: Infinity}], ['states-BigInt', {index: 3, value: 2n}],
    ['states-boolean', {index: 3, value: true}], ['states-undefined', {index: 3, value: undefined}],
    ['outcomes-NaN', {index: 4, value: NaN}], ['target-type', {index: 5, value: {}}],
    ['target-Symbol', {index: 5, value: Symbol('target')}], ['source-array', {index: 0, value: []}]]) {
    const callArgs = args({...sb, model: 'TSO'}); callArgs[replacement.index] = replacement.value;
    for (const method of ['query', 'compareFences']) {
      const result = JSON.parse(engine[method](...callArgs, ...(method === 'compareFences' ? ['P0:1'] : [])));
      check(`${method}: rejects ${name}`, result.status === 'error' && result.exitCode === 2, {error: result.error});
    }
  }
  const badSource = JSON.parse(engine.query('memory x=0\nthread P0\nload r0 missing\nend', 'SC', 'bfs', 10, 10, 'mem.x=0'));
  check('Source parser errors identify the source input', badSource.status === 'error' && badSource.error?.input === 'source');
  const badFenceType = JSON.parse(engine.compareFences(...args({...sb, model: 'TSO'}), null));
  check('Nonstring fence selection is rejected', badFenceType.status === 'error' && badFenceType.exitCode === 2);

  for (const [name, command, expectedCode, expectedVerdict, expectedStatus] of [
    ['query-SC-unreachable', ['query', '-', '--model', 'SC', '--target', sb.target], 0, 'unreachable', 'ok'],
    ['query-TSO-reachable', ['query', '-', '--model', 'TSO', '--target', sb.target], 0, 'reachable', 'ok'],
    ['query-unknown', ['query', '-', '--model', 'TSO', '--target', sb.target, '--max-states', '1'], 3, 'unknown', 'ok'],
    ['query-incomplete-hit', ['query', '-', '--model', 'TSO', '--target', 'reg.P0.r0=0 && mem.x=1', '--max-outcomes', '1'], 0, 'reachable', 'ok'],
    ['compare-complete', ['compare-fences', '-', '--model', 'TSO', '--target', sb.target, '--fences', 'P0:1,P1:1'], 0, null, 'complete'],
    ['compare-incomplete', ['compare-fences', '-', '--model', 'TSO', '--target', sb.target, '--fences', 'P0:1,P1:1', '--max-states', '1'], 3, null, 'incomplete'],
    ['query-invalid-target', ['query', '-', '--model', 'TSO', '--target', 'mem.missing=0'], 2, null, 'error'],
    ['compare-invalid-fences', ['compare-fences', '-', '--model', 'TSO', '--target', sb.target, '--fences', 'P0:3'], 2, null, 'error'],
    ['query-missing-target', ['query', '-', '--model', 'TSO'], 2, null, 'error'],
    ['compare-missing-fences', ['compare-fences', '-', '--model', 'TSO', '--target', sb.target], 2, null, 'error'],
    ['query-repeated-target', ['query', '-', '--target', 'mem.x=1', '--target', 'mem.y=1'], 2, null, 'error'],
    ['query-invalid-model', ['query', '-', '--model', 'ARM', '--target', sb.target], 2, null, 'error'],
    ['compare-empty-fences', ['compare-fences', '-', '--target', sb.target, '--fences', ''], 2, null, 'error'],
  ]) {
    const actual = cli(command, sb.source);
    check(`CLI ${name}: process and JSON status`, actual.code === expectedCode && actual.result.status === expectedStatus,
      {exitCode: actual.code, status: actual.result.status, error: actual.error ?? actual.result.error});
    if (expectedVerdict) equal(`CLI ${name}: verdict`, actual.result.verdict, expectedVerdict);
    if (name === 'compare-complete') {
      equal('CLI compare-fences removes exactly SB both-zero', actual.result.sets?.removed, ['1,1|0|0']);
      equal('CLI compare-fences adds no outcomes', actual.result.sets?.added, []);
    }
  }
  for (const command of ['query', 'compare-fences']) {
    const flags = command === 'compare-fences' ? ['--fences', 'P0:1,P1:1'] : [];
    const full = cli([command, '-', '--target', sb.target, ...flags], sb.source);
    check(`CLI ${command}: both is the default and both models complete`, full.code === 0 && full.result.status === 'ok' &&
      full.result.model === 'both' && full.result.results?.SC && full.result.results?.TSO);
    if (command === 'query') {
      equal('CLI query both: independent SC verdict', full.result.results?.SC?.verdict, 'unreachable');
      equal('CLI query both: independent TSO verdict', full.result.results?.TSO?.verdict, 'reachable');
    } else {
      equal('CLI compare both: SC removes nothing', full.result.results?.SC?.sets?.removed, []);
      equal('CLI compare both: TSO removes both-zero', full.result.results?.TSO?.sets?.removed, ['1,1|0|0']);
    }
    const partial = cli([command, '-', '--model', 'both', '--target', sb.target, ...flags, '--max-states', '1'], sb.source);
    check(`CLI ${command}: both propagates incompleteness`, partial.code === 3 && partial.result.status === 'incomplete' &&
      partial.result.results?.SC?.exitCode === 3 && partial.result.results?.TSO?.exitCode === 3);
    const invalid = cli([command, '-', '--model', 'both', '--target', 'mem.missing=0', ...flags], sb.source);
    check(`CLI ${command}: both propagates target errors`, invalid.code === 2 && invalid.result.status === 'error' &&
      invalid.result.error?.input === 'target' && invalid.result.results === undefined);
    const badSourceResult = cli([command, '-', '--model', 'both', '--target', 'mem.x=0', ...flags], 'memory x=0\nthread P0\nmissing\nend');
    check(`CLI ${command}: both propagates source errors`, badSourceResult.code === 2 && badSourceResult.result.status === 'error' &&
      badSourceResult.result.error?.input === 'source');
  }
  const bothBadFences = cli(['compare-fences', '-', '--model', 'both', '--target', sb.target, '--fences', 'P0:3'], sb.source);
  check('CLI compare both propagates fence errors', bothBadFences.code === 2 && bothBadFences.result.status === 'error' && bothBadFences.result.error?.input === 'fences');
  python(['tools/evidence.py', 'verify', 'experiments'], JSON.stringify(report.evidence));
  check('Experiment inputs unchanged before and after execution', true);
  report.status = checks.some(row => !row.passed) ? 'failed' : 'passed';
} catch (error) {
  check('Experiment runner completed', false, {error: error.stack ?? String(error)});
  report.status = 'failed';
  report.error = error.message;
} finally {
  report.finishedAt = new Date().toISOString();
  save();
}
console.log(JSON.stringify({status: report.status, passed: report.passed, failed: report.failed,
  queries: queries.length, comparisons: comparisons.length, mappings: mappings.length, report: 'reports/experiments.json'}));
if (report.status !== 'passed') process.exitCode = 1;
