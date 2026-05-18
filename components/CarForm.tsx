"use client";

import Link from "next/link";
import { Download, PenLine, Save } from "lucide-react";
import { useMemo, useState } from "react";
import type { CarStatus, CarWithRelations } from "@/lib/carTypes";
import type { ImportedCar } from "@/lib/importCar";
import { DynamicTextList, ImageFormItem, ImageUrlManager } from "@/components/ImageUrlManager";

type Action = (formData: FormData) => void | Promise<void>;

type FormValues = {
  title: string;
  brand: string;
  model: string;
  year: string;
  month: string;
  mileageKm: string;
  bodyType: string;
  engineDescription: string;
  engineVolumeCm3: string;
  powerHp: string;
  transmission: string;
  fuel: string;
  priceBruttoEur: string;
  priceNettoEur: string;
  eurRubRate: string;
  customsDutyRub: string;
  platesInsuranceRub: string;
  transportRub: string;
  customsFeeRub: string;
  recyclingFeeRub: string;
  customsChecksRub: string;
  serviceFeeRub: string;
  serviceFeePercent: string;
  marketPriceRub: string;
  location: string;
  sourceUrl: string;
  shortDescription: string;
  reviewText: string;
  status: CarStatus;
  isFeatured: boolean;
};

const statuses: { value: CarStatus; label: string }[] = [
  { value: "available", label: "Доступно" },
  { value: "checking", label: "Проверяется" },
  { value: "sold", label: "Продано" },
  { value: "archived", label: "Неактуально" }
];

export function CarForm({ car, action, mode }: { car?: CarWithRelations; action: Action; mode: "create" | "edit" }) {
  const [values, setValues] = useState<FormValues>(() => initialValues(car));
  const [images, setImages] = useState<ImageFormItem[]>(car?.images.map((image) => ({ url: image.url, alt: image.alt || "" })) ?? [{ url: "", alt: "" }]);
  const [pros, setPros] = useState(car?.pros.map((item) => ({ title: item.title, text: item.text })) ?? [{ title: "", text: "" }]);
  const [cons, setCons] = useState(car?.cons.map((item) => ({ title: item.title, text: item.text })) ?? [{ title: "", text: "" }]);
  const [importUrl, setImportUrl] = useState(car?.sourceUrl ?? "");
  const [importState, setImportState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [importMessage, setImportMessage] = useState("");
  const [contentState, setContentState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [contentMessage, setContentMessage] = useState("");
  const [serviceFeeEdited, setServiceFeeEdited] = useState(Boolean(car?.serviceFeeRub));
  const title = mode === "create" ? "Добавить автомобиль" : "Редактировать автомобиль";

  const hiddenPayloads = useMemo(() => ({
    imagesJson: JSON.stringify(images),
    prosJson: JSON.stringify(pros),
    consJson: JSON.stringify(cons)
  }), [images, pros, cons]);

  async function importListing() {
    if (!importUrl.trim()) {
      setImportState("error");
      setImportMessage("Вставьте ссылку на объявление.");
      return;
    }

    setImportState("loading");
    setImportMessage("Выполняем импорт данных из объявления...");

    try {
      const response = await fetch(`/api/import-car?url=${encodeURIComponent(importUrl.trim())}`);
      const payload = await response.json() as ImportedCar & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Не удалось импортировать объявление.");

      setValues((current) => mergeImportedValues(current, payload, importUrl.trim()));
      setServiceFeeEdited(false);
      if (payload.images?.length) setImages(payload.images);
      setImportState("success");
      setImportMessage(importSuccessMessage(payload));
    } catch (error) {
      setImportState("error");
      setImportMessage(error instanceof Error ? error.message : "Не удалось импортировать объявление.");
    }
  }

  function setField(name: keyof FormValues, value: string | boolean) {
    if (name === "serviceFeeRub") setServiceFeeEdited(true);
    setValues((current) => {
      const next = { ...current, [name]: value };
      if (name === "priceBruttoEur") {
        next.priceNettoEur = String(calculateNettoFromBrutto(next.priceBruttoEur));
      }
      if (shouldRecalculateCustomsDuty(name)) {
        next.customsDutyRub = String(calculateCustomsDuty(next));
      }
      if (!serviceFeeEdited && shouldRecalculateServiceFee(name)) {
        next.serviceFeeRub = String(calculateRecommendedServiceFee(next));
      }
      return next;
    });
  }

  async function generateEditorialContent() {
    setContentState("loading");
    setContentMessage("Формируем описание, плюсы и минусы...");

    try {
      const response = await fetch("/api/generate-car-content", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values)
      });
      const payload = await response.json() as {
        shortDescription?: string;
        reviewText?: string;
        pros?: { title: string; text: string }[];
        cons?: { title: string; text: string }[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Не удалось сформировать текст.");

      setValues((current) => ({
        ...current,
        shortDescription: payload.shortDescription || current.shortDescription,
        reviewText: payload.reviewText || current.reviewText
      }));
      if (payload.pros?.length) setPros(payload.pros);
      if (payload.cons?.length) setCons(payload.cons);
      setContentState("success");
      setContentMessage("Описание, плюсы и минусы сформированы. Проверьте текст перед публикацией.");
    } catch (error) {
      setContentState("error");
      setContentMessage(error instanceof Error ? error.message : "Не удалось сформировать текст.");
    }
  }

  return (
    <form action={action} className="space-y-6">
      <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-semibold text-ink">{title}</h1>
            <p className="mt-1 text-sm text-muted">Можно заполнить вручную или подтянуть данные из ссылки AutoScout24/mobile.de.</p>
          </div>
          <div className="flex gap-3">
            <Link className="rounded-full bg-mist px-5 py-3 font-semibold text-orbit" href="/admin">Назад</Link>
            <button className="inline-flex items-center gap-2 rounded-full bg-orbit px-5 py-3 font-semibold text-white" type="submit">
              <Save className="h-4 w-4" /> Сохранить
            </button>
          </div>
        </div>
      </div>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-ink">Импорт по ссылке</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            className="input"
            value={importUrl}
            onChange={(event) => setImportUrl(event.target.value)}
            placeholder="https://www.autoscout24.de/angebote/..."
            type="url"
          />
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full bg-orbit px-5 py-3 font-semibold text-white disabled:opacity-60"
            type="button"
            disabled={importState === "loading"}
            onClick={importListing}
          >
            <Download className="h-4 w-4" />
            {importState === "loading" ? "Импорт..." : "Заполнить"}
          </button>
        </div>
        {importMessage && (
          <p className={`mt-3 text-sm ${importState === "error" ? "text-rose-600" : "text-muted"}`}>
            {importMessage}
          </p>
        )}
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-ink">Описание и оценка</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Сформирует нейтральный обзор, плюсы и минусы на основании заполненных характеристик и расчета. Текст нужно проверить перед публикацией.
        </p>
        <button
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-orbit px-5 py-3 font-semibold text-white disabled:opacity-60"
          type="button"
          disabled={contentState === "loading"}
          onClick={generateEditorialContent}
        >
          <PenLine className="h-4 w-4" />
          {contentState === "loading" ? "Формирование..." : "Сформировать описание"}
        </button>
        {contentMessage && (
          <p className={`mt-3 text-sm ${contentState === "error" ? "text-rose-600" : "text-muted"}`}>
            {contentMessage}
          </p>
        )}
      </section>

      <input type="hidden" name="imagesJson" value={hiddenPayloads.imagesJson} />
      <input type="hidden" name="prosJson" value={hiddenPayloads.prosJson} />
      <input type="hidden" name="consJson" value={hiddenPayloads.consJson} />

      <FormSection title="Основное">
        <Text name="title" label="Название объявления" value={values.title} onChange={setField} required />
        <Text name="brand" label="Марка" value={values.brand} onChange={setField} required />
        <Text name="model" label="Модель" value={values.model} onChange={setField} required />
        <Text name="year" label="Год" value={values.year} onChange={setField} type="number" required />
        <Text name="month" label="Месяц выпуска" value={values.month} onChange={setField} type="number" />
        <Text name="mileageKm" label="Пробег" value={values.mileageKm} onChange={setField} type="number" required />
        <Text name="bodyType" label="Кузов" value={values.bodyType} onChange={setField} />
        <Text name="engineDescription" label="Двигатель" value={values.engineDescription} onChange={setField} required />
        <Text name="engineVolumeCm3" label="Объем двигателя" value={values.engineVolumeCm3} onChange={setField} type="number" />
        <Text name="powerHp" label="Мощность" value={values.powerHp} onChange={setField} type="number" />
        <Text name="transmission" label="Коробка" value={values.transmission} onChange={setField} required />
        <Text name="fuel" label="Топливо" value={values.fuel} onChange={setField} required />
      </FormSection>

      <FormSection title="Калькулятор">
        <Text name="priceBruttoEur" label="Цена brutto EUR" value={values.priceBruttoEur} onChange={setField} type="number" required />
        <Text name="priceNettoEur" label="Цена netto EUR" value={values.priceNettoEur} onChange={setField} type="number" />
        <Text name="eurRubRate" label="Курс EUR/RUB" value={values.eurRubRate} onChange={setField} type="number" required />
        <Text name="customsDutyRub" label="Пошлина" value={values.customsDutyRub} onChange={setField} type="number" required />
        <Text name="platesInsuranceRub" label="Административные расходы" value={values.platesInsuranceRub} onChange={setField} type="number" required />
        <Text name="transportRub" label="Логистика и перегон" value={values.transportRub} onChange={setField} type="number" required />
        <Text name="customsFeeRub" label="Таможенный сбор" value={values.customsFeeRub} onChange={setField} type="number" required />
        <Text name="recyclingFeeRub" label="Утильсбор" value={values.recyclingFeeRub} onChange={setField} type="number" required />
        <Text name="customsChecksRub" label="Таможня + проверки" value={values.customsChecksRub} onChange={setField} type="number" required />
        <Text name="serviceFeePercent" label="Комиссия, %" value={values.serviceFeePercent} onChange={setField} type="number" />
        <Text name="marketPriceRub" label="Цена похожих в РФ, RUB" value={values.marketPriceRub} onChange={setField} type="number" />
        <Text name="serviceFeeRub" label="Комиссия сервиса" value={values.serviceFeeRub} onChange={setField} type="number" />
        <button
          className="rounded-full bg-mist px-5 py-3 font-semibold text-orbit"
          type="button"
          onClick={() => {
            setServiceFeeEdited(false);
            setValues((current) => ({ ...current, serviceFeeRub: String(calculateRecommendedServiceFee(current)) }));
          }}
        >
          Пересчитать комиссию
        </button>
      </FormSection>

      <FormSection title="Описание и публикация">
        <Text name="location" label="Местоположение" value={values.location} onChange={setField} />
        <Text name="sourceUrl" label="Ссылка на оригинальное объявление" value={values.sourceUrl} onChange={setField} />
        <TextArea name="shortDescription" label="Краткое описание" value={values.shortDescription} onChange={setField} />
        <TextArea name="reviewText" label="Полный обзор" value={values.reviewText} onChange={setField} />
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink">Статус</span>
          <select className="input" name="status" value={values.status} onChange={(event) => setField("status", event.target.value as CarStatus)}>
            {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-3 rounded-2xl bg-mist p-4 font-semibold text-ink">
          <input type="checkbox" name="isFeatured" checked={values.isFeatured} onChange={(event) => setField("isFeatured", event.target.checked)} />
          Показывать на главной
        </label>
      </FormSection>

      <ImageUrlManager images={images} setImages={setImages} />
      <DynamicTextList title="Плюсы" items={pros} setItems={setPros} />
      <DynamicTextList title="Минусы" items={cons} setItems={setCons} />
    </form>
  );
}

function initialValues(car?: CarWithRelations): FormValues {
  return {
    title: car?.title ?? "",
    brand: car?.brand ?? "",
    model: car?.model ?? "",
    year: String(car?.year ?? 2022),
    month: car?.month ? String(car.month) : "",
    mileageKm: String(car?.mileageKm ?? 0),
    bodyType: car?.bodyType ?? "",
    engineDescription: car?.engineDescription ?? "",
    engineVolumeCm3: car?.engineVolumeCm3 ? String(car.engineVolumeCm3) : "",
    powerHp: car?.powerHp ? String(car.powerHp) : "",
    transmission: car?.transmission ?? "Автомат",
    fuel: car?.fuel ?? "Дизель",
    priceBruttoEur: String(car?.priceBruttoEur ?? 0),
    priceNettoEur: car?.priceNettoEur ? String(car.priceNettoEur) : "",
    eurRubRate: String(car?.eurRubRate ?? 100),
    customsDutyRub: String(car?.customsDutyRub ?? 0),
    platesInsuranceRub: String(car?.platesInsuranceRub ?? 15000),
    transportRub: String(car?.transportRub ?? 30000),
    customsFeeRub: String(car?.customsFeeRub ?? 0),
    recyclingFeeRub: String(car?.recyclingFeeRub ?? 0),
    customsChecksRub: String(car?.customsChecksRub ?? 0),
    serviceFeeRub: car?.serviceFeeRub ? String(car.serviceFeeRub) : "",
    serviceFeePercent: car?.serviceFeePercent ? String(car.serviceFeePercent) : "7",
    marketPriceRub: car?.marketPriceRub ? String(car.marketPriceRub) : "",
    location: car?.location ?? "",
    sourceUrl: car?.sourceUrl ?? "",
    shortDescription: car?.shortDescription ?? "",
    reviewText: car?.reviewText ?? "",
    status: car?.status ?? "available",
    isFeatured: car?.isFeatured ?? true
  };
}

function mergeImportedValues(current: FormValues, imported: ImportedCar, importUrl: string): FormValues {
  return {
    ...current,
    title: stringify(imported.title) || current.title,
    brand: stringify(imported.brand) || current.brand,
    model: stringify(imported.model) || current.model,
    year: stringify(imported.year) || current.year,
    month: stringify(imported.month) || current.month,
    mileageKm: stringify(imported.mileageKm) || current.mileageKm,
    bodyType: stringify(imported.bodyType) || current.bodyType,
    engineDescription: stringify(imported.engineDescription) || current.engineDescription,
    engineVolumeCm3: stringify(imported.engineVolumeCm3) || current.engineVolumeCm3,
    powerHp: stringify(imported.powerHp) || current.powerHp,
    transmission: stringify(imported.transmission) || current.transmission,
    fuel: stringify(imported.fuel) || current.fuel,
    priceBruttoEur: stringify(imported.priceBruttoEur) || current.priceBruttoEur,
    priceNettoEur: stringify(calculateNettoFromBrutto(stringify(imported.priceBruttoEur) || current.priceBruttoEur)),
    eurRubRate: stringify(imported.eurRubRate) || current.eurRubRate,
    customsDutyRub: stringify(imported.customsDutyRub) || current.customsDutyRub,
    platesInsuranceRub: stringify(imported.platesInsuranceRub) || "15000",
    transportRub: stringify(imported.transportRub) || "30000",
    customsFeeRub: stringify(imported.customsFeeRub) || current.customsFeeRub,
    recyclingFeeRub: stringify(imported.recyclingFeeRub) || current.recyclingFeeRub,
    customsChecksRub: stringify(imported.customsChecksRub) || current.customsChecksRub,
    serviceFeeRub: stringify(imported.serviceFeeRub) || current.serviceFeeRub,
    serviceFeePercent: stringify(imported.serviceFeePercent) || current.serviceFeePercent,
    marketPriceRub: stringify(imported.marketPriceRub) || current.marketPriceRub,
    location: stringify(imported.location) || current.location,
    sourceUrl: stringify(imported.sourceUrl) || importUrl,
    shortDescription: stringify(imported.shortDescription) || current.shortDescription,
    reviewText: stringify(imported.reviewText) || current.reviewText
  };
}

function stringify(value: unknown) {
  return value === undefined || value === null ? "" : String(value);
}

function calculateNettoFromBrutto(value: string) {
  const brutto = parseNumber(value);
  return brutto ? Math.round(brutto / 1.19) : "";
}

function shouldRecalculateServiceFee(name: keyof FormValues) {
  return [
    "priceBruttoEur",
    "priceNettoEur",
    "eurRubRate",
    "year",
    "month",
    "engineVolumeCm3",
    "customsDutyRub",
    "platesInsuranceRub",
    "transportRub",
    "customsFeeRub",
    "recyclingFeeRub",
    "customsChecksRub",
    "serviceFeePercent",
    "marketPriceRub"
  ].includes(name);
}

function shouldRecalculateCustomsDuty(name: keyof FormValues) {
  return ["engineVolumeCm3", "eurRubRate", "year", "month"].includes(name);
}

function calculateCustomsDuty(values: FormValues) {
  const engineCc = parseNumber(values.engineVolumeCm3);
  const eurRubRate = parseNumber(values.eurRubRate);
  if (!engineCc || !eurRubRate) return parseNumber(values.customsDutyRub);
  const rate = getCustomsRateEurPerCc(calculateVehicleAge(values), engineCc);
  return Math.round(engineCc * rate * eurRubRate);
}

function calculateVehicleAge(values: FormValues) {
  const year = parseNumber(values.year);
  const month = parseNumber(values.month) || 1;
  if (!year) return 3;
  const now = new Date();
  const months = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
  return Math.max(months, 0) / 12;
}

function getCustomsRateEurPerCc(ageYears: number, engineCc: number) {
  const bands = ageYears <= 5
    ? [[1000, 1.5], [1500, 1.7], [1800, 2.5], [2300, 2.7], [3000, 3.0], [Infinity, 3.6]]
    : [[1000, 3.0], [1500, 3.2], [1800, 3.5], [2300, 4.8], [3000, 5.0], [Infinity, 5.7]];
  return bands.find(([max]) => engineCc <= max)?.[1] || 3.6;
}

function calculateRecommendedServiceFee(values: FormValues) {
  const preServiceTotal = calculatePreServiceTotal(values);
  const percent = parseNumber(values.serviceFeePercent) || 7;
  const base = Math.round(preServiceTotal * (percent / 100));
  const marketPrice = parseNumber(values.marketPriceRub);
  if (!marketPrice || marketPrice <= preServiceTotal) return base;
  const marginBased = Math.round((marketPrice - preServiceTotal) * 0.25);
  const cap = Math.round(preServiceTotal * 0.12);
  return Math.max(base, Math.min(Math.max(base, marginBased), cap));
}

function calculatePreServiceTotal(values: FormValues) {
  const priceEur = parseNumber(values.priceNettoEur) || parseNumber(values.priceBruttoEur);
  return Math.round(
    priceEur * parseNumber(values.eurRubRate)
    + parseNumber(values.customsDutyRub)
    + parseNumber(values.platesInsuranceRub)
    + parseNumber(values.transportRub)
    + parseNumber(values.customsFeeRub)
    + parseNumber(values.recyclingFeeRub)
    + parseNumber(values.customsChecksRub)
  );
}

function parseNumber(value: string) {
  const parsed = Number(String(value || "0").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function importSuccessMessage(payload: ImportedCar & { error?: string }) {
  const source = payload.botMeta?.source;
  const method = payload.botMeta?.method;
  const missing = payload.botMeta?.missingFields || [];
  const prefix = method ? `Данные импортированы через AutoScoutBot (${source || "source"}: ${method}).` : "Данные импортированы в форму.";
  const rate = payload.exchangeRateSource ? ` Курс EUR/RUB: ${payload.eurRubRate} (${payload.exchangeRateSource}).` : "";
  const suffix = missing.length ? ` Не найдены поля: ${missing.join(", ")}.` : " Проверьте расчет и описание перед публикацией.";
  return `${prefix}${rate}${suffix}`;
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-5 text-xl font-semibold text-ink">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function Text({
  name,
  label,
  value,
  onChange,
  required,
  type = "text"
}: {
  name: keyof FormValues;
  label: string;
  value: string;
  onChange: (name: keyof FormValues, value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink">{label}</span>
      <input className="input" name={name} value={value} type={type} step={type === "number" ? "any" : undefined} required={required} onChange={(event) => onChange(name, event.target.value)} />
    </label>
  );
}

function TextArea({
  name,
  label,
  value,
  onChange
}: {
  name: keyof FormValues;
  label: string;
  value: string;
  onChange: (name: keyof FormValues, value: string) => void;
}) {
  return (
    <label className="block md:col-span-2 lg:col-span-3">
      <span className="mb-1 block text-sm font-semibold text-ink">{label}</span>
      <textarea className="input min-h-32" name={name} value={value} onChange={(event) => onChange(name, event.target.value)} />
    </label>
  );
}
