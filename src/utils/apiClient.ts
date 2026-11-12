/**
 * Safely calls backend API endpoints with automated fallback for client-only / static environments (like Vercel).
 * When running on static hosts without a Node backend, endpoints return 404, 405, or HTML rewrites.
 * This helper ensures that `json()` parsing never throws `Unexpected end of JSON input`.
 */
export async function safeApiCall<T>(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; data: T | null; status: number }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const text = await res.text();
      if (!text || !text.trim()) {
        return { ok: false, data: null, status: res.status };
      }
      try {
        const data = JSON.parse(text) as T;
        return { ok: true, data, status: res.status };
      } catch (e) {
        return { ok: false, data: null, status: res.status };
      }
    }
    return { ok: false, data: null, status: res.status };
  } catch (err) {
    return { ok: false, data: null, status: 0 };
  }
}
