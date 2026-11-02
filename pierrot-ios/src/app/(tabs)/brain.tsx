import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';

import { friendlyApiMessage, ApiError } from '@/api/client';
import { askBrain } from '@/api/brain';
import { sendPierrot } from '@/api/pierrot';
import type { BrainResearchResponse } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { Markdown } from '@/components/chat/Markdown';
import { ActionButton } from '@/components/ui/ActionButton';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { fonts, layout, palette, radius, spacing, type } from '@/constants/theme';

type Mode = 'ask' | 'add';
type UrlStep = 'idle' | 'preview' | 'done';

type UrlThread = {
  conversationId: string;
  sessionId: string;
  preview: string;
  documentId?: string;
  runId?: string;
  status?: string;
};

function Gate({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.gate}>
      <Text style={styles.gateTitle}>{title}</Text>
      <Text style={styles.gateText}>{message}</Text>
      {action ? (
        <ActionButton label={action.label} onPress={action.onPress} style={styles.gateButton} />
      ) : null}
    </View>
  );
}

function CitationRow({
  title,
  heading,
  sourceType,
  similarity,
}: {
  title: string;
  heading: string;
  sourceType: string | null;
  similarity: number | null;
}) {
  return (
    <View style={styles.citation}>
      <View style={styles.citationBody}>
        <Text style={styles.citationTitle}>{title}</Text>
        {heading && heading !== title ? (
          <Text style={styles.citationHeading}>{heading}</Text>
        ) : null}
      </View>
      <View style={styles.citationMeta}>
        {sourceType ? <Text style={styles.citationType}>{sourceType}</Text> : null}
        {typeof similarity === 'number' ? (
          <Text style={styles.citationScore}>{Math.round(similarity * 100)}%</Text>
        ) : null}
      </View>
    </View>
  );
}

function ResearchResult({ result }: { result: BrainResearchResponse }) {
  return (
    <View style={styles.result}>
      <View style={styles.resultMetaRow}>
        <Text style={styles.resultMeta}>
          {result.retrieval.outcome.replace(/_/g, ' ')}
        </Text>
        <Text style={styles.resultMeta}>{result.retrieval.latencyMs} ms</Text>
        <Text style={styles.resultMeta}>
          {result.citations.length} source{result.citations.length === 1 ? '' : 's'}
        </Text>
      </View>

      <View style={styles.answer}>
        <Markdown content={result.answer} />
      </View>

      {result.caveat ? <Text style={styles.caveat}>{result.caveat}</Text> : null}

      {result.citations.length > 0 ? (
        <View style={styles.resultSection}>
          <Text style={styles.sectionLabel}>Sources</Text>
          {result.citations.map((citation, index) => (
            <CitationRow
              key={`${citation.documentId}-${citation.chunkId}-${index}`}
              title={citation.documentTitle}
              heading={citation.heading}
              sourceType={citation.sourceType}
              similarity={citation.similarity}
            />
          ))}
        </View>
      ) : null}

      {result.entities.length > 0 ? (
        <View style={styles.resultSection}>
          <Text style={styles.sectionLabel}>Entities</Text>
          <View style={styles.chips}>
            {result.entities.slice(0, 18).map((entity) => (
              <View key={entity.id} style={styles.chip}>
                <Text style={styles.chipText}>{entity.name}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {result.graphContext.matchedRelationships > 0 ? (
        <Text style={styles.graphMeta}>
          Knowledge graph: {result.graphContext.matchedEntities} entities ·{' '}
          {result.graphContext.matchedRelationships} relationships
        </Text>
      ) : null}
    </View>
  );
}

export default function BrainScreen() {
  const { status, session, isAdmin, getAccessToken } = useAuth();

  const [mode, setMode] = React.useState<Mode>('ask');
  const [question, setQuestion] = React.useState('');
  const [research, setResearch] = React.useState<BrainResearchResponse | null>(null);
  const [researchBusy, setResearchBusy] = React.useState(false);
  const [researchError, setResearchError] = React.useState<string | null>(null);

  const [url, setUrl] = React.useState('');
  const [urlStep, setUrlStep] = React.useState<UrlStep>('idle');
  const [urlThread, setUrlThread] = React.useState<UrlThread | null>(null);
  const [urlBusy, setUrlBusy] = React.useState(false);
  const [urlError, setUrlError] = React.useState<string | null>(null);

  const ask = async () => {
    const text = question.trim();
    if (!text || researchBusy) return;

    setResearchBusy(true);
    setResearchError(null);
    setResearch(null);

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new ApiError('Sign in as the owner to search Brain.', {
          code: 'UNAUTHORIZED',
        });
      }

      const result = await askBrain(text, token);
      setResearch(result);
    } catch (error) {
      setResearchError(friendlyApiMessage(error));
    } finally {
      setResearchBusy(false);
    }
  };

  const resetUrl = () => {
    setUrl('');
    setUrlStep('idle');
    setUrlThread(null);
    setUrlError(null);
  };

  const submitUrl = async () => {
    const text = url.trim();
    if (!text || urlBusy) return;

    if (!/^https?:\/\//i.test(text)) {
      setUrlError('Send a complete http(s) link.');
      return;
    }

    setUrlBusy(true);
    setUrlError(null);
    setUrlStep('idle');
    setUrlThread(null);

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new ApiError('Sign in as the owner to add a source.', {
          code: 'UNAUTHORIZED',
        });
      }

      const conversationId = Crypto.randomUUID();
      const sessionId = Crypto.randomUUID();

      const result = await sendPierrot({
        message: text,
        conversationId,
        sessionId,
        userMessageId: Crypto.randomUUID(),
        history: [],
        consent: { state: 'pending', version: null },
        mode: 'unframed',
        token,
      });

      setUrlThread({
        conversationId,
        sessionId,
        preview: result.reply,
        status: result.brain_url_status,
        documentId: result.brain_document_id,
        runId: result.brain_run_id,
      });
      setUrlStep(result.brain_url_preview ? 'preview' : 'done');
    } catch (error) {
      setUrlError(friendlyApiMessage(error));
    } finally {
      setUrlBusy(false);
    }
  };

  const decideUrl = async (add: boolean) => {
    if (!urlThread || urlBusy) return;

    setUrlBusy(true);
    setUrlError(null);

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new ApiError('Sign in as the owner to continue.', {
          code: 'UNAUTHORIZED',
        });
      }

      const result = await sendPierrot({
        message: add ? 'Yes, add it.' : 'No, do not add it.',
        conversationId: urlThread.conversationId,
        sessionId: urlThread.sessionId,
        userMessageId: Crypto.randomUUID(),
        history: [
          { role: 'user', content: url },
          { role: 'assistant', content: urlThread.preview },
        ],
        consent: { state: 'pending', version: null },
        mode: 'unframed',
        token,
      });

      setUrlThread({
        ...urlThread,
        preview: result.reply,
        status: result.brain_url_status,
        documentId: result.brain_document_id,
        runId: result.brain_run_id,
      });
      setUrlStep('done');
    } catch (error) {
      setUrlError(friendlyApiMessage(error));
    } finally {
      setUrlBusy(false);
    }
  };

  const header = (
    <PageHeader
      eyebrow="Memory"
      title="Brain"
      subtitle="Search the private archive, or hand Pierrot a link for intake."
    />
  );

  if (status === 'loading') {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.scroll}>{header}</ScrollView>
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.scroll}>
          {header}
          <Gate
            title="Owner access"
            message="Brain is scoped to the owner account. Sign in with the same email you use on merkurov.love. Public conversations can still use approved public RAG inside Chat."
            action={{ label: 'Open settings', onPress: () => router.push('/settings') }}
          />
        </ScrollView>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.scroll}>
          {header}
          <Gate
            title="This account is not the owner"
            message={`Signed in as ${session.user.email ?? 'an account'}. Brain research and URL intake are owner-only on the server. Chat remains available with public retrieval.`}
            action={{ label: 'Account settings', onPress: () => router.push('/settings') }}
          />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {header}

          <View style={styles.switcher}>
            {(['ask', 'add'] as const).map((item) => {
              const active = mode === item;

              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  onPress={() => setMode(item)}
                  style={styles.switchItem}>
                  <Text style={[styles.switchLabel, active && styles.switchLabelActive]}>
                    {item === 'ask' ? 'Research' : 'Add a source'}
                  </Text>
                  <View style={[styles.switchRule, active && styles.switchRuleActive]} />
                </Pressable>
              );
            })}
          </View>

          {mode === 'ask' ? (
            <View style={styles.panel}>
              <TextField
                label="Question"
                value={question}
                onChangeText={setQuestion}
                placeholder="How has my position on AI regulation changed?"
                multiline
                maxLength={2000}
                onSubmitEditing={() => void ask()}
              />

              <View style={styles.panelActions}>
                <ActionButton
                  label={researchBusy ? 'Searching' : 'Ask Brain'}
                  onPress={() => void ask()}
                  loading={researchBusy}
                  disabled={!question.trim()}
                />
                <Text style={styles.panelHint}>
                  Owner RAG · citations and graph context
                </Text>
              </View>

              {researchError ? (
                <Notice tone="error" title="Search failed" message={researchError} />
              ) : null}

              {research ? <ResearchResult result={research} /> : null}
            </View>
          ) : (
            <View style={styles.panel}>
              <TextField
                label="URL"
                value={url}
                onChangeText={setUrl}
                placeholder="https://…"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={urlStep === 'idle'}
              />

              <View style={styles.panelActions}>
                {urlStep === 'idle' ? (
                  <ActionButton
                    label={urlBusy ? 'Sending' : 'Send to Pierrot'}
                    onPress={() => void submitUrl()}
                    loading={urlBusy}
                    disabled={!url.trim()}
                  />
                ) : null}

                {urlStep === 'preview' ? (
                  <>
                    <ActionButton
                      label={urlBusy ? 'Working' : 'Add to Brain'}
                      onPress={() => void decideUrl(true)}
                      loading={urlBusy}
                    />
                    <ActionButton
                      label="Cancel"
                      variant="outline"
                      onPress={() => void decideUrl(false)}
                      disabled={urlBusy}
                    />
                  </>
                ) : null}

                {urlStep === 'done' ? (
                  <ActionButton label="Another link" variant="outline" onPress={resetUrl} />
                ) : null}

                <Text style={styles.panelHint}>
                  Preview is created by the owner URL pipeline. Adding starts the
                  existing Brain ingestion queue.
                </Text>
              </View>

              {urlError ? (
                <Notice tone="error" title="Source not accepted" message={urlError} />
              ) : null}

              {urlThread ? (
                <View style={styles.result}>
                  <View style={styles.resultMetaRow}>
                    <Text style={styles.resultMeta}>
                      {urlStep === 'preview' ? 'Preview' : 'Result'}
                    </Text>
                    {urlThread.status ? (
                      <Text style={styles.resultMeta}>{urlThread.status.replace(/_/g, ' ')}</Text>
                    ) : null}
                  </View>

                  <View style={styles.answer}>
                    <Markdown content={urlThread.preview} />
                  </View>

                  {urlThread.documentId || urlThread.runId ? (
                    <Text style={styles.identifier}>
                      {urlThread.documentId ? `document ${urlThread.documentId}` : ''}
                      {urlThread.documentId && urlThread.runId ? '\n' : ''}
                      {urlThread.runId ? `run ${urlThread.runId}` : ''}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    width: '100%',
    maxWidth: layout.brain,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  gate: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  gateTitle: {
    ...type.heading,
  },
  gateText: {
    ...type.bodySmall,
    color: palette.textSecondary,
    maxWidth: 560,
  },
  gateButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  switcher: {
    flexDirection: 'row',
    gap: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
    marginBottom: spacing.lg,
  },
  switchItem: {
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  switchLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: palette.textFaint,
  },
  switchLabelActive: {
    color: palette.text,
  },
  switchRule: {
    height: 1,
    backgroundColor: 'transparent',
  },
  switchRuleActive: {
    backgroundColor: palette.text,
  },
  panel: {
    gap: spacing.md,
  },
  panelActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
  },
  panelHint: {
    ...type.meta,
    color: palette.textFaint,
    flexShrink: 1,
  },
  result: {
    marginTop: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
    gap: spacing.md,
  },
  resultMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  resultMeta: {
    ...type.label,
    fontSize: 9,
    color: palette.textFaint,
  },
  answer: {
    paddingVertical: spacing.xs,
  },
  caveat: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    color: palette.textFaint,
  },
  resultSection: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  sectionLabel: {
    ...type.label,
    marginBottom: spacing.xs,
  },
  citation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  citationBody: {
    flex: 1,
    gap: 3,
  },
  citationTitle: {
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 21,
    color: palette.text,
  },
  citationHeading: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: palette.textMuted,
  },
  citationMeta: {
    alignItems: 'flex-end',
    gap: 3,
  },
  citationType: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: palette.textFaint,
  },
  citationScore: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: palette.textMuted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.lineStrong,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  chipText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: palette.textSecondary,
  },
  graphMeta: {
    ...type.meta,
    color: palette.textFaint,
  },
  identifier: {
    fontFamily: fonts.mono,
    fontSize: 9,
    lineHeight: 14,
    color: palette.textFaint,
  },
});
