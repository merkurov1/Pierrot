export type ChatMessageRole = 'user' | 'assistant';

export type ChatMessageStatus = 'complete' | 'pending' | 'error';

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
  status: ChatMessageStatus;
  provider?: string;
  model?: string;
  latencyMs?: number;
  errorCode?: string;
  /** The user text that should be retried when status === 'error'. */
  retryText?: string;
};

export type Conversation = {
  id: string;
  sessionId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

export function titleFromMessage(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Untitled conversation';

  const clipped = normalized.length > 52 ? `${normalized.slice(0, 51).trimEnd()}…` : normalized;
  return clipped;
}
