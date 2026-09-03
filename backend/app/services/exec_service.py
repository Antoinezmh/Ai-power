import asyncio
import uuid


class ExecService:
    _processes = {}
    @classmethod
    async def start_executable(cls, tool, user_id):
        if not getattr(tool, 'source', None): raise ValueError('Executable source is not configured')
        process_id = uuid.uuid4().hex; cls._processes[process_id] = {'status': 'running', 'process_id': process_id, 'user_id': user_id}; return process_id
    @classmethod
    async def get_status(cls, process_id): return cls._processes.get(process_id, {'status': 'not_found', 'process_id': process_id})
    @classmethod
    async def stop_executable(cls, process_id):
        if process_id not in cls._processes: return False
        cls._processes[process_id]['status'] = 'stopped'; return True
