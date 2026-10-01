"""Contract smoke test ONLY, not a model accuracy benchmark."""
import json
from pathlib import Path
from backend.judge import fuse

if __name__=='__main__':
    rows=[json.loads(s) for s in (Path(__file__).resolve().parents[1]/'benchmarks/htrb-format.example.jsonl').read_text().splitlines()]
    matches=sum(fuse(r['state'])['gate']==r['labels']['gate'] for r in rows)
    print(json.dumps({'evaluation':'synthetic-policy-contract-only','cases':len(rows),'matches':matches,'laya_inference_run':False,'sic_model_accuracy':None}))
