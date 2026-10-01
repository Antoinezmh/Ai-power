"""Fail-closed policy fusion. Optional Laya output is advisory, never approval."""
import json
import math
from pathlib import Path

SKILLS = ('reliability','tcad','device_design','process','wafer_map')
METRICS = {'BV_V':'V','Ron_mohm_cm2':'mOhm*cm^2','Eox_MV_cm':'MV/cm','Vth_V':'V','SCWT_us':'us'}


def validate_state(state):
    if state.get('schema_version') != 'engineering-state/v0.1':
        raise ValueError('unsupported state schema')
    for name in ('project_id','task_id','revision','observations','metrics','specs','evidence_ids','critical_missing','proposed_action'):
        if name not in state:
            raise ValueError('missing state field: '+name)
    if not isinstance(state['revision'],int) or state['revision']<1:
        raise ValueError('invalid revision')
    for key, entry in state['metrics'].items():
        if key not in METRICS or entry['unit'] != METRICS[key]:
            raise ValueError('unknown metric or wrong unit')
        if not isinstance(entry['value'],(int,float)) or isinstance(entry['value'],bool) or not math.isfinite(entry['value']):
            raise ValueError('nonfinite or invalid metric')
        if entry['value']<0 or not entry.get('conditions') or not entry.get('evidence_id') or entry['evidence_id'] not in state['evidence_ids']:
            raise ValueError('metric requires nonnegative value, conditions and evidence reference')
    for key, limits in state['specs'].items():
        if key not in METRICS or limits.get('unit') != METRICS[key] or not limits.get('rule_version'):
            raise ValueError('invalid spec rule')
        if not any(k in limits for k in ('min','max')):
            raise ValueError('empty spec')
        for bound in ('min','max'):
            if bound in limits and (not isinstance(limits[bound],(int,float)) or not math.isfinite(limits[bound])):
                raise ValueError('invalid spec bound')
        if 'min' in limits and 'max' in limits and limits['min']>limits['max']:
            raise ValueError('inverted spec bounds')
    return state


def rules(state):
    validate_state(state)
    failures, missing = [], list(state['critical_missing'])
    if not state['evidence_ids']:
        missing.append('no_evidence')
    if not state['specs']:
        missing.append('no_spec_rules')
    for key, limits in state['specs'].items():
        item = state['metrics'].get(key)
        if item is None:
            missing.append(key)
            continue
        # Condition compatibility is explicit. No numeric comparison across conditions.
        if not limits.get('conditions') or item['conditions'] != limits['conditions']:
            missing.append(key+':condition_match')
            continue
        value=item['value']
        if ('min' in limits and value<limits['min']) or ('max' in limits and value>limits['max']):
            failures.append({'metric':key,'value':value,'rule_version':limits['rule_version']})
    return {'verdict':'FAIL' if failures else 'UNKNOWN' if missing else 'PASS','failures':failures,'missing':sorted(set(missing))}


def questions():
    q={
      'next_focus':{'type':'choice','instructions':'Which investigation should be prioritized next? This is investigation priority, not root-cause probability.','criteria':{'A':'termination-related investigation','B':'oxide-related investigation','C':'contamination-related investigation','D':'interface-related investigation','U':'insufficient information or other mechanism'}},
      'review_priority':{'type':'score','instructions':'Rate urgency for expert review using only observed evidence.','criteria':['routine review','prompt review required','urgent review required']},
      'needs_escalation':{'type':'noul','instructions':'Does this case need expert review because evidence is missing, conflicting, or outside the declared spec?'}
    }
    for skill in SKILLS:
        q['route_'+skill]={'type':'noul','instructions':f'Is the {skill} capability needed to investigate this case?'}
    return q


class LocalLaya:
    def __init__(self, checkpoint_path):
        # No automatic remote model selection/download by this wrapper.
        path=Path(checkpoint_path).resolve()
        if not path.is_dir() or not (path/'rl_agent_config.json').is_file():
            raise ValueError('reviewed local Laya checkpoint required')
        import laya
        self.agent=laya.load(str(path))
        self.checkpoint_path=str(path)

    def predict(self,state):
        validate_state(state)
        return self.agent.predict(json.dumps(state,ensure_ascii=False,sort_keys=True),questions())


def fuse(state, model_result=None):
    result=rules(state)
    # A fail never becomes a pass by voting. Collecting data can still be proposed.
    if result['verdict']=='FAIL':
        gate='BLOCK_PROPOSAL_AND_ESCALATE'
    elif result['verdict']=='UNKNOWN':
        gate='ABSTAIN_AND_REQUEST_EVIDENCE'
    else:
        gate='HUMAN_REVIEW_REQUIRED'
    return {'schema_version':'judge-result/v0.1','rule_result':result,'gate':gate,
      'model_advice':model_result,'model_probability_calibrated_for_sic':False,
      'policy_version':'shadow-only/v0.1','auto_execute':False,
      'limits':['No model confidence grants permission.','Production adapters disabled.','Rules and input conditions require expert approval.']}
