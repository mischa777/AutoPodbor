import { archiveCar, getAllCars } from "@/lib/cars";

export type LinkHealthResult = {
  checked: number;
  archived: number;
  errors: string[];
};

const goneMarkers = [
  "seite nicht gefunden",
  "page not found",
  "not found",
  "anzeige wurde gelöscht",
  "angebot wurde entfernt",
  "объявление было удалено",
  "страница не найдена"
];

export async function archiveUnavailableCarLinks(): Promise<LinkHealthResult> {
  const cars = await getAllCars();
  const result: LinkHealthResult = { checked: 0, archived: 0, errors: [] };

  for (const car of cars) {
    if (!car.sourceUrl || car.status === "archived") continue;
    result.checked += 1;
    try {
      const available = await isListingAvailable(car.sourceUrl);
      if (!available) {
        await archiveCar(car.id);
        result.archived += 1;
      }
    } catch (error) {
      result.errors.push(`${car.sourceUrl}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return result;
}

async function isListingAvailable(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "de-DE,de;q=0.9,en;q=0.8,ru;q=0.7",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    },
    cache: "no-store"
  });

  if (response.status === 404 || response.status === 410) return false;
  if (!response.ok) return true;

  const text = (await response.text()).toLowerCase().slice(0, 80_000);
  return !goneMarkers.some((marker) => text.includes(marker));
}
