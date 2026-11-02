/**
 * Wire contracts for the existing newlove backend.
 *
 * These types mirror the real JSON produced by:
 *   POST /api/pierrot-web
 *   POST /api/admin/brain/research
 *   GET  /api/admin/brain/graph
 *   GET  /api/flow/items
 *   GET  /api/auth/me
 *   GET  /api/health
 *
 * They are deliberately permissive where the server returns optional
 * presentation metadata. No client type is treated as an authorization
 * boundary.
 */

export type PierrotConsentState = 'pending' | 'granted' | 'denied';

export type PierrotConsent = {
  state: PierrotConsentState;
  version: string | null;
};

export type PierrotHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
  offerId?: string;
  commercialMarker?: string;
};

export type RagEvidenceSource = {
  documentId: string;
  documentTitle: string;
  sourceType: string;
  sourceClass: string;
  sourceDomain: string | null;
  author: string | null;
  publishedAt: string | null;
  chunkId: string;
  heading: string;
  sectionPath: string[];
  sectionIndex: number;
  lineStart: number;
  lineEnd: number;
  similarity: number;
  excerpt: string;
  canonicalUrl: string | null;
  verificationStatus: string;
};

export type RagResult = {
  mode: 'unframed' | 'media' | 'public';
  outcome: string;
  sources: RagEvidenceSource[];
};

export type PierrotResponse = {
  reply: string;
  provider?: 'gemini' | 'deepseek' | 'openrouter';
  model?: string;
  latencyMs?: number;
  fallbackUsed?: boolean;
  admin?: boolean;
  rag?: RagResult;
  conversationId: string;
  sessionId: string;
  userMessageId: string;
  assistantMessageId?: string;
  recorded?: boolean;
  replayed?: boolean;
  humanMode?: boolean;
  humanUnavailable?: boolean;
  human?: {
    requestId: string;
    status: 'pending' | 'active' | 'declined' | 'expired' | 'closed';
    language?: string;
    createdAt?: string | null;
    expiresAt?: string | null;
  } | null;
  brain_url_preview?: boolean;
  brain_url_kind?: string;
  brain_url_pipeline?: string;
  brain_url_status?: string;
  brain_document_id?: string;
  brain_run_id?: string;
  error?: string;
  code?: string;
  retryAfter?: number;
};

export type BrainCitation = {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  heading: string;
  sectionPath: string[];
  similarity: number | null;
  publishedAt: string | null;
  sourceType: string | null;
};

export type BrainEntity = {
  id: string;
  name: string;
  type: string;
  description: string | null;
};

export type BrainRelationship = {
  source: string;
  target: string;
  relation: string;
  confidence: number;
  inference: boolean;
  document_id: string;
  document_title: string | null;
  chunk_id: string;
  evidence: string;
};

export type BrainResearchResponse = {
  status: string;
  answer: string;
  citations: BrainCitation[];
  entities: BrainEntity[];
  relationships: BrainRelationship[];
  retrieval: {
    outcome: string;
    documentIds: string[];
    chunkIds: string[];
    latencyMs: number;
  };
  graphContext: {
    matchedEntities: number;
    matchedRelationships: number;
    summaries: number;
  };
  caveat: string;
};

export type BrainGraphNode = {
  id: string;
  kind: string;
  label: string;
  subtitle: string | null;
  documentId?: string;
  entityId?: string;
  sourceType?: string;
  publishedAt?: string | null;
  mentionCount?: number;
  confidence?: number;
};

export type BrainGraphResponse = {
  status: string;
  nodes: BrainGraphNode[];
  edges: {
    id: string;
    source: string;
    target: string;
    relation: string;
    label: string;
    confidence: number;
    inference: boolean;
  }[];
  stats: {
    documents: number;
    entities: number;
    relationships: number;
    mentions: number;
    shownNodes: number;
    shownEdges: number;
  };
};

export type FlowItem = {
  id: string;
  title: string | null;
  slug: string | null;
  lang: string;
  type: string;
  status: string;
  visibility: string;
  body_md?: string | null;
  source_url?: string | null;
  metadata?: Record<string, unknown> | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  bluesky_uri?: string | null;
  telegram_message_id?: string | number | null;
};

export type FlowItemsResponse = {
  items: FlowItem[];
  hasMore: boolean;
  total: number;
  nextOffset: number;
};

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

export type AuthMeResponse = {
  user: AuthUser | null;
  roles: string[];
  isAdmin: boolean;
};

export type HealthResponse = {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  checks: {
    database: boolean;
    supabase: boolean;
    env: boolean;
  };
  details?: { duration?: number };
};
