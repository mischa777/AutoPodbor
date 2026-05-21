import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth";
import { getParserSettings } from "@/lib/parserSettings";
import { scanConfiguredCarSearches } from "@/lib/telegramScanner";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await requireAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const url = new URL(request.url);
  const settings = await getParserSettings();
  const result = await scanConfiguredCarSearches({
    settings,
    debug: url.searchParams.get("debug") === "1"
  });
  return NextResponse.json(result);
}
