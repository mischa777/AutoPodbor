import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { CarImage, CarInput, CarStatus, CarTextItem, CarWithRelations } from "@/lib/carTypes";
import { getCachedEnergotransbankEurSellRate } from "@/lib/exchangeRate";
import { getAdminFirestore } from "@/lib/firebaseServer";

export type { CarImage, CarInput, CarStatus, CarTextItem, CarWithRelations } from "@/lib/carTypes";

const carsCollection = "cars";

export async function getFeaturedCars() {
  const cars = await getAllCars();
  return cars.filter((car) => car.isFeatured);
}

export async function getAllCars() {
  const rate = await getCachedEnergotransbankEurSellRate();
  const snapshot = await getAdminFirestore()
    .collection(carsCollection)
    .orderBy("updatedAt", "desc")
    .get();

  return snapshot.docs.map((doc) => withLiveRate(mapCarDocument(doc), rate.value));
}

export async function getCarById(id: string) {
  const rate = await getCachedEnergotransbankEurSellRate();
  const snapshot = await getAdminFirestore().collection(carsCollection).doc(id).get();
  return snapshot.exists ? withLiveRate(mapCarDocument(snapshot), rate.value) : null;
}

export async function createCar(data: CarInput) {
  const docRef = getAdminFirestore().collection(carsCollection).doc();
  await docRef.set({
    ...normalizeCarInput(data),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  const snapshot = await docRef.get();
  return mapCarDocument(snapshot);
}

export async function updateCar(id: string, data: CarInput) {
  const docRef = getAdminFirestore().collection(carsCollection).doc(id);
  await docRef.set(
    {
      ...normalizeCarInput(data),
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  const snapshot = await docRef.get();
  return mapCarDocument(snapshot);
}

export async function deleteCar(id: string) {
  await getAdminFirestore().collection(carsCollection).doc(id).delete();
}

export async function archiveCar(id: string) {
  await getAdminFirestore().collection(carsCollection).doc(id).set(
    {
      status: "archived",
      isFeatured: false,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export async function updateCarStatus(id: string, status: CarStatus) {
  await getAdminFirestore().collection(carsCollection).doc(id).set(
    {
      status,
      isFeatured: status === "available" || status === "checking",
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export async function updateCarEditableField(id: string, field: string, value: string | number | null) {
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
  await getAdminFirestore().collection(carsCollection).doc(id).set(
    {
      [field]: value,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export async function getExistingCarSourceUrls() {
  const snapshot = await getAdminFirestore().collection(carsCollection).select("sourceUrl").get();
  return new Set(
    snapshot.docs
      .map((doc) => optionalStringValue(doc.get("sourceUrl")))
      .filter((url): url is string => Boolean(url))
      .map(normalizeSourceUrl)
  );
}

export function normalizeSourceUrl(url: string) {
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

function normalizeCarInput(data: CarInput): CarInput {
  return {
    ...data,
    month: data.month ?? null,
    bodyType: data.bodyType ?? null,
    engineVolumeCm3: data.engineVolumeCm3 ?? null,
    powerHp: data.powerHp ?? null,
    powerKw: data.powerKw ?? null,
    priceNettoEur: data.priceNettoEur ?? null,
    serviceFeeRub: data.serviceFeeRub ?? null,
    serviceFeePercent: data.serviceFeePercent || 7,
    marketPriceRub: data.marketPriceRub ?? null,
    location: data.location ?? null,
    sourceUrl: data.sourceUrl ?? null,
    shortDescription: data.shortDescription ?? null,
    reviewText: data.reviewText ?? null,
    images: normalizeOrderedItems(data.images),
    pros: normalizeOrderedItems(data.pros),
    cons: normalizeOrderedItems(data.cons)
  };
}

function normalizeOrderedItems<T extends { id?: string; order?: number }>(items: T[]) {
  return (items || []).map((item, order) => ({
    ...item,
    id: item.id || crypto.randomUUID(),
    order
  }));
}

function mapCarDocument(snapshot: FirebaseFirestore.DocumentSnapshot): CarWithRelations {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    title: stringValue(data.title),
    brand: stringValue(data.brand),
    model: stringValue(data.model),
    year: numberValue(data.year),
    month: optionalNumberValue(data.month),
    mileageKm: numberValue(data.mileageKm),
    bodyType: optionalStringValue(data.bodyType),
    engineDescription: stringValue(data.engineDescription),
    engineVolumeCm3: optionalNumberValue(data.engineVolumeCm3),
    powerHp: optionalNumberValue(data.powerHp),
    powerKw: optionalNumberValue(data.powerKw),
    transmission: stringValue(data.transmission),
    fuel: stringValue(data.fuel),
    priceBruttoEur: numberValue(data.priceBruttoEur),
    priceNettoEur: optionalNumberValue(data.priceNettoEur),
    eurRubRate: numberValue(data.eurRubRate),
    customsDutyRub: numberValue(data.customsDutyRub),
    platesInsuranceRub: numberValue(data.platesInsuranceRub),
    transportRub: numberValue(data.transportRub),
    customsFeeRub: numberValue(data.customsFeeRub),
    recyclingFeeRub: numberValue(data.recyclingFeeRub),
    customsChecksRub: numberValue(data.customsChecksRub),
    serviceFeeRub: optionalNumberValue(data.serviceFeeRub),
    serviceFeePercent: numberValue(data.serviceFeePercent) || 7,
    marketPriceRub: optionalNumberValue(data.marketPriceRub),
    location: optionalStringValue(data.location),
    sourceUrl: optionalStringValue(data.sourceUrl),
    shortDescription: optionalStringValue(data.shortDescription),
    reviewText: optionalStringValue(data.reviewText),
    status: isCarStatus(data.status) ? data.status : "available",
    isFeatured: Boolean(data.isFeatured),
    images: orderedItems<CarImage>(data.images),
    pros: orderedItems<CarTextItem>(data.pros),
    cons: orderedItems<CarTextItem>(data.cons),
    createdAt: dateValue(data.createdAt),
    updatedAt: dateValue(data.updatedAt)
  };
}

function withLiveRate(car: CarWithRelations, eurRubRate: number): CarWithRelations {
  return {
    ...car,
    eurRubRate: eurRubRate || car.eurRubRate
  };
}

function orderedItems<T extends { order: number }>(value: unknown): T[] {
  return Array.isArray(value)
    ? [...(value as T[])].sort((left, right) => (left.order || 0) - (right.order || 0))
    : [];
}

function isCarStatus(value: unknown): value is CarStatus {
  return value === "available" || value === "checking" || value === "sold" || value === "archived";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function optionalStringValue(value: unknown) {
  return typeof value === "string" && value.length ? value : null;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumberValue(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateValue(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}
