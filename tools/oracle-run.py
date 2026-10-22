#!/usr/bin/env python3
"""Run pinned upstream herd7 on the shared MOV/MFENCE subset.

The oracle outputs are obtained from herd7, never from LitmusLab or a copied
operational interpreter. Mapping is explicit and all final memory/register
locations are observed. This is a model simulator, not a physical CPU run.
"""
import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import sys
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
REGS = ['EAX', 'EBX', 'ECX', 'EDX', 'ESI', 'EDI', 'EBP', 'ESP']


def translate(name, memory, threads):
    maps = []
    for ops in threads:
        named = list(dict.fromkeys(op[1] for op in ops if op[0] == 'load'))
        if len(named) > len(REGS):
            raise ValueError('at most eight registers per thread')
        maps.append(dict(zip(named, REGS)))
    init = [f'{k}={v}' for k, v in memory.items()]
    observed = list(memory)
    rows = []
    for tid, ops in enumerate(threads):
        init.extend(f'{tid}:{reg}=0' for reg in maps[tid].values())
        observed.extend(f'{tid}:{reg}' for reg in maps[tid].values())
        row = []
        for op in ops:
            if op[0] == 'store':
                row.append(f'MOV [{op[1]}],${op[2]}')
            elif op[0] == 'load':
                row.append(f'MOV {maps[tid][op[1]]},[{op[2]}]')
            elif op[0] == 'fence':
                row.append('MFENCE')
            else:
                raise ValueError(f'unsupported instruction {op}')
        rows.append(row)
    source = f'X86 LL_{name}\n{{\n' + ';\n'.join(init) + ';\n}\n'
    source += ' | '.join(f'P{tid}' for tid in range(len(threads))) + ';\n'
    for idx in range(max(map(len, rows))):
        source += ' | '.join(row[idx] if idx < len(row) else '' for row in rows) + ';\n'
    source += 'locations [' + '; '.join(observed) + ']\n'
    # The predicate affects observation counts only; the complete projected
    # final-state set is listed independently by herd7.
    first = next(iter(memory))
    source += f'exists ({first}={memory[first]})\n'
    return source, maps


def parse_states(output, memory, maps):
    lines = output.splitlines()
    marker = next(i for i, line in enumerate(lines) if re.fullmatch(r'States [0-9]+', line))
    count = int(lines[marker].split()[1])
    result = []
    reverse = [{value: key for key, value in mapping.items()} for mapping in maps]
    for line in lines[marker + 1:marker + 1 + count]:
        state = {'memory': {}, 'registers': {f'P{i}': {} for i in range(len(maps))}}
        for entry in filter(None, (part.strip() for part in line.split(';'))):
            location, value = entry.split('=')
            value = int(value, 0)
            if ':' in location:
                tid, register = location.split(':')
                state['registers'][f'P{tid}'][reverse[int(tid)][register]] = value
            else:
                if location.startswith('[') and location.endswith(']'):
                    location = location[1:-1]
                state['memory'][location] = value
        if set(state['memory']) != set(memory):
            raise ValueError(f'herd omitted memory locations: {state}')
        for tid, mapping in enumerate(maps):
            if set(state['registers'][f'P{tid}']) != set(mapping):
                raise ValueError(f'herd omitted registers: {state}')
        result.append(state)
    if len(result) != count:
        raise ValueError('truncated herd7 state listing')
    return sorted(result, key=lambda x: json.dumps(x, sort_keys=True))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--herd', type=pathlib.Path, default=ROOT / '.tools/oracle/bin/herd7')
    parser.add_argument('--report', type=pathlib.Path, default=ROOT / 'reports/oracle-herd7.json')
    args = parser.parse_args()
    version = subprocess.run([str(args.herd), '-version'], text=True, capture_output=True, check=True).stdout.strip()
    if not version.startswith('7.58'):
        raise RuntimeError(f'expected herd7 7.58, got {version!r}')
    raw = ROOT / 'reports/oracle-raw'
    raw.mkdir(parents=True, exist_ok=True)
    fixtures = ROOT / 'tests/oracle'
    cases = json.loads((fixtures / 'cases.json').read_text())
    report = {'schema_version': 1, 'kind': 'external-memory-model-oracle', 'tool': 'herd7',
              'version': version, 'upstream_tag': '7.58',
              'upstream_commit': '1ca343e16a2038e406d1ac674e7e3a1b722b36c7',
              'retrieved_at': datetime.now(timezone.utc).isoformat(),
              'scope': 'X86 MOV immediate store, MOV register load, MFENCE; all final memory and named registers',
              'runs': []}
    for name, (memory, threads) in cases.items():
        dsl = 'memory ' + ' '.join(f'{key}={value}' for key, value in memory.items()) + '\n'
        for tid, ops in enumerate(threads):
            dsl += f'\nthread P{tid}\n' + '\n'.join(' '.join(map(str, op)) for op in ops) + '\nend\n'
        dsl_bytes = (fixtures / (name + '.litmuslab')).read_bytes()
        if dsl_bytes != dsl.encode():
            raise ValueError(f'{name}: DSL fixture disagrees with cases.json; update them together before running the oracle')
        source, maps = translate(name, memory, threads)
        input_path = fixtures / (name + '.litmus')
        input_path.write_text(source)
        for model, cat in [('SC', 'sc.cat'), ('TSO', 'x86tso.cat')]:
            command = [str(args.herd), '-model', cat, '-show', 'none', str(input_path)]
            completed = subprocess.run(command, text=True, capture_output=True, timeout=120)
            stem = raw / f'herd7-{name}-{model}'
            stem.with_suffix('.stdout').write_text(completed.stdout)
            stem.with_suffix('.stderr').write_text(completed.stderr)
            if completed.returncode:
                raise RuntimeError(f'herd7 failed: {completed.stderr}')
            states = parse_states(completed.stdout, memory, maps)
            report['runs'].append({'case': name, 'model': model,
                'command': ['herd7', '-model', cat, '-show', 'none', str(input_path.relative_to(ROOT))],
                'input_sha256': hashlib.sha256(source.encode()).hexdigest(),
                'dsl_input_sha256': hashlib.sha256(dsl_bytes).hexdigest(),
                'stdout_sha256': hashlib.sha256(completed.stdout.encode()).hexdigest(),
                'returncode': completed.returncode, 'complete': True,
                'state_count': len(states), 'outcomes': states})
            print(f'{name:12s} {model:3s}: {len(states)} complete projected outcomes')
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
