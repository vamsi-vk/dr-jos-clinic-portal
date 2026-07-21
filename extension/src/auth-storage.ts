/** Shared extension auth helpers (popup + content script) */

export type StoredAuth = {
  token?: string;
  user?: { name?: string; email?: string };
  apiBase?: string;
  tokenExpiresAt?: number;
};

export function getStoredAuth(): Promise<StoredAuth> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_AUTH" }, (data) => {
      resolve((data ?? {}) as StoredAuth);
    });
  });
}

export function setStoredAuth(payload: {
  token: string;
  user: unknown;
  apiBase: string;
  expiresIn?: number;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: "SET_AUTH",
        token: payload.token,
        user: payload.user,
        apiBase: payload.apiBase,
        tokenExpiresAt: payload.expiresIn
          ? Date.now() + payload.expiresIn * 1000
          : undefined,
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      }
    );
  });
}

export function clearStoredAuth(): Promise<void> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "CLEAR_AUTH" }, () => resolve());
  });
}

export function isTokenExpired(auth: StoredAuth): boolean {
  if (!auth.token) return true;
  if (!auth.tokenExpiresAt) return false;
  return Date.now() >= auth.tokenExpiresAt - 60_000;
}

export async function refreshTokenIfPossible(auth: StoredAuth): Promise<StoredAuth> {
  if (!auth.token || !auth.apiBase) return auth;
  const apiBase = auth.apiBase.replace(/\/$/, "");
  try {
    const res = await fetch(`${apiBase}/api/extension/session`, {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (!res.ok) return auth;
    const data = (await res.json()) as { token?: string; expiresIn?: number };
    if (!data.token) return auth;
    await setStoredAuth({
      token: data.token,
      user: auth.user,
      apiBase,
      expiresIn: data.expiresIn ?? 604800,
    });
    return {
      ...auth,
      token: data.token,
      apiBase,
      tokenExpiresAt: Date.now() + (data.expiresIn ?? 604800) * 1000,
    };
  } catch {
    return auth;
  }
}

export async function ensureValidAuth(auth: StoredAuth): Promise<StoredAuth | null> {
  if (!auth.token || !auth.apiBase) return null;

  if (isTokenExpired(auth)) {
    await clearStoredAuth();
    return null;
  }

  const apiBase = auth.apiBase.replace(/\/$/, "");
  try {
    const res = await fetch(`${apiBase}/api/extension/session`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (res.ok) {
      return refreshTokenIfPossible(auth);
    }
    if (res.status === 401) {
      await clearStoredAuth();
      return null;
    }
  } catch {
    return auth;
  }

  return auth;
}

export const SESSION_EXPIRED_MESSAGE =
  "Session expired — open the extension popup, confirm API URL is http://localhost:3002, and sign in again.";

export const AUTH_INVALID_MESSAGE =
  "Could not verify sign-in — open the extension popup and sign in again (API: http://localhost:3002).";
