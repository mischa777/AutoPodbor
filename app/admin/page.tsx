import { AdminCarTable } from "@/components/AdminCarTable";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { requireAdminPage } from "@/lib/auth";
import { getAllCars } from "@/lib/cars";

export const dynamic = "force-dynamic";

// TODO: before production add authentication for admin routes.
export default async function AdminPage() {
  await requireAdminPage();
  const cars = await getAllCars();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminCarTable cars={cars} />
      </main>
      <Footer />
    </>
  );
}
