import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/auth";
import { importCarWithAutoScoutBot } from "@/lib/botImportCar";
import { getCachedEnergotransbankEurSellRate } from "@/lib/exchangeRate";
import { importCarFromUrl } from "@/lib/importCar";

export const maxDuration = 60;

export async function GET(request: Request) {
  const admin = await requireAdminRequest(request);
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Link is required." }, { status: 400 });
  }

  try {
    const rate = await getCachedEnergotransbankEurSellRate();
    let car;
    try {
      car = await importCarWithAutoScoutBot(url, rate.value);
      if ((car.images?.length || 0) < 6) {
        try {
          const fallbackCar = await importCarFromUrl(url, rate.value);
          car.images = mergeImages(car.images || [], fallbackCar.images || []);
        } catch {
          // Keep the AutoScoutBot result if the secondary image pass is blocked.
        }
      }
    } catch {
      car = await importCarFromUrl(url, rate.value);
    }
    car.eurRubRate = rate.value;
    car.exchangeRateSource = rate.source;
    return NextResponse.json(car);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to import listing." },
      { status: 400 }
    );
  }
}

function mergeImages(
  primary: Array<{ url: string; alt?: string }>,
  secondary: Array<{ url: string; alt?: string }>
) {
  const seen = new Set<string>();
  return [...primary, ...secondary]
    .filter((image) => {
      const key = normalizeImageKey(image.url);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20);
}

function normalizeImageKey(url: string) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("w");
    parsed.searchParams.delete("width");
    parsed.searchParams.delete("h");
    parsed.searchParams.delete("height");
    parsed.searchParams.delete("q");
    parsed.searchParams.delete("format");
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}
