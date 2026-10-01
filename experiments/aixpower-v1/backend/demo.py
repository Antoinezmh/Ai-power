import hashlib
import json
import tempfile
from pathlib import Path
from backend.engine import Engine, GateError


def task():
    return json.loads((Path(__file__).resolve().parents[1]/'contracts/task.example.json').read_text())


def evidence(ev_id='DEMO-E1', group='DEMO-source-1', tag='localization', validity='VALID', relation='SUPPORTS'):
    return {'id':ev_id, 'tag':tag, 'artifact_sha256':hashlib.sha256(b'SYNTHETIC DEMO SOURCE').hexdigest(), 'locator':{'page':1}, 'conditions':{'demo':True,'bias_V':600,'temperature_K':423.15}, 'dependency_group':group, 'validity':validity, 'quality':0.7, 'links':{'H1':{'relation':relation,'relevance':0.8}}}


if __name__ == '__main__':
    with tempfile.TemporaryDirectory() as directory:
        engine = Engine(str(Path(directory)/'demo.sqlite'))
        engine.create(task())
        engine.add_evidence('HTRB-DEMO-001',evidence(),1)
        print(json.dumps(engine.evaluate('HTRB-DEMO-001'),ensure_ascii=False,indent=2))
        decision = engine.propose('HTRB-DEMO-001','engineer-demo','补采温变漏电，并核对完整测试条件；所有示例均为合成数据')
        approval = engine.approve(decision['id'],'reviewer-demo')
        print(json.dumps(engine.consume_review(approval['id']),ensure_ascii=False,indent=2))
        decision = engine.propose('HTRB-DEMO-001','engineer-demo','再次评审')
        approval = engine.approve(decision['id'],'reviewer-demo')
        engine.add_evidence('HTRB-DEMO-001',evidence('DEMO-E2',tag='temperature_dependence'),2)
        try:
            engine.consume_review(approval['id'])
        except GateError as exc:
            print('Expected blocked stale approval:',exc)
        engine.close()
