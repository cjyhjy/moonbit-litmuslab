#!/usr/bin/env python3
"""Run current checks and bind their evidence to the exact tested input tree."""
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
import evidence

ROOT = Path(__file__).resolve().parents[1]
DIST = ('dist/engine.mjs', 'dist/engine.raw.mjs')
GENERATED = {
    'crosscheck': ['crosscheck.json', 'crosscheck.md'],
    'upper-state-budget': ['resource-stress.json'],
    'interfaces': ['interfaces.json'],
    'recorded-herd-comparison': ['oracle-comparison.json'],
    'live-herd7': ['oracle-herd7.json'],
    'fresh-herd-comparison': ['oracle-comparison.json'],
    'generated-herd-comparison': ['oracle-generated.json'],
    'live-moonctl': ['oracle-moonctl.json'],
}


def source_commit():
    """Never misidentify an enclosing coordination repository as this project."""
    try:
        top = subprocess.run(['git', 'rev-parse', '--show-toplevel'], cwd=ROOT,
                             capture_output=True, text=True, check=True)
        if Path(top.stdout.strip()).resolve() != ROOT:
            return None
        return subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT,
                              capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def dist_hashes():
    return {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
            if (ROOT / name).is_file() else None for name in DIST}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--live-oracle', action='store_true', help='requires tools/oracle-bootstrap.sh to have completed')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'reports',
                        help='write this run\'s report, logs and copied results here')
    parser.add_argument('--check-dist', action='store_true',
                        help='require rebuilt JavaScript to match the artifacts present at run start')
    args = parser.parse_args()
    commands = []
    for target in ('js', 'native', 'wasm-gc'):
        commands.append((f'moon-check-{target}', ['./tools/moon', 'check', '--target', target]))
        # This pinned compiler cannot build Native foreign_library artifacts.
        # Build the actual native test executable and run all Native tests.
        if target == 'native':
            commands.append(('moon-build-native-test-executable', ['./tools/moon', 'test', '--build-only', '--target', target, '--release']))
        else:
            commands.append((f'moon-build-{target}', ['./tools/moon', 'build', '--target', target, '--release']))
        commands.append((f'moon-test-{target}', ['./tools/moon', 'test', '--target', target]))
    commands += [
        ('reference-unit-tests', [sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py', '-v']),
        ('crosscheck', [sys.executable, 'tools/crosscheck.py']),
        ('upper-state-budget', ['node', 'tools/stress.mjs']),
        ('interfaces', ['node', 'tools/check-interfaces.mjs']),
    ]
    if args.live_oracle:
        commands += [('live-herd7', [sys.executable, 'tools/oracle-run.py']),
                     ('fresh-herd-comparison', ['node', 'tools/oracle-compare.mjs']),
                     ('generated-herd-comparison', [sys.executable, 'tools/oracle-generated.py']),
                     ('live-moonctl', [sys.executable, 'tools/oracle-moonctl.py'])]
    else:
        commands.append(('recorded-herd-comparison', ['node', 'tools/oracle-compare.mjs']))
    result = {'generatedAt': datetime.now(timezone.utc).isoformat(), 'platform': platform.platform(),
              'sourceCommit': source_commit(), 'status': 'running',
              'liveOracleRequested': args.live_oracle, 'checkDistRequested': args.check_dist,
              'oracleScope': 'fresh execution requested' if args.live_oracle else
                  'comparison with recorded herd7 results; no fresh external tool execution',
              'checks': []}
    output = args.output_dir.resolve()
    report_path = output / 'local-verification.json'
    logdir = output / 'verification-logs'
    logdir.mkdir(parents=True, exist_ok=True)

    def save():
        report_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')

    def run_check(name, command):
        started = time.monotonic()
        started_wall = time.time_ns()
        try:
            done = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=180)
            code, stdout = done.returncode, done.stdout + done.stderr
        except (OSError, subprocess.TimeoutExpired) as error:
            code, stdout = -1, str(error)
        produced = []
        for filename in GENERATED.get(name, []):
            source = ROOT / 'reports' / filename
            if not source.is_file() or source.stat().st_mtime_ns < started_wall:
                if code == 0:
                    code, stdout = -1, stdout + '\nMissing fresh output: ' + filename
                continue
            # Failed checks can produce the most useful diagnostics (including
            # a minimal counterexample); retain fresh outputs without hiding failure.
            if output != ROOT / 'reports':
                shutil.copyfile(source, output / filename)
            produced.append({'path': filename, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()})
        log = logdir / (name + '.txt')
        log.write_text('$ ' + ' '.join(command) + '\n' + stdout)
        row = {'name': name, 'command': command, 'exitCode': code,
               'passed': code == 0, 'elapsedSeconds': round(time.monotonic() - started, 3),
               'log': str(log.relative_to(output)), 'outputs': produced}
        result['checks'].append(row)
        save()
        print(f'{name}: {"PASS" if row["passed"] else "FAIL"}', flush=True)
        if code:
            raise RuntimeError(name + ' failed; see ' + row['log'])

    save()  # A failed new attempt must never leave a stale passed report behind.
    try:
        before_dist = dist_hashes()
        run_check('build-js', ['sh', 'tools/build.sh'])
        if args.check_dist:
            after_dist = dist_hashes()
            consistent = all(before_dist.values()) and before_dist == after_dist
            result['checks'].append({'name': 'provided-js-consistency', 'passed': bool(consistent),
                                     'before': before_dist, 'rebuilt': after_dist})
            save()
            if not consistent:
                raise RuntimeError('Provided dist artifacts differ from the source rebuild')
        # Build output must exist before capturing the tree that the tests consume.
        result['evidence'] = evidence.snapshot(ROOT, 'local')
        for name, command in commands:
            run_check(name, command)
        evidence.verify_snapshot(ROOT, result['evidence'], 'local')
        result['status'] = 'passed'
    except Exception as error:
        result['status'], result['error'] = 'failed', str(error)
    result['hashes'] = {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
                        for path in sorted(list((ROOT / 'core').glob('*.mbt')) + list((ROOT / 'dist').glob('*.mjs')))}
    result['finishedAt'] = datetime.now(timezone.utc).isoformat()
    save()
    return 0 if result['status'] == 'passed' else 1


if __name__ == '__main__':
    raise SystemExit(main())
