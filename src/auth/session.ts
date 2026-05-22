import { cookies } from "next/headers";

const SESSION_COOKIE = "mircioo_session";

export interface SessionPayload {
  userId: string;
  workspaceId: string;
  role: string;
}

export async function setSession(payload: SessionPayload): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.userId && parsed.workspaceId && parsed.role) {
      return parsed as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export function createId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
