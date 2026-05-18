"use client";

import { useMemo, useState } from "react";
import type { CarWithRelations } from "@/lib/carTypes";
import { formatRub } from "@/lib/carTypes";

type CostField = {
  key: string;
  label: string;
  value: number;
  suffix: string;
};

export function CostCalculator({ car, editable = false }: { car: CarWithRelations; editable?: boolean }) {
  const [fields, setFields] = useState<CostField[]>([
    { key: "priceBruttoEur", label: "Цена авто brutto", value: car.priceBruttoEur, suffix: "EUR" },
    { key: "eurRubRate", label: "Курс EUR/RUB", value: car.eurRubRate, suffix: "RUB" },
    { key: "priceNettoEur", label: "Цена netto", value: car.priceNettoEur ?? 0, suffix: "EUR" },
    { key: "customsDutyRub", label: "Пошлина", value: car.customsDutyRub, suffix: "RUB" },
    { key: "platesInsuranceRub", label: "Административные расходы", value: car.platesInsuranceRub, suffix: "RUB" },
    { key: "transportRub", label: "Логистика и перегон", value: car.transportRub, suffix: "RUB" },
    { key: "customsFeeRub", label: "Таможенный сбор", value: car.customsFeeRub, suffix: "RUB" },
    { key: "recyclingFeeRub", label: "Утильсбор", value: car.recyclingFeeRub, suffix: "RUB" },
    { key: "customsChecksRub", label: "Таможня + проверки", value: car.customsChecksRub, suffix: "RUB" },
    { key: "serviceFeeRub", label: "Комиссия сервиса", value: car.serviceFeeRub ?? 0, suffix: "RUB" }
  ]);

  const byKey = Object.fromEntries(fields.map((field) => [field.key, field.value]));
  const total = useMemo(() => {
    const taxablePriceEur = byKey.priceNettoEur || byKey.priceBruttoEur;
    return (
      taxablePriceEur * byKey.eurRubRate +
      byKey.customsDutyRub +
      byKey.platesInsuranceRub +
      byKey.transportRub +
      byKey.customsFeeRub +
      byKey.recyclingFeeRub +
      byKey.customsChecksRub +
      byKey.serviceFeeRub
    );
  }, [byKey]);

  return (
    <section className="rounded-3xl bg-ink p-6 text-white shadow-soft">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-semibold">Цена под ключ</h2>
        </div>
        <p className="text-3xl font-semibold">{formatRub(total)}</p>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className="rounded-2xl bg-white/10 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/55">{field.label}</span>
            <span className="mt-2 flex items-center gap-2">
              <input
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 font-semibold text-white outline-none disabled:opacity-90"
                value={field.value}
                disabled={!editable}
                inputMode="decimal"
                onChange={(event) => {
                  const nextValue = Number(event.target.value.replace(",", "."));
                  setFields((current) => current.map((item) => item.key === field.key ? { ...item, value: Number.isFinite(nextValue) ? nextValue : 0 } : item));
                }}
              />
              <span className="w-10 text-sm text-white/55">{field.suffix}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="mt-4 text-sm text-white/55">
        Если указана цена netto, расчет выполняется от нее. Значения публикуются администратором после проверки сметы.
      </p>
    </section>
  );
}
