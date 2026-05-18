import Link from "next/link";
import { ArrowRight, Gauge, Route, ShieldCheck } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-20">
        <div>
          <p className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-orbit shadow-sm ring-1 ring-slate-200">
            Германия → Россия: проверка, расчет и сопровождение
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Подбор и сопровождение импорта автомобилей из Германии.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            Анализируем объявление, рассчитываем полную себестоимость, оцениваем риски и сопровождаем сделку до передачи автомобиля клиенту.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex items-center justify-center gap-2 rounded-full bg-orbit px-6 py-3 font-semibold text-white shadow-soft" href="/#cars">
              Посмотреть автомобили <ArrowRight className="h-4 w-4" />
            </Link>
            <Link className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-semibold text-orbit ring-1 ring-slate-200" href="/#contacts">
              Получить консультацию
            </Link>
          </div>
        </div>
        <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] bg-ink p-6 text-white shadow-soft">
          <div className="absolute inset-x-8 top-24 h-px rotate-[-14deg] orbit-line" />
          <div className="absolute left-10 top-20 h-48 w-48 rounded-full border border-white/20" />
          <div className="absolute bottom-8 right-8 h-64 w-64 rounded-full border border-white/15" />
          <div className="relative z-10 flex h-full flex-col justify-between gap-8">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/65">HAT import route</span>
              <Route className="h-7 w-7 text-white/80" />
            </div>
            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
              <div className="mb-5 flex items-center justify-between text-sm text-white/70">
                <span>DE</span>
                <span>проверка → расчет → сопровождение</span>
                <span>RU</span>
              </div>
              <div className="h-2 rounded-full bg-white/15">
                <div className="h-2 w-2/3 rounded-full bg-white" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Проверка", ShieldCheck],
                ["Смета", Gauge],
                ["Логистика", Route]
              ].map(([label, Icon]) => (
                <div key={label as string} className="rounded-2xl bg-white/10 p-4">
                  <Icon className="mb-3 h-5 w-5" />
                  <p className="text-sm font-semibold">{label as string}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
