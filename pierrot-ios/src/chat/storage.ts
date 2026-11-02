import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

import type { Conversation } from '@/chat/types';

/**
 * Local transcript cache.
 *
 * SQLite is used deliberately instead of AsyncStorage: chat transcripts are
 * personal data and should not sit in the generic key/value store. Auth tokens
 * live separately in the iOS Keychain via expo-secure-store.
 *
 * The database file is inside the app sandbox and receives the platform's
 * default file protection. Stronger at-rest encryption is tracked in TODO.md.
 */
let database: SQLite.SQLiteDatabase | null = null;

function getDatabase(): SQLite.SQLiteDatabase | null {
  if (Platform.OS === 'web') return null;

  if (!database) {
    database = SQLite.openDatabaseSync('pierrot-conversations.db');
    database.execSync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY NOT NULL,
        updated_at TEXT NOT NULL,
        payload TEXT NOT NULL
      );
    `);
  }

  return database;
}

function reviveConversation(raw: string): Conversation | null {
  try {
    const parsed = JSON.parse(raw) as Conversation;

    if (!parsed?.id || !parsed?.sessionId || !Array.isArray(parsed.messages)) {
      return null;
    }

    const messages = parsed.messages.map((message) =>
      message.status === 'pending'
        ? {
            ...message,
            status: 'error' as const,
            errorCode: 'INTERRUPTED',
            content: '',
            retryText: message.retryText ?? '',
          }
        : message
    );

    return { ...parsed, messages };
  } catch {
    return null;
  }
}

export function loadConversations(): Conversation[] {
  try {
    const db = getDatabase();
    if (!db) return [];

    const rows = db.getAllSync<{ payload: string }>(
      'SELECT payload FROM conversations ORDER BY updated_at DESC'
    );

    return rows
      .map((row) => reviveConversation(row.payload))
      .filter((value): value is Conversation => Boolean(value));
  } catch {
    return [];
  }
}

export function saveConversation(conversation: Conversation): void {
  try {
    const db = getDatabase();
    if (!db) return;

    db.runSync(
      `INSERT INTO conversations (id, updated_at, payload)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         updated_at = excluded.updated_at,
         payload = excluded.payload`,
      conversation.id,
      conversation.updatedAt,
      JSON.stringify(conversation)
    );
  } catch {
    // Local persistence must never break the conversation itself.
  }
}

export function deleteStoredConversation(id: string): void {
  try {
    getDatabase()?.runSync('DELETE FROM conversations WHERE id = ?', id);
  } catch {
    // Ignore.
  }
}

export function clearStoredConversations(): void {
  try {
    getDatabase()?.runSync('DELETE FROM conversations');
  } catch {
    // Ignore.
  }
}
