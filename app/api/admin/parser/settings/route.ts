import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth";
import { getParserSettings, parseSearchUrls, saveParserSettings } from "@/lib/parserSettings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  return NextResponse.json(await getParserSettings());
}

export async function POST(request: Request) {
  const admin = await requireAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const body = await request.json();
  const settings = await saveParserSettings({
    ...body,
    searchUrls: typeof body.searchUrlsText === "string" ? parseSearchUrls(body.searchUrlsText) : body.searchUrls
  });
  return NextResponse.json(settings);
}
