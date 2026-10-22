#!/usr/bin/env node
import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
import process from 'node:process';

const MAX_INPUT_BYTES = 128 * 1024;
const HELP = `LitmusLab — finite SC/TSO litmus experiments, powered by MoonBit

Usage:
  node bin/litmuslab.mjs analyze FILE [--model SC|TSO|both] [--strategy bfs|dfs]
      [--max-states N] [--max-outcomes N]
  node bin/litmuslab.mjs replay FILE --model SC|TSO --witness 't0 f0 ...'

FILE may be - to read UTF-8 source from stdin. Defaults: both, bfs, 20000, 256.
Limits: 128 KiB input bytes; the core also limits source to 32768 Unicode points.
Budgets: max-states 1..100000, max-outcomes 1..1024, separately for each model.
stdout is one JSON value except --help. Exit codes: 0 complete/ok, 2 error,
3 incomplete. An incomplete search cannot establish that an outcome is forbidden.
`;

function fail(code, message) {
  return { status: 'error', exitCode: 2, error: { code, message, line: 0, column: 0 } };
}

function output(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
  process.exitCode = value.exitCode ?? (value.status === 'error' ? 2 : value.status === 'incomplete' ? 3 : 0);
}

function parseArgs(argv) {
  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) return { help: true };
  const [command, file, ...options] = argv;
  if (!['analyze', 'replay'].includes(command) || !file || file.startsWith('--')) throw new Error('Expected analyze FILE or replay FILE. Use --help for usage.');
  const allowed = command === 'analyze' ? ['--model', '--strategy', '--max-states', '--max-outcomes'] : ['--model', '--witness'];
  const parsed = { command, file, model: command === 'analyze' ? 'both' : 'SC', strategy: 'bfs', maxStates: 20000, maxOutcomes: 256 };
  const seen = new Set();
  for (let index = 0; index < options.length; index += 2) {
    const flag = options[index];
    if (!allowed.includes(flag)) throw new Error(`Unknown option: ${flag}`);
    if (seen.has(flag)) throw new Error(`Repeated option: ${flag}`);
    seen.add(flag);
    const value = options[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    const key = { '--model': 'model', '--strategy': 'strategy', '--max-states': 'maxStates', '--max-outcomes': 'maxOutcomes', '--witness': 'witness' }[flag];
    parsed[key] = value;
  }
  if (!(command === 'analyze' ? ['SC', 'TSO', 'both'] : ['SC', 'TSO']).includes(parsed.model)) throw new Error(`Invalid model: ${parsed.model}`);
  if (!['bfs', 'dfs'].includes(parsed.strategy)) throw new Error(`Invalid strategy: ${parsed.strategy}`);
  for (const [key, maximum] of [['maxStates', 100000], ['maxOutcomes', 1024]]) {
    if (!/^[0-9]+$/.test(String(parsed[key])) || Number(parsed[key]) < 1 || Number(parsed[key]) > maximum) throw new Error(`${key} must be an integer in 1..${maximum}`);
    parsed[key] = Number(parsed[key]);
  }
  if (command === 'replay' && (!seen.has('--model') || !seen.has('--witness'))) throw new Error('replay requires --model and --witness (an empty witness is allowed).');
  if (command === 'replay' && Buffer.byteLength(parsed.witness, 'utf8') > MAX_INPUT_BYTES) throw new Error('Witness exceeds the 128 KiB byte limit.');
  return parsed;
}

async function readSource(file) {
  const chunks = [];
  let size = 0;
  const add = (chunk) => {
    size += chunk.length;
    if (size > MAX_INPUT_BYTES) throw new Error('Source exceeds the 128 KiB byte limit.');
    chunks.push(chunk);
  };
  if (file === '-') {
    for await (const chunk of process.stdin) add(Buffer.from(chunk));
  } else {
    // Nonblocking open avoids hanging on a FIFO before the regular-file check.
    const handle = await open(file, constants.O_RDONLY | constants.O_NONBLOCK);
    try {
      const info = await handle.stat();
      if (!info.isFile()) throw new Error('Source must be a regular file or stdin (-).');
      if (info.size > MAX_INPUT_BYTES) throw new Error('Source exceeds the 128 KiB byte limit.');
      const buffer = Buffer.alloc(16384);
      while (true) {
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
        if (!bytesRead) break;
        add(Buffer.from(buffer.subarray(0, bytesRead)));
      }
    } finally { await handle.close(); }
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
}

async function main() {
  let options;
  try { options = parseArgs(process.argv.slice(2)); }
  catch (error) { return output(fail('CLI_ARGUMENT_ERROR', error.message)); }
  if (options.help) { process.stdout.write(HELP); return; }
  let source;
  try { source = await readSource(options.file); }
  catch (error) { return output(fail('CLI_INPUT_ERROR', error.message)); }
  let engine;
  try { engine = await import('../dist/engine.mjs'); }
  catch { return output(fail('ENGINE_UNAVAILABLE', 'Build the MoonBit engine first: npm run build')); }
  try {
    if (options.command === 'replay') return output(JSON.parse(engine.replay(source, options.model, options.witness)));
    if (options.model !== 'both') return output(JSON.parse(engine.analyze(source, options.model, options.strategy, options.maxStates, options.maxOutcomes)));
    const results = {};
    for (const model of ['SC', 'TSO']) {
      results[model] = JSON.parse(engine.analyze(source, model, options.strategy, options.maxStates, options.maxOutcomes));
      if (results[model].status === 'error') return output(results[model]);
    }
    const complete = Object.values(results).every((result) => result.status === 'complete');
    const sc = new Set(results.SC.outcomes.map((outcome) => outcome.id));
    const tso = new Set(results.TSO.outcomes.map((outcome) => outcome.id));
    output({ status: complete ? 'complete' : 'incomplete', exitCode: complete ? 0 : 3, model: 'both', strategy: options.strategy, results, comparison: { definitive: complete, common: [...sc].filter((id) => tso.has(id)), scOnly: [...sc].filter((id) => !tso.has(id)), tsoOnly: [...tso].filter((id) => !sc.has(id)) } });
  } catch (error) { output(fail('ENGINE_ERROR', error.message)); }
}

await main();
