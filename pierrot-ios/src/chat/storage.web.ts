import type { Conversation } from '@/chat/types';

/**
 * Web-only fallback.
 *
 * SQLite is the native transcript store. The browser preview is not a target
 * platform for this app, so its archive is intentionally in-memory only rather
 * than writing personal transcripts to localStorage.
 */
let memory: Conversation[] = [];

export function loadConversations(): Conversation[] {
  return memory.map((conversation) => ({ ...conversation, messages: [...conversation.messages] }));
}

export function saveConversation(conversation: Conversation): void {
  memory = [conversation, ...memory.filter((item) => item.id !== conversation.id)];
}

export function deleteStoredConversation(id: string): void {
  memory = memory.filter((conversation) => conversation.id !== id);
}

export function clearStoredConversations(): void {
  memory = [];
}
