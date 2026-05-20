import { NextResponse } from "next/server";
import { scanConfiguredCarSearches } from "@/lib/telegramScanner";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAllowedCronRequest(request)) {
    return NextResponse.json({ error: "Cron access denied." }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const result = await scanConfiguredCarSearches({ debug: url.searchParams.get("debug") === "1" });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Telegram scan failed." },
      { status: 500 }
    );
  }
}

function isAllowedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV !== "production") return true;
  if (!secret) return false;

  const url = new URL(request.url);
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return url.searchParams.get("secret") === secret || bearer === secret;
}
