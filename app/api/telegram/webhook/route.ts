import { NextResponse } from "next/server";
import { answerCallbackQuery, editTelegramMessage, type TelegramCallbackQuery } from "@/lib/telegram";
import {
  candidateAfterDescriptionKeyboard,
  candidateKeyboard,
  formatCandidateMessage,
  formatCandidateWithContent
} from "@/lib/telegramScanner";
import { generateCandidateContent, getCandidate, publishCandidate, skipCandidate } from "@/lib/telegramCandidates";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

type TelegramUpdate = {
  callback_query?: TelegramCallbackQuery;
};

export async function POST(request: Request) {
  if (!isAllowedTelegramRequest(request)) {
    return NextResponse.json({ error: "Telegram webhook denied." }, { status: 403 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const callback = update.callback_query;
  if (!callback?.data || !callback.message) {
    return NextResponse.json({ ok: true });
  }

  const [action, candidateId] = callback.data.split(":");
  const chatId = callback.message.chat.id;
  const messageId = callback.message.message_id;

  try {
    if (action === "describe") {
      await answerCallbackQuery(callback.id, "Готовлю описание");
      const candidate = await generateCandidateContent(candidateId);
      await editTelegramMessage(chatId, messageId, formatCandidateWithContent(candidate), candidateAfterDescriptionKeyboard(candidate.id, candidate.car.sourceUrl));
      return NextResponse.json({ ok: true });
    }

    if (action === "publish") {
      await answerCallbackQuery(callback.id, "Добавляю в подборку");
      const carId = await publishCandidate(candidateId);
      const candidate = await getCandidate(candidateId);
      await editTelegramMessage(
        chatId,
        messageId,
        [`Добавлено в подборку.`, `ID: ${carId}`, "", candidate ? formatCandidateMessage(candidate) : undefined].filter(Boolean).join("\n")
      );
      return NextResponse.json({ ok: true });
    }

    if (action === "skip") {
      await answerCallbackQuery(callback.id, "Пропущено");
      await skipCandidate(candidateId);
      const candidate = await getCandidate(candidateId);
      await editTelegramMessage(chatId, messageId, candidate ? `Пропущено.\n\n${formatCandidateMessage(candidate)}` : "Пропущено.");
      return NextResponse.json({ ok: true });
    }

    await answerCallbackQuery(callback.id, "Неизвестная кнопка");
    return NextResponse.json({ ok: true });
  } catch (error) {
    await answerCallbackQuery(callback.id, error instanceof Error ? error.message.slice(0, 180) : "Ошибка");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Telegram action failed." },
      { status: 500 }
    );
  }
}

function isAllowedTelegramRequest(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret && process.env.NODE_ENV !== "production") return true;
  if (!secret) return false;
  return request.headers.get("x-telegram-bot-api-secret-token") === secret;
}
