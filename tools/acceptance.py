#!/usr/bin/env python3
"""Unpack the actual ZIP into a fresh directory, validate it, and rebuild there.

Writes only release/acceptance.json (outside the archive) so its recorded ZIP hash
continues to identify the exact tested artifact. Never reuses a previous extraction.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    archive = ROOT / 'release/LitmusLab-0.1.0.zip'
    base = ROOT / '.acceptance'
    base.mkdir(exist_ok=True)
    target = Path(tempfile.mkdtemp(prefix='unzip-', dir=base))
    rows = []
    report = {'status': 'running', 'generatedAt': datetime.now(timezone.utc).isoformat(),
              'archive': archive.name, 'archiveSha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
              'freshDirectory': str(target.relative_to(ROOT)), 'checks': rows}
    try:
        with zipfile.ZipFile(archive) as z:
            for member in z.infolist():
                path = (target / member.filename).resolve()
                if target not in path.parents:
                    raise AssertionError('Unsafe archive member')
            z.extractall(target)
        copy = target / 'LitmusLab-0.1.0'
        manifest_count = 0
        for line in (copy / 'MANIFEST.sha256').read_text().splitlines():
            digest, name = line.split('  ', 1)
            assert hashlib.sha256((copy / name).read_bytes()).hexdigest() == digest, name
            manifest_count += 1
        rows.append({'name': 'archive-manifest', 'passed': True, 'files': manifest_count})
        assert not (copy / '.tools').exists()
        assert not (copy / '_build').exists()
        assert not (copy / 'node_modules').exists()
        rows.append({'name': 'no-copied-toolchain-or-build-cache', 'passed': True})

        def run(name, command, expected=0, env=None, json_output=False):
            done = subprocess.run(command, cwd=copy, text=True, capture_output=True, env=env, timeout=120)
            row = {'name': name, 'command': command, 'expectedExitCode': expected,
                   'exitCode': done.returncode, 'passed': done.returncode == expected,
                   'stdoutTail': done.stdout[-1600:], 'stderrTail': done.stderr[-1600:]}
            rows.append(row)
            assert row['passed'], name + ': ' + done.stderr[-1000:]
            return json.loads(done.stdout) if json_output else done

        result = run('packaged-cli-SC-TSO', ['node', 'bin/litmuslab.mjs', 'analyze', 'examples/store-buffering.litmus', '--model', 'both'], json_output=True)
        assert result['results']['SC']['stats']['outcomes'] == 3
        assert result['results']['TSO']['stats']['outcomes'] == 4
        witness = result['results']['TSO']['outcomes'][0]['witness']
        run('packaged-cli-replay', ['node', 'bin/litmuslab.mjs', 'replay', 'examples/store-buffering.litmus', '--model', 'TSO', '--witness', witness])
        limited = run('packaged-cli-incomplete', ['node', 'bin/litmuslab.mjs', 'analyze', 'examples/store-buffering.litmus', '--max-states', '1'], expected=3, json_output=True)
        assert limited['status'] == 'incomplete' and limited['comparison']['definitive'] is False
        run('packaged-reference-unittests', ['python3', '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_reference.py'])
        run('packaged-crosscheck', ['python3', 'tools/crosscheck.py'])
        run('packaged-recorded-oracle-comparison', ['node', 'tools/oracle-compare.mjs'])
        before = hashlib.sha256((copy / 'dist/engine.raw.mjs').read_bytes()).hexdigest()
        # A compiler is intentionally external to the ZIP. All project input is
        # the clean extraction; the compiler's core library is a fixed dependency.
        compiler = ROOT / '.tools/moon'
        if not (compiler / 'bin/moon').is_file():
            raise RuntimeError('Source-rebuild acceptance requires the pinned local compiler; run tools/bootstrap.py')
        env = dict(os.environ, MOON_HOME=str(compiler), PATH=str(compiler / 'bin') + os.pathsep + os.environ.get('PATH', ''))
        env['MOON_CACHE_DIR'] = str(target / 'moon-cache')
        # Python ZipFile does not restore executable mode; run the wrapper with sh
        # on first extraction and restore only the tracked executable files.
        for script in ['tools/moon', 'tools/build.sh', 'bin/litmuslab.mjs']:
            (copy / script).chmod((copy / script).stat().st_mode | 0o111)
        run('clean-source-rebuild', ['sh', 'tools/build.sh'], env=env)
        after = hashlib.sha256((copy / 'dist/engine.raw.mjs').read_bytes()).hexdigest()
        assert before == after, 'Clean build artifact differs from packaged core'
        rows.append({'name': 'reproducible-MoonBit-JS', 'passed': True, 'sha256': after})
        run('clean-MoonBit-tests', ['sh', 'tools/moon', 'test', '--target', 'js'], env=env)
        report['status'] = 'passed'
    except Exception as error:
        report['status'] = 'failed'
        report['error'] = str(error)
        raise
    finally:
        report['finishedAt'] = datetime.now(timezone.utc).isoformat()
        (ROOT / 'release/acceptance.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': report['status'], 'archiveSha256': report['archiveSha256'], 'checks': len(rows)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
