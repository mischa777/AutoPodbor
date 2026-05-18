import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebaseServer";

export type SessionUser = {
  uid: string;
  email?: string;
};

export const sessionCookieName = "hta_session";

export async function verifyFirebaseIdToken(idToken: string): Promise<SessionUser> {
  const decoded = await getAdminAuth().verifyIdToken(idToken);
  return {
    uid: decoded.uid,
    email: decoded.email
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) return null;

  try {
    return await verifyFirebaseIdToken(token);
  } catch {
    return null;
  }
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
