import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { updateCarEditableField } from "@/lib/cars";
import { getAdminFirestore } from "@/lib/firebaseServer";
import { getCandidate, updateCandidateCarField } from "@/lib/telegramCandidates";

export type EditTargetType = "candidate" | "car";

export type TelegramEditSession = {
  chatId: string;
  targetType: EditTargetType;
  targetId: string;
  field: EditableTelegramField;
  messageId: number;
  promptMessageId?: number | null;
  createdAt?: string | null;
};

export type EditableTelegramField =
  | "title"
  | "priceBruttoEur"
  | "mileageKm"
  | "engineVolumeCm3"
  | "powerHp"
  | "engineDescription"
  | "fuel"
  | "transmission"
  | "location"
  | "shortDescription";

const collectionName = "telegramEditSessions";

export const editableFieldLabels: Record<EditableTelegramField, string> = {
  title: "Название",
  priceBruttoEur: "Цена brutto EUR",
  mileageKm: "Пробег, км",
  engineVolumeCm3: "Объем двигателя, см3",
  powerHp: "Мощность, л.с.",
  engineDescription: "Двигатель",
  fuel: "Топливо",
  transmission: "Коробка",
  location: "Локация",
  shortDescription: "Краткое описание"
};

export function isEditableTelegramField(value: string): value is EditableTelegramField {
  return value in editableFieldLabels;
}

export async function setTelegramEditSession(session: TelegramEditSession) {
  await sessionRef(session.chatId).set({
    ...session,
    createdAt: FieldValue.serverTimestamp()
  });
}

export async function getTelegramEditSession(chatId: number | string) {
  const snapshot = await sessionRef(chatId).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  const field = String(data.field || "");
  if (!isEditableTelegramField(field)) return null;
  return {
    chatId: String(chatId),
    targetType: data.targetType === "car" ? "car" : "candidate",
    targetId: String(data.targetId || ""),
    field,
    messageId: Number(data.messageId || 0),
    promptMessageId: optionalNumber(data.promptMessageId),
    createdAt: dateValue(data.createdAt)
  } satisfies TelegramEditSession;
}

export async function clearTelegramEditSession(chatId: number | string) {
  await sessionRef(chatId).delete();
}

export async function applyTelegramEdit(session: TelegramEditSession, rawValue: string) {
  const value = parseFieldValue(session.field, rawValue);
  if (session.targetType === "candidate") {
    await updateCandidateCarField(session.targetId, session.field, value);
    return getCandidate(session.targetId);
  }
  await updateCarEditableField(session.targetId, session.field, value);
  return null;
}

function parseFieldValue(field: EditableTelegramField, rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;
  if (["priceBruttoEur", "mileageKm", "engineVolumeCm3", "powerHp"].includes(field)) {
    const parsed = Number(trimmed.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(parsed)) throw new Error("Нужно прислать число.");
    return Math.round(parsed);
  }
  return trimmed;
}

function sessionRef(chatId: number | string) {
  return getAdminFirestore().collection(collectionName).doc(String(chatId));
}

function dateValue(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function optionalNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
