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

function getSessionId(): string {
  let id = sessionStorage.getItem("ew_session_id");
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("ew_session_id", id);
  }
  return id;
}

async function logAuditError(payload: {
  pageUrl: string;
  issueType: string;
  severity: string;
  errorMessage?: string;
  sessionId?: string;
}) {
  try {
    await fetch(`${API_BASE}/audit/errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // best effort
  }
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

  const t0 = Date.now();
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const responseTimeMs = Date.now() - t0;

  if (response.status === 401) {
    dispatchAuthError();
    throw new AuthTokenError();
  }

  if (!response.ok && response.status !== 401) {
    const severityLevel =
      response.status >= 500
        ? "HIGH"
        : response.status >= 400
        ? "MEDIUM"
        : "LOW";

    logAuditError({
      pageUrl: window.location.pathname,
      issueType: response.status >= 500 ? "api_500" : "api_non_200",
      severity: severityLevel,
      errorMessage: `${options.method ?? "GET"} ${path} returned HTTP ${response.status}`,
      sessionId: getSessionId(),
    });
  }

  if (responseTimeMs > 1000) {
    logAuditError({
      pageUrl: window.location.pathname,
      issueType: "api_slow",
      severity: "LOW",
      errorMessage: `${path} took ${responseTimeMs}ms`,
      sessionId: getSessionId(),
    });
  }

  return response;
}
