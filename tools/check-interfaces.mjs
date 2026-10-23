#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { createServer, request } from 'node:http';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createExperiment, createResultBundle, parseExperiment, MAX_CONFIG_BYTES } from '../web/experiment.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];
const failures = [];
const started = new Date().toISOString();
const temporary = await mkdtemp(join(tmpdir(), 'litmuslab-interfaces-'));
let server;

function captureEvidence() {
  const result = spawnSync('python3', ['tools/evidence.py', 'snapshot', 'interfaces'], { cwd: root, encoding: 'utf8', timeout: 10000 });
  if (result.status !== 0) throw new Error(`Evidence snapshot failed: ${result.stderr}`);
  return JSON.parse(result.stdout);
}

const evidence = captureEvidence();

function verify(name, condition, evidence = {}) {
  const check = { name, passed: Boolean(condition), ...evidence };
  checks.push(check);
  if (!condition) failures.push(name);
}

function cli(args, input) {
  const process = spawnSync(globalThis.process.execPath, ['bin/litmuslab.mjs', ...args], { cwd: root, encoding: 'utf8', input, timeout: 15000, maxBuffer: 8 * 1024 * 1024 });
  let output;
  try { output = JSON.parse(process.stdout); }
  catch { output = { parseError: true, stdout: process.stdout }; }
  return { code: process.status, output, stderr: process.stderr, signal: process.signal };
}

const httpRequest = (port, path, method = 'GET') => new Promise((resolve, reject) => {
  const req = request({ host: '127.0.0.1', port, path, method }, (res) => {
    let bytes = 0;
    res.on('data', (chunk) => { bytes += chunk.length; });
    res.on('end', () => resolve({ path, method, status: res.statusCode, bytes, contentType: res.headers['content-type'] }));
  });
  req.on('error', reject);
  req.setTimeout(5000, () => req.destroy(new Error('HTTP timeout')));
  req.end();
});

async function startPreview() {
  // Ask the OS for a free loopback port without relying on a fixed developer port.
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  server = spawn(process.execPath, ['tools/serve.mjs', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Local preview did not become ready')), 10000);
    const finish = (error) => { clearTimeout(timer); error ? reject(error) : resolve(); };
    server.once('error', finish);
    server.once('exit', (code) => finish(new Error(`Local preview exited early: ${code}; ${output}`)));
    server.stderr.on('data', (chunk) => { output += chunk; });
    server.stdout.on('data', (chunk) => { output += chunk; if (output.includes('LitmusLab local preview:')) finish(); });
  });
  return port;
}

try {
  const fixture = createExperiment('memory x=0\nthread P0\nload r0 x\nend\n', { model: 'both', strategy: 'bfs', maxStates: 20000, maxOutcomes: 256 });
  const encoded = (value) => new TextEncoder().encode(JSON.stringify(value));
  const rejected = (bytes) => { try { parseExperiment(bytes); return false; } catch { return true; } };
  verify('experiment configuration round trip', JSON.stringify(parseExperiment(encoded(fixture))) === JSON.stringify(fixture));
  for (const [name, value] of [
    ['unknown root field', { ...fixture, results: {} }],
    ['result bundle import', { ...fixture, kind: 'litmuslab.results' }],
    ['unsupported version', { ...fixture, version: 2 }],
    ['string version', { ...fixture, version: '1' }],
    ['source type', { ...fixture, source: [] }],
    ['oversized source', { ...fixture, source: 'x'.repeat(32769) }],
    ['lone surrogate', { ...fixture, source: '\ud800' }],
    ['missing options field', { ...fixture, options: { model: 'SC' } }],
    ['unknown option field', { ...fixture, options: { ...fixture.options, cached: true } }],
    ['unknown model', { ...fixture, options: { ...fixture.options, model: 'ARM' } }],
    ['unknown strategy', { ...fixture, options: { ...fixture.options, strategy: 'random' } }],
    ['fraction budget', { ...fixture, options: { ...fixture.options, maxStates: 1.5 } }],
    ['string budget', { ...fixture, options: { ...fixture.options, maxStates: '20000' } }],
    ['null budget', { ...fixture, options: { ...fixture.options, maxStates: null } }],
    ['zero budget', { ...fixture, options: { ...fixture.options, maxStates: 0 } }],
    ['state upper bound', { ...fixture, options: { ...fixture.options, maxStates: 100001 } }],
    ['outcome upper bound', { ...fixture, options: { ...fixture.options, maxOutcomes: 1025 } }],
    ['array root', [fixture]], ['null root', null]
  ]) verify(`config rejects ${name}`, rejected(encoded(value)));
  verify('config rejects invalid UTF8', rejected(new Uint8Array([255])));
  verify('config rejects invalid JSON', rejected(new TextEncoder().encode('{')));
  verify('config rejects byte limit', rejected(new Uint8Array(MAX_CONFIG_BYTES + 1)));
  const limits = createExperiment('😀'.repeat(32768), { model: 'TSO', strategy: 'dfs', maxStates: 100000, maxOutcomes: 1024 });
  verify('config accepts Unicode codepoint and budget upper boundaries', parseExperiment(encoded(limits)).source === limits.source);
  let rejectedResults = false;
  try { createResultBundle(fixture, {}); } catch { rejectedResults = true; }
  verify('result export rejects missing actual results', rejectedResults);
  for (const file of ['store-buffering', 'load-buffering', 'message-passing', 'store-buffering-fence', 'fifo', 'forwarding']) {
    const result = cli(['analyze', `examples/${file}.litmus`, '--model', 'both']);
    verify(`${file}: complete`, result.code === 0 && result.output.comparison?.definitive, { exitCode: result.code });
    for (const model of ['SC', 'TSO']) for (const outcome of result.output.results?.[model]?.outcomes || []) {
      const replay = cli(['replay', `examples/${file}.litmus`, '--model', model, '--witness', outcome.witness]);
      verify(`${file}/${model}: replay ${outcome.id}`, replay.code === 0 && replay.output.outcome?.id === outcome.id && replay.output.trace?.at(-1).terminal, { exitCode: replay.code, steps: replay.output.trace?.length - 1 });
    }
  }
  const source = await readFile(join(root, 'examples/store-buffering.litmus'), 'utf8');
  verify('stdin', cli(['analyze', '-', '--model', 'SC'], source).output.outcomes?.length === 3);
  verify('state budget exit3', cli(['analyze', '-', '--model', 'both', '--max-states', '1'], source).code === 3);
  verify('outcome budget exit3', cli(['analyze', '-', '--model', 'TSO', '--max-outcomes', '1'], source).code === 3);
  verify('invalid option exit2', cli(['analyze', '-', '--bogus', 'x'], source).code === 2);
  verify('repeat option exit2', cli(['analyze', '-', '--model', 'SC', '--model', 'TSO'], source).code === 2);
  verify('invalid budget exit2', cli(['analyze', '-', '--max-states', '0'], source).code === 2);
  verify('invalid witness exit2', cli(['replay', '-', '--model', 'SC', '--witness', 'f0'], source).code === 2);
  verify('truncated witness exit2', cli(['replay', '-', '--model', 'SC', '--witness', 't0'], source).code === 2);
  verify('malformed source exit2', cli(['analyze', '-'], 'memory x=0\nthread P0\nload r0 missing\nend\n').code === 2);
  verify('stdin size limit exit2', cli(['analyze', '-'], '#'.repeat(131073)).code === 2);
  const invalidUtf8 = cli(['analyze', '-'], Buffer.from([0xff]));
  verify('invalid UTF8 exit2', invalidUtf8.code === 2 && invalidUtf8.output.error?.code === 'CLI_INPUT_ERROR');
  verify('missing file exit2', cli(['analyze', join(temporary, 'missing.litmus')]).code === 2);
  verify('directory input exit2', cli(['analyze', temporary]).code === 2);
  const largeFile = join(temporary, 'oversized.litmus');
  await writeFile(largeFile, '#'.repeat(131073));
  verify('regular file size limit exit2', cli(['analyze', largeFile]).code === 2);
  if (process.platform !== 'win32') {
    const fifo = join(temporary, 'source.fifo');
    const created = spawnSync('mkfifo', [fifo]);
    if (created.status === 0) {
      const result = cli(['analyze', fifo]);
      verify('FIFO is rejected without blocking', result.code === 2 && !result.signal && result.output.error?.code === 'CLI_INPUT_ERROR');
    } else verify('FIFO fixture creation', false);
  }

  const port = await startPreview();
  for (const [path, expected] of [['/', 200], ['/dist/engine.mjs', 200], ['/dist/engine.raw.mjs', 200], ['/examples/store-buffering.litmus', 200], ['/docs/TUTORIAL.md', 200], ['/package.json', 404], ['/.tools/moon', 404], ['/web/../../PROJECTS.md', 400], ['/web/%2e%2e/%2e%2e/PROJECTS.md', 400], ['/web/%ZZ', 400]]) {
    const result = await httpRequest(port, path);
    verify(`HTTP GET ${path}`, result.status === expected, result);
  }
  const head = await httpRequest(port, '/', 'HEAD');
  verify('HTTP HEAD no response body', head.status === 200 && head.bytes === 0, head);
  const post = await httpRequest(port, '/', 'POST');
  verify('HTTP POST rejected', post.status === 405, post);
} catch (error) {
  verify('interface runner completed', false, { error: error.message });
} finally {
  if (server && server.exitCode === null) {
    await new Promise((resolve) => { server.once('exit', resolve); server.kill('SIGTERM'); });
  }
  await rm(temporary, { recursive: true, force: true });
}

try { verify('input evidence unchanged during verification', captureEvidence().digest === evidence.digest); }
catch (error) { verify('input evidence unchanged during verification', false, { error: error.message }); }

const report = { formatVersion: 1, source: 'Local configuration validation, CLI and loopback server checks; no external oracle claims.', started, finished: new Date().toISOString(), command: 'node tools/check-interfaces.mjs', evidence, node: process.version, platform: process.platform, passed: checks.length - failures.length, failed: failures.length, checks };
await mkdir(join(root, 'reports'), { recursive: true });
await writeFile(join(root, 'reports/interfaces.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ passed: report.passed, failed: report.failed, report: 'reports/interfaces.json', failures }));
process.exitCode = failures.length ? 1 : 0;
