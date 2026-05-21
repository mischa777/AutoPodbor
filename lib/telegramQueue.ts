import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebaseServer";

export type TelegramQueue = {
  id: string;
  candidateIds: string[];
  currentIndex: number;
  messageId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const queueId = "default";
const queueRef = () => getAdminFirestore().collection("telegramQueues").doc(queueId);

export async function appendTelegramQueue(candidateIds: string[]) {
  const uniqueIds = [...new Set(candidateIds.filter(Boolean))];
  if (!uniqueIds.length) return getTelegramQueue();

  const snapshot = await queueRef().get();
  const current = snapshot.exists ? mapQueue(snapshot) : null;
  const nextIds = [...new Set([...(current?.candidateIds || []), ...uniqueIds])];

  await queueRef().set(
    {
      candidateIds: nextIds,
      currentIndex: current?.currentIndex || 0,
      messageId: current?.messageId || null,
      createdAt: current ? snapshot.get("createdAt") : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return getTelegramQueue();
}

export async function getTelegramQueue() {
  const snapshot = await queueRef().get();
  return snapshot.exists ? mapQueue(snapshot) : null;
}

export async function setTelegramQueueMessage(messageId: number) {
  await queueRef().set(
    {
      messageId,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export async function moveTelegramQueue(step: number) {
  const queue = await getTelegramQueue();
  if (!queue) return null;
  const maxIndex = Math.max(queue.candidateIds.length - 1, 0);
  const currentIndex = Math.min(Math.max(queue.currentIndex + step, 0), maxIndex);
  await queueRef().set(
    {
      currentIndex,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  return getTelegramQueue();
}

export async function removeCurrentFromTelegramQueue() {
  const queue = await getTelegramQueue();
  if (!queue) return null;
  const candidateIds = queue.candidateIds.filter((_, index) => index !== queue.currentIndex);
  const currentIndex = Math.min(queue.currentIndex, Math.max(candidateIds.length - 1, 0));
  await queueRef().set(
    {
      candidateIds,
      currentIndex,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  return getTelegramQueue();
}

function mapQueue(snapshot: FirebaseFirestore.DocumentSnapshot): TelegramQueue {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    candidateIds: Array.isArray(data.candidateIds) ? data.candidateIds.map(String) : [],
    currentIndex: numberValue(data.currentIndex),
    messageId: optionalNumberValue(data.messageId),
    createdAt: dateValue(data.createdAt),
    updatedAt: dateValue(data.updatedAt)
  };
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function dateValue(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}
