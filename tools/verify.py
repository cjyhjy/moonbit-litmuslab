#!/usr/bin/env python3
"""Run reproducible local checks; optional live third-party runs are explicit."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import platform
import shutil
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--live-oracle', action='store_true', help='requires tools/oracle-bootstrap.sh to have completed')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'reports', help='write current logs and result here; historical reports remain the default')
    parser.add_argument('--check-dist', action='store_true', help='require rebuilt JavaScript to match the committed artifacts')
    args = parser.parse_args()
    commands = []
    for target in ['js', 'native', 'wasm-gc']:
        commands.append((f'moon-check-{target}', ['./tools/moon', 'check', '--target', target]))
        # The pinned toolchain cannot link native foreign_library artifacts.
        # Build the real native test executable, then execute the full suite.
        if target == 'native':
            commands.append(('moon-build-native-test-executable', ['./tools/moon', 'test', '--build-only', '--target', target, '--release']))
        else:
            commands.append((f'moon-build-{target}', ['./tools/moon', 'build', '--target', target, '--release']))
        commands.append((f'moon-test-{target}', ['./tools/moon', 'test', '--target', target]))
    commands.append(('build-js', ['sh', 'tools/build.sh']))
    if args.check_dist:
        commands.append(('committed-js-consistency', ['git', 'diff', '--exit-code', '--', 'dist/engine.mjs', 'dist/engine.raw.mjs']))
    commands += [
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
    revision = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True, capture_output=True)
    result = {'generatedAt': datetime.now(timezone.utc).isoformat(), 'platform': platform.platform(),
              'sourceCommit': revision.stdout.strip() if revision.returncode == 0 else None,
              'status': 'running', 'liveOracleRequested': args.live_oracle,
              'oracleScope': 'fresh execution requested' if args.live_oracle else 'comparison with recorded herd7 results; no fresh external tool execution',
              'recordedOracleSha256': hashlib.sha256((ROOT / 'reports/oracle-herd7.json').read_bytes()).hexdigest(),
              'checks': []}
    output = args.output_dir.resolve()
    logdir = output / 'verification-logs'
    logdir.mkdir(parents=True, exist_ok=True)
    report = output / 'local-verification.json'
    report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    generated = {'crosscheck': ['crosscheck.json', 'crosscheck.md'],
                 'upper-state-budget': ['resource-stress.json'], 'interfaces': ['interfaces.json'],
                 'recorded-herd-comparison': ['oracle-comparison.json']}
    for name, command in commands:
        started = time.monotonic()
        started_wall = time.time()
        try:
            run = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=180)
        except subprocess.TimeoutExpired as error:
            run = subprocess.CompletedProcess(command, 124, '', f'Timed out after {error.timeout} seconds\n')
        log = logdir / (name + '.txt')
        log.write_text('$ ' + ' '.join(command) + '\n' + run.stdout + run.stderr)
        row = {'name': name, 'command': command, 'exitCode': run.returncode,
               'passed': run.returncode == 0, 'elapsedSeconds': round(time.monotonic() - started, 3),
               'log': str(log.relative_to(output))}
        result['checks'].append(row)
        if output != ROOT / 'reports':
            for filename in generated.get(name, []):
                source = ROOT / 'reports' / filename
                if source.is_file() and source.stat().st_mtime >= started_wall:
                    shutil.copyfile(source, output / filename)
        print(f'{name}: {"PASS" if row["passed"] else "FAIL"}', flush=True)
        if run.returncode:
            result['status'] = 'failed'
            break
    else:
        result['status'] = 'passed'
    result['hashes'] = {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
                        for path in sorted(list((ROOT / 'core').glob('*.mbt')) + list((ROOT / 'dist').glob('*.mjs')))}
    report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    return 0 if result['status'] == 'passed' else 1


if __name__ == '__main__':
    raise SystemExit(main())
