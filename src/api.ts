// Default to the production VPS so users only need to set the API key.
// Override by setting PERSONAL_ARCHIVE_URL in the client config (useful for
// local dev or self-hosted instances on a different domain).
const DEFAULT_URL = 'https://vps-a9517071.vps.ovh.net';
const API_URL = process.env.PERSONAL_ARCHIVE_URL || DEFAULT_URL;
const API_KEY = process.env.PERSONAL_ARCHIVE_API_KEY || '';

if (!API_KEY) {
  process.stderr.write(
    '[personal-archive-mcp] PERSONAL_ARCHIVE_API_KEY not set. ' +
      'Generate one at https://vps-a9517071.vps.ovh.net/settings/api-keys\n',
  );
}

export async function apiCall(path: string, options: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${await res.text()}`);
  }
  if (res.status === 204) return {};
  return res.json();
}

/**
 * Wraps a result payload for MCP tool responses. Returns both the text
 * content (for clients that don't support structured output) and
 * structuredContent (for modern clients that can render it natively).
 *
 * The structuredContent is always wrapped in an object because the MCP
 * spec requires structuredContent to be an object. If the caller passes
 * a primitive/array, it's wrapped under a `result` key.
 */
export function textResult(data: unknown) {
  const structured: Record<string, unknown> =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : { result: data };
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: structured,
  };
}
