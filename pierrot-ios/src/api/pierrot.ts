import { apiRequest } from '@/api/client';
import type {
  PierrotConsent,
  PierrotHistoryItem,
  PierrotResponse,
} from '@/api/types';

export type SendPierrotInput = {
  message: string;
  conversationId: string;
  sessionId: string;
  userMessageId: string;
  history: PierrotHistoryItem[];
  consent: PierrotConsent;
  mode?: 'site' | 'unframed';
  token?: string | null;
  signal?: AbortSignal;
};

/**
 * The one real Pierrot chat endpoint used by merkurov.love.
 *
 * It is a JSON request/response route (no SSE, no chunked streaming). The
 * server enforces rate limits, consent, owner-scope RAG and human takeover
 * before it calls Gemini -> DeepSeek -> OpenRouter.
 */
export function sendPierrot(input: SendPierrotInput): Promise<PierrotResponse> {
  return apiRequest<PierrotResponse>('/api/pierrot-web', {
    method: 'POST',
    token: input.token,
    signal: input.signal,
    timeoutMs: 65_000,
    body: {
      message: input.message,
      conversationId: input.conversationId,
      sessionId: input.sessionId,
      userMessageId: input.userMessageId,
      consent: input.consent,
      ...(input.mode ? { mode: input.mode } : {}),
      context: {
        pathname: '/',
        referrer: 'pierrot-ios',
      },
      history: input.history,
    },
  });
}

export const PIERROT_MAX_MESSAGE_LENGTH = 4000;
export const PIERROT_HISTORY_ITEMS = 24;
