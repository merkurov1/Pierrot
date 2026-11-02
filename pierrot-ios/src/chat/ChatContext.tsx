import React from 'react';
import * as Crypto from 'expo-crypto';

import type { ChatMessage, Conversation } from '@/chat/types';
import { titleFromMessage } from '@/chat/types';
import {
  clearStoredConversations,
  deleteStoredConversation,
  loadConversations,
  saveConversation,
} from '@/chat/storage';

type ChatContextValue = {
  conversations: Conversation[];
  activeId: string | null;
  activeConversation: Conversation | null;
  setActiveId: (id: string | null) => void;
  startNewConversation: () => void;
  createConversation: (firstText?: string) => Conversation;
  appendMessage: (conversationId: string, message: ChatMessage) => void;
  updateMessage: (
    conversationId: string,
    messageId: string,
    patch: Partial<ChatMessage>
  ) => void;
  renameConversation: (conversationId: string, title: string) => void;
  setPinned: (conversationId: string, pinned: boolean) => void;
  upsertConversation: (conversation: Conversation) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  deleteConversation: (id: string) => void;
  clearConversations: () => void;
};

const ChatContext = React.createContext<ChatContextValue | null>(null);

function newConversation(firstText?: string): Conversation {
  const now = new Date().toISOString();

  return {
    id: Crypto.randomUUID(),
    sessionId: Crypto.randomUUID(),
    title: firstText ? titleFromMessage(firstText) : 'New conversation',
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function ChatProvider({ children }: React.PropsWithChildren) {
  const [conversations, setConversations] = React.useState<Conversation[]>(() =>
    loadConversations()
  );
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const createConversation = React.useCallback((firstText?: string) => {
    const conversation = newConversation(firstText);

    setConversations((current) => [conversation, ...current]);
    saveConversation(conversation);
    setActiveId(conversation.id);

    return conversation;
  }, []);

  const startNewConversation = React.useCallback(() => {
    setActiveId(null);
  }, []);

  const appendMessage = React.useCallback((conversationId: string, message: ChatMessage) => {
    setConversations((current) => {
      const conversation = current.find((item) => item.id === conversationId);
      if (!conversation) return current;

      const next: Conversation = {
        ...conversation,
        title:
          conversation.messages.length === 0 && message.role === 'user'
            ? titleFromMessage(message.content)
            : conversation.title,
        updatedAt: new Date().toISOString(),
        messages: [...conversation.messages, message],
      };

      saveConversation(next);

      return [next, ...current.filter((item) => item.id !== conversationId)];
    });
  }, []);

  const updateMessage = React.useCallback(
    (conversationId: string, messageId: string, patch: Partial<ChatMessage>) => {
      setConversations((current) => {
        const conversation = current.find((item) => item.id === conversationId);
        if (!conversation) return current;

        const next: Conversation = {
          ...conversation,
          updatedAt: new Date().toISOString(),
          messages: conversation.messages.map((message) =>
            message.id === messageId ? { ...message, ...patch } : message
          ),
        };

        saveConversation(next);

        return [next, ...current.filter((item) => item.id !== conversationId)];
      });
    },
    []
  );

  const renameConversation = React.useCallback((conversationId: string, title: string) => {
    setConversations((current) => {
      const conversation = current.find((item) => item.id === conversationId);
      if (!conversation) return current;
      const next: Conversation = {
        ...conversation,
        title: title.trim().slice(0, 120) || conversation.title,
        updatedAt: new Date().toISOString(),
      };
      saveConversation(next);
      return [next, ...current.filter((item) => item.id !== conversationId)];
    });
  }, []);

  const setPinned = React.useCallback((conversationId: string, pinned: boolean) => {
    setConversations((current) => {
      const conversation = current.find((item) => item.id === conversationId);
      if (!conversation) return current;
      const next: Conversation = { ...conversation, pinned, updatedAt: new Date().toISOString() };
      saveConversation(next);
      return [next, ...current.filter((item) => item.id !== conversationId)];
    });
  }, []);

  const upsertConversation = React.useCallback((conversation: Conversation) => {
    setConversations((current) => {
      const next = [conversation, ...current.filter((item) => item.id !== conversation.id)];
      saveConversation(conversation);
      return next;
    });
  }, []);

  const removeMessage = React.useCallback((conversationId: string, messageId: string) => {
    setConversations((current) => {
      const conversation = current.find((item) => item.id === conversationId);
      if (!conversation) return current;

      const next: Conversation = {
        ...conversation,
        updatedAt: new Date().toISOString(),
        messages: conversation.messages.filter((message) => message.id !== messageId),
      };

      saveConversation(next);

      return current.map((item) => (item.id === conversationId ? next : item));
    });
  }, []);

  const deleteConversation = React.useCallback(
    (id: string) => {
      deleteStoredConversation(id);
      setConversations((current) => current.filter((item) => item.id !== id));
      setActiveId((current) => (current === id ? null : current));
    },
    []
  );

  const clearConversations = React.useCallback(() => {
    clearStoredConversations();
    setConversations([]);
    setActiveId(null);
  }, []);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeId) ?? null;

  const value = React.useMemo<ChatContextValue>(
    () => ({
      conversations,
      activeId,
      activeConversation,
      setActiveId,
      startNewConversation,
      createConversation,
      appendMessage,
      updateMessage,
      renameConversation,
      setPinned,
      upsertConversation,
      removeMessage,
      deleteConversation,
      clearConversations,
    }),
    [
      conversations,
      activeId,
      activeConversation,
      startNewConversation,
      createConversation,
      appendMessage,
      updateMessage,
      renameConversation,
      setPinned,
      upsertConversation,
      removeMessage,
      deleteConversation,
      clearConversations,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const value = React.useContext(ChatContext);

  if (!value) {
    throw new Error('useChat must be used inside ChatProvider.');
  }

  return value;
}
