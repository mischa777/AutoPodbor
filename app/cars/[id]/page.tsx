import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CarGallery } from "@/components/CarGallery";
import { CarSpecs } from "@/components/CarSpecs";
import { CostCalculator } from "@/components/CostCalculator";
import { Footer } from "@/components/Footer";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Header } from "@/components/Header";
import { ProsConsBlock } from "@/components/ProsConsBlock";
import { ReviewBlock } from "@/components/ReviewBlock";
import { StatusBadge } from "@/components/StatusBadge";
import { formatEur, formatKm } from "@/lib/carTypes";
import { getCarById } from "@/lib/cars";

export const dynamic = "force-dynamic";

export default async function CarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const car = await getCarById(id);
  if (!car) notFound();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/#cars" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-orbit">
          <ArrowLeft className="h-4 w-4" /> К списку автомобилей
        </Link>
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <CarGallery images={car.images} title={car.title} />
          <aside className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
            <StatusBadge status={car.status} />
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink">{car.title}</h1>
            <p className="mt-4 text-lg text-muted">{car.shortDescription}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-mist p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Цена в Германии</p>
                <p className="mt-1 text-xl font-semibold text-orbit">{formatEur(car.priceBruttoEur)}</p>
              </div>
              <div className="rounded-2xl bg-mist p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Пробег</p>
                <p className="mt-1 text-xl font-semibold text-ink">{formatKm(car.mileageKm)}</p>
              </div>
            </div>
            <div className="mt-6">
              <FavoriteButton carId={car.id} />
            </div>
          </aside>
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <CarSpecs car={car} />
          <CostCalculator car={car} />
        </div>
        <div className="mt-8 space-y-8">
          <ReviewBlock text={car.reviewText} />
          <ProsConsBlock pros={car.pros} cons={car.cons} />
        </div>
      </main>
      <Footer />
    </>
  );
}
