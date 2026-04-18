export interface User {
  id: number;
  username: string;
  display_name: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  status: string;
}

export function saveSession(token: string, user: User) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function getToken(): string {
  return localStorage.getItem("token") || "";
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
