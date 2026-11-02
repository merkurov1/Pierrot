import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';

import { friendlyApiMessage } from '@/api/client';
import { getHealth } from '@/api/health';
import type { HealthResponse } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { useChat } from '@/chat/ChatContext';
import { ActionButton } from '@/components/ui/ActionButton';
import { Notice, Rule } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { env } from '@/config/env';
import { fonts, palette, spacing, type } from '@/constants/theme';

function Section({
  label,
  children,
}: React.PropsWithChildren<{ label: string }>) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function ValueRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'ok' | 'bad';
}) {
  return (
    <View style={styles.valueRow}>
      <Text style={styles.valueLabel}>{label}</Text>
      <View style={styles.valueRight}>
        {tone ? (
          <View
            style={[
              styles.statusDot,
              tone === 'ok' ? styles.statusOk : styles.statusBad,
            ]}
          />
        ) : null}
        <Text selectable style={styles.valueText}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const {
    status,
    session,
    me,
    isAdmin,
    authConfigured,
    consent,
    error,
    requestCode,
    signIn,
    signOut,
    refreshMe,
    setConsent,
  } = useAuth();
  const { conversations, clearConversations } = useChat();

  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [codeSent, setCodeSent] = React.useState(false);
  const [authBusy, setAuthBusy] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const [health, setHealth] = React.useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = React.useState<string | null>(null);
  const [healthBusy, setHealthBusy] = React.useState(false);
  const [checkedAt, setCheckedAt] = React.useState<Date | null>(null);

  const checkHealth = React.useCallback(async () => {
    setHealthBusy(true);
    setHealthError(null);

    try {
      const result = await getHealth();
      setHealth(result);
      setCheckedAt(new Date());
    } catch (requestError) {
      setHealth(null);
      setHealthError(friendlyApiMessage(requestError));
      setCheckedAt(new Date());
    } finally {
      setHealthBusy(false);
    }
  }, []);

  React.useEffect(() => {
    // Initial network health check. setState happens after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkHealth();
  }, [checkHealth]);

  const sendCode = async () => {
    const value = email.trim();
    if (!value || authBusy) return;

    setAuthBusy(true);
    setAuthError(null);

    try {
      await requestCode(value);
      setCodeSent(true);
    } catch (requestError) {
      setAuthError(friendlyApiMessage(requestError));
    } finally {
      setAuthBusy(false);
    }
  };

  const submitCode = async () => {
    const value = code.trim();
    if (value.length !== 6 || authBusy) return;

    setAuthBusy(true);
    setAuthError(null);

    try {
      await signIn(email.trim(), value);
      setCode('');
      setCodeSent(false);
    } catch (requestError) {
      setAuthError(friendlyApiMessage(requestError));
    } finally {
      setAuthBusy(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'Local conversations stay on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const confirmClear = () => {
    Alert.alert(
      'Clear local conversations?',
      'This removes the transcript cache from this device. Server-side records, if enabled, are not deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearConversations },
      ]
    );
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build = Constants.expoConfig?.ios?.buildNumber ?? '—';
  const sdk = Constants.expoConfig?.sdkVersion ?? '—';

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <PageHeader
            eyebrow="System"
            title="Settings"
            subtitle="Identity, connection, privacy and the local archive."
          />

          <Section label="Account">
            {status === 'loading' ? (
              <Text style={styles.muted}>Restoring session…</Text>
            ) : session ? (
              <>
                <View style={styles.identity}>
                  <Text style={styles.identityName}>
                    {me?.user?.name || session.user.name || session.user.email || 'Signed in'}
                  </Text>
                  {(me?.user?.name || session.user.name) && session.user.email ? (
                    <Text style={styles.identityEmail}>{session.user.email}</Text>
                  ) : null}
                  <Text style={styles.identityRole}>
                    {isAdmin ? 'Owner / ADMIN' : me ? 'Authenticated account' : 'Session active'}
                  </Text>
                </View>

                <View style={styles.buttonRow}>
                  <ActionButton
                    label="Refresh role"
                    variant="outline"
                    onPress={() => void refreshMe()}
                  />
                  <ActionButton label="Sign out" variant="quiet" onPress={confirmSignOut} />
                </View>

                <Text style={styles.help}>
                  The app uses the same Supabase account and email code as merkurov.love.
                  Authentication tokens are kept in the iOS Keychain.
                </Text>
              </>
            ) : !authConfigured ? (
              <Notice
                title="Auth not configured"
                message="Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY for this build. Chat and Flow work without an account. Brain requires the owner account."
              />
            ) : (
              <>
                <TextField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!codeSent}
                />

                {codeSent ? (
                  <>
                    <TextField
                      label="Email code"
                      value={code}
                      onChangeText={setCode}
                      placeholder="6-digit code"
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <View style={styles.buttonRow}>
                      <ActionButton
                        label={authBusy ? 'Signing in' : 'Sign in'}
                        onPress={() => void submitCode()}
                        loading={authBusy}
                        disabled={code.trim().length !== 6}
                      />
                      <ActionButton
                        label="Change email"
                        variant="quiet"
                        onPress={() => {
                          setCodeSent(false);
                          setCode('');
                          setAuthError(null);
                        }}
                        disabled={authBusy}
                      />
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void sendCode()}
                      disabled={authBusy}>
                      <Text style={styles.link}>Resend code</Text>
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.buttonRow}>
                    <ActionButton
                      label={authBusy ? 'Sending' : 'Send code'}
                      onPress={() => void sendCode()}
                      loading={authBusy}
                      disabled={!email.trim()}
                    />
                  </View>
                )}

                <Text style={styles.help}>
                  Sign-in is optional for Chat. Brain is available only to the owner
                  account verified by the backend.
                </Text>
              </>
            )}

            {authError || error ? (
              <Notice
                tone="error"
                title="Account"
                message={authError || error || 'Authentication failed.'}
              />
            ) : null}
          </Section>

          <Rule />

          <Section label="Connection">
            <ValueRow
              label="Backend"
              value={env.apiUrl}
              tone={health ? 'ok' : healthError ? 'bad' : undefined}
            />
            <ValueRow
              label="State"
              value={
                healthBusy
                  ? 'Checking…'
                  : health
                    ? `${health.status} · ${health.environment}`
                    : healthError
                      ? 'Unreachable'
                      : 'Unknown'
              }
              tone={health ? 'ok' : healthError ? 'bad' : undefined}
            />
            {health ? (
              <>
                <ValueRow
                  label="Database"
                  value={health.checks.database ? 'Reachable' : 'Unavailable'}
                  tone={health.checks.database ? 'ok' : 'bad'}
                />
                <ValueRow
                  label="Supabase"
                  value={health.checks.supabase ? 'Reachable' : 'Unavailable'}
                  tone={health.checks.supabase ? 'ok' : 'bad'}
                />
              </>
            ) : null}
            {checkedAt ? (
              <Text style={styles.help}>
                Checked {checkedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            ) : null}

            {healthError ? (
              <Notice
                tone="error"
                title="Connection failed"
                message={healthError}
              />
            ) : null}

            <View style={styles.buttonRow}>
              <ActionButton
                label={healthBusy ? 'Checking' : 'Check connection'}
                variant="outline"
                onPress={() => void checkHealth()}
                loading={healthBusy}
              />
            </View>
          </Section>

          <Rule />

          <Section label="Privacy">
            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchTitle}>Server transcript</Text>
                <Text style={styles.help}>
                  When enabled, the existing Pierrot backend stores this conversation for
                  its retention period (currently 90 days). Off by default.
                </Text>
              </View>
              <Switch
                value={consent === 'granted'}
                onValueChange={(value) => void setConsent(value ? 'granted' : 'denied')}
                trackColor={{ false: palette.surfaceActive, true: palette.lineStrong }}
                thumbColor={consent === 'granted' ? palette.text : palette.textMuted}
              />
            </View>

            <ValueRow
              label="Local archive"
              value={`${conversations.length} ${
                conversations.length === 1 ? 'conversation' : 'conversations'
              } on this device`}
            />

            <Text style={styles.help}>
              Transcripts are cached locally in SQLite, not in AsyncStorage. Authentication
              tokens are stored in the iOS Keychain.
            </Text>

            <View style={styles.buttonRow}>
              <ActionButton
                label="Clear local conversations"
                variant="outline"
                onPress={confirmClear}
              />
            </View>
          </Section>

          <Rule />

          <Section label="About">
            <ValueRow label="Application" value="Pierrot" />
            <ValueRow label="Version" value={`${version} (${build})`} />
            <ValueRow label="Expo SDK" value={sdk} />
            <ValueRow label="Platform" value={Platform.OS === 'ios' ? 'iOS / iPadOS' : Platform.OS} />

            <Pressable
              accessibilityRole="link"
              onPress={() => void WebBrowser.openBrowserAsync(env.siteUrl)}>
              <Text style={styles.link}>merkurov.love ↗</Text>
            </Pressable>

            <Text style={styles.help}>
              Pierrot is a personal intelligence interface over the existing newlove
              backend. It does not contain AI provider keys or server credentials.
            </Text>
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  section: {
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  sectionLabel: {
    ...type.label,
    marginBottom: spacing.xs,
  },
  sectionBody: {
    gap: spacing.md,
  },
  identity: {
    gap: 3,
  },
  identityName: {
    ...type.heading,
  },
  identityEmail: {
    ...type.bodySmall,
    color: palette.textSecondary,
  },
  identityRole: {
    ...type.label,
    fontSize: 9,
    color: palette.textMuted,
    marginTop: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  muted: {
    ...type.bodySmall,
    color: palette.textMuted,
  },
  help: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    color: palette.textFaint,
  },
  link: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: palette.textSecondary,
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: spacing.xs,
  },
  valueLabel: {
    ...type.meta,
    color: palette.textMuted,
    minWidth: 96,
  },
  valueRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  valueText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 16,
    color: palette.textSecondary,
    textAlign: 'right',
    flexShrink: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusOk: {
    backgroundColor: palette.success,
  },
  statusBad: {
    backgroundColor: palette.danger,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  switchCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  switchTitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 21,
    color: palette.text,
  },
});
