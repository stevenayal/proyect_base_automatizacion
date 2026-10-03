"""Regresiones del reporte: evitar resultados verdes falsos."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('report', Path(__file__).with_name('semana06-report.py'))
report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)

class ReportTests(unittest.TestCase):
    def parse(self, steps, before=None, after=None, uri='grupos/grupo-01-autenticacion-acceso/features/semana-06/test.feature'):
        element = {'type':'scenario', 'name':'Caso <seguro> & fiel',
                   'steps':[{'result':{'status':s}} for s in steps],
                   'before':before or [], 'after':after or []}
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/'result.json'
            path.write_text(json.dumps([{'uri':uri,'elements':[element]}]))
            return report.parse_cucumber_json(path)

    def test_all_passed(self):
        self.assertEqual(self.parse(['passed'])['passed'], 1)

    def test_partial_skipped_is_not_passed(self):
        stats=self.parse(['passed','skipped'])
        self.assertEqual((stats['passed'],stats['skipped']), (0,1))
        self.assertEqual(report.get_verdict(stats)[1], 'warn')

    def test_undefined_ambiguous_pending_unknown_fail(self):
        for status in ('undefined','ambiguous','pending','unknown'):
            with self.subTest(status=status):
                self.assertEqual(self.parse(['passed',status])['failed'],1)

    def test_failed_hooks(self):
        for hook in ('before','after'):
            stats=self.parse(['passed'], **{hook:[{'result':{'status':'failed','error_message':'Hook roto'}}]})
            self.assertEqual(stats['failed'],1)
            self.assertEqual(stats['scenarios'][0]['errors'], ['Hook roto'])

    def test_empty_is_not_success(self):
        self.assertEqual(self.parse([])['passed'],0)
        self.assertEqual(report.get_verdict({'total':0})[1],'warn')

    def test_hidden_cucumber_hooks_excluded_from_step_count(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp)/'result.json'
            path.write_text(json.dumps([{'uri':'grupos/x/features/semana-06/test.feature',
                'elements':[{'type':'scenario','steps':[
                    {'hidden':True,'keyword':'After','result':{'status':'failed'}},
                    {'name':'Paso','result':{'status':'passed'}}]}]}]))
            stats=report.parse_cucumber_json(path)
            self.assertEqual(stats['steps'], {'passed':1})
            self.assertEqual(stats['failed'],1)

    def test_rejects_lab(self):
        with self.assertRaises(ValueError):
            self.parse(['passed'],uri='features/LAB-LOGIN-001.feature')

if __name__ == '__main__':
    unittest.main()
