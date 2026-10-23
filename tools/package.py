#!/usr/bin/env python3
"""Build a local, dependency-free runtime/source archive with a content manifest."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
EXCLUDE = {'.ci-evidence', '.tools', '_build', 'release', '.acceptance', '.git', 'node_modules', '__pycache__', '.DS_Store'}
NAME = 'LitmusLab-' + json.loads((ROOT / 'package.json').read_text())['version']


def files():
    for path in sorted(ROOT.rglob('*')):
        relative = path.relative_to(ROOT)
        if relative.parts[:2] == ('reports', 'history') or any(part in EXCLUDE for part in relative.parts) or path.is_dir():
            continue
        if path.is_symlink():
            raise ValueError('Archive refuses symlink: ' + str(relative))
        if path.suffix in {'.pyc', '.pyo'} or relative.name == 'MANIFEST.sha256':
            continue
        yield relative, path


def main():
    paths = list(files())
    release = ROOT / 'release'
    release.mkdir(exist_ok=True)
    manifest = ''.join(hashlib.sha256(path.read_bytes()).hexdigest() + '  ' + relative.as_posix() + '\n'
                       for relative, path in paths)
    target = release / (NAME + '.zip')
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for relative, path in paths:
            info = zipfile.ZipInfo(NAME + '/' + relative.as_posix(), date_time=(2026, 10, 22, 0, 0, 0))
            info.external_attr = (path.stat().st_mode & 0o777) << 16
            archive.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
        archive.writestr(NAME + '/MANIFEST.sha256', manifest)
    checksum = hashlib.sha256(target.read_bytes()).hexdigest()
    (release / 'SHA256SUMS').write_text(checksum + '  ' + target.name + '\n')
    print(f'{target.name}: {len(paths)} files, {target.stat().st_size} bytes, SHA-256 {checksum}')


if __name__ == '__main__':
    main()
