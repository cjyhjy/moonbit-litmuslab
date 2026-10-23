#!/usr/bin/env python3
"""Seeded external herd7 differential checks, separate from the six fixed cases.

This generates finite DSL programs, translates exactly the MOV/MFENCE subset,
runs real herd7, and compares complete memory/register outcome sets with the
actual MoonBit JS engine. It is not a hardware test or a proof of equivalence.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import platform
import random
import re
import subprocess
import sys
from evidence import snapshot, verify_snapshot

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / 'tests/oracle-generated'
RAW = ROOT / 'reports/oracle-generated-raw'
DEFAULT_SEED = 20261022
FAMILIES = ['mixed', 'overwrite', 'negative', 'same_address', 'fenced', 'empty_thread', 'all_empty', 'forwarding']


def sha(data):
    return hashlib.sha256(data if isinstance(data, bytes) else data.encode()).hexdigest()


def key(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'))


def dsl_source(memory, threads):
    source = 'memory ' + ' '.join(f'{name}={value}' for name, value in memory.items()) + '\n'
    for tid, ops in enumerate(threads):
        source += f'\nthread P{tid}\n'
        source += ''.join(' '.join(map(str, op)) + '\n' for op in ops)
        source += 'end\n'
    return source


def generate(seed):
    rng = random.Random(seed)
    cases = []
    for family in FAMILIES:
        for nthreads in range(1, 5):
            names = ['x', 'y', 'z'][:rng.choice([1, 2, 3])]
            memory = {address: rng.choice([-2, -1, 0, 1, 2]) for address in names}
            target = rng.choice(names)
            other = rng.choice(names)
            value = rng.choice([-2, -1, 1, 2])
            second = next(v for v in [-2, -1, 0, 1, 2] if v != value)
            threads = []
            for tid in range(nthreads):
                address = rng.choice(names)
                write = ('store', address, rng.choice([-2, -1, 0, 1, 2]))
                read = ('load', 'r0', rng.choice(names))
                threads.append([write, read] if rng.randrange(2) else [read, write])
            if family == 'mixed':
                threads[0].insert(rng.randrange(3), ('load', 'r1', other))
            elif family == 'overwrite':
                threads[0] = [('load', 'r0', target), ('store', target, value), ('load', 'r0', other)]
            elif family == 'negative':
                memory[target] = rng.choice([-2, -1])
                threads[0] = [('load', 'r0', target), ('store', other, -3), ('load', 'r1', other)]
            elif family == 'same_address':
                threads[0] = [('store', target, value), ('store', target, second), ('load', 'r0', target)]
            elif family == 'fenced':
                threads[0] = [('store', target, value), ('fence',), ('load', 'r0', other), ('fence',)]
            elif family == 'empty_thread':
                threads[rng.randrange(nthreads)] = []
            elif family == 'all_empty':
                threads = [[] for _ in range(nthreads)]
            elif family == 'forwarding':
                threads[0] = [('store', target, value), ('load', 'r0', target), ('store', target, second), ('load', 'r1', target)]
            cases.append({'name': f'g{len(cases):02d}_{family}_t{nthreads}', 'family': family,
                          'memory': memory, 'threads': threads})
    # Fixed boundary probes supplement the seeded families, without changing
    # or counting the existing six fixed oracle cases as new coverage.
    cases.extend([
        {'name': 'g32_int16_endpoints', 'family': 'boundary', 'memory': {'x': -32768, 'y': 32767},
         'threads': [[('load', 'r0', 'x'), ('store', 'y', -32768), ('load', 'r0', 'y')],
                     [('store', 'x', 32767), ('load', 'r0', 'x')]]},
        {'name': 'g33_eight_registers', 'family': 'boundary', 'memory': {'x': -1, 'y': 2},
         'threads': [[('load', f'r{i}', 'x' if i % 2 else 'y') for i in range(8)] + [('store', 'x', -2), ('load', 'r0', 'x')]]},
        {'name': 'g34_eight_memory_locations', 'family': 'boundary', 'memory': {f'm{i}': i - 4 for i in range(8)},
         'threads': [[('store', 'm0', 2), ('load', 'r0', 'm1')], [], [('load', 'r0', 'm0')], []]},
        {'name': 'g35_sixteen_instructions', 'family': 'boundary', 'memory': {'x': -1},
         'threads': [[('store', 'x', -2), ('load', 'r0', 'x'), ('fence',), ('load', 'r1', 'x'),
                      ('fence',), ('fence',), ('fence',), ('fence',), ('store', 'x', 2),
                      ('load', 'r0', 'x'), ('fence',), ('load', 'r1', 'x'),
                      ('fence',), ('fence',), ('fence',), ('fence',)]]},
    ])
    assert len(cases) == 36 and len({case['name'] for case in cases}) == 36
    return cases


def coverage(cases):
    counts = Counter()
    for case in cases:
        memory, threads = case['memory'], case['threads']
        counts['programs'] += 1
        counts[f'threads_{len(threads)}'] += 1
        counts['negative_initial_values'] += any(value < 0 for value in memory.values())
        counts['negative_store_values'] += any(op[0] == 'store' and op[2] < 0 for ops in threads for op in ops)
        counts['fences'] += any(op[0] == 'fence' for ops in threads for op in ops)
        counts['empty_threads'] += any(not ops for ops in threads)
        counts['all_empty_threads'] += all(not ops for ops in threads)
        counts['register_overwrite'] += any(len([op[1] for op in ops if op[0] == 'load']) != len({op[1] for op in ops if op[0] == 'load'}) for ops in threads)
        counts['same_address_store_sequence'] += any(len([op[1] for op in ops if op[0] == 'store']) != len({op[1] for op in ops if op[0] == 'store'}) for ops in threads)
        used = {op[1] if op[0] == 'store' else op[2] for ops in threads for op in ops if op[0] != 'fence'}
        counts['unused_memory_locations'] += bool(set(memory) - used)
    return dict(sorted(counts.items()))


def load_fixed_helpers():
    spec = importlib.util.spec_from_file_location('fixed_oracle_helpers', ROOT / 'tools/oracle-run.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def translate(helpers, name, memory, threads):
    source, maps = helpers.translate(name, memory, threads)
    if all(not ops for ops in threads):
        # herd7 accepts empty instruction cells, but requires at least one
        # table row. This inserts no instructions and no memory events.
        source = source.replace('locations [', ' | '.join('' for _ in threads) + ';\nlocations [', 1)
    return source, maps


def run_herd(herd, helpers, name, model, memory, maps, litmus_path, timeout):
    cat = {'SC': 'sc.cat', 'TSO': 'x86tso.cat'}[model]
    cmd = [str(herd), '-model', cat, '-show', 'none', str(litmus_path)]
    try:
        result = subprocess.run(cmd, text=True, capture_output=True, timeout=timeout)
        stdout, stderr, returncode = result.stdout, result.stderr, result.returncode
        timed_out = False
    except subprocess.TimeoutExpired as exc:
        stdout = (exc.stdout or b'').decode() if isinstance(exc.stdout, bytes) else (exc.stdout or '')
        stderr = (exc.stderr or b'').decode() if isinstance(exc.stderr, bytes) else (exc.stderr or '')
        returncode, timed_out = None, True
    stem = RAW / f'{name}-{model}'
    stem.with_suffix('.stdout').write_text(stdout)
    stem.with_suffix('.stderr').write_text(stderr)
    record = {'case': name, 'model': model, 'command': ['herd7', '-model', cat, '-show', 'none', str(litmus_path.relative_to(ROOT))],
              'returncode': returncode, 'stdout_sha256': sha(stdout), 'stderr_sha256': sha(stderr),
              'raw_stdout': str(stem.with_suffix('.stdout').relative_to(ROOT)), 'raw_stderr': str(stem.with_suffix('.stderr').relative_to(ROOT))}
    if timed_out:
        record.update(classification='oracle_timeout', complete=False)
    elif returncode != 0:
        record.update(classification='oracle_process_error', complete=False)
    elif stderr.strip():
        # herd7 may exit 0 on parsing errors: never equate exit 0 with success.
        record.update(classification='oracle_diagnostic', complete=False, diagnostic=stderr.strip())
    elif len(re.findall(r'^States \d+$', stdout, re.M)) != 1:
        record.update(classification='oracle_missing_states', complete=False)
    else:
        try:
            states = helpers.parse_states(stdout, memory, maps)
            if not states:
                raise ValueError('Straight-line finite program unexpectedly had no terminal outcomes')
            if len({key(state) for state in states}) != len(states):
                raise ValueError('Duplicate projected outcomes')
            record.update(classification='complete', complete=True, outcomes=states, outcome_count=len(states))
        except (ValueError, KeyError, IndexError, StopIteration) as exc:
            record.update(classification='oracle_parse_error', complete=False, diagnostic=str(exc))
    return record


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--seed', type=int, default=DEFAULT_SEED)
    parser.add_argument('--herd', type=Path, default=ROOT / '.tools/oracle/bin/herd7')
    parser.add_argument('--node', default='node')
    parser.add_argument('--timeout', type=int, default=30, help='per herd7 invocation, seconds')
    args = parser.parse_args()
    if args.timeout < 1 or args.timeout > 60:
        parser.error('--timeout must be 1..60')
    FIXTURES.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)
    helpers = load_fixed_helpers()
    version = subprocess.run([str(args.herd), '-version'], text=True, capture_output=True, check=True).stdout.strip()
    if not version.startswith('7.58,'):
        raise RuntimeError('Pinned herd7 7.58 required')
    cases = generate(args.seed)
    assert key(cases) == key(generate(args.seed)), 'Generator must be deterministic'
    manifest = {'schema_version': 1, 'seed': args.seed, 'python': platform.python_version(),
                'generator_sha256': sha(Path(__file__).read_bytes()), 'program_count': len(cases), 'cases': []}
    runs, requests, prepared = [], [], []
    for case in cases:
        name, memory, threads = case['name'], case['memory'], case['threads']
        source = dsl_source(memory, threads)
        litmus, maps = translate(helpers, name, memory, threads)
        source_path, litmus_path = FIXTURES / f'{name}.litmuslab', FIXTURES / f'{name}.litmus'
        source_path.write_text(source)
        litmus_path.write_text(litmus)
        manifest['cases'].append({**case, 'source': source, 'source_sha256': sha(source),
                                  'litmus_sha256': sha(litmus), 'register_map': maps})
        prepared.append((case, source, litmus, maps, litmus_path))
    manifest_path = FIXTURES / 'cases.json'
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    malformed, bad_maps = helpers.translate('missing_empty_table_row', {'x': -1}, [[], []])
    bad_path = FIXTURES / 'probes/missing_empty_table_row.litmus'
    bad_path.parent.mkdir(parents=True, exist_ok=True)
    bad_path.write_text(malformed)
    # Bind generated inputs before any oracle execution, then verify them again
    # after the real MoonBit engine has completed the full batch.
    evidence = snapshot(ROOT, 'oracle-generated')
    # Replace any prior success before starting subprocesses. Interrupted runs
    # must not leave a previous successful run looking like the latest result.
    (ROOT / 'reports/oracle-generated.json').write_text(json.dumps({
        'schema_version': 1, 'kind': 'seeded-external-oracle-full-outcome-set-comparison',
        'status': 'running', 'all_matched': False, 'passed': 0, 'runs_count': 0,
        'expected_runs': 72, 'program_count': 36, 'seed': args.seed, 'evidence': evidence,
        'run_at': datetime.now(timezone.utc).isoformat()}, indent=2) + '\n')
    for case, source, litmus, maps, litmus_path in prepared:
        name, memory = case['name'], case['memory']
        for model in ['SC', 'TSO']:
            run = run_herd(args.herd, helpers, name, model, memory, maps, litmus_path, args.timeout)
            run.update(source_sha256=sha(source), litmus_sha256=sha(litmus))
            runs.append(run)
            requests.append({'case': name, 'model': model, 'source': source})
        print(name, 'herd:', ', '.join(f"{r['model']}={r.get('outcome_count', r['classification'])}" for r in runs[-2:]), flush=True)
    # A deliberately malformed empty program demonstrates herd7's exit-zero
    # warning behavior. It is an expected grammar rejection, not a passed
    # semantic comparison, and is excluded from the 72 positive runs.
    rejection_probe = run_herd(args.herd, helpers, 'probe-missing-empty-row', 'SC', {'x': -1}, bad_maps, bad_path, args.timeout)
    rejection_probe['expected_classification'] = 'oracle_diagnostic'
    rejection_probe['recognized_as_rejection'] = rejection_probe['classification'] == 'oracle_diagnostic' and not rejection_probe['complete']
    bridge = subprocess.run([args.node, str(ROOT / 'tools/oracle-generated-engine.mjs')], input=json.dumps(requests), text=True,
                            capture_output=True, timeout=60)
    (RAW / 'engine-bridge.stderr').write_text(bridge.stderr)
    if bridge.returncode:
        raise RuntimeError('Engine batch failed: ' + bridge.stderr)
    engine = json.loads(bridge.stdout)
    if len(engine['results']) != 72 or len(runs) != 72:
        raise RuntimeError('Expected exactly 72 distinct case/model results')
    engine_map = {(record['case'], record['model']): record['result'] for record in engine['results']}
    if len(engine_map) != 72:
        raise RuntimeError('Duplicate engine results')
    for run in runs:
        actual = engine_map[(run['case'], run['model'])]
        output_path = RAW / f"{run['case']}-{run['model']}.engine.json"
        output_path.write_text(json.dumps(actual, ensure_ascii=False, indent=2) + '\n')
        run.update(engine_status=actual.get('status'), engine_output_sha256=sha(output_path.read_bytes()),
                   engine_output=str(output_path.relative_to(ROOT)))
        expected_set = {key(outcome) for outcome in run.get('outcomes', [])}
        actual_set = {key(outcome) for outcome in actual.get('outcomes', [])}
        run['engine_outcome_count'] = len(actual_set)
        run['missing'] = [json.loads(value) for value in sorted(expected_set - actual_set)]
        run['unexpected'] = [json.loads(value) for value in sorted(actual_set - expected_set)]
        run['matched'] = run['complete'] and actual.get('status') == 'complete' and not run['missing'] and not run['unexpected']
        if actual.get('status') != 'complete':
            run['comparison_classification'] = 'engine_' + actual.get('status', 'invalid')
        elif not run['complete']:
            run['comparison_classification'] = 'oracle_unavailable'
        elif run['matched']:
            run['comparison_classification'] = 'matched'
        else:
            run['comparison_classification'] = 'semantic_mismatch'
    verify_snapshot(ROOT, evidence, 'oracle-generated')
    report = {'schema_version': 1, 'kind': 'seeded-external-oracle-full-outcome-set-comparison', 'status': 'finished', 'evidence': evidence,
              'run_at': datetime.now(timezone.utc).isoformat(), 'seed': args.seed,
              'oracle_version': version, 'oracle_binary_sha256': sha(args.herd.read_bytes()),
              'generator_sha256': manifest['generator_sha256'], 'fixed_helpers_sha256': sha((ROOT / 'tools/oracle-run.py').read_bytes()),
              'engine_bridge_sha256': sha((ROOT / 'tools/oracle-generated-engine.mjs').read_bytes()),
              'engine_sha256': engine['engine_sha256'], 'raw_engine_sha256': engine['raw_engine_sha256'],
              'fixtures_sha256': sha(manifest_path.read_bytes()), 'python': platform.python_version(), 'node': engine['node'],
              'program_count': len(cases), 'expected_runs': 72, 'runs_count': len(runs),
              'coverage': coverage(cases), 'classifications': dict(Counter(run['comparison_classification'] for run in runs)),
              'passed': sum(run['matched'] for run in runs),
              'all_matched': all(run['matched'] for run in runs) and rejection_probe['recognized_as_rejection'],
              'scope': 'Finite X86 MOV immediate store / register load / MFENCE shared subset with DSL signed 16-bit values, exact full final memory and named registers; simulator, not physical hardware.',
              'normalization': 'No integer normalization: herd7 directly emits signed values. Empty threads use blank instruction cells; all-empty programs retain one blank table row and add no instructions.',
              'command': f'python3 tools/oracle-generated.py --seed {args.seed}',
              'expected_grammar_rejections': [rejection_probe], 'runs': runs}
    report_path = ROOT / 'reports/oracle-generated.json'
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(f"Generated oracle: {report['passed']}/72 matched; rejection probe recognized={rejection_probe['recognized_as_rejection']}")
    return 0 if report['all_matched'] else 1


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as exc:
        failed = {'schema_version': 1, 'kind': 'seeded-external-oracle-full-outcome-set-comparison',
                  'status': 'error', 'all_matched': False, 'passed': 0, 'runs_count': 0,
                  'expected_runs': 72, 'program_count': 36,
                  'run_at': datetime.now(timezone.utc).isoformat(), 'error': str(exc)}
        (ROOT / 'reports/oracle-generated.json').write_text(json.dumps(failed, indent=2) + '\n')
        print(str(exc), file=sys.stderr)
        sys.exit(2)
