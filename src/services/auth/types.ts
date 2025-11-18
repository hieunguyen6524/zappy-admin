export type AuthUser = {
  id: string; // UUID from Supabase Auth
  email: string;
  fullName?: string;
  roles: string[];
};

export type LoginResponse = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: { id: string; email: string; fullName?: string; roles: string[] };
};

export type CreateAdminRequest = {
  email: string;
  password: string;
  fullName: string;
  role?: "admin" | "superadmin";
};

export type CreateAdminResponse = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

