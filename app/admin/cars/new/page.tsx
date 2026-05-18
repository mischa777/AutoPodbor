import { createCar } from "@/app/actions";
import { CarForm } from "@/components/CarForm";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { requireAdminPage } from "@/lib/auth";

// TODO: before production add authentication for admin routes.
export default async function NewCarPage() {
  await requireAdminPage();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <CarForm action={createCar} mode="create" />
      </main>
      <Footer />
    </>
  );
}
