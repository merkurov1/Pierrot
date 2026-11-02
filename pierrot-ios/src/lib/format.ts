export function formatFlowDate(value?: string | null): string {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatRelative(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60_000));

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function plainTextFromMarkdown(value?: string | null): string {
  if (!value) return '';

  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function firstLine(value?: string | null): string {
  const text = plainTextFromMarkdown(value);
  if (!text) return '';

  const sentence = text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || text;
  return sentence.length > 180 ? `${sentence.slice(0, 179).trimEnd()}…` : sentence;
}

export function hostFromUrl(value?: string | null): string {
  if (!value) return '';

  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
}
