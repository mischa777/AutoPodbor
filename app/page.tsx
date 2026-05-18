import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { PotentialCarsSection } from "@/components/PotentialCarsSection";
import { WorkflowSection } from "@/components/WorkflowSection";
import { getFeaturedCars } from "@/lib/cars";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cars = await getFeaturedCars();

  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <PotentialCarsSection cars={cars} />
        <WorkflowSection />
      </main>
      <Footer />
    </>
  );
}
