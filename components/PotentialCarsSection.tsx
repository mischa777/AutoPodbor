import type { CarWithRelations } from "@/lib/carTypes";
import { CarCard } from "@/components/CarCard";

export function PotentialCarsSection({ cars }: { cars: CarWithRelations[] }) {
  return (
    <section id="cars" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orbit">Актуальные варианты</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Автомобили, отобранные для импорта</h2>
          </div>
          <p className="max-w-xl text-muted">
            Каждое объявление сопровождается расчетом себестоимости, статусом проверки и предварительной оценкой ключевых рисков.
          </p>
        </div>
        {cars.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {cars.map((car) => <CarCard key={car.id} car={car} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-mist p-10 text-center text-muted">
            Опубликованных автомобилей пока нет.
          </div>
        )}
      </div>
    </section>
  );
}
