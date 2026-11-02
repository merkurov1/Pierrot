import { apiRequest } from '@/api/client';
import type { BrainGraphResponse, BrainResearchResponse } from '@/api/types';

/**
 * Owner-only Brain research. The server verifies the Supabase bearer token
 * and its ADMIN role; the mobile client never sees a database credential.
 */
export function askBrain(question: string, token: string): Promise<BrainResearchResponse> {
  return apiRequest<BrainResearchResponse>('/api/admin/brain/research', {
    method: 'POST',
    token,
    timeoutMs: 125_000,
    body: { question },
  });
}

export function getBrainGraph(token: string, query = ''): Promise<BrainGraphResponse> {
  const search = new URLSearchParams({ limit: '120' });
  if (query.trim()) search.set('q', query.trim());

  return apiRequest<BrainGraphResponse>(`/api/admin/brain/graph?${search.toString()}`, {
    token,
    timeoutMs: 30_000,
  });
}
