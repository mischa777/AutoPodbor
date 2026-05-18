import { Mail, MapPin, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer id="contacts" className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm text-muted sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <p className="text-base font-semibold text-ink">Hohmann Auto Transfer</p>
          <p className="mt-2">Подбор, расчет и сопровождение импорта автомобилей из Германии в Россию.</p>
        </div>
        <div className="space-y-2">
          <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-orbit" /> +49 000 000000</p>
          <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-orbit" /> hello@hohmann-auto.example</p>
        </div>
        <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-orbit" /> Работаем с объявлениями, документами и логистикой на маршруте Германия → Россия.</p>
      </div>
    </footer>
  );
}
