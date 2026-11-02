import { apiRequest } from '@/api/client';
import type { HealthResponse } from '@/api/types';

export function getHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/api/health', { timeoutMs: 10_000 });
}
