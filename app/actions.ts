"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth";
import type { CarInput, CarStatus } from "@/lib/carTypes";
import { createCar as createFirestoreCar, deleteCar as deleteFirestoreCar, updateCar as updateFirestoreCar } from "@/lib/cars";

type ListItem = { title: string; text: string };
type ImageItem = { url: string; alt?: string };

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  return value.length ? value : null;
}

function numberValue(formData: FormData, key: string) {
  const value = stringValue(formData, key).replace(",", ".");
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumber(formData: FormData, key: string) {
  const value = stringValue(formData, key).replace(",", ".");
  if (!value.length) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseJsonArray<T>(formData: FormData, key: string, fallback: T[]): T[] {
  try {
    const raw = stringValue(formData, key);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function parseCarForm(formData: FormData): CarInput {
  const images = parseJsonArray<ImageItem>(formData, "imagesJson", [])
    .map((image, order) => ({
      id: crypto.randomUUID(),
      url: image.url?.trim(),
      alt: image.alt?.trim() || null,
      order
    }))
    .filter((image) => image.url);
  const pros = parseJsonArray<ListItem>(formData, "prosJson", [])
    .map((item, order) => ({
      id: crypto.randomUUID(),
      title: item.title?.trim() || "Плюс",
      text: item.text?.trim() || "",
      order
    }))
    .filter((item) => item.title || item.text);
  const cons = parseJsonArray<ListItem>(formData, "consJson", [])
    .map((item, order) => ({
      id: crypto.randomUUID(),
      title: item.title?.trim() || "Минус",
      text: item.text?.trim() || "",
      order
    }))
    .filter((item) => item.title || item.text);

  return {
    title: stringValue(formData, "title"),
    brand: stringValue(formData, "brand"),
    model: stringValue(formData, "model"),
    year: numberValue(formData, "year"),
    month: optionalNumber(formData, "month"),
    mileageKm: numberValue(formData, "mileageKm"),
    bodyType: optionalString(formData, "bodyType"),
    engineDescription: stringValue(formData, "engineDescription"),
    engineVolumeCm3: optionalNumber(formData, "engineVolumeCm3"),
    powerHp: optionalNumber(formData, "powerHp"),
    transmission: stringValue(formData, "transmission"),
    fuel: stringValue(formData, "fuel"),
    priceBruttoEur: numberValue(formData, "priceBruttoEur"),
    priceNettoEur: optionalNumber(formData, "priceNettoEur"),
    eurRubRate: numberValue(formData, "eurRubRate"),
    customsDutyRub: numberValue(formData, "customsDutyRub"),
    platesInsuranceRub: numberValue(formData, "platesInsuranceRub"),
    transportRub: numberValue(formData, "transportRub"),
    customsFeeRub: numberValue(formData, "customsFeeRub"),
    recyclingFeeRub: numberValue(formData, "recyclingFeeRub"),
    customsChecksRub: numberValue(formData, "customsChecksRub"),
    serviceFeeRub: optionalNumber(formData, "serviceFeeRub"),
    serviceFeePercent: numberValue(formData, "serviceFeePercent"),
    marketPriceRub: optionalNumber(formData, "marketPriceRub"),
    location: optionalString(formData, "location"),
    sourceUrl: optionalString(formData, "sourceUrl"),
    shortDescription: optionalString(formData, "shortDescription"),
    reviewText: optionalString(formData, "reviewText"),
    status: stringValue(formData, "status") as CarStatus,
    isFeatured: formData.get("isFeatured") === "on",
    images,
    pros,
    cons
  };
}

export async function createCar(formData: FormData) {
  await requireAdminUser();
  await createFirestoreCar(parseCarForm(formData));
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateCar(id: string, formData: FormData) {
  await requireAdminUser();
  await updateFirestoreCar(id, parseCarForm(formData));
  revalidatePath("/");
  revalidatePath(`/cars/${id}`);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function deleteCar(id: string) {
  await requireAdminUser();
  await deleteFirestoreCar(id);
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}
