import { createHash } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { createCar, type CarInput } from "@/lib/cars";
import type { GeneratedCarContent } from "@/lib/aiCarContent";
import { generateCarContent } from "@/lib/aiCarContent";
import { getAdminFirestore } from "@/lib/firebaseServer";
import type { ImportedCar } from "@/lib/importCar";

export type CandidateStatus = "new" | "described" | "published" | "skipped";

export type TelegramCandidate = {
  id: string;
  url: string;
  status: CandidateStatus;
  car: ImportedCar;
  content?: GeneratedCarContent | null;
  telegramMessageId?: number | null;
  scanSource?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  publishedCarId?: string | null;
};

const collectionName = "telegramCandidates";

export function candidateIdFromUrl(url: string) {
  return createHash("sha1").update(normalizeCandidateUrl(url)).digest("hex").slice(0, 24);
}

export async function getCandidate(id: string) {
  const snapshot = await getAdminFirestore().collection(collectionName).doc(id).get();
  return snapshot.exists ? mapCandidate(snapshot) : null;
}

export async function upsertCandidate(car: ImportedCar, scanSource?: string) {
  const url = car.sourceUrl;
  if (!url) throw new Error("Candidate source URL is missing.");
  const id = candidateIdFromUrl(url);
  const ref = getAdminFirestore().collection(collectionName).doc(id);
  const snapshot = await ref.get();
  const existing = snapshot.exists ? mapCandidate(snapshot) : null;
  if (existing?.status === "published" || existing?.status === "skipped") return existing;

  await ref.set(
    {
      url: normalizeCandidateUrl(url),
      car: stripUndefined(car),
      scanSource: scanSource || null,
      status: existing?.status || "new",
      telegramMessageId: existing?.telegramMessageId || null,
      content: existing?.content || null,
      publishedCarId: existing?.publishedCarId || null,
      createdAt: existing ? snapshot.get("createdAt") : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  const updated = await ref.get();
  return mapCandidate(updated);
}

export async function setCandidateTelegramMessage(id: string, messageId: number) {
  await getAdminFirestore().collection(collectionName).doc(id).set(
    {
      telegramMessageId: messageId,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export async function generateCandidateContent(id: string) {
  const candidate = await requireCandidate(id);
  const content = await generateCarContent(toContentInput(candidate.car));
  await getAdminFirestore().collection(collectionName).doc(id).set(
    {
      content,
      status: "described",
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  return { ...candidate, content, status: "described" as CandidateStatus };
}

export async function publishCandidate(id: string) {
  const candidate = await requireCandidate(id);
  if (candidate.publishedCarId) return candidate.publishedCarId;
  const car = await createCar(toCarInput(candidate.car, candidate.content || undefined));
  await getAdminFirestore().collection(collectionName).doc(id).set(
    {
      status: "published",
      publishedCarId: car.id,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  return car.id;
}

export async function skipCandidate(id: string) {
  await getAdminFirestore().collection(collectionName).doc(id).set(
    {
      status: "skipped",
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export async function updateCandidateCarField(id: string, field: string, value: string | number | null) {
  const allowedFields = new Set([
    "title",
    "brand",
    "model",
    "year",
    "mileageKm",
    "bodyType",
    "engineDescription",
    "engineVolumeCm3",
    "powerHp",
    "transmission",
    "fuel",
    "priceBruttoEur",
    "priceNettoEur",
    "location",
    "shortDescription",
    "reviewText"
  ]);
  if (!allowedFields.has(field)) throw new Error("This field cannot be edited from Telegram.");
  await getAdminFirestore().collection(collectionName).doc(id).set(
    {
      [`car.${field}`]: value,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export function toCarInput(car: ImportedCar, content?: GeneratedCarContent): CarInput {
  const title = car.title || [car.brand, car.model, car.year].filter(Boolean).join(" ");
  return {
    title: title || "Автомобиль из Германии",
    brand: car.brand || "",
    model: car.model || "",
    year: car.year || new Date().getFullYear(),
    month: car.month ?? null,
    mileageKm: car.mileageKm || 0,
    bodyType: car.bodyType || null,
    engineDescription: car.engineDescription || [car.fuel, car.powerHp ? `${car.powerHp} л.с.` : undefined].filter(Boolean).join(" / "),
    engineVolumeCm3: car.engineVolumeCm3 ?? null,
    powerHp: car.powerHp ?? null,
    powerKw: car.powerKw ?? null,
    transmission: car.transmission || "",
    fuel: car.fuel || "",
    priceBruttoEur: car.priceBruttoEur || 0,
    priceNettoEur: car.priceNettoEur ?? null,
    eurRubRate: car.eurRubRate || 0,
    customsDutyRub: car.customsDutyRub || 0,
    platesInsuranceRub: car.platesInsuranceRub || 15000,
    transportRub: car.transportRub || 30000,
    customsFeeRub: car.customsFeeRub || 0,
    recyclingFeeRub: car.recyclingFeeRub || 0,
    customsChecksRub: car.customsChecksRub || 65000,
    serviceFeeRub: car.serviceFeeRub ?? null,
    serviceFeePercent: car.serviceFeePercent || 7,
    marketPriceRub: car.marketPriceRub ?? null,
    location: car.location || null,
    sourceUrl: car.sourceUrl || null,
    shortDescription: content?.shortDescription || car.shortDescription || null,
    reviewText: content?.reviewText || car.reviewText || null,
    status: "available",
    isFeatured: true,
    images: (car.images || []).slice(0, 20).map((image, order) => ({
      id: crypto.randomUUID(),
      url: image.url,
      alt: image.alt || title || "Фото автомобиля",
      order
    })),
    pros: (content?.pros || []).map((item, order) => ({
      id: crypto.randomUUID(),
      title: item.title,
      text: item.text,
      order
    })),
    cons: (content?.cons || []).map((item, order) => ({
      id: crypto.randomUUID(),
      title: item.title,
      text: item.text,
      order
    }))
  };
}

function toContentInput(car: ImportedCar) {
  return {
    title: car.title,
    brand: car.brand,
    model: car.model,
    year: valueToString(car.year),
    month: valueToString(car.month),
    mileageKm: valueToString(car.mileageKm),
    bodyType: car.bodyType,
    engineDescription: car.engineDescription,
    engineVolumeCm3: valueToString(car.engineVolumeCm3),
    powerHp: valueToString(car.powerHp),
    transmission: car.transmission,
    fuel: car.fuel,
    location: car.location
  };
}

async function requireCandidate(id: string) {
  const candidate = await getCandidate(id);
  if (!candidate) throw new Error("Candidate was not found.");
  return candidate;
}

function mapCandidate(snapshot: FirebaseFirestore.DocumentSnapshot): TelegramCandidate {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    url: stringValue(data.url),
    status: isCandidateStatus(data.status) ? data.status : "new",
    car: (data.car || {}) as ImportedCar,
    content: (data.content || null) as GeneratedCarContent | null,
    telegramMessageId: optionalNumberValue(data.telegramMessageId),
    scanSource: optionalStringValue(data.scanSource),
    publishedCarId: optionalStringValue(data.publishedCarId),
    createdAt: dateValue(data.createdAt),
    updatedAt: dateValue(data.updatedAt)
  };
}

function normalizeCandidateUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("position");
    parsed.searchParams.delete("source");
    parsed.searchParams.delete("source_otp");
    parsed.searchParams.delete("relevance_adjustment");
    parsed.searchParams.delete("boosting_product");
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function isCandidateStatus(value: unknown): value is CandidateStatus {
  return value === "new" || value === "described" || value === "published" || value === "skipped";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function optionalStringValue(value: unknown) {
  return typeof value === "string" && value.length ? value : null;
}

function optionalNumberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function valueToString(value: unknown) {
  return value === undefined || value === null ? undefined : String(value);
}

function dateValue(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)).filter((item) => item !== undefined) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefined(entry)])
    ) as T;
  }
  return value;
}
