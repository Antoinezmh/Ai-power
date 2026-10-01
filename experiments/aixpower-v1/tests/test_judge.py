import copy
import json
import unittest
from pathlib import Path
from backend.judge import fuse, questions, validate_state, LocalLaya

ROWS=[json.loads(line) for line in (Path(__file__).resolve().parents[1]/'benchmarks/htrb-format.example.jsonl').read_text().splitlines()]

class JudgeTests(unittest.TestCase):
    def test_synthetic_contract_cases(self):
        for row in ROWS:
            self.assertEqual(fuse(row['state'])['gate'],row['labels']['gate'])

    def test_high_confidence_cannot_override_rule(self):
        out=fuse(ROWS[1]['state'],{'confidence':0.999,'recommendation':'PASS'})
        self.assertEqual(out['rule_result']['verdict'],'FAIL')
        self.assertFalse(out['auto_execute'])

    def test_passing_numbers_never_authorize_release(self):
        s=copy.deepcopy(ROWS[0]['state']); s['critical_missing']=[]; s['proposed_action']={'kind':'PRODUCTION_RELEASE'}
        out=fuse(s,{'confidence':1})
        self.assertEqual(out['gate'],'HUMAN_REVIEW_REQUIRED')
        self.assertFalse(out['auto_execute'])

    def test_condition_mismatch_abstains(self):
        s=copy.deepcopy(ROWS[0]['state']); s['critical_missing']=[]
        s['metrics']['BV_V']['conditions']['temperature_K']=448.15
        self.assertEqual(fuse(s)['rule_result']['verdict'],'UNKNOWN')

    def test_wrong_unit_rejected(self):
        s=copy.deepcopy(ROWS[0]['state']); s['metrics']['BV_V']['unit']='mV'
        with self.assertRaises(ValueError): validate_state(s)

    def test_missing_evidence_reference_rejected(self):
        s=copy.deepcopy(ROWS[0]['state']); s['evidence_ids']=[]
        with self.assertRaises(ValueError): validate_state(s)

    def test_no_automatic_model_download(self):
        with self.assertRaises(ValueError): LocalLaya('/nonexistent-aixpower-model')

    def test_router_uses_independent_questions(self):
        q=questions()
        self.assertEqual(q['route_reliability']['type'],'noul')
        self.assertEqual(q['next_focus']['type'],'choice')
