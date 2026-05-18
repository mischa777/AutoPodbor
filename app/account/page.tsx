import { AccountDashboard } from "@/components/AccountDashboard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <AccountDashboard />
      </main>
      <Footer />
    </>
  );
}
