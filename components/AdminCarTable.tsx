"use client";

import Image from "next/image";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { CarWithRelations } from "@/lib/carTypes";
import { deleteCar } from "@/app/actions";
import { calculateTotalRub, formatRub } from "@/lib/carTypes";
import { StatusBadge } from "@/components/StatusBadge";

export function AdminCarTable({ cars }: { cars: CarWithRelations[] }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Админка</h1>
          <p className="mt-1 text-sm text-muted">TODO: before production add authentication for admin routes.</p>
        </div>
        <Link className="inline-flex items-center justify-center gap-2 rounded-full bg-orbit px-5 py-3 font-semibold text-white" href="/admin/cars/new">
          <Plus className="h-4 w-4" /> Добавить авто
        </Link>
      </div>
      {cars.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-y-3 text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3">Авто</th>
                <th className="px-3">Статус</th>
                <th className="px-3">Главная</th>
                <th className="px-3">Себестоимость</th>
                <th className="px-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {cars.map((car) => (
                <tr key={car.id} className="bg-mist">
                  <td className="rounded-l-2xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-16 w-24 overflow-hidden rounded-xl bg-slate-200">
                        {car.images[0] && <Image src={car.images[0].url} alt={car.title} fill className="object-cover" sizes="96px" />}
                      </div>
                      <div>
                        <p className="font-semibold text-ink">{car.title}</p>
                        <p className="text-muted">{car.year} · {car.brand} {car.model}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3"><StatusBadge status={car.status} /></td>
                  <td className="p-3 text-muted">{car.isFeatured ? "Да" : "Нет"}</td>
                  <td className="p-3 font-semibold text-ink">{formatRub(calculateTotalRub(car))}</td>
                  <td className="rounded-r-2xl p-3">
                    <div className="flex justify-end gap-2">
                      <Link className="rounded-full bg-white p-3 text-orbit ring-1 ring-slate-200" href={`/admin/cars/${car.id}/edit`} aria-label="Редактировать">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <form action={deleteCar.bind(null, car.id)} onSubmit={(event) => {
                        if (!confirm(`Удалить объявление "${car.title}"?`)) event.preventDefault();
                      }}>
                        <button className="rounded-full bg-white p-3 text-rose-600 ring-1 ring-slate-200" type="submit" aria-label="Удалить">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-mist p-10 text-center text-muted">
          Объявлений пока нет. Создайте первое авто для витрины.
        </div>
      )}
    </div>
  );
}
