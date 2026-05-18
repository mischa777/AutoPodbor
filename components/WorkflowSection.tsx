import { Calculator, ClipboardCheck, KeyRound, Route } from "lucide-react";

const steps = [
  ["Проверка объявления", ClipboardCheck, "Анализируем историю, комплектацию, продавца, юридические и технические риски до начала сделки."],
  ["Расчет себестоимости", Calculator, "Формируем смету с курсом EUR/RUB, пошлиной, сборами, логистикой и комиссией сервиса."],
  ["Сопровождение сделки", KeyRound, "Помогаем с коммуникацией, документами, оплатой и контролем передачи автомобиля."],
  ["Маршрут и логистика", Route, "Планируем перемещение автомобиля и контрольные точки до передачи клиенту."]
] as const;

export function WorkflowSection() {
  return (
    <section id="workflow" className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-ink">Порядок работы</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {steps.map(([title, Icon, text]) => (
            <div key={title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <Icon className="mb-5 h-6 w-6 text-orbit" />
              <h3 className="font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
