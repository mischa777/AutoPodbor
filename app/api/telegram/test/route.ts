import { NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAllowedTestRequest(request)) {
    return NextResponse.json({ error: "Telegram test access denied." }, { status: 403 });
  }

  try {
    const message = await sendTelegramMessage("Тест Telegram: связь с сайтом работает.");
    return NextResponse.json({ ok: true, messageId: message.message_id });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Telegram test failed." },
      { status: 500 }
    );
  }
}

function isAllowedTestRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV !== "production") return true;
  if (!secret) return false;

  const url = new URL(request.url);
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return url.searchParams.get("secret") === secret || bearer === secret;
}
