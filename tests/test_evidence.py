"""Regression tests for stale evidence, archive binding, and rebuild coverage."""
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import acceptance
import evidence
import summarize


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        base = ROOT / '.acceptance'
        base.mkdir(exist_ok=True)
        self.directory = tempfile.TemporaryDirectory(prefix='evidence-test-', dir=base)
        self.root = Path(self.directory.name)
        files = {'package.json': json.dumps({'version': '0.2.0'}), 'core/example.mbt': 'core',
                 'dist/engine.mjs': 'wrapper', 'dist/engine.raw.mjs': 'compiled',
                 'tools/evidence.py': 'evidence', 'tools/reference.py': 'reference',
                 'web/app.mjs': 'app', 'bin/litmuslab.mjs': 'cli', 'reports/oracle-herd7.json': '{}',
                 'reports/node-version.txt': 'v20', 'reports/moon-version.txt': 'pinned moon',
                 'release/LitmusLab-0.2.0.zip': 'first archive'}
        for name, content in files.items():
            self.write(name, content)
        for backend in ['js', 'native', 'wasm-gc']:
            self.write(f'reports/verification-logs/moon-test-{backend}.txt', 'Total tests: 1, passed: 1, failed: 0')
        engine = {name: evidence.sha256(self.root / 'dist' / name) for name in ['engine.mjs', 'engine.raw.mjs']}
        self.producers = {
            'local': ('reports/local-verification.json', {'status': 'passed', 'checks': []}),
            'crosscheck': ('reports/crosscheck.json', {'summary': {'status': 'passed'}, 'engineSha256': engine['engine.mjs'], 'rawEngineSha256': engine['engine.raw.mjs']}),
            'oracle': ('reports/oracle-comparison.json', {'all_matched': True, 'cases': 12, 'passed': 12, 'oracle_version': 'test', 'engine_sha256': engine['engine.mjs'], 'raw_engine_sha256': engine['engine.raw.mjs']}),
            'oracle-generated': ('reports/oracle-generated.json', {'all_matched': True, 'expected_runs': 72, 'runs_count': 72, 'passed': 72, 'program_count': 36}),
            'interfaces': ('reports/interfaces.json', {'passed': 1, 'failed': 0}),
            'browser': ('reports/browser-optimization.json', {'passed': 1, 'failed': 0, 'viewports': [390]}),
            'performance': ('reports/performance.json', {'status': 'passed', 'scope': 'synthetic fixture', 'samplesPerVariant': 5,
                            'engineHashes': {'candidate': engine}, 'cases': [{'name': 'fixture', 'sameSearchOutput': True, 'medians': {}, 'timeRatio': 1, 'rssRatio': 1}]}),
        }
        for profile in self.producers:
            self.refresh(profile)
        self.write_json('reports/oracle-moonctl.json', {'version': 'test', 'runs': [{'matched': True}]})
        self.clean = {'status': 'passed', 'inputTree': evidence.snapshot(self.root, 'local'),
                      'archive': 'LitmusLab-0.2.0.zip', 'archiveSha256': evidence.sha256(self.root / 'release/LitmusLab-0.2.0.zip'),
                      'checks': [{'name': 'synthetic fixture', 'passed': True}]}
        self.write_json('release/acceptance.json', self.clean)

    def tearDown(self):
        self.directory.cleanup()

    def write(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)

    def write_json(self, name, value):
        self.write(name, json.dumps(value))

    def refresh(self, profile):
        name, data = self.producers[profile]
        self.write_json(name, {**data, 'evidence': evidence.snapshot(self.root, profile)})

    def test_complete_bound_summary_does_not_attest_embedded_archive(self):
        result = summarize.assemble(self.root)
        self.assertEqual(result['status'], 'passed')
        self.assertEqual(result['version'], '0.2.0')
        self.assertTrue(result['cleanCopy']['sourceTreeVerified'])
        self.assertFalse(result['cleanCopy']['embeddedReportClaimsExactArchive'])

    def test_crosscheck_cannot_reuse_old_reference_evidence(self):
        self.write('tools/reference.py', 'changed reference')
        self.refresh('local')
        with self.assertRaisesRegex(evidence.EvidenceError, 'crosscheck'):
            summarize.assemble(self.root)

    def test_old_browser_pass_cannot_gain_new_web_hashes(self):
        self.write('web/app.mjs', 'changed app')
        self.refresh('local')
        self.refresh('interfaces')
        with self.assertRaisesRegex(evidence.EvidenceError, 'browser'):
            summarize.assemble(self.root)

    def test_interface_evidence_covers_cli(self):
        self.write('bin/litmuslab.mjs', 'changed CLI')
        self.refresh('local')
        with self.assertRaisesRegex(evidence.EvidenceError, 'interfaces'):
            summarize.assemble(self.root)

    def test_oracle_evidence_covers_upstream_recorded_output(self):
        self.write('reports/oracle-herd7.json', '{"changed":true}')
        with self.assertRaisesRegex(evidence.EvidenceError, 'oracle'):
            summarize.assemble(self.root)

    def test_generated_oracle_evidence_covers_added_fixtures(self):
        self.write('tests/oracle-generated/new.litmuslab', 'memory x=0\nthread A\nend')
        self.refresh('local')
        with self.assertRaisesRegex(evidence.EvidenceError, 'oracle-generated'):
            summarize.assemble(self.root)

    def test_performance_must_use_current_candidate(self):
        name, data = self.producers['performance']
        data['engineHashes']['candidate']['engine.raw.mjs'] = '0' * 64
        self.refresh('performance')
        with self.assertRaisesRegex(evidence.EvidenceError, 'Performance'):
            summarize.assemble(self.root)

    def test_archive_change_preserves_only_source_tree_proof(self):
        self.write('release/LitmusLab-0.2.0.zip', 'different archive with same runtime inputs')
        binding = evidence.acceptance_binding(self.root, self.clean)
        self.assertTrue(binding['sourceTreeVerified'])
        self.assertFalse(binding['exactArchiveVerified'])
        result = summarize.assemble(self.root)
        self.assertFalse(result['cleanCopy']['embeddedReportClaimsExactArchive'])
        self.assertEqual(result['cleanCopy']['sourceEvidenceReason'], 'input-tree-current-archive-not-attested')

    def test_changed_inputs_invalidate_old_clean_pass(self):
        self.write('tools/new-runtime-tool.py', 'new input')
        binding = evidence.acceptance_binding(self.root, self.clean)
        self.assertFalse(binding['sourceTreeVerified'])
        self.assertFalse(binding['exactArchiveVerified'])

    def test_legacy_clean_pass_without_input_binding_is_rejected(self):
        self.assertFalse(evidence.acceptance_binding(self.root, {'status': 'passed'})['sourceTreeVerified'])

    def test_new_and_deleted_inputs_are_detected(self):
        before = evidence.snapshot(self.root, 'local')
        self.write('core/new.mbt', 'new input')
        with self.assertRaisesRegex(evidence.EvidenceError, 'added'):
            evidence.verify_snapshot(self.root, before)
        (self.root / 'core/new.mbt').unlink()
        (self.root / 'core/example.mbt').unlink()
        with self.assertRaisesRegex(evidence.EvidenceError, 'removed'):
            evidence.verify_snapshot(self.root, before)

    def test_documentation_reports_archives_and_caches_do_not_self_invalidate(self):
        before = evidence.snapshot(self.root, 'local')
        for name in ['docs/note.md', 'reports/changed.json', 'release/new.zip', '.tools/bin/new', '_build/new', '.acceptance/new', 'tools/__pycache__/x.pyc']:
            self.write(name, 'output or excluded input')
        self.assertEqual(evidence.verify_snapshot(self.root, before)['digest'], before['digest'])

    def test_recorded_digest_and_profile_cannot_be_relabelled(self):
        before = evidence.snapshot(self.root, 'browser')
        with self.assertRaises(evidence.EvidenceError):
            evidence.verify_snapshot(self.root, before, 'interfaces')
        before['digest'] = '0' * 64
        with self.assertRaisesRegex(evidence.EvidenceError, 'digest'):
            evidence.verify_snapshot(self.root, before)

    def test_public_wrapper_change_is_a_rebuild_failure_even_when_raw_matches(self):
        with self.assertRaisesRegex(AssertionError, 'engine.mjs'):
            acceptance.verify_rebuild({'engine.mjs': 'old', 'engine.raw.mjs': 'same'},
                                      {'engine.mjs': 'new', 'engine.raw.mjs': 'same'})

    def test_manifest_requires_exact_coverage(self):
        isolated = self.root / 'manifest-case'
        isolated.mkdir()
        (isolated / 'tracked').write_text('tracked')
        (isolated / 'MANIFEST.sha256').write_text(evidence.sha256(isolated / 'tracked') + '  tracked\n')
        self.assertEqual(acceptance.verify_manifest(isolated), 1)
        (isolated / 'unlisted').write_text('unlisted')
        with self.assertRaisesRegex(AssertionError, 'exactly'):
            acceptance.verify_manifest(isolated)


if __name__ == '__main__':
    unittest.main()
