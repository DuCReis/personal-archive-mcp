const API_URL = process.env.PERSONAL_ARCHIVE_URL || 'http://localhost';
const API_KEY = process.env.PERSONAL_ARCHIVE_API_KEY || '';

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

export function textResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}
