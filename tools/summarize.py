#!/usr/bin/env python3
"""Assemble current local evidence without inventing publication or CI status."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import platform
import re

ROOT = Path(__file__).resolve().parents[1]


def read(name):
    return json.loads((ROOT / name).read_text())


def main():
    local = read('reports/local-verification.json')
    cross = read('reports/crosscheck.json')
    oracle = read('reports/oracle-comparison.json')
    interfaces = read('reports/interfaces.json')
    browser = read('reports/browser.json')
    moonctl = read('reports/oracle-moonctl.json')
    clean_path = ROOT / 'release/acceptance.json'
    clean = read('release/acceptance.json') if clean_path.exists() else None
    flags = [local['status'] == 'passed', cross['summary']['status'] == 'passed',
             oracle['all_matched'] and oracle['cases'] == 12,
             interfaces['failed'] == 0, browser['failed'] == 0,
             all(x['matched'] for x in moonctl['runs'])]
    core_counts = {}
    for backend in ['js', 'native', 'wasm-gc']:
        log = (ROOT / f'reports/verification-logs/moon-test-{backend}.txt').read_text()
        found = re.search(r'Total tests: (\d+), passed: (\d+), failed: (\d+)', log)
        if not found:
            raise ValueError('Missing MoonBit test count for ' + backend)
        core_counts[backend] = dict(zip(['total', 'passed', 'failed'], map(int, found.groups())))
    source_hashes = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
                     for p in sorted(list((ROOT / 'core').glob('*.mbt')) + list((ROOT / 'dist').glob('*.mjs')))}
    verified_hashes = local['hashes']
    if source_hashes != verified_hashes:
        raise ValueError('Source or compiled engine changed since verification; rerun tools/verify.py')
    browser_files = [ROOT / 'web' / name for name in ['app.mjs', 'engine-worker.mjs', 'index.html', 'style.css']]
    status = 'passed' if all(flags) and clean and clean['status'] == 'passed' else 'awaiting-clean-copy' if all(flags) else 'failed'
    report = {
        'schemaVersion': 1, 'project': 'LitmusLab', 'version': '0.1.0',
        'verifiedAt': datetime.now(timezone.utc).isoformat(), 'status': status,
        'scope': 'Local finite SC/TSO implementation and reproducible artifact; no hardware experiment or publication claim',
        'platform': {'system': platform.system(), 'machine': platform.machine(),
                     'python': platform.python_version(), 'node': (ROOT / 'reports/node-version.txt').read_text().strip(),
                     'moon': (ROOT / 'reports/moon-version.txt').read_text().splitlines()},
        'checks': local['checks'], 'moonbitTests': core_counts,
        'independentCrosscheck': {**cross['summary'], 'evidence': 'reports/crosscheck.json', 'externalOracle': False},
        'externalOracle': {'tool': 'herd7', 'version': oracle['oracle_version'], 'passed': oracle['passed'],
                           'cases': oracle['cases'], 'allMatched': oracle['all_matched'],
                           'evidence': 'reports/oracle-comparison.json', 'realHardware': False},
        'neighbor': {'tool': 'MoonCTL', 'version': moonctl['version'], 'allRunsMatched': all(x['matched'] for x in moonctl['runs']),
                     'upstreamTests': 29, 'evidence': 'reports/oracle-moonctl.json', 'memoryModelOracle': False},
        'interfaces': {'passed': interfaces['passed'], 'failed': interfaces['failed'], 'evidence': 'reports/interfaces.json'},
        'browser': {'passed': browser['passed'], 'failed': browser['failed'], 'viewports': browser['viewports'],
                    'evidence': 'reports/browser.json', 'hashes': {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in browser_files}},
        'cleanCopy': {'status': clean['status'] if clean else 'not-run',
                      'method': 'Extract ZIP in a fresh directory, verify every manifest hash, run CLI/reference/oracle comparison, rebuild all MoonBit project sources, compare generated JS byte-for-byte',
                      'compiler': 'Pinned project-local external toolchain; no build cache is included in the ZIP',
                      'finalArchiveAttestation': 'release/acceptance.json (outside the ZIP, binds the exact final archive SHA-256)',
                      'checksPassed': sum(1 for x in clean['checks'] if x['passed']) if clean else 0},
        'hashes': source_hashes,
        'resolvedIssues': ['JavaScript NaN/fraction/string budget bypass blocked by public FFI wrapper',
                           'CLI non-regular FIFO input opened nonblocking and rejected',
                           '390px UI horizontal overflow fixed',
                           'herd7 source archive inherited unrelated ancestor Git revision; final verified source metadata generated explicitly'],
        'notTested': ['Linux and Windows execution', 'GitHub-hosted CI execution', 'Real CPU hardware outcomes',
                      'Full x86, ARM, RISC-V, C/C++ memory models', 'Formal proof for every supported program'],
        'publication': {'githubPushed': False, 'mooncakesPublished': False, 'hostedWebsite': False,
                        'contestSubmitted': False, 'identityDeclarationMade': False},
        'archive': {'path': 'release/LitmusLab-0.1.0.zip', 'checksums': 'release/SHA256SUMS',
                    'excludes': ['.tools', '_build', '.acceptance', 'node_modules', 'release', '.git']},
    }
    (ROOT / 'reports/verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': report['status'], 'path': 'reports/verification.json'}))


if __name__ == '__main__':
    main()
