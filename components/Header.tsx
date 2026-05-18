import Link from "next/link";
import { CarFront, Orbit, UserRound } from "lucide-react";
import { getSessionUser, isAdminEmail } from "@/lib/firebaseAdmin";

export async function Header() {
  const user = await getSessionUser();
  const isAdmin = isAdminEmail(user?.email);

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-orbit text-white shadow-soft">
            <Orbit className="absolute h-10 w-10 opacity-35" />
            <CarFront className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-lg font-semibold tracking-tight text-ink">Hohmann Auto Transfer</span>
            <span className="block text-sm text-muted">Правильная траектория вашего автомобиля</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-ink">
          <Link href="/">Главная</Link>
          <Link href="/#cars">Автомобили</Link>
          <Link href="/#workflow">Порядок работы</Link>
          <Link href="/#contacts">Контакты</Link>
          <Link className="inline-flex items-center gap-2 rounded-full bg-mist px-4 py-2 text-orbit" href="/account">
            <UserRound className="h-4 w-4" />
            Кабинет
          </Link>
          {isAdmin && (
            <Link className="rounded-full bg-orbit px-4 py-2 text-white" href="/admin">
              Админка
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
