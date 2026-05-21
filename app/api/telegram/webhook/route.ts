import { NextResponse } from "next/server";
import { getCarById, updateCarStatus, type CarStatus, type CarWithRelations } from "@/lib/cars";
import { answerCallbackQuery, editTelegramMessage, sendTelegramForceReply, type TelegramCallbackQuery, type TelegramTextMessage } from "@/lib/telegram";
import {
  applyTelegramEdit,
  clearTelegramEditSession,
  editableFieldLabels,
  getTelegramEditSession,
  isEditableTelegramField,
  setTelegramEditSession,
  type EditTargetType
} from "@/lib/telegramEditSessions";
import {
  candidateAfterDescriptionKeyboard,
  candidateKeyboard,
  editFieldKeyboard,
  formatCandidateMessage,
  formatCandidateWithContent,
  publishedCarKeyboard
} from "@/lib/telegramScanner";
import { generateCandidateContent, getCandidate, publishCandidate, skipCandidate } from "@/lib/telegramCandidates";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

type TelegramUpdate = {
  callback_query?: TelegramCallbackQuery;
  message?: TelegramTextMessage;
};

export async function POST(request: Request) {
  if (!isAllowedTelegramRequest(request)) {
    return NextResponse.json({ error: "Telegram webhook denied." }, { status: 403 });
  }

  const update = (await request.json()) as TelegramUpdate;
  if (update.message?.text) {
    await handleTextMessage(update.message);
    return NextResponse.json({ ok: true });
  }

  const callback = update.callback_query;
  if (!callback?.data || !callback.message) {
    return NextResponse.json({ ok: true });
  }

  const [action, ...parts] = callback.data.split(":");
  const chatId = callback.message.chat.id;
  const messageId = callback.message.message_id;

  try {
    if (action === "describe") {
      const candidateId = parts[0];
      await answerCallbackQuery(callback.id, "Готовлю описание");
      const candidate = await generateCandidateContent(candidateId);
      await editTelegramMessage(chatId, messageId, formatCandidateWithContent(candidate), candidateAfterDescriptionKeyboard(candidate.id, candidate.car.sourceUrl));
      return NextResponse.json({ ok: true });
    }

    if (action === "publish") {
      const candidateId = parts[0];
      await answerCallbackQuery(callback.id, "Добавляю в подборку");
      const carId = await publishCandidate(candidateId);
      const candidate = await getCandidate(candidateId);
      await editTelegramMessage(
        chatId,
        messageId,
        [`Добавлено в подборку.`, `ID: ${carId}`, "", candidate ? formatCandidateMessage(candidate) : undefined].filter(Boolean).join("\n"),
        publishedCarKeyboard(carId)
      );
      return NextResponse.json({ ok: true });
    }

    if (action === "skip") {
      const candidateId = parts[0];
      await answerCallbackQuery(callback.id, "Пропущено");
      await skipCandidate(candidateId);
      const candidate = await getCandidate(candidateId);
      await editTelegramMessage(chatId, messageId, candidate ? `Пропущено.\n\n${formatCandidateMessage(candidate)}` : "Пропущено.");
      return NextResponse.json({ ok: true });
    }

    if (action === "status") {
      const [carId, status] = parts;
      if (!isCarStatus(status)) throw new Error("Unknown status.");
      await answerCallbackQuery(callback.id, "Статус обновлен");
      await updateCarStatus(carId, status);
      const car = await getCarById(carId);
      await editTelegramMessage(chatId, messageId, car ? formatPublishedCarMessage(car) : `Статус обновлен: ${statusLabel(status)}\nID: ${carId}`, publishedCarKeyboard(carId));
      return NextResponse.json({ ok: true });
    }

    if (action === "editmenu") {
      const [targetType, targetId] = parts;
      if (!isEditTargetType(targetType)) throw new Error("Unknown edit target.");
      await answerCallbackQuery(callback.id, "Выберите поле");
      await editTelegramMessage(chatId, messageId, "Что изменить?", editFieldKeyboard(targetType, targetId));
      return NextResponse.json({ ok: true });
    }

    if (action === "edit") {
      const [targetType, targetId, field] = parts;
      if (!isEditTargetType(targetType) || !isEditableTelegramField(field)) throw new Error("Unknown edit field.");
      const prompt = await sendTelegramForceReply(chatId, `Ответьте на это сообщение новым значением для поля: ${editableFieldLabels[field]}`);
      await setTelegramEditSession({
        chatId: String(chatId),
        targetType,
        targetId,
        field,
        messageId,
        promptMessageId: prompt.message_id
      });
      await answerCallbackQuery(callback.id, "Жду новое значение");
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

async function handleTextMessage(message: TelegramTextMessage) {
  const session = await getTelegramEditSession(message.chat.id);
  if (!session || !message.text) return;
  if (session.promptMessageId && message.reply_to_message?.message_id !== session.promptMessageId) return;
  const updatedCandidate = await applyTelegramEdit(session, message.text);
  await clearTelegramEditSession(message.chat.id);

  if (session.targetType === "candidate" && updatedCandidate) {
    const keyboard = updatedCandidate.content
      ? candidateAfterDescriptionKeyboard(updatedCandidate.id, updatedCandidate.car.sourceUrl)
      : candidateKeyboard(updatedCandidate.id, updatedCandidate.car.sourceUrl);
    const text = updatedCandidate.content ? formatCandidateWithContent(updatedCandidate) : formatCandidateMessage(updatedCandidate);
    await editTelegramMessage(message.chat.id, session.messageId, text, keyboard);
    return;
  }

  const car = await getCarById(session.targetId);
  await editTelegramMessage(message.chat.id, session.messageId, car ? formatPublishedCarMessage(car) : `Поле обновлено: ${editableFieldLabels[session.field]}\nID: ${session.targetId}`, publishedCarKeyboard(session.targetId));
}

function isAllowedTelegramRequest(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret && process.env.NODE_ENV !== "production") return true;
  if (!secret) return false;
  return request.headers.get("x-telegram-bot-api-secret-token") === secret;
}

function isCarStatus(value: string): value is CarStatus {
  return value === "available" || value === "checking" || value === "sold" || value === "archived";
}

function isEditTargetType(value: string): value is EditTargetType {
  return value === "candidate" || value === "car";
}

function statusLabel(status: CarStatus) {
  if (status === "available") return "доступно";
  if (status === "checking") return "проверяется";
  if (status === "sold") return "продано";
  return "архив";
}

function formatPublishedCarMessage(car: CarWithRelations) {
  return [
    "Машина в подборке",
    "",
    car.title || [car.brand, car.model, car.year].filter(Boolean).join(" "),
    [
      car.year ? `${car.year} г.` : undefined,
      car.mileageKm ? `${formatNumber(car.mileageKm)} км` : undefined,
      car.fuel,
      car.powerHp ? `${car.powerHp} л.с.` : undefined,
      car.engineVolumeCm3 ? `${formatNumber(car.engineVolumeCm3)} см3` : undefined,
      car.transmission
    ].filter(Boolean).join(" | "),
    car.priceBruttoEur ? `Цена: ${formatNumber(car.priceBruttoEur)} EUR brutto` : undefined,
    car.priceNettoEur ? `Netto: ${formatNumber(car.priceNettoEur)} EUR` : undefined,
    car.location ? `Локация: ${car.location}` : undefined,
    `Статус: ${statusLabel(car.status)}`,
    `ID: ${car.id}`
  ].filter(Boolean).join("\n");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);
}
