/**
 * Runtime configuration.
 *
 * Only EXPO_PUBLIC_* values reach the bundle. They must be public by
 * definition: the Supabase anon key is a publishable client credential, never
 * a service-role key. Gemini/DeepSeek/provider secrets stay on the newlove
 * server and are never referenced here.
 */

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : null;
}

export const env = {
  apiUrl: clean(process.env.EXPO_PUBLIC_API_URL) ?? 'https://www.merkurov.love',
  siteUrl: clean(process.env.EXPO_PUBLIC_SITE_URL) ?? 'https://www.merkurov.love',
  supabaseUrl: clean(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
} as const;

export const isAuthConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

export function absoluteSiteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${env.siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
