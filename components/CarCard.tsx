import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Fuel, Gauge, Settings } from "lucide-react";
import type { CarWithRelations } from "@/lib/carTypes";
import { calculateTotalRub, formatEur, formatKm, formatRub } from "@/lib/carTypes";
import { StatusBadge } from "@/components/StatusBadge";

export function CarCard({ car }: { car: CarWithRelations }) {
  const image = car.images[0];

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-slate-200/70">
      <div className="relative aspect-[16/10] bg-slate-200">
        {image ? (
          <Image src={image.url} alt={image.alt || car.title} fill className="object-cover" sizes="(min-width: 1024px) 33vw, 100vw" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">Фото скоро появится</div>
        )}
        <div className="absolute left-4 top-4">
          <StatusBadge status={car.status} />
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-ink">{car.title}</h3>
            <p className="mt-1 text-sm text-muted">{car.year} · {formatKm(car.mileageKm)}</p>
          </div>
          <p className="text-right text-lg font-semibold text-orbit">{formatEur(car.priceBruttoEur)}</p>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-xs text-muted">
          <span className="flex items-center gap-1 rounded-xl bg-mist px-3 py-2"><Gauge className="h-3.5 w-3.5" /> {car.engineDescription}</span>
          <span className="flex items-center gap-1 rounded-xl bg-mist px-3 py-2"><Settings className="h-3.5 w-3.5" /> {car.transmission}</span>
          <span className="flex items-center gap-1 rounded-xl bg-mist px-3 py-2"><Fuel className="h-3.5 w-3.5" /> {car.fuel}</span>
        </div>
        <div className="mt-5 rounded-2xl bg-ink p-4 text-white">
          <p className="text-xs text-white/60">Цена под ключ</p>
          <p className="mt-1 text-2xl font-semibold">{formatRub(calculateTotalRub(car))}</p>
        </div>
        <Link className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-orbit px-5 py-3 font-semibold text-white" href={`/cars/${car.id}`}>
          Подробнее <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
