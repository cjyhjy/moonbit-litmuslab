#!/usr/bin/env python3
"""Unpack the actual ZIP into a fresh directory, validate it, and rebuild there.

Writes only release/acceptance.json (outside the archive) so its recorded ZIP hash
continues to identify the exact tested artifact. Never reuses a previous extraction.
"""
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
from datetime import datetime, timezone
import zipfile
from evidence import project_version, sha256, snapshot, verify_snapshot

ROOT = Path(__file__).resolve().parents[1]


def verify_manifest(copy):
    listed = set()
    for line in (copy / 'MANIFEST.sha256').read_text().splitlines():
        digest, name = line.split('  ', 1)
        path = copy / name
        if name in listed or Path(name).is_absolute() or '..' in Path(name).parts or path.is_symlink():
            raise AssertionError('Unsafe or duplicate manifest path: ' + name)
        if sha256(path) != digest:
            raise AssertionError('Manifest digest mismatch: ' + name)
        listed.add(name)
    actual = {path.relative_to(copy).as_posix() for path in copy.rglob('*')
              if path.is_file() and path.name != 'MANIFEST.sha256'}
    if listed != actual:
        raise AssertionError('Manifest does not cover exactly the archive files')
    return len(listed)


def engine_hashes(copy):
    return {name: sha256(copy / 'dist' / name) for name in ['engine.mjs', 'engine.raw.mjs']}


def verify_rebuild(before, after):
    if before != after:
        changed = [name for name in before if before.get(name) != after.get(name)]
        raise AssertionError('Clean build differs from packaged engine: ' + ', '.join(changed))


def main():
    name = 'LitmusLab-' + project_version(ROOT)
    archive = ROOT / 'release' / (name + '.zip')
    archive_bytes = archive.read_bytes()
    base = ROOT / '.acceptance'
    base.mkdir(exist_ok=True)
    target = Path(tempfile.mkdtemp(prefix='unzip-', dir=base))
    rows = []
    report = {'schemaVersion': 2, 'status': 'running', 'generatedAt': datetime.now(timezone.utc).isoformat(),
              'archive': archive.name, 'archiveSha256': hashlib.sha256(archive_bytes).hexdigest(),
              'freshDirectory': str(target.relative_to(ROOT)), 'checks': rows}
    try:
        with zipfile.ZipFile(io.BytesIO(archive_bytes)) as z:
            if len(set(z.namelist())) != len(z.namelist()):
                raise AssertionError('Duplicate archive member')
            for member in z.infolist():
                path = (target / member.filename).resolve()
                if target not in path.parents:
                    raise AssertionError('Unsafe archive member')
            z.extractall(target)
        copy = target / name
        if any(path.name != name for path in target.iterdir()):
            raise AssertionError('Archive has unexpected top-level entries')
        manifest_count = verify_manifest(copy)
        rows.append({'name': 'archive-manifest', 'passed': True, 'files': manifest_count})
        assert not (copy / '.tools').exists()
        assert not (copy / '_build').exists()
        assert not (copy / 'node_modules').exists()
        rows.append({'name': 'no-copied-toolchain-or-build-cache', 'passed': True})
        report['inputTree'] = snapshot(copy, 'local')

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
        run('packaged-independent-unittests', ['python3', '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py'])
        run('packaged-crosscheck', ['python3', 'tools/crosscheck.py'])
        run('packaged-recorded-oracle-comparison', ['node', 'tools/oracle-compare.mjs'])
        before = engine_hashes(copy)
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
        after = engine_hashes(copy)
        verify_rebuild(before, after)
        rows.append({'name': 'reproducible-public-wrapper-and-MoonBit-JS', 'passed': True, 'hashes': after})
        run('rebuilt-public-API-crosscheck', ['python3', 'tools/crosscheck.py'])
        rebuilt = run('rebuilt-public-CLI', ['node', 'bin/litmuslab.mjs', 'analyze', 'examples/store-buffering.litmus', '--model', 'both'], json_output=True)
        assert rebuilt['results']['SC']['stats']['outcomes'] == 3
        assert rebuilt['results']['TSO']['stats']['outcomes'] == 4
        run('clean-MoonBit-tests', ['sh', 'tools/moon', 'test', '--target', 'js'], env=env)
        verify_snapshot(copy, report['inputTree'], 'local')
        if sha256(archive) != report['archiveSha256']:
            raise AssertionError('Archive changed while acceptance was running')
        rows.append({'name': 'unchanged-tested-input-tree-and-archive', 'passed': True})
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
