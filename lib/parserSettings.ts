import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebaseServer";

export type ParserSettings = {
  searchUrls: string[];
  budgetRub: number;
  maxPriceEur: number;
  maxMileageKm: number;
  maxPowerHp: number;
  maxEngineCc: number;
  scanPages: number;
  maxLinks: number;
};

const settingsRef = () => getAdminFirestore().collection("settings").doc("parser");

export async function getParserSettings(): Promise<ParserSettings> {
  const snapshot = await settingsRef().get();
  const data = snapshot.data() || {};
  return normalizeParserSettings({
    searchUrls: Array.isArray(data.searchUrls) ? data.searchUrls : getEnvSearchUrls(),
    budgetRub: data.budgetRub ?? process.env.CAR_SCAN_BUDGET_RUB,
    maxPriceEur: data.maxPriceEur ?? process.env.CAR_SCAN_MAX_PRICE_EUR,
    maxMileageKm: data.maxMileageKm ?? process.env.CAR_SCAN_MAX_MILEAGE_KM,
    maxPowerHp: data.maxPowerHp ?? process.env.CAR_SCAN_MAX_POWER_HP,
    maxEngineCc: data.maxEngineCc ?? process.env.CAR_SCAN_MAX_ENGINE_CC,
    scanPages: data.scanPages ?? process.env.CAR_SCAN_PAGES,
    maxLinks: data.maxLinks ?? process.env.CAR_SCAN_MAX_LINKS
  });
}

export async function saveParserSettings(input: Partial<ParserSettings>) {
  const settings = normalizeParserSettings(input);
  await settingsRef().set(
    {
      ...settings,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  return settings;
}

export function normalizeParserSettings(input: Partial<ParserSettings>): ParserSettings {
  return {
    searchUrls: normalizeSearchUrls(input.searchUrls),
    budgetRub: positiveNumber(input.budgetRub, 2_500_000),
    maxPriceEur: positiveNumber(input.maxPriceEur, 15_000),
    maxMileageKm: positiveNumber(input.maxMileageKm, 180_000),
    maxPowerHp: positiveNumber(input.maxPowerHp, 160),
    maxEngineCc: positiveNumber(input.maxEngineCc, 1900),
    scanPages: positiveNumber(input.scanPages, 1),
    maxLinks: positiveNumber(input.maxLinks, 30)
  };
}

export function parseSearchUrls(value: string) {
  const normalized = value.trim();
  if (!normalized) return [];
  const matches = normalized.match(/https?:\/\/[\s\S]+?(?=(?:\s*\n|\s*,\s*https?:\/\/|$))/g);
  return normalizeSearchUrls(matches || normalized.split(/\n+/));
}

function getEnvSearchUrls() {
  return parseSearchUrls(process.env.CAR_SCAN_URLS || "");
}

function normalizeSearchUrls(value: unknown) {
  const urls = Array.isArray(value) ? value : [];
  return [...new Set(urls.map((url) => String(url).trim()).filter((url) => url.startsWith("http")))];
}

function positiveNumber(value: unknown, fallback: number) {
  const parsed = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
