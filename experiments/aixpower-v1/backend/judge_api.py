"""Optional FastAPI reference endpoint; not integration-tested in this environment.
Run only on localhost: uvicorn backend.judge_api:app --host 127.0.0.1 --port 8010
Requires fastapi, uvicorn; optional laya installed separately.
"""
import os
import secrets
import threading
from fastapi import FastAPI, Header, HTTPException
from backend.judge import LocalLaya, fuse, validate_state

app=FastAPI(title='AIxPOWER Judge v0.1 — shadow only')
_model=None
_lock=threading.Lock()

@app.post('/v1/judge')
def judge(state:dict, authorization:str=Header(default='')):
    key=os.environ.get('AIXPOWER_JUDGE_API_KEY','')
    if not key:
        raise HTTPException(503,'Judge API disabled: server key not configured')
    if not secrets.compare_digest(authorization,'Bearer '+key):
        raise HTTPException(403,'Forbidden')
    try:
        validate_state(state)
    except (ValueError,KeyError,TypeError) as exc:
        raise HTTPException(422,str(exc))
    advice=None
    if os.environ.get('AIXPOWER_LAYA_ENABLED')=='1':
        global _model
        # Serialize loading AND inference in this reference. Add bounded workers
        # and request limits before serving untrusted/multi-tenant traffic.
        with _lock:
            try:
                if _model is None:
                    _model=LocalLaya(os.environ.get('AIXPOWER_LAYA_PATH',''))
                advice=_model.predict(state)
            except Exception:
                # Inference failure provides no model advice; policy remains closed.
                advice={'status':'UNAVAILABLE','fallback':'RULES_AND_HUMAN'}
    return fuse(state,advice)
