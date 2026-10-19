export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string; message: string; fields: Record<string, string> };

export type ApiFailure = Extract<ApiResult<never>, { ok: false }>;

const NETWORK_MESSAGE = "Could not reach the server. Try again.";
const UNKNOWN_MESSAGE = "Something went wrong. Try again.";

// Calls the JSON API from the browser and reads the shared error shape. Never throws.
export async function apiRequest<T = void>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, code: "network_error", message: NETWORK_MESSAGE, fields: {} };
  }
  if (response.ok) {
    const text = await response.text();
    return { ok: true, data: (text ? JSON.parse(text) : undefined) as T };
  }
  const parsed = (await response.json().catch(() => null)) as {
    error?: { code?: string; message?: string; fields?: Record<string, string> };
  } | null;
  return {
    ok: false,
    status: response.status,
    code: parsed?.error?.code ?? "unknown",
    message: parsed?.error?.message ?? UNKNOWN_MESSAGE,
    fields: parsed?.error?.fields ?? {},
  };
}
