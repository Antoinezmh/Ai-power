import tempfile
import unittest
from pathlib import Path
from backend.engine import Engine, GateError
from backend.demo import task, evidence


class EngineTests(unittest.TestCase):
    def setUp(self):
        self.e = Engine()
        self.e.create(task())

    def tearDown(self):
        self.e.close()

    def test_empty_abstains(self):
        self.assertEqual(self.e.evaluate('HTRB-DEMO-001')['verdict'],'UNKNOWN')

    def test_duplicate_family_not_double_counted(self):
        self.e.add_evidence('HTRB-DEMO-001',evidence(),1)
        score = self.e.evaluate('HTRB-DEMO-001')['hypothesis_ranking'][0]['ranking_score']
        self.e.add_evidence('HTRB-DEMO-001',evidence('E2'),2)
        self.assertEqual(self.e.evaluate('HTRB-DEMO-001')['hypothesis_ranking'][0]['ranking_score'],score)

    def test_unknown_does_not_fill_required(self):
        self.e.add_evidence('HTRB-DEMO-001',evidence(validity='UNKNOWN'),1)
        self.assertIn('localization',self.e.evaluate('HTRB-DEMO-001')['missing'])

    def test_conflicting_family_flagged(self):
        self.e.add_evidence('HTRB-DEMO-001',evidence(),1)
        self.e.add_evidence('HTRB-DEMO-001',evidence('E2',relation='CONTRADICTS'),2)
        r = self.e.evaluate('HTRB-DEMO-001')
        self.assertTrue(r['hypothesis_ranking'][0]['within_group_conflict'])
        self.assertEqual(r['verdict'],'UNKNOWN')

    def test_revision_conflict(self):
        with self.assertRaises(GateError):
            self.e.add_evidence('HTRB-DEMO-001',evidence(),4)
        self.assertEqual(self.e.get_task('HTRB-DEMO-001')['revision'],1)

    def test_self_approval_blocked(self):
        d = self.e.propose('HTRB-DEMO-001','a','collect')
        with self.assertRaises(GateError):
            self.e.approve(d['id'],'a')

    def test_change_invalidates_approval(self):
        d = self.e.propose('HTRB-DEMO-001','a','collect')
        a = self.e.approve(d['id'],'b')
        self.e.add_evidence('HTRB-DEMO-001',evidence(),1)
        with self.assertRaises(GateError):
            self.e.consume_review(a['id'])

    def test_single_use_and_no_execution(self):
        d = self.e.propose('HTRB-DEMO-001','a','collect')
        a = self.e.approve(d['id'],'b')
        self.assertFalse(self.e.consume_review(a['id'])['external_execution'])
        with self.assertRaises(GateError):
            self.e.consume_review(a['id'])

    def test_expired(self):
        d = self.e.propose('HTRB-DEMO-001','a','collect')
        a = self.e.approve(d['id'],'b')
        a['expires_at']=0
        with self.e.db:
            self.e._save('approvals',a)
        with self.assertRaises(GateError):
            self.e.consume_review(a['id'])

    def test_production_disabled(self):
        with self.assertRaises(GateError):
            self.e.propose('HTRB-DEMO-001','a','release','MASK_RELEASE')

    def test_persistence(self):
        with tempfile.TemporaryDirectory() as d:
            path = str(Path(d)/'state.sqlite')
            first = Engine(path)
            first.create(task())
            first.add_evidence('HTRB-DEMO-001',evidence(),1)
            first.close()
            second = Engine(path)
            self.assertEqual(second.get_task('HTRB-DEMO-001')['revision'],2)
            second.close()

    def test_nan_rejected(self):
        ev=evidence(); ev['quality']=float('nan')
        with self.assertRaises(GateError):
            self.e.add_evidence('HTRB-DEMO-001',ev,1)
