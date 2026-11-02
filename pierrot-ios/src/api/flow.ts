import { apiRequest } from '@/api/client';
import type { FlowItemsResponse } from '@/api/types';

export function getFlowItems(limit = 12, offset = 0): Promise<FlowItemsResponse> {
  return apiRequest<FlowItemsResponse>(
    `/api/flow/items?limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(
      String(offset)
    )}`,
    { timeoutMs: 20_000 }
  );
}
