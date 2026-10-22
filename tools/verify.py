#!/usr/bin/env python3
"""Run reproducible local checks; optional live third-party runs are explicit."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import platform
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--live-oracle', action='store_true', help='requires tools/oracle-bootstrap.sh to have completed')
    args = parser.parse_args()
    commands = [
        ('moon-check-js', ['./tools/moon', 'check', '--target', 'js']),
        ('moon-test-js', ['./tools/moon', 'test', '--target', 'js']),
        ('moon-test-native', ['./tools/moon', 'test', '--target', 'native']),
        ('moon-test-wasm-gc', ['./tools/moon', 'test', '--target', 'wasm-gc']),
        ('build-js', ['sh', 'tools/build.sh']),
        ('reference-unit-tests', [sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_reference.py', '-v']),
        ('crosscheck', [sys.executable, 'tools/crosscheck.py']),
        ('upper-state-budget', ['node', 'tools/stress.mjs']),
        ('interfaces', ['node', 'tools/check-interfaces.mjs']),
        ('recorded-herd-comparison', ['node', 'tools/oracle-compare.mjs']),
    ]
    if args.live_oracle:
        commands += [('live-herd7', [sys.executable, 'tools/oracle-run.py']),
                     ('fresh-herd-comparison', ['node', 'tools/oracle-compare.mjs']),
                     ('live-moonctl', [sys.executable, 'tools/oracle-moonctl.py'])]
    result = {'generatedAt': datetime.now(timezone.utc).isoformat(), 'platform': platform.platform(),
              'status': 'passed', 'liveOracleRequested': args.live_oracle, 'checks': []}
    logdir = ROOT / 'reports/verification-logs'
    logdir.mkdir(exist_ok=True)
    for name, command in commands:
        started = time.monotonic()
        run = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=180)
        log = logdir / (name + '.txt')
        log.write_text('$ ' + ' '.join(command) + '\n' + run.stdout + run.stderr)
        row = {'name': name, 'command': command, 'exitCode': run.returncode,
               'passed': run.returncode == 0, 'elapsedSeconds': round(time.monotonic() - started, 3),
               'log': str(log.relative_to(ROOT))}
        result['checks'].append(row)
        print(f'{name}: {"PASS" if row["passed"] else "FAIL"}', flush=True)
        if run.returncode:
            result['status'] = 'failed'
            break
    result['hashes'] = {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
                        for path in sorted(list((ROOT / 'core').glob('*.mbt')) + list((ROOT / 'dist').glob('*.mjs')))}
    (ROOT / 'reports/local-verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    return 0 if result['status'] == 'passed' else 1


if __name__ == '__main__':
    raise SystemExit(main())
