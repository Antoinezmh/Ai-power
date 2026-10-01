"""Synchronous, local reference only; actors are NOT authenticated principals."""
import copy
import hashlib
import json
import math
import sqlite3
import time
import uuid


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False)


def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


class GateError(ValueError):
    pass


class Engine:
    def __init__(self, path=':memory:'):
        self.db = sqlite3.connect(path)
        self.db.execute('CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, data TEXT NOT NULL)')
        self.db.execute('CREATE TABLE IF NOT EXISTS decisions(id TEXT PRIMARY KEY, data TEXT NOT NULL)')
        self.db.execute('CREATE TABLE IF NOT EXISTS approvals(id TEXT PRIMARY KEY, data TEXT NOT NULL)')
        self.db.execute('CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, task_id TEXT, event TEXT, payload TEXT)')
        self.db.commit()

    def close(self):
        self.db.close()

    def _get(self, table, key):
        row = self.db.execute(f'SELECT data FROM {table} WHERE id=?', (key,)).fetchone()
        if not row:
            raise GateError('not found')
        return json.loads(row[0])

    def _save(self, table, data):
        self.db.execute(f'INSERT OR REPLACE INTO {table}(id,data) VALUES (?,?)', (data['id'], canonical(data)))

    def _event(self, task_id, event, payload):
        self.db.execute('INSERT INTO events(task_id,event,payload) VALUES (?,?,?)', (task_id, event, canonical(payload)))

    def create(self, task):
        task = copy.deepcopy(task)
        if not task.get('demo') or not task.get('hypotheses'):
            raise GateError('reference implementation requires demo data and hypotheses')
        if self.db.execute('SELECT 1 FROM tasks WHERE id=?', (task['id'],)).fetchone():
            raise GateError('duplicate task')
        task['revision'] = 1
        task['evidence'] = []
        task['state'] = 'READY'
        with self.db:
            self._save('tasks', task)
            self._event(task['id'], 'TASK_CREATED', {'revision': 1})
        return task

    def get_task(self, task_id):
        return self._get('tasks', task_id)

    def add_evidence(self, task_id, evidence, expected_revision):
        ev = copy.deepcopy(evidence)
        for k in ('id','tag','artifact_sha256','locator','conditions','dependency_group','validity','quality','links'):
            if k not in ev:
                raise GateError(f'missing evidence field: {k}')
        if len(ev['artifact_sha256']) != 64 or any(c not in '0123456789abcdef' for c in ev['artifact_sha256']):
            raise GateError('invalid source hash')
        if ev['validity'] not in ('VALID','UNKNOWN','RETRACTED'):
            raise GateError('invalid validity')
        if not isinstance(ev['quality'], (float,int)) or not math.isfinite(ev['quality']) or not 0 <= ev['quality'] <= 1:
            raise GateError('invalid quality')
        if not ev['dependency_group'] or not ev['locator'] or not ev['conditions']:
            raise GateError('source group, locator and conditions required')
        self.db.execute('BEGIN IMMEDIATE')
        try:
            task = self.get_task(task_id)
            if task['revision'] != expected_revision:
                raise GateError('revision conflict')
            if any(e['id'] == ev['id'] for e in task['evidence']):
                raise GateError('duplicate evidence id')
            hypothesis_ids = {h['id'] for h in task['hypotheses']}
            for h, link in ev['links'].items():
                if h not in hypothesis_ids or link['relation'] not in ('SUPPORTS','CONTRADICTS','NEUTRAL','UNKNOWN'):
                    raise GateError('invalid hypothesis link')
                if not math.isfinite(link['relevance']) or not 0 <= link['relevance'] <= 1:
                    raise GateError('invalid relevance')
            task['evidence'].append(ev)
            task['revision'] += 1
            task['state'] = 'READY'
            self._save('tasks', task)
            self._event(task_id, 'EVIDENCE_ADDED', {'id': ev['id'], 'revision': task['revision']})
            self.db.commit()
            return task
        except Exception:
            self.db.rollback()
            raise

    def evaluate(self, task_id):
        task = self.get_task(task_id)
        ranking = []
        available = {e['tag'] for e in task['evidence'] if e['validity'] == 'VALID'}
        missing = sorted(set(task['required_evidence']) - available)
        for h in task['hypotheses']:
            groups, support, against, unknown = {}, [], [], []
            for ev in task['evidence']:
                link = ev['links'].get(h['id'])
                if not link:
                    continue
                if ev['validity'] != 'VALID' or link['relation'] == 'UNKNOWN':
                    unknown.append(ev['id'])
                    continue
                g = groups.setdefault(ev['dependency_group'], [0.0,0.0])
                weight = ev['quality'] * link['relevance']
                if link['relation'] == 'SUPPORTS':
                    g[0] = max(g[0], weight)
                    support.append(ev['id'])
                elif link['relation'] == 'CONTRADICTS':
                    g[1] = max(g[1], weight)
                    against.append(ev['id'])
            raw = sum(a-b for a,b in groups.values())
            ranking.append({'hypothesis_id': h['id'], 'ranking_score': round(max(-1,min(1,raw)),4), 'supporting': support, 'contradicting': against, 'unknown': unknown, 'independent_groups': len(groups), 'within_group_conflict': any(a>0 and b>0 for a,b in groups.values())})
        ranking.sort(key=lambda r: r['ranking_score'], reverse=True)
        conflict = any(r['within_group_conflict'] for r in ranking)
        # This reference NEVER confirms a mechanism, even if all required tags exist.
        return {'task_revision': task['revision'], 'policy_version':'evidence-score/v0-demo', 'verdict':'UNKNOWN' if missing or conflict else 'PASS', 'mechanism_state':'UNASSESSED', 'missing': missing, 'hypothesis_ranking': ranking, 'probability_calibrated':False}

    def propose(self, task_id, proposer, action, kind='COLLECT_EVIDENCE'):
        if kind not in ('COLLECT_EVIDENCE','ANALYSIS_PROPOSAL'):
            raise GateError('production actions disabled')
        self.db.execute('BEGIN IMMEDIATE')
        try:
            task = self.get_task(task_id)
            snapshot = {'task':task, 'evaluation':self.evaluate(task_id), 'proposer':proposer, 'proposal':{'kind':kind,'action':action}, 'skill_version':'htrb_rca/0.1-demo', 'target':'NO_EXTERNAL_EXECUTION'}
            decision = {'id': str(uuid.uuid4()), 'task_id': task_id, 'task_revision':task['revision'], 'snapshot':snapshot, 'snapshot_hash':digest(snapshot)}
            self._save('decisions',decision)
            self._event(task_id,'DECISION_PROPOSED',{'decision_id':decision['id'],'hash':decision['snapshot_hash']})
            self.db.commit()
            return decision
        except Exception:
            self.db.rollback()
            raise

    def _current(self, decision):
        task = self.get_task(decision['task_id'])
        if task['revision'] != decision['task_revision'] or digest(task) != digest(decision['snapshot']['task']):
            raise GateError('stale decision: task changed')
        if digest(decision['snapshot']) != decision['snapshot_hash']:
            raise GateError('snapshot integrity failure')

    def approve(self, decision_id, reviewer, ttl=3600):
        if not reviewer or not math.isfinite(ttl) or ttl <= 0:
            raise GateError('invalid approval')
        self.db.execute('BEGIN IMMEDIATE')
        try:
            d = self._get('decisions',decision_id)
            self._current(d)
            if reviewer == d['snapshot']['proposer']:
                raise GateError('self approval forbidden')
            approval = {'id':str(uuid.uuid4()), 'decision_id':decision_id, 'snapshot_hash':d['snapshot_hash'], 'reviewer':reviewer, 'expires_at':time.time()+ttl, 'consumed':False}
            self._save('approvals',approval)
            self._event(d['task_id'],'APPROVED',{'approval_id':approval['id'],'reviewer':reviewer})
            self.db.commit()
            return approval
        except Exception:
            self.db.rollback()
            raise

    def consume_review(self, approval_id):
        """Consume a reviewed proposal locally. DOES NOT execute any external action."""
        self.db.execute('BEGIN IMMEDIATE')
        try:
            a = self._get('approvals',approval_id)
            d = self._get('decisions',a['decision_id'])
            self._current(d)
            if a['consumed'] or a['expires_at'] <= time.time() or a['snapshot_hash'] != d['snapshot_hash']:
                raise GateError('approval consumed, expired or mismatched')
            a['consumed'] = True
            self._save('approvals',a)
            self._event(d['task_id'],'REVIEW_CONSUMED_NO_EXECUTION',{'approval_id':approval_id})
            self.db.commit()
            return {'status':'REVIEWED','external_execution':False,'proposal':d['snapshot']['proposal']}
        except Exception:
            self.db.rollback()
            raise
