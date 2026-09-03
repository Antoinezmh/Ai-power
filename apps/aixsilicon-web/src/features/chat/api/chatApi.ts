import { api } from '@/lib/api';

export interface ToolSuggestion { id: string; name: string; description?: string; icon?: string; reason: string; }
export interface ChatReply { reply: string; mode: 'agent' | 'catalog'; suggestions: ToolSuggestion[]; }
export interface AgentConfig { provider: string; model: string; base_url: string; enabled: boolean; key_configured: boolean; updated_at?: string | null; }

export const chatApi = {
  send: (message: string) => api.post<ChatReply>('/api/v1/chat/', { message }),
  getConfig: () => api.get<AgentConfig>('/api/v1/chat/config'),
  saveConfig: (data: Omit<AgentConfig, 'key_configured' | 'updated_at'> & { api_key?: string }) => api.put<AgentConfig>('/api/v1/chat/config', data),
};
