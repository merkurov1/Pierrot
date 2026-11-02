import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { friendlyApiMessage } from '@/api/client';
import {
  createDevPrompt,
  getGitHubRepositories,
  getRepositoryCommits,
  getRepositoryDiff,
  getRepositoryFile,
  getRepositoryTree,
  listDecisions,
  listDevPrompts,
  searchRepositoryCode,
  updateDevPrompt,
  type Decision,
  type DevPrompt,
  type GitHubCodeResult,
  type GitHubCommit,
  type GitHubDiff,
  type GitHubFile,
  type GitHubRepository,
  type GitHubTreeEntry,
} from '@/api/mobile';
import { useAuth } from '@/auth/AuthContext';
import { useChat } from '@/chat/ChatContext';
import { useMobileBackend } from '@/mobile/MobileBackendContext';
import { ActionButton } from '@/components/ui/ActionButton';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { fonts, layout, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/theme/ThemeContext';

type Tab = 'files' | 'commits' | 'search' | 'prompt' | 'history';

export default function DevScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { status, isAdmin, getAccessToken } = useAuth();
  const { activeConversation } = useChat();
  const { available } = useMobileBackend();

  const [repos, setRepos] = React.useState<GitHubRepository[]>([]);
  const [repo, setRepo] = React.useState<GitHubRepository | null>(null);
  const [tab, setTab] = React.useState<Tab>('files');
  const [tree, setTree] = React.useState<GitHubTreeEntry[]>([]);
  const [commits, setCommits] = React.useState<GitHubCommit[]>([]);
  const [file, setFile] = React.useState<GitHubFile | null>(null);
  const [diff, setDiff] = React.useState<GitHubDiff | null>(null);
  const [codeResults, setCodeResults] = React.useState<GitHubCodeResult[]>([]);
  const [query, setQuery] = React.useState('');
  const [task, setTask] = React.useState('');
  const [selectedFiles, setSelectedFiles] = React.useState<string[]>([]);
  const [decisions, setDecisions] = React.useState<Decision[]>([]);
  const [selectedDecisionIds, setSelectedDecisionIds] = React.useState<string[]>([]);
  const [prompts, setPrompts] = React.useState<DevPrompt[]>([]);
  const [builtPrompt, setBuiltPrompt] = React.useState<DevPrompt | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const withToken = React.useCallback(async <T,>(fn: (token: string) => Promise<T>): Promise<T | null> => {
    const token = await getAccessToken();
    if (!token) {
      setError('Owner session required.');
      return null;
    }
    return fn(token);
  }, [getAccessToken]);

  const loadRepos = React.useCallback(async () => {
    setBusy('repos');
    setError(null);

    try {
      const result = await withToken((token) => getGitHubRepositories(token));
      if (result) {
        setRepos(result.items);
        setRepo((current) => current ?? result.items[0] ?? null);
      }
    } catch (requestError) {
      setError(friendlyApiMessage(requestError));
    } finally {
      setBusy(null);
    }
  }, [withToken]);

  React.useEffect(() => {
    if (isAdmin && status === 'signedIn') {
      // Initial network load; setState happens after GitHub responds.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadRepos();
    }
  }, [isAdmin, status, loadRepos]);

  const loadRepo = React.useCallback(
    async (nextRepo: GitHubRepository) => {
      setRepo(nextRepo);
      setFile(null);
      setDiff(null);
      setError(null);
      setBusy('repo');

      try {
        const token = await getAccessToken();
        if (!token) return;
        const [treeResult, commitResult, decisionResult, promptResult] = await Promise.all([
          getRepositoryTree(token, nextRepo.fullName, nextRepo.defaultBranch),
          getRepositoryCommits(token, nextRepo.fullName, nextRepo.defaultBranch),
          listDecisions(token, { limit: 20 }).catch(() => ({ items: [] as Decision[] })),
          listDevPrompts(token, { limit: 10 }).catch(() => ({ items: [] as DevPrompt[] })),
        ]);
        setTree(treeResult.entries);
        setCommits(commitResult.commits);
        setDecisions(decisionResult.items);
        setPrompts(promptResult.items);
      } catch (requestError) {
        setError(friendlyApiMessage(requestError));
      } finally {
        setBusy(null);
      }
    },
    [getAccessToken]
  );

  React.useEffect(() => {
    if (repo) {
      // Initial repo load; setState happens after GitHub responds.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadRepo(repo);
    }
    // Reload only when the selected repository changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo?.fullName]);

  const openFile = async (path: string) => {
    if (!repo) return;
    setBusy('file');
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) return;
      setFile(await getRepositoryFile(token, repo.fullName, path, repo.defaultBranch));
    } catch (requestError) {
      setError(friendlyApiMessage(requestError));
    } finally {
      setBusy(null);
    }
  };

  const loadDiff = async () => {
    if (!repo || commits.length < 2) return;
    setBusy('diff');
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) return;
      setDiff(await getRepositoryDiff(token, repo.fullName, commits[1].sha, commits[0].sha));
    } catch (requestError) {
      setError(friendlyApiMessage(requestError));
    } finally {
      setBusy(null);
    }
  };

  const searchCode = async () => {
    if (!repo || !query.trim()) return;
    setBusy('search');
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) return;
      const result = await searchRepositoryCode(token, repo.fullName, query.trim());
      setCodeResults(result.items);
    } catch (requestError) {
      setError(friendlyApiMessage(requestError));
    } finally {
      setBusy(null);
    }
  };

  const markVerified = async () => {
    if (!builtPrompt || busy) return;
    setBusy('verify');
    try {
      const token = await getAccessToken();
      if (!token) return;
      const updated = await updateDevPrompt(token, builtPrompt.id, {
        status: 'verified',
        verificationStatus: 'passed',
      });
      setBuiltPrompt(updated);
      setPrompts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (requestError) {
      setError(friendlyApiMessage(requestError));
    } finally {
      setBusy(null);
    }
  };

  const buildPrompt = async () => {
    if (!repo || !task.trim()) return;
    setBusy('prompt');
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) return;
      const prompt = await createDevPrompt(token, {
        repository: repo.fullName,
        baseRef: repo.defaultBranch,
        task: task.trim(),
        files: selectedFiles,
        conversationId: activeConversation?.id,
        decisionIds: selectedDecisionIds,
      });
      setBuiltPrompt(prompt);
      setPrompts((current) => [prompt, ...current]);
      setTab('prompt');
    } catch (requestError) {
      setError(friendlyApiMessage(requestError));
    } finally {
      setBusy(null);
    }
  };

  if (!available) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <PageHeader
            eyebrow="Workspace"
            title="Dev"
            subtitle="Read-only GitHub, OpenCode prompts and decision context."
          />
          <Notice
            title="Not available yet"
            message="Dev is hidden until the server update is available. Chat, Flow and Brain work independently."
          />
        </ScrollView>
      </Screen>
    );
  }

  if (status === 'loading') {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <PageHeader
            eyebrow="Workspace"
            title="Dev"
            subtitle="Read-only GitHub, OpenCode prompts and decision context."
          />
          <Notice
            title="Owner access required"
            message="Dev is available to the owner account after signing in with the same Supabase identity as merkurov.love."
          />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader
          eyebrow="Workspace"
          title="Dev"
          subtitle="Read-only repository context, decisions and OpenCode prompts."
        />

        <View style={styles.section}>
          <Text style={styles.label}>Repositories</Text>
          <View style={styles.chips}>
            {repos.map((item) => (
              <Pressable
                key={item.fullName}
                onPress={() => void loadRepo(item)}
                style={[styles.chip, repo?.fullName === item.fullName && styles.chipActive]}>
                <Text
                  style={[
                    styles.chipText,
                    repo?.fullName === item.fullName && styles.chipTextActive,
                  ]}>
                  {item.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.help}>
            Repositories are configured on the backend with GITHUB_ALLOWED_REPOS. Read-only.
          </Text>
        </View>

        {error ? <Notice tone="error" title="Dev error" message={error} /> : null}

        <View style={styles.tabs}>
          {(['files', 'commits', 'search', 'prompt', 'history'] as const).map((item) => (
            <Pressable key={item} onPress={() => setTab(item)} style={styles.tab}>
              <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        {busy ? (
          <View style={styles.inlineBusy}>
            <ActivityIndicator size="small" color={colors.textMuted} />
            <Text style={styles.help}>{busy}…</Text>
          </View>
        ) : null}

        {tab === 'files' ? (
          <View style={styles.section}>
            {file ? (
              <>
                <View style={styles.rowBetween}>
                  <Text style={styles.label}>{file.path}</Text>
                  <Pressable onPress={() => setFile(null)}>
                    <Text style={styles.link}>Close</Text>
                  </Pressable>
                </View>
                <Text selectable style={styles.code}>
                  {file.content ?? `[${file.binary ? 'binary' : 'unavailable'} file]`}
                </Text>
              </>
            ) : (
              <View style={styles.list}>
                {tree
                  .filter((entry) => entry.type === 'blob')
                  .slice(0, 300)
                  .map((entry) => (
                    <Pressable key={entry.path} onPress={() => void openFile(entry.path)}>
                      <Text style={styles.listItem}>{entry.path}</Text>
                    </Pressable>
                  ))}
              </View>
            )}
          </View>
        ) : null}

        {tab === 'commits' ? (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Latest commits</Text>
              <Pressable onPress={() => void loadDiff()}>
                <Text style={styles.link}>Show latest diff</Text>
              </Pressable>
            </View>
            {commits.map((commit) => (
              <View key={commit.sha} style={styles.commit}>
                <Text style={styles.commitMessage}>{commit.message}</Text>
                <Text style={styles.meta}>
                  {commit.sha.slice(0, 7)} · {commit.authorName || 'unknown'} ·{' '}
                  {commit.date ? new Date(commit.date).toLocaleDateString() : ''}
                </Text>
              </View>
            ))}
            {diff ? (
              <View style={styles.section}>
                <Text style={styles.label}>
                  Diff {diff.base.slice(0, 7)} → {diff.head.slice(0, 7)}
                </Text>
                {diff.files.map((item) => (
                  <View key={item.path} style={styles.commit}>
                    <Text style={styles.commitMessage}>{item.path}</Text>
                    <Text style={styles.meta}>
                      +{item.additions} / −{item.deletions}
                    </Text>
                    {item.patch ? <Text selectable style={styles.code}>{item.patch}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {tab === 'search' ? (
          <View style={styles.section}>
            <View style={styles.searchRow}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search code"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
              />
              <ActionButton label="Search" onPress={() => void searchCode()} />
            </View>
            {codeResults.map((result) => (
              <Pressable key={`${result.sha}-${result.path}`} onPress={() => void openFile(result.path)}>
                <Text style={styles.listItem}>{result.path}</Text>
                {result.fragments.slice(0, 2).map((fragment, index) => (
                  <Text key={index} style={styles.meta}>
                    {fragment}
                  </Text>
                ))}
              </Pressable>
            ))}
          </View>
        ) : null}

        {tab === 'prompt' ? (
          <View style={styles.section}>
            <TextField
              label="Task"
              value={task}
              onChangeText={setTask}
              placeholder="What should OpenCode implement?"
              multiline
            />
            <Text style={styles.label}>Attach files</Text>
            <View style={styles.chips}>
              {tree
                .filter((entry) => entry.type === 'blob')
                .slice(0, 40)
                .map((entry) => {
                  const active = selectedFiles.includes(entry.path);
                  return (
                    <Pressable
                      key={entry.path}
                      onPress={() =>
                        setSelectedFiles((current) =>
                          active
                            ? current.filter((path) => path !== entry.path)
                            : [...current, entry.path]
                        )
                      }
                      style={[styles.chip, active && styles.chipActive]}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {entry.path.split('/').pop()}
                      </Text>
                    </Pressable>
                  );
                })}
            </View>
            <Text style={styles.label}>Attach decisions</Text>
            <View style={styles.chips}>
              {decisions.slice(0, 10).map((decision) => {
                const active = selectedDecisionIds.includes(decision.id);
                return (
                  <Pressable
                    key={decision.id}
                    onPress={() =>
                      setSelectedDecisionIds((current) =>
                        active ? current.filter((id) => id !== decision.id) : [...current, decision.id]
                      )
                    }
                    style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {decision.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <ActionButton
              label={busy === 'prompt' ? 'Building' : 'Build prompt'}
              onPress={() => void buildPrompt()}
              loading={busy === 'prompt'}
              disabled={!task.trim() || !repo}
            />
            {builtPrompt ? (
              <View style={styles.promptBox}>
                <View style={styles.rowBetween}>
                  <Text style={styles.label}>OpenCode prompt</Text>
                  <Text style={styles.link} onPress={() => void Clipboard.setStringAsync(builtPrompt.promptText)}>
                    Copy
                  </Text>
                </View>
                <Text selectable style={styles.promptText}>
                  {builtPrompt.promptText}
                </Text>
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => void Share.share({ message: builtPrompt.promptText })}
                    style={styles.inlineAction}>
                    <Text style={styles.link}>Share prompt</Text>
                  </Pressable>
                  <Pressable onPress={() => void markVerified()} style={styles.inlineAction}>
                    <Text style={styles.link}>
                      {builtPrompt.verificationStatus === 'passed' ? 'Verified' : 'Mark verified'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {tab === 'history' ? (
          <View style={styles.section}>
            {prompts.length === 0 ? (
              <Text style={styles.help}>No saved prompts yet.</Text>
            ) : (
              prompts.map((prompt) => (
                <Pressable key={prompt.id} onPress={() => setBuiltPrompt(prompt)} style={styles.commit}>
                  <Text style={styles.commitMessage}>{prompt.task}</Text>
                  <Text style={styles.meta}>
                    {prompt.repository} · {prompt.verificationStatus} ·{' '}
                    {new Date(prompt.createdAt).toLocaleDateString()}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) => {
  const type = typography(colors);
  return StyleSheet.create({
    content: {
      width: '100%',
      maxWidth: layout.brain,
      alignSelf: 'center',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xxl,
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    section: { gap: spacing.md, paddingVertical: spacing.md },
    label: {
      fontFamily: fonts.mono,
      fontSize: 10,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: colors.textMuted,
    },
    help: { ...type.bodySmall, color: colors.textFaint },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chip: {
      borderWidth: 1,
      borderColor: colors.lineStrong,
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
    },
    chipActive: { backgroundColor: colors.text, borderColor: colors.text },
    chipText: { fontFamily: fonts.sans, fontSize: 11, color: colors.textSecondary },
    chipTextActive: { color: colors.inverseText },
    tabs: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      paddingBottom: spacing.sm,
    },
    tab: { paddingVertical: 4 },
    tabText: {
      fontFamily: fonts.mono,
      fontSize: 9,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: colors.textFaint,
    },
    tabTextActive: { color: colors.text },
    inlineBusy: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    list: { gap: spacing.xs },
    listItem: {
      fontFamily: fonts.mono,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textSecondary,
      paddingVertical: 3,
    },
    code: {
      fontFamily: fonts.mono,
      fontSize: 10,
      lineHeight: 15,
      color: colors.textSecondary,
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: 8,
    },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    link: {
      fontFamily: fonts.mono,
      fontSize: 9,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.accent,
    },
    commit: { gap: 3, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line },
    commitMessage: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: colors.text },
    meta: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 14, color: colors.textFaint },
    searchRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
    input: {
      flex: 1,
      minHeight: 40,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      borderRadius: 8,
      paddingHorizontal: spacing.sm,
      color: colors.text,
      fontFamily: fonts.sans,
      fontSize: 14,
    },
    promptBox: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 8,
      padding: spacing.md,
      gap: spacing.sm,
      backgroundColor: colors.surface,
    },
    promptText: {
      fontFamily: fonts.mono,
      fontSize: 10,
      lineHeight: 15,
      color: colors.textSecondary,
    },
    inlineAction: { alignSelf: 'flex-start' },
    actionsRow: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  });
};
