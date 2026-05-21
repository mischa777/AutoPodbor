import { AdminCarTable } from "@/components/AdminCarTable";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ParserControlPanel } from "@/components/ParserControlPanel";
import { requireAdminPage } from "@/lib/auth";
import { getAllCars } from "@/lib/cars";
import { getParserSettings } from "@/lib/parserSettings";

export const dynamic = "force-dynamic";

// TODO: before production add authentication for admin routes.
export default async function AdminPage() {
  await requireAdminPage();
  const [cars, parserSettings] = await Promise.all([getAllCars(), getParserSettings()]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ParserControlPanel initialSettings={parserSettings} />
        <AdminCarTable cars={cars} />
      </main>
      <Footer />
    </>
  );
}
