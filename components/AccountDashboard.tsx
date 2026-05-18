"use client";

import Image from "next/image";
import Link from "next/link";
import { getDocs, collection, orderBy, query } from "firebase/firestore";
import { Heart, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { firestore } from "@/lib/firebaseClient";

type FavoriteItem = {
  carId: string;
};

type AccountCar = {
  id: string;
  title: string;
  year: number;
  mileageKm: number;
  priceBruttoEur: number;
  priceNettoEur?: number | null;
  eurRubRate: number;
  customsDutyRub: number;
  platesInsuranceRub: number;
  transportRub: number;
  customsFeeRub: number;
  recyclingFeeRub: number;
  customsChecksRub: number;
  serviceFeeRub?: number | null;
  images: { url: string; alt?: string | null }[];
};

export function AccountDashboard() {
  const { user, loading, configured, logout } = useAuth();
  const [favorites, setFavorites] = useState<AccountCar[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!user || !firestore) return;

    async function loadFavorites() {
      setState("loading");
      try {
        const favoritesQuery = query(collection(firestore!, "users", user!.uid, "favorites"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(favoritesQuery);
        const favoriteItems = snapshot.docs.map((item) => item.data() as FavoriteItem);
        const cars = await Promise.all(
          favoriteItems.map(async (item) => {
            const response = await fetch(`/api/cars/${item.carId}`);
            return response.ok ? ((await response.json()) as AccountCar) : null;
          })
        );
        setFavorites(cars.filter((car): car is AccountCar => Boolean(car)));
        setState("ready");
      } catch {
        setState("error");
      }
    }

    loadFavorites();
  }, [user]);

  if (!configured) {
    return (
      <Panel title="Личный кабинет">
        <p className="text-muted">Firebase пока не настроен. После добавления ключей здесь появятся вход и избранное.</p>
      </Panel>
    );
  }

  if (loading) {
    return <Panel title="Личный кабинет"><p className="text-muted">Загрузка...</p></Panel>;
  }

  if (!user) {
    return (
      <Panel title="Личный кабинет">
        <p className="text-muted">Войдите, чтобы сохранять автомобили в избранное.</p>
        <Link className="mt-5 inline-flex rounded-full bg-orbit px-5 py-3 font-semibold text-white" href="/login?next=/account">
          Войти
        </Link>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <Panel title="Личный кабинет">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted">Вы вошли как</p>
            <p className="mt-1 font-semibold text-ink">{user.email}</p>
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-full bg-mist px-5 py-3 font-semibold text-orbit" type="button" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </div>
      </Panel>

      <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-orbit" />
          <h2 className="text-2xl font-semibold text-ink">Избранные автомобили</h2>
        </div>

        {state === "loading" && <p className="mt-5 text-muted">Загрузка избранного...</p>}
        {state === "error" && <p className="mt-5 text-rose-600">Не удалось загрузить избранное.</p>}
        {state === "ready" && favorites.length === 0 && (
          <p className="mt-5 text-muted">Пока ничего не добавлено. Откройте карточку автомобиля и нажмите “В избранное”.</p>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {favorites.map((car) => (
            <Link key={car.id} href={`/cars/${car.id}`} className="grid gap-4 rounded-2xl bg-mist p-3 ring-1 ring-slate-200 sm:grid-cols-[140px_1fr]">
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-200">
                {car.images[0] && <Image src={car.images[0].url} alt={car.title} fill className="object-cover" sizes="140px" />}
              </div>
              <div>
                <h3 className="font-semibold text-ink">{car.title}</h3>
                <p className="mt-1 text-sm text-muted">{car.year} · {formatKm(car.mileageKm)}</p>
                <p className="mt-2 text-sm text-muted">{formatEur(car.priceBruttoEur)}</p>
                <p className="mt-2 font-semibold text-orbit">{formatRub(calculateTotalRub(car))}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
      <h1 className="text-3xl font-semibold text-ink">{title}</h1>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function calculateTotalRub(car: AccountCar) {
  const priceEur = car.priceNettoEur ?? car.priceBruttoEur;
  return (
    priceEur * car.eurRubRate +
    car.customsDutyRub +
    car.platesInsuranceRub +
    car.transportRub +
    car.customsFeeRub +
    car.recyclingFeeRub +
    car.customsChecksRub +
    (car.serviceFeeRub ?? 0)
  );
}

function formatRub(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(value);
}

function formatEur(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatKm(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} км`;
}
