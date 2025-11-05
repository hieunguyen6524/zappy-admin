export type AuthUser = {
  id: number;
  email: string;
  fullName?: string;
  roles: string[];
};

type LoginResponse = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: { id: number; email: string; fullName?: string; roles: string[] };
};

const ACCESS_KEY = "auth.accessToken";
const REFRESH_KEY = "auth.refreshToken";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as LoginResponse | { error?: string };
  if (!res.ok) throw new Error((data as any)?.error || "Đăng nhập thất bại");
  const d = data as LoginResponse;
  setTokens(d.accessToken, d.refreshToken);
  return { id: d.user.id, email: d.user.email, fullName: d.user.fullName, roles: d.user.roles };
}

export async function refresh(): Promise<string> {
  const rt = getRefreshToken();
  if (!rt) throw new Error("Missing refresh token");
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: rt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Làm mới token thất bại");
  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken as string;
}

export async function logout(): Promise<void> {
  const at = getAccessToken();
  const rt = getRefreshToken();
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(at ? { Authorization: `Bearer ${at}` } : {}),
      },
      body: JSON.stringify(rt ? { refreshToken: rt } : {}),
    });
  } catch (_) {
    // ignore
  }
  clearTokens();
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  let at = getAccessToken();
  const headers = new Headers(init.headers || {});
  if (at) headers.set("Authorization", `Bearer ${at}`);
  let res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    try {
      at = await refresh();
      const retryHeaders = new Headers(init.headers || {});
      retryHeaders.set("Authorization", `Bearer ${at}`);
      res = await fetch(input, { ...init, headers: retryHeaders });
    } catch (_) {
      // refresh failed
    }
  }
  return res;
}

export async function me(): Promise<AuthUser | null> {
  try {
    const res = await authFetch("/api/admin/ping");
    if (!res.ok) return null;
    const data = await res.json();
    const by = data?.by;
    if (!by) return null;
    return { id: by.id, email: by.email, roles: by.roles };
  } catch {
    return null;
  }
}


