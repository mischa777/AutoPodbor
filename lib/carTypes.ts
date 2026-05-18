export type CarStatus = "available" | "checking" | "sold" | "archived";

export type CarImage = {
  id: string;
  url: string;
  alt?: string | null;
  order: number;
};

export type CarTextItem = {
  id: string;
  title: string;
  text: string;
  order: number;
};

export type CarWithRelations = {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  month?: number | null;
  mileageKm: number;
  bodyType?: string | null;
  engineDescription: string;
  engineVolumeCm3?: number | null;
  powerHp?: number | null;
  powerKw?: number | null;
  transmission: string;
  fuel: string;
  priceBruttoEur: number;
  priceNettoEur?: number | null;
  eurRubRate: number;
  customsDutyRub: number;
  platesInsuranceRub: number;
  transportRub: number;
  customsFeeRub: number;
  recyclingFeeRub: number;
  customsChecksRub: number;
  serviceFeeRub?: number | null;
  serviceFeePercent: number;
  marketPriceRub?: number | null;
  location?: string | null;
  sourceUrl?: string | null;
  shortDescription?: string | null;
  reviewText?: string | null;
  status: CarStatus;
  isFeatured: boolean;
  images: CarImage[];
  pros: CarTextItem[];
  cons: CarTextItem[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CarInput = Omit<CarWithRelations, "id" | "createdAt" | "updatedAt">;

export const statusLabels: Record<CarStatus, string> = {
  available: "Доступно",
  checking: "Проверяется",
  sold: "Продано",
  archived: "Неактуально"
};

export const statusTone: Record<CarStatus, string> = {
  available: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  checking: "bg-amber-50 text-amber-700 ring-amber-200",
  sold: "bg-slate-100 text-slate-600 ring-slate-200",
  archived: "bg-rose-50 text-rose-700 ring-rose-200"
};

export function calculatePreServiceTotalRub(car: Pick<CarWithRelations, "priceBruttoEur" | "priceNettoEur" | "eurRubRate" | "customsDutyRub" | "platesInsuranceRub" | "transportRub" | "customsFeeRub" | "recyclingFeeRub" | "customsChecksRub">) {
  const taxablePriceEur = car.priceNettoEur ?? car.priceBruttoEur;
  return (
    taxablePriceEur * car.eurRubRate +
    car.customsDutyRub +
    car.platesInsuranceRub +
    car.transportRub +
    car.customsFeeRub +
    car.recyclingFeeRub +
    car.customsChecksRub
  );
}

export function calculateServiceFeeRub(car: Pick<CarWithRelations, "priceBruttoEur" | "priceNettoEur" | "eurRubRate" | "customsDutyRub" | "platesInsuranceRub" | "transportRub" | "customsFeeRub" | "recyclingFeeRub" | "customsChecksRub" | "serviceFeeRub" | "serviceFeePercent" | "marketPriceRub">) {
  if (car.serviceFeeRub) return car.serviceFeeRub;
  const preServiceTotal = calculatePreServiceTotalRub(car);
  const percent = car.serviceFeePercent || 7;
  const base = Math.round(preServiceTotal * (percent / 100));
  if (!car.marketPriceRub || car.marketPriceRub <= preServiceTotal) return base;
  const marginBased = Math.round((car.marketPriceRub - preServiceTotal) * 0.25);
  const cap = Math.round(preServiceTotal * 0.12);
  return Math.max(base, Math.min(Math.max(base, marginBased), cap));
}

export function calculateTotalRub(car: Pick<CarWithRelations, "priceBruttoEur" | "priceNettoEur" | "eurRubRate" | "customsDutyRub" | "platesInsuranceRub" | "transportRub" | "customsFeeRub" | "recyclingFeeRub" | "customsChecksRub" | "serviceFeeRub" | "serviceFeePercent" | "marketPriceRub">) {
  return calculatePreServiceTotalRub(car) + calculateServiceFeeRub(car);
}

export function formatRub(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatEur(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatKm(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} км`;
}
