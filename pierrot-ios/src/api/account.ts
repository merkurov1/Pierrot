import { apiRequest } from '@/api/client';
import type { AuthMeResponse } from '@/api/types';

export function getMe(token: string): Promise<AuthMeResponse> {
  return apiRequest<AuthMeResponse>('/api/auth/me', {
    token,
    timeoutMs: 12_000,
  });
}
