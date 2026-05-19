"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { CarStatus, CarWithRelations } from "@/lib/carTypes";
import { calculateTotalRub, formatRub, statusLabels } from "@/lib/carTypes";
import { CarCard } from "@/components/CarCard";

type SortMode = "newest" | "price_asc" | "price_desc";

type Filters = {
  bodyType: string;
  maxMileage: string;
  maxPriceRub: string;
  status: "" | CarStatus;
  engine: string;
  sort: SortMode;
};

const initialFilters: Filters = {
  bodyType: "",
  maxMileage: "",
  maxPriceRub: "",
  status: "",
  engine: "",
  sort: "newest"
};

export function PotentialCarsSection({ cars }: { cars: CarWithRelations[] }) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const bodyTypes = useMemo(() => unique(cars.map((car) => car.bodyType).filter(Boolean) as string[]), [cars]);

  const filteredCars = useMemo(() => {
    const maxMileage = parseNumber(filters.maxMileage);
    const maxPriceRub = parseNumber(filters.maxPriceRub);
    const engine = filters.engine.trim().toLowerCase();

    return cars
      .filter((car) => {
        const totalRub = calculateTotalRub(car);
        const engineText = [car.engineDescription, car.fuel, car.engineVolumeCm3 ? String(car.engineVolumeCm3) : "", car.powerHp ? `${car.powerHp}` : ""]
          .join(" ")
          .toLowerCase();

        if (filters.bodyType && car.bodyType !== filters.bodyType) return false;
        if (filters.status && car.status !== filters.status) return false;
        if (maxMileage && car.mileageKm > maxMileage) return false;
        if (maxPriceRub && totalRub > maxPriceRub) return false;
        if (engine && !engineText.includes(engine)) return false;
        return true;
      })
      .sort((left, right) => {
        if (filters.sort === "newest") {
          return dateTime(right.updatedAt || right.createdAt) - dateTime(left.updatedAt || left.createdAt);
        }
        const diff = calculateTotalRub(left) - calculateTotalRub(right);
        return filters.sort === "price_asc" ? diff : -diff;
      });
  }, [cars, filters]);

  function setFilter<Key extends keyof Filters>(key: Key, value: Filters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <section id="cars" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orbit">Актуальные варианты</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Автомобили, отобранные для импорта</h2>
          </div>
          <p className="max-w-xl text-muted">
            Фильтры помогают быстро оставить подходящие варианты по бюджету, пробегу, кузову, статусу и двигателю.
          </p>
        </div>

        {cars.length > 0 && (
          <div className="mb-8 rounded-3xl bg-mist p-4 ring-1 ring-slate-200">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 font-semibold text-ink">
                <SlidersHorizontal className="h-5 w-5 text-orbit" />
                Фильтры
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-orbit ring-1 ring-slate-200"
                type="button"
                onClick={() => setFilters(initialFilters)}
              >
                <X className="h-4 w-4" />
                Сбросить
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Кузов</span>
                <select className="input bg-white" value={filters.bodyType} onChange={(event) => setFilter("bodyType", event.target.value)}>
                  <option value="">Любой</option>
                  {bodyTypes.map((bodyType) => (
                    <option key={bodyType} value={bodyType}>{bodyType}</option>
                  ))}
                </select>
              </label>

              <FilterInput label="Пробег до, км" value={filters.maxMileage} onChange={(value) => setFilter("maxMileage", value)} />
              <FilterInput label="Цена до, ₽" value={filters.maxPriceRub} onChange={(value) => setFilter("maxPriceRub", value)} />

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Доступность</span>
                <select className="input bg-white" value={filters.status} onChange={(event) => setFilter("status", event.target.value as Filters["status"])}>
                  <option value="">Любая</option>
                  {(Object.keys(statusLabels) as CarStatus[]).map((status) => (
                    <option key={status} value={status}>{statusLabels[status]}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Двигатель</span>
                <input
                  className="input bg-white"
                  value={filters.engine}
                  onChange={(event) => setFilter("engine", event.target.value)}
                  placeholder="дизель, 1.5, 116"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Сортировка</span>
                <select className="input bg-white" value={filters.sort} onChange={(event) => setFilter("sort", event.target.value as SortMode)}>
                  <option value="newest">Сначала новые</option>
                  <option value="price_asc">Цена: сначала ниже</option>
                  <option value="price_desc">Цена: сначала выше</option>
                </select>
              </label>
            </div>

            <p className="mt-4 text-sm text-muted">
              Найдено: {filteredCars.length} из {cars.length}
              {filteredCars[0] ? ` · от ${formatRub(calculateTotalRub(filteredCars[0]))}` : ""}
            </p>
          </div>
        )}

        {filteredCars.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredCars.map((car) => <CarCard key={car.id} car={car} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-mist p-10 text-center text-muted">
            Подходящих автомобилей пока нет.
          </div>
        )}
      </div>
    </section>
  );
}

function FilterInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <input className="input bg-white" type="number" min="0" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateTime(value?: string | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, "ru"));
}
