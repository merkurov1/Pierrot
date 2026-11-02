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
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';

import { friendlyApiMessage } from '@/api/client';
import { useTheme, useThemedStyles, type ThemePreference } from '@/theme/ThemeContext';
import { getHealth } from '@/api/health';
import { deleteAccount, deleteServerConversation, listServerConversations } from '@/api/mobile';
import type { HealthResponse } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { useChat } from '@/chat/ChatContext';
import { useMobileBackend } from '@/mobile/MobileBackendContext';
import { ActionButton } from '@/components/ui/ActionButton';
import { Avatar } from '@/components/ui/Avatar';
import { Notice, Rule } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { env } from '@/config/env';
import { fonts, spacing, typography, ThemeColors } from '@/constants/theme';

function Section({
  label,
  children,
}: React.PropsWithChildren<{ label: string }>) {
  const styles = useThemedStyles(makeStyles);
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
  const styles = useThemedStyles(makeStyles);
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
  const styles = useThemedStyles(makeStyles);
  const { colors, preference, setPreference } = useTheme();
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
    signInWithGoogle,
    signInWithApple,
    signInWithEmailLink,
    signOut,
    refreshMe,
    setConsent,
    getAccessToken,
  } = useAuth();
  const { conversations, clearConversations } = useChat();
  const {
    available: ownerFeatures,
    checking: ownerChecking,
    checkedAt: ownerCheckedAt,
    refresh: refreshOwnerFeatures,
  } = useMobileBackend();

  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [emailLink, setEmailLink] = React.useState('');
  const [codeSent, setCodeSent] = React.useState(false);
  const [authBusy, setAuthBusy] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const [health, setHealth] = React.useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = React.useState<string | null>(null);
  const [healthBusy, setHealthBusy] = React.useState(false);
  const [checkedAt, setCheckedAt] = React.useState<Date | null>(null);
  const [accountBusy, setAccountBusy] = React.useState(false);
  const oauthRedirect = React.useMemo(() => {
    try {
      return Linking.createURL('auth/callback');
    } catch {
      return 'pierrot://auth/callback';
    }
  }, []);

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

  const runSocial = async (method: 'google' | 'apple') => {
    if (authBusy) return;
    setAuthBusy(true);
    setAuthError(null);

    try {
      if (method === 'google') await signInWithGoogle();
      else await signInWithApple();
      setCode('');
      setCodeSent(false);
    } catch (requestError) {
      setAuthError(friendlyApiMessage(requestError));
    } finally {
      setAuthBusy(false);
    }
  };

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

  const describeAuthError = (error: unknown, mode: 'code' | 'link') => {
    const message = friendlyApiMessage(error);

    if (/expired|invalid|token/i.test(message)) {
      return mode === 'code'
        ? 'That code is invalid or was already used. If you opened the email link, request a new code — or copy the link without opening it and paste it below.'
        : 'That link is invalid or was already used. Request a new email and copy the link without opening it.';
    }

    return message;
  };

  const submitCode = async () => {
    const value = code.replace(/\D/g, '');
    if (value.length < 6 || authBusy) return;

    setAuthBusy(true);
    setAuthError(null);

    try {
      await signIn(email.trim(), value);
      setCode('');
      setEmailLink('');
      setCodeSent(false);
    } catch (requestError) {
      setAuthError(describeAuthError(requestError, 'code'));
    } finally {
      setAuthBusy(false);
    }
  };

  const submitEmailLink = async () => {
    const value = emailLink.trim();
    if (!value || authBusy) return;

    setAuthBusy(true);
    setAuthError(null);

    try {
      await signInWithEmailLink(value);
      setEmailLink('');
      setCode('');
      setCodeSent(false);
    } catch (requestError) {
      setAuthError(describeAuthError(requestError, 'link'));
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

  const deleteServerHistory = async () => {
    if (!session || accountBusy) return;

    Alert.alert(
      'Delete server history?',
      'This deletes the owner-scoped server archive for this account. Decisions and Dev prompts are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setAccountBusy(true);
              try {
                const token = await getAccessToken();
                if (!token) return;
                const list = await listServerConversations(token, { limit: 50 });
                for (const item of list.items) {
                  await deleteServerConversation(token, item.id);
                }
                Alert.alert('Server history deleted', `${list.items.length} conversation(s) removed.`);
              } catch (requestError) {
                Alert.alert('Deletion failed', friendlyApiMessage(requestError));
              } finally {
                setAccountBusy(false);
              }
            })();
          },
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    if (Platform.OS !== 'ios' || !Alert.prompt) return;

    Alert.prompt(
      'Delete account',
      'This permanently deletes the Supabase account and its server-side Pierrot data. Type DELETE to confirm.',
      (value) => {
        if (value?.trim() !== 'DELETE') return;
        void (async () => {
          setAccountBusy(true);
          try {
            const token = await getAccessToken();
            if (!token) return;
            await deleteAccount(token);
            clearConversations();
            await signOut();
            Alert.alert('Account deleted', 'The local cache has been cleared.');
          } catch (requestError) {
            Alert.alert('Account deletion failed', friendlyApiMessage(requestError));
          } finally {
            setAccountBusy(false);
          }
        })();
      },
      'plain-text'
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
                <View style={styles.identityRow}>
                  <Avatar uri={me?.user?.image} name={me?.user?.name || session.user.name} size={44} />
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
                </View>

                <View style={styles.buttonRow}>
                  <ActionButton
                    label="Refresh role"
                    variant="outline"
                    onPress={() => void refreshMe()}
                  />
                  <ActionButton label="Sign out" variant="quiet" onPress={confirmSignOut} />
                  {ownerFeatures ? (
                    <ActionButton
                      label={accountBusy ? 'Working' : 'Delete account'}
                      variant="quiet"
                      onPress={confirmDeleteAccount}
                      disabled={accountBusy}
                    />
                  ) : null}
                </View>

                <Text style={styles.help}>
                  The app uses the same Supabase account and email code as merkurov.love.
                  Authentication tokens are kept in the iOS Keychain.
                </Text>
                {!ownerChecking && !ownerFeatures ? (
                  <Text style={styles.help}>
                    Account deletion and the extra owner tools are hidden until the server
                    update is available. Signing out and local history still work.
                  </Text>
                ) : null}
              </>
            ) : !authConfigured ? (
              <Notice
                title="Auth not configured"
                message="Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY for this build. Chat and Flow work without an account. Brain requires the owner account."
              />
            ) : (
              <>
                <View style={styles.socialButtons}>
                  <ActionButton
                    label={authBusy ? 'Connecting' : 'Continue with Google'}
                    variant="outline"
                    onPress={() => void runSocial('google')}
                    disabled={authBusy}
                  />
                  {Platform.OS === 'ios' ? (
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                      cornerRadius={8}
                      style={styles.appleButton}
                      onPress={() => void runSocial('apple')}
                    />
                  ) : null}
                  <Text style={styles.help}>
                    Google and Apple use the existing Supabase providers. If Google returns
                    you to merkurov.love, add the current OAuth redirect shown below to
                    Supabase Redirect URLs. Email OTP below works without any redirect and
                    is the fallback. Passkey remains disabled until a verified native
                    WebAuthn plugin is added.
                  </Text>
                </View>

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
                      onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="6-digit code"
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                    <View style={styles.buttonRow}>
                      <ActionButton
                        label={authBusy ? 'Signing in' : 'Sign in'}
                        onPress={() => void submitCode()}
                        loading={authBusy}
                        disabled={code.replace(/\D/g, '').length < 6}
                      />
                      <ActionButton
                        label="Change email"
                        variant="quiet"
                        onPress={() => {
                          setCodeSent(false);
                          setCode('');
                          setEmailLink('');
                          setAuthError(null);
                        }}
                        disabled={authBusy}
                      />
                    </View>
                    <Text style={styles.help}>
                      Use the 6-digit code from the email. If your email only contains a
                      magic link, copy that link without opening it and paste it below.
                    </Text>
                    <TextField
                      label="Email link (optional)"
                      value={emailLink}
                      onChangeText={setEmailLink}
                      placeholder="https://…/auth/v1/verify?token=…"
                      autoCapitalize="none"
                      autoCorrect={false}
                      multiline
                    />
                    <View style={styles.buttonRow}>
                      <ActionButton
                        label={authBusy ? 'Signing in' : 'Sign in with link'}
                        variant="outline"
                        onPress={() => void submitEmailLink()}
                        loading={authBusy}
                        disabled={!emailLink.trim()}
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

          <Section label="Appearance">
            <Text style={styles.help}>
              Light is the default. System follows the device setting.
            </Text>
            <View style={styles.segment}>
              {(['light', 'dark', 'system'] as ThemePreference[]).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => void setPreference(value)}
                  style={[styles.segmentItem, preference === value && styles.segmentActive]}>
                  <Text
                    style={[
                      styles.segmentText,
                      preference === value && styles.segmentTextActive,
                    ]}>
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Section>

          <Rule />

          <Section label="Connection">
            <ValueRow
              label="Backend"
              value={env.apiUrl}
              tone={health ? 'ok' : healthError ? 'bad' : undefined}
            />
            <ValueRow label="OAuth redirect" value={oauthRedirect} />
            <View style={styles.buttonRow}>
              <ActionButton
                label="Copy OAuth redirect"
                variant="quiet"
                onPress={() => {
                  void Clipboard.setStringAsync(oauthRedirect).then(() =>
                    Alert.alert('Copied', 'Paste it into Supabase Redirect URLs.')
                  );
                }}
              />
            </View>
            <ValueRow
              label="Owner tools"
              value={
                ownerChecking
                  ? 'Checking…'
                  : ownerFeatures
                    ? 'Available'
                    : 'Hidden until server update'
              }
              tone={ownerFeatures ? 'ok' : undefined}
            />
            {ownerCheckedAt ? (
              <Text style={styles.help}>
                Owner tools checked{' '}
                {ownerCheckedAt.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                . Chat, Flow and Brain work independently.
              </Text>
            ) : null}
            <View style={styles.buttonRow}>
              <ActionButton
                label={ownerChecking ? 'Checking' : 'Recheck owner tools'}
                variant="quiet"
                onPress={() => void refreshOwnerFeatures()}
                loading={ownerChecking}
              />
            </View>
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
                trackColor={{ false: colors.surfaceActive, true: colors.lineStrong }}
                thumbColor={consent === 'granted' ? colors.text : colors.textMuted}
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
              {ownerFeatures ? (
                <ActionButton
                  label="Decision memory"
                  variant="outline"
                  onPress={() => router.push('/decisions')}
                />
              ) : null}
              <ActionButton
                label="Clear local conversations"
                variant="outline"
                onPress={confirmClear}
              />
              {ownerFeatures ? (
                <ActionButton
                  label={accountBusy ? 'Working' : 'Delete server history'}
                  variant="outline"
                  onPress={() => void deleteServerHistory()}
                  disabled={accountBusy}
                />
              ) : null}
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
            <Pressable
              accessibilityRole="link"
              onPress={() => void WebBrowser.openBrowserAsync(`${env.siteUrl}/advising`)}>
              <Text style={styles.link}>Support / contact ↗</Text>
            </Pressable>
            <Text style={styles.help}>
              Privacy: chat content, account email and diagnostics. Server transcripts
              are optional and controlled above. Local transcripts stay on this device.
            </Text>

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

const makeStyles = (colors: ThemeColors) => {
  const type = typography(colors);
  return StyleSheet.create({
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
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  identity: {
    flex: 1,
    gap: 3,
  },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  segmentItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  segmentActive: {
    backgroundColor: colors.text,
  },
  segmentText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.inverseText,
  },
  identityName: {
    ...type.heading,
  },
  identityEmail: {
    ...type.bodySmall,
    color: colors.textSecondary,
  },
  identityRole: {
    ...type.label,
    fontSize: 9,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  socialButtons: {
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  appleButton: {
    width: '100%',
    height: 44,
    borderRadius: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  muted: {
    ...type.bodySmall,
    color: colors.textMuted,
  },
  help: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textFaint,
  },
  link: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textSecondary,
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
    color: colors.textMuted,
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
    color: colors.textSecondary,
    textAlign: 'right',
    flexShrink: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusOk: {
    backgroundColor: colors.success,
  },
  statusBad: {
    backgroundColor: colors.danger,
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
    color: colors.text,
  },
  });
};
