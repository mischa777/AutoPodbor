import { Suspense } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-4 py-10 sm:px-6 lg:px-8">
        <Suspense>
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
