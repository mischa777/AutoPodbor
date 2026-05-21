import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth";
import { archiveUnavailableCarLinks } from "@/lib/linkHealth";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await requireAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  return NextResponse.json(await archiveUnavailableCarLinks());
}
