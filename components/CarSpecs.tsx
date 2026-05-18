import type { CarWithRelations } from "@/lib/carTypes";
import { formatEur, formatKm } from "@/lib/carTypes";

export function CarSpecs({ car }: { car: CarWithRelations }) {
  const specs = [
    ["Марка", car.brand],
    ["Модель", car.model],
    ["Год / месяц", `${car.year}${car.month ? ` / ${String(car.month).padStart(2, "0")}` : ""}`],
    ["Пробег", formatKm(car.mileageKm)],
    ["Двигатель", car.engineDescription],
    ["Объем двигателя", car.engineVolumeCm3 ? `${car.engineVolumeCm3} см³` : null],
    ["Мощность", car.powerHp ? `${car.powerHp} л.с.` : null],
    ["Коробка", car.transmission],
    ["Топливо", car.fuel],
    ["Кузов", car.bodyType],
    ["Цена brutto", formatEur(car.priceBruttoEur)],
    ["Цена netto", car.priceNettoEur ? formatEur(car.priceNettoEur) : null],
    ["Местоположение", car.location]
  ].filter(([, value]) => value);

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-2xl font-semibold text-ink">Характеристики</h2>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        {specs.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-mist p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
            <dd className="mt-1 font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {car.sourceUrl && (
        <a className="mt-5 inline-flex rounded-full bg-orbit px-5 py-3 font-semibold text-white" href={car.sourceUrl} target="_blank" rel="noreferrer">
          Оригинальное объявление
        </a>
      )}
    </section>
  );
}
