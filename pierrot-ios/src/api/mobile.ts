import { apiRequest } from '@/api/client';

export type ServerConversationSummary = {
  id: string;
  title: string;
  status: string;
  pinned: boolean;
  archived: boolean;
  startedAt: string;
  lastMessageAt: string | null;
  messageCount: number;
  lastMessageRole: 'user' | 'assistant' | null;
  consentState: 'pending' | 'granted' | 'denied';
  transcriptAvailable: boolean;
  expiresAt: string | null;
};

export type ServerMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  provider: string | null;
};

export type ServerConversationDetail = ServerConversationSummary & {
  messages: ServerMessage[];
};

export type DecisionKind =
  | 'decision'
  | 'position'
  | 'preference'
  | 'constraint'
  | 'task'
  | 'rejected_recommendation';

export type DecisionStatus = 'current' | 'superseded' | 'rejected' | 'uncertain';

export type Decision = {
  id: string;
  conversationId: string | null;
  messageId: string | null;
  kind: DecisionKind;
  title: string;
  content: string;
  rationale: string | null;
  status: DecisionStatus;
  project: string | null;
  tags: string[];
  sourceRefs: unknown[];
  supersededBy: string | null;
  decidedAt: string | null;
  reviewAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DecisionCandidate = {
  kind: DecisionKind;
  title: string;
  content: string;
  rationale: string;
  status: 'current' | 'uncertain';
  source: {
    conversationId: string;
    messageId: string;
    role: 'user' | 'assistant';
    createdAt: string;
    quote: string;
  };
  confidence: number;
};

export type SearchScope =
  | 'brain'
  | 'media'
  | 'flow'
  | 'archive'
  | 'decisions'
  | 'github'
  | 'web';

export type SearchResultItem = {
  id: string;
  scope: SearchScope;
  type: string;
  title: string;
  subtitle: string | null;
  excerpt: string;
  url: string | null;
  deepLink: string;
  date: string | null;
  source: string;
  novelty: 'known' | 'new' | 'unknown';
  similarity: number | null;
};

export type SearchSourceResult = {
  scope: SearchScope;
  status: 'ok' | 'unavailable' | 'error';
  count: number;
  results: SearchResultItem[];
  code?: string;
};

export type UnifiedSearchResult = {
  query: string;
  routedScopes: SearchScope[];
  synthesis: string;
  partial: boolean;
  sources: SearchSourceResult[];
  generatedAt: string;
};

export type ProjectStatus = {
  generatedAt: string;
  cached: boolean;
  level: 'calm' | 'attention' | 'action';
  summary: string;
  reasons: { code: string; level: 'attention' | 'action'; message: string }[];
  dataGaps: string[];
  metrics: {
    conversations7d: number | null;
    conversationsPrevious7d: number | null;
    messages7d: number | null;
    brainDocuments: number | null;
    brainChunks: number | null;
    mediaRecords: number | null;
    mediaQuotes: number | null;
    flowPublished: number | null;
    users: number | null;
    activeSubscribers: number | null;
    archivedConversations: number | null;
    decisions: number | null;
    githubRepos: number | null;
  };
};

export type GitHubRepository = {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  description: string | null;
  htmlUrl: string;
  updatedAt: string | null;
  pushedAt: string | null;
};

export type GitHubTreeEntry = {
  path: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
  size: number | null;
};

export type GitHubFile = {
  path: string;
  ref: string;
  sha: string;
  size: number;
  htmlUrl: string | null;
  downloadUrl: string | null;
  content: string | null;
  binary: boolean;
  truncated: boolean;
};

export type GitHubCommit = {
  sha: string;
  message: string;
  authorName: string | null;
  authorLogin: string | null;
  date: string | null;
  htmlUrl: string | null;
};

export type GitHubDiff = {
  base: string;
  head: string;
  status: string;
  aheadBy: number;
  behindBy: number;
  files: {
    path: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch: string | null;
  }[];
  truncated: boolean;
};

export type GitHubCodeResult = {
  path: string;
  sha: string;
  htmlUrl: string | null;
  fragments: string[];
};

export type DevPrompt = {
  id: string;
  repository: string;
  baseRef: string;
  baseCommit: string | null;
  task: string;
  promptText: string;
  affectedFiles: string[];
  backendChanges: string[];
  mobileChanges: string[];
  migrations: string[];
  tests: string[];
  acceptanceCriteria: string[];
  securityConstraints: string[];
  unverified: string[];
  conversationId: string | null;
  decisionIds: string[];
  status: 'draft' | 'ready' | 'used' | 'verified' | 'failed';
  verificationStatus: 'not_run' | 'passed' | 'partial' | 'failed';
  verificationNotes: string | null;
  resultCommit: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function tokenHeader(token: string) {
  return token;
}

function query(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    search.set(key, String(value));
  }

  const value = search.toString();
  return value ? `?${value}` : '';
}

export function getProjectStatus(token: string, refresh = false): Promise<ProjectStatus> {
  return apiRequest<ProjectStatus>(`/api/mobile/overview${refresh ? '?refresh=1' : ''}`, {
    token,
    timeoutMs: 30_000,
  });
}

export function listServerConversations(
  token: string,
  params: { limit?: number; offset?: number; archived?: boolean; q?: string } = {}
): Promise<{
  items: ServerConversationSummary[];
  nextOffset: number | null;
  hasMore: boolean;
}> {
  return apiRequest(
    `/api/mobile/conversations${query({
      limit: params.limit ?? 30,
      offset: params.offset ?? 0,
      archived: params.archived ?? false,
      q: params.q,
    })}`,
    { token, timeoutMs: 20_000 }
  );
}

export function getServerConversation(
  token: string,
  id: string
): Promise<ServerConversationDetail> {
  return apiRequest(`/api/mobile/conversations/${encodeURIComponent(id)}`, {
    token,
    timeoutMs: 20_000,
  });
}

export function updateServerConversation(
  token: string,
  id: string,
  input: { title?: string; pinned?: boolean; archived?: boolean }
): Promise<ServerConversationSummary> {
  return apiRequest(`/api/mobile/conversations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    token,
    body: input,
  });
}

export function deleteServerConversation(token: string, id: string): Promise<{ ok: boolean }> {
  return apiRequest(`/api/mobile/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
}

export function importServerConversation(
  token: string,
  input: {
    conversationId: string;
    sessionId: string;
    title?: string;
    consent: 'granted';
    messages: { id: string; role: 'user' | 'assistant'; content: string }[];
  }
): Promise<{ conversationId: string; imported: number; skipped: number }> {
  return apiRequest('/api/mobile/conversations/import', {
    method: 'POST',
    token,
    timeoutMs: 30_000,
    body: input,
  });
}

export function listDecisions(
  token: string,
  params: { limit?: number; offset?: number; q?: string; kind?: string; status?: string } = {}
): Promise<{ items: Decision[]; hasMore: boolean; nextOffset: number | null }> {
  return apiRequest(
    `/api/mobile/decisions${query({
      limit: params.limit ?? 30,
      offset: params.offset ?? 0,
      q: params.q,
      kind: params.kind,
      status: params.status,
    })}`,
    { token }
  );
}

export function createDecision(
  token: string,
  input: {
    kind: DecisionKind;
    title: string;
    content: string;
    rationale?: string;
    status?: DecisionStatus;
    project?: string;
    tags?: string[];
    conversationId?: string;
    messageId?: string;
  }
): Promise<Decision> {
  return apiRequest('/api/mobile/decisions', {
    method: 'POST',
    token,
    body: input,
  });
}

export function updateDecision(
  token: string,
  id: string,
  input: Partial<{
    title: string;
    content: string;
    rationale: string;
    kind: DecisionKind;
    status: DecisionStatus;
    project: string;
    tags: string[];
    supersededBy: string;
  }>
): Promise<Decision> {
  return apiRequest(`/api/mobile/decisions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    token,
    body: input,
  });
}

export function deleteDecision(token: string, id: string): Promise<{ ok: boolean }> {
  return apiRequest(`/api/mobile/decisions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
}

export function extractDecisionCandidates(
  token: string,
  conversationId: string,
  messageIds?: string[]
): Promise<{ candidates: DecisionCandidate[]; note: string }> {
  return apiRequest('/api/mobile/decisions/extract', {
    method: 'POST',
    token,
    body: { conversationId, messageIds },
    timeoutMs: 20_000,
  });
}

export function unifiedSearch(
  token: string,
  input: { query: string; scopes?: SearchScope[]; limit?: number }
): Promise<UnifiedSearchResult> {
  return apiRequest('/api/mobile/search', {
    method: 'POST',
    token,
    timeoutMs: 30_000,
    body: input,
  });
}

export function getGitHubRepositories(token: string): Promise<{
  items: GitHubRepository[];
  unavailable: string[];
  generatedAt: string;
}> {
  return apiRequest('/api/mobile/github/repos', { token, timeoutMs: 30_000 });
}

export function getRepositoryTree(
  token: string,
  repo: string,
  ref = 'main',
  prefix?: string
): Promise<{ ref: string; entries: GitHubTreeEntry[]; truncated: boolean }> {
  return apiRequest(
    `/api/mobile/github/repos/${repo}/tree${query({ ref, prefix, limit: 500 })}`,
    { token, timeoutMs: 30_000 }
  );
}

export function getRepositoryFile(
  token: string,
  repo: string,
  path: string,
  ref = 'main'
): Promise<GitHubFile> {
  return apiRequest(`/api/mobile/github/repos/${repo}/file${query({ path, ref })}`, {
    token,
    timeoutMs: 30_000,
  });
}

export function getRepositoryCommits(
  token: string,
  repo: string,
  ref = 'main'
): Promise<{ commits: GitHubCommit[]; generatedAt: string }> {
  return apiRequest(`/api/mobile/github/repos/${repo}/commits${query({ ref, limit: 20 })}`, {
    token,
    timeoutMs: 30_000,
  });
}

export function getRepositoryDiff(
  token: string,
  repo: string,
  base = 'main',
  head = 'main'
): Promise<GitHubDiff> {
  return apiRequest(`/api/mobile/github/repos/${repo}/diff${query({ base, head })}`, {
    token,
    timeoutMs: 30_000,
  });
}

export function searchRepositoryCode(
  token: string,
  repo: string,
  q: string
): Promise<{ items: GitHubCodeResult[]; incomplete: boolean }> {
  return apiRequest(`/api/mobile/github/repos/${repo}/search${query({ q, limit: 20 })}`, {
    token,
    timeoutMs: 30_000,
  });
}

export function listDevPrompts(
  token: string,
  params: { limit?: number; offset?: number; repository?: string; status?: string } = {}
): Promise<{ items: DevPrompt[]; hasMore: boolean; nextOffset: number | null }> {
  return apiRequest(
    `/api/mobile/dev/prompts${query({
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
      repository: params.repository,
      status: params.status,
    })}`,
    { token }
  );
}

export function createDevPrompt(
  token: string,
  input: {
    repository: string;
    baseRef?: string;
    task: string;
    files?: string[];
    conversationId?: string;
    decisionIds?: string[];
    affectedFiles?: string[];
    backendChanges?: string[];
    mobileChanges?: string[];
    migrations?: string[];
    tests?: string[];
    acceptanceCriteria?: string[];
    securityConstraints?: string[];
  }
): Promise<DevPrompt> {
  return apiRequest('/api/mobile/dev/prompts', {
    method: 'POST',
    token,
    timeoutMs: 60_000,
    body: input,
  });
}

export function updateDevPrompt(
  token: string,
  id: string,
  input: Partial<{
    status: DevPrompt['status'];
    verificationStatus: DevPrompt['verificationStatus'];
    verificationNotes: string;
    resultCommit: string;
  }>
): Promise<DevPrompt> {
  return apiRequest(`/api/mobile/dev/prompts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    token,
    body: input,
  });
}

export function deleteAccount(token: string): Promise<{ ok: boolean }> {
  return apiRequest('/api/mobile/account', {
    method: 'DELETE',
    token,
    body: { confirm: 'DELETE' },
    timeoutMs: 20_000,
  });
}

/**
 * Kept for callers that need a typed header value; the actual header is added
 * centrally by apiRequest.
 */
export const mobileAuthHeader = tokenHeader;
