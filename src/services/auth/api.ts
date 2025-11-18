/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AuthUser, LoginResponse, CreateAdminRequest, CreateAdminResponse } from './types';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './tokens';

export async function login(
  email: string,
  password: string
): Promise<AuthUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as LoginResponse | { error?: string };
  if (!res.ok) throw new Error((data as any)?.error || "Đăng nhập thất bại");
  const d = data as LoginResponse;
  setTokens(d.accessToken, d.refreshToken);
  return {
    id: d.user.id,
    email: d.user.email,
    fullName: d.user.fullName,
    roles: d.user.roles,
  };
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

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
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
    return { 
      id: by.id, 
      email: by.email, 
      fullName: by.fullName,
      roles: by.roles || [] 
    };
  } catch {
    return null;
  }
}

export async function createAdmin(
  data: CreateAdminRequest
): Promise<CreateAdminResponse> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Không có quyền truy cập");
  }

  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const result = (await res.json()) as CreateAdminResponse | { error?: string };
  if (!res.ok) {
    throw new Error((result as any)?.error || "Tạo tài khoản thất bại");
  }

  return result as CreateAdminResponse;
}

