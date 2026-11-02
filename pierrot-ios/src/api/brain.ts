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

export type BrainSourcePreview = {
  kind: 'url' | 'pdf' | 'txt' | 'text';
  title: string;
  author: string | null;
  publishedAt: string | null;
  language: string;
  canonicalUrl: string | null;
  normalizedUrl: string;
  storagePath: string | null;
  sourceSha256: string;
  chunkCount: number;
  wordCount: number;
  excerpt: string;
  headings: string[];
  warnings: string[];
  duplicate: {
    status: string;
    documentId: string;
    title: string;
    match: string;
  } | null;
};

export type BrainEnqueueResult = {
  status: string;
  run: { id: string; status: string } | null;
  jobs: { id: string; status: string; input_url: string }[];
  progress: unknown;
  rows: { status: string; reason?: string; input?: string }[];
  skipped: { reason?: string; input?: string }[];
  nextUrl: string | null;
};

export function previewBrainText(
  token: string,
  text: string
): Promise<{ status: string; preview: BrainSourcePreview }> {
  return apiRequest('/api/admin/brain/preview', {
    method: 'POST',
    token,
    timeoutMs: 60_000,
    body: { kind: 'text', text },
  });
}

export function enqueueBrainText(
  token: string,
  preview: BrainSourcePreview
): Promise<BrainEnqueueResult> {
  return apiRequest('/api/admin/brain/sources', {
    method: 'POST',
    token,
    timeoutMs: 60_000,
    body: {
      sources: [
        {
          kind: 'text',
          storagePath: preview.storagePath,
          sourceSha256: preview.sourceSha256,
          title: preview.title,
        },
      ],
      recheckExisting: false,
    },
  });
}
