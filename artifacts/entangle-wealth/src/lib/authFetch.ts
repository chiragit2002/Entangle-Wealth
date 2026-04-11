const API_BASE = "/api";

export class AuthTokenError extends Error {
  constructor() {
    super("Authentication required. Please sign in to continue.");
    this.name = "AuthTokenError";
  }
}

function dispatchAuthError() {
  window.dispatchEvent(new CustomEvent("auth-error"));
}

export async function authFetch(
  path: string,
  getToken: () => Promise<string | null>,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getToken();
  if (!token) {
    dispatchAuthError();
    throw new AuthTokenError();
  }
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
    Authorization: `Bearer ${token}`,
  };
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (response.status === 401) {
    dispatchAuthError();
    throw new AuthTokenError();
  }

  return response;
}
