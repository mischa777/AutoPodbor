import { notFound } from "next/navigation";
import { updateCar } from "@/app/actions";
import { CarForm } from "@/components/CarForm";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { requireAdminPage } from "@/lib/auth";
import { getCarById } from "@/lib/cars";

export const dynamic = "force-dynamic";

// TODO: before production add authentication for admin routes.
export default async function EditCarPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const car = await getCarById(id);
  if (!car) notFound();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <CarForm car={car} action={updateCar.bind(null, id)} mode="edit" />
      </main>
      <Footer />
    </>
  );
}
