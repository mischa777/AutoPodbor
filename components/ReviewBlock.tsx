export function ReviewBlock({ text }: { text?: string | null }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orbit">Экспертный комментарий</p>
      <p className="mt-4 whitespace-pre-line text-lg leading-8 text-ink">
        {text || "Комментарий будет добавлен после первичной проверки автомобиля."}
      </p>
    </section>
  );
}
