import { NextResponse } from "next/server";
import { getSessionUser, isAdminEmail } from "@/lib/firebaseAdmin";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({
    user,
    isAdmin: isAdminEmail(user?.email)
  });
}
