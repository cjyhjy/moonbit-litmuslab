#!/usr/bin/env python3
"""Re-run the separately downloaded, pinned MoonCTL upstream examples."""
import json
import hashlib
import pathlib
import subprocess
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / '.tools/oracle/moonctl'
MOON = ROOT / 'tools/moon'
RAW = ROOT / 'reports/oracle-raw'
COMMIT = '4174d616c4fe84236aa57782dd247f7320e20738'

if not (SOURCE / 'moon.mod').exists():
    archive = ROOT / '.tools/oracle/moonctl.tar.gz'
    archive.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['curl', '-fsSL', '--retry', '3', '--max-time', '120',
                    'https://codeload.github.com/length-super/moonctl/tar.gz/' + COMMIT,
                    '-o', str(archive)], check=True)
    if hashlib.sha256(archive.read_bytes()).hexdigest() != 'fb520ce6a50959c7d7bf4b11e04248b1c4c1a1c448f7dd68e6d7474e35182e3b':
        raise RuntimeError('MoonCTL archive checksum mismatch')
    SOURCE.mkdir(parents=True, exist_ok=True)
    subprocess.run(['tar', '-xzf', str(archive), '-C', str(SOURCE), '--strip-components=1'], check=True)
RAW.mkdir(parents=True, exist_ok=True)
cases = [
    ('tests', ['test', '--target', 'native'], 0),
    ('buggy', ['run', '--target', 'native', 'cmd/main', '--', '--json', 'examples/buggy.json', 'AG !double_charge'], 1),
    ('fixed', ['run', '--target', 'native', 'cmd/main', '--', '--json', 'examples/fixed.json', 'AG !double_charge'], 0),
    ('explore', ['run', '--target', 'wasm-gc', 'examples/explore'], 0),
]
report = {'upstream': 'https://github.com/length-super/moonctl', 'version': '0.2.0',
          'commit': COMMIT, 'kind': 'upstream-neighbor-run-not-memory-model-oracle',
          'run_at': datetime.now(timezone.utc).isoformat(), 'runs': []}
for name, args, expected in cases:
    p = subprocess.run([str(MOON), *args], cwd=SOURCE, text=True, capture_output=True, timeout=180)
    (RAW / f'moonctl-{name}.stdout').write_text(p.stdout)
    (RAW / f'moonctl-{name}.stderr').write_text(p.stderr)
    report['runs'].append({'case': name, 'command': ['moon', *args], 'returncode': p.returncode,
                           'expected_returncode': expected, 'matched': p.returncode == expected})
    print(name, 'exit=', p.returncode, 'expected=', expected)
    if p.returncode != expected:
        raise RuntimeError(p.stderr)
(ROOT / 'reports/oracle-moonctl.json').write_text(json.dumps(report, indent=2) + '\n')
