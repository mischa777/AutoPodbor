"use client";

import { useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import type { CarTextItem } from "@/lib/carTypes";

type DetailItem = Pick<CarTextItem, "id" | "title" | "text">;

export function ProsConsBlock({ pros, cons }: { pros: CarTextItem[]; cons: CarTextItem[] }) {
  const [active, setActive] = useState<DetailItem | null>(null);

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <List title="Плюсы" items={pros} tone="good" onOpen={setActive} />
      <List title="Минусы" items={cons} tone="bad" onOpen={setActive} />
      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4" role="dialog" aria-modal="true">
          <div className="max-w-lg rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex items-start justify-between gap-5">
              <h3 className="text-2xl font-semibold text-ink">{active.title}</h3>
              <button className="rounded-full bg-mist p-2 text-ink" type="button" onClick={() => setActive(null)} aria-label="Закрыть">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-4 leading-7 text-muted">{active.text}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function List({ title, items, tone, onOpen }: { title: string; items: DetailItem[]; tone: "good" | "bad"; onOpen: (item: DetailItem) => void }) {
  const Icon = tone === "good" ? CheckCircle2 : XCircle;
  const iconClass = tone === "good" ? "text-emerald-600" : "text-rose-600";

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-2xl font-semibold text-ink">{title}</h2>
      <div className="mt-5 space-y-3">
        {items.length ? items.map((item) => (
          <button key={item.id} className="flex w-full items-start gap-3 rounded-2xl bg-mist p-4 text-left transition hover:bg-slate-200/70" type="button" onClick={() => onOpen(item)}>
            <Icon className={`mt-1 h-5 w-5 flex-none ${iconClass}`} />
            <span>
              <span className="block font-semibold text-ink">{item.title}</span>
              <span className="mt-1 line-clamp-2 block text-sm leading-6 text-muted">{item.text}</span>
            </span>
          </button>
        )) : (
          <p className="text-muted">Пункты пока не добавлены.</p>
        )}
      </div>
    </div>
  );
}
