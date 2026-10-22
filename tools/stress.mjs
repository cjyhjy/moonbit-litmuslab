// A synthetic upper-budget probe; this is not a throughput benchmark.
import {analyze, replay} from '../dist/engine.mjs';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const source = 'memory x=0 y=0\n' + Array.from({length: 4}, (_, t) =>
  `thread P${t}\n` + Array.from({length: 16}, (_, i) => `store ${i % 2 ? 'y' : 'x'} ${t * 16 + i}`).join('\n') + '\nend').join('\n');
const started = performance.now();
const result = JSON.parse(analyze(source, 'TSO', 'dfs', 100000, 1024));
if (result.status !== 'incomplete' || result.reason !== 'max_states' || result.stats.visitedStates !== 100000) {
  throw new Error('Upper-budget probe did not stop at the specified state cap');
}
for (const outcome of result.outcomes) {
  if (JSON.parse(replay(source, 'TSO', outcome.witness)).status !== 'ok') throw new Error('Invalid retained witness');
}
const report = {kind: 'synthetic-resource-stress', passed: true, command: ['node', 'tools/stress.mjs'],
  model: 'TSO', strategy: 'dfs', threads: 4, instructionsPerThread: 16, limit: 100000,
  status: result.status, reason: result.reason, stats: result.stats,
  elapsedMilliseconds: performance.now() - started, maxRssKiB: process.resourceUsage().maxRSS,
  node: process.version, platform: process.platform, arch: process.arch,
  scope: 'one finite synthetic stress case; not a performance guarantee'};
writeFileSync(fileURLToPath(new URL('../reports/resource-stress.json', import.meta.url)), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
