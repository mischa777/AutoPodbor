import { redirect } from "next/navigation";
import { getSessionUser, isAdminEmail, verifyFirebaseIdToken } from "@/lib/firebaseAdmin";

export async function requireAdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdminEmail(user.email)) redirect("/account");
  return user;
}

export async function requireAdminUser() {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) {
    throw new Error("Admin access required.");
  }
  return user;
}

export async function requireAdminRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
  const user = token ? await verifyFirebaseIdToken(token) : await getSessionUser();

  if (!user || !isAdminEmail(user.email)) {
    return null;
  }

  return user;
}
