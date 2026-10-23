#!/usr/bin/env python3
"""Summarize current input evidence; exact final ZIP attestation stays external."""
from datetime import datetime, timezone
import json
from pathlib import Path
import platform
import re
from evidence import EvidenceError, acceptance_binding, project_version, sha256, verify_snapshot
ROOT = Path(__file__).resolve().parents[1]


def read(root, name):
    return json.loads((root / name).read_text())


def bound_report(root, name, profile):
    report = read(root, name)
    try:
        verify_snapshot(root, report.get('evidence'), profile)
    except EvidenceError as error:
        raise EvidenceError(f'{name}: {error}') from error
    return report


def assemble(root=ROOT):
    root = Path(root).resolve()
    version = project_version(root)
    browser_name = ('reports/browser-optimization.json' if (root / 'reports/browser-optimization.json').is_file() else 'reports/browser.json')
    sources = {'local': ('reports/local-verification.json', 'local'),
               'cross': ('reports/crosscheck.json', 'crosscheck'),
               'oracle': ('reports/oracle-comparison.json', 'oracle'),
               'generated': ('reports/oracle-generated.json', 'oracle-generated'),
               'interfaces': ('reports/interfaces.json', 'interfaces'),
               'browser': (browser_name, 'browser'),
               'performance': ('reports/performance.json', 'performance')}
    has_experiments = tuple(map(int, version.split('-')[0].split('.'))) >= (0, 3, 0)
    if has_experiments:
        sources['experiments'] = ('reports/experiments.json', 'experiments')
    data = {key: bound_report(root, name, profile) for key, (name, profile) in sources.items()}
    local, cross, oracle, generated, interfaces, browser, performance = (data[key] for key in ['local', 'cross', 'oracle', 'generated', 'interfaces', 'browser', 'performance'])
    moonctl = read(root, 'reports/oracle-moonctl.json')
    for name, key, oracle_key in [('engine.mjs', 'engineSha256', 'engine_sha256'), ('engine.raw.mjs', 'rawEngineSha256', 'raw_engine_sha256')]:
        current = sha256(root / 'dist' / name)
        if cross.get(key) != current or oracle.get(oracle_key) != current:
            raise EvidenceError(f'Cross-check or oracle comparison executed a different {name}')
        if performance.get('engineHashes', {}).get('candidate', {}).get(name) != current:
            raise EvidenceError(f'Performance evidence executed a different candidate {name}')
    clean = read(root, 'release/acceptance.json') if (root / 'release/acceptance.json').exists() else None
    binding = acceptance_binding(root, clean)
    flags = [local['status'] == 'passed', cross['summary']['status'] == 'passed',
             oracle['all_matched'] and oracle['cases'] == oracle['passed'] == 12,
             generated['all_matched'] and generated['expected_runs'] == generated['runs_count'] == generated['passed'] > 0,
             interfaces['failed'] == 0, browser['failed'] == 0,
             all(item['matched'] for item in moonctl['runs']),
             performance['status'] == 'passed' and all(item['sameSearchOutput'] for item in performance['cases'])]
    if has_experiments:
        flags.append(data['experiments']['status'] == 'passed' and data['experiments']['failed'] == 0)
    core_counts = {}
    for backend in ['js', 'native', 'wasm-gc']:
        log = (root / f'reports/verification-logs/moon-test-{backend}.txt').read_text()
        found = re.search(r'Total tests: (\d+), passed: (\d+), failed: (\d+)', log)
        if not found:
            raise EvidenceError('Missing MoonBit test count for ' + backend)
        core_counts[backend] = dict(zip(['total', 'passed', 'failed'], map(int, found.groups())))
        flags.append(core_counts[backend]['failed'] == 0)
    status = 'passed' if all(flags) and binding['sourceTreeVerified'] else 'awaiting-clean-copy' if all(flags) else 'failed'
    return {
        'schemaVersion': 2, 'project': 'LitmusLab', 'version': version,
        'verifiedAt': datetime.now(timezone.utc).isoformat(), 'status': status,
        'scope': 'Current finite SC/TSO inputs and clean source tree; exact final ZIP requires the external attestation',
        'platform': {'system': platform.system(), 'machine': platform.machine(), 'python': platform.python_version(),
                     'node': (root / 'reports/node-version.txt').read_text().strip(), 'moon': (root / 'reports/moon-version.txt').read_text().splitlines()},
        'checks': local['checks'], 'moonbitTests': core_counts,
        'independentCrosscheck': {**cross['summary'], 'evidence': 'reports/crosscheck.json', 'externalOracle': False},
        'externalOracle': {'tool': 'herd7', 'version': oracle['oracle_version'], 'passed': oracle['passed'], 'cases': oracle['cases'],
                           'allMatched': oracle['all_matched'], 'evidence': 'reports/oracle-comparison.json', 'realHardware': False},
        'generatedExternalOracle': {'passed': generated['passed'], 'runs': generated['runs_count'], 'programs': generated['program_count'],
                                   'allMatched': generated['all_matched'], 'coverage': generated.get('coverage', {}), 'evidence': 'reports/oracle-generated.json'},
        'neighbor': {'tool': 'MoonCTL', 'version': moonctl['version'], 'allRunsMatched': all(item['matched'] for item in moonctl['runs']),
                     'evidence': 'reports/oracle-moonctl.json', 'memoryModelOracle': False,
                     'scope': 'Recorded separate neighbor run; does not verify the current LitmusLab engine'},
        'interfaces': {'passed': interfaces['passed'], 'failed': interfaces['failed'], 'evidence': 'reports/interfaces.json'},
        'browser': {'passed': browser['passed'], 'failed': browser['failed'], 'viewports': browser.get('viewports', []),
                    'evidence': browser_name, 'inputDigest': browser['evidence']['digest']},
        'performance': {'scope': performance['scope'], 'samplesPerVariant': performance['samplesPerVariant'], 'evidence': 'reports/performance.json',
                        'cases': [{key: item[key] for key in ['name', 'sameSearchOutput', 'medians', 'timeRatio', 'rssRatio']} for item in performance['cases']]},
        'cleanCopy': {'status': 'passed' if binding['sourceTreeVerified'] else 'not-current', 'sourceTreeVerified': binding['sourceTreeVerified'],
                      'inputDigest': local['evidence']['digest'], 'sourceEvidenceReason': binding['reason'],
                      'method': 'Fresh extraction; exact manifest; public API/CLI; rebuild and compare wrapper plus raw engine; rerun public API/CLI',
                      'compiler': 'Pinned project-local external toolchain; build cache excluded from ZIP',
                      'embeddedReportClaimsExactArchive': False,
                      'finalArchiveAttestation': 'release/acceptance.json outside the ZIP; archiveSha256 must match the actual final ZIP',
                      'checksPassed': sum(bool(item['passed']) for item in clean.get('checks', [])) if binding['sourceTreeVerified'] else 0},
        'inputEvidence': local['evidence'],
        'hashes': {path.relative_to(root).as_posix(): sha256(path) for path in sorted(list((root / 'core').glob('*.mbt')) + list((root / 'dist').glob('*.mjs')))},
        'reportHashes': {name: sha256(root / name) for name, _ in sources.values()},
        'experiments': ({'passed': data['experiments']['passed'], 'failed': data['experiments']['failed'],
                         'evidence': 'reports/experiments.json'} if has_experiments else None),
        'changesInThisVersion': ['Action-specific persistent state copies and allocation reduction in state keys',
                                'Structured replay effects independently checked against pre-transition states',
                                'Generated external-oracle cases and fixed-workload performance measurements',
                                'Stale evidence rejected; clean-copy acceptance compares both engine modules'] + (
                                ['MoonBit target reachability queries with three-valued verdicts',
                                 'Fence insertion comparison with separate set and single-witness conclusions'] if has_experiments else []),
        'notTested': ['This version: Linux and Windows execution', 'This version: GitHub-hosted CI execution', 'Real CPU hardware outcomes',
                      'Full x86, ARM, RISC-V, C/C++ memory models', 'Formal proof for every supported program'],
        'publication': {'currentVersionScope': version, 'recordedBeforePublication': True, 'currentVersionGithubPushed': False,
                        'mooncakesPublished': False, 'hostedWebsite': False, 'contestSubmitted': False, 'identityDeclarationMade': False,
                        'priorPublishedBaseline': {'version': '0.2.0', 'commit': '61f55b866a19854a0c074e13945dfc7bfdc6b4d0',
                                                   'repository': 'https://github.com/cjyhjy/moonbit-litmuslab',
                                                   'linuxCIRun': 'https://github.com/cjyhjy/moonbit-litmuslab/actions/runs/39980173271',
                                                   'source': 'GitHub API verified during 0.3.0 development',
                                                   'verifiesCurrentVersion': False}},
        'archive': {'path': f'release/LitmusLab-{version}.zip', 'checksums': 'release/SHA256SUMS',
                    'excludes': ['.tools', '_build', '.acceptance', '.ci-evidence', 'node_modules', 'release', '.git', 'reports/history']},
    }


def main(root=ROOT):
    report = assemble(root)
    (Path(root) / 'reports/verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': report['status'], 'path': 'reports/verification.json'}))
    return 0 if report['status'] in {'passed', 'awaiting-clean-copy'} else 1


if __name__ == '__main__':
    raise SystemExit(main())
