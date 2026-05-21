import { getCachedEnergotransbankEurSellRate } from "@/lib/exchangeRate";
import { importCarFromUrl, type ImportedCar } from "@/lib/importCar";
import { getExistingCarSourceUrls, normalizeSourceUrl } from "@/lib/cars";
import { getParserSettings, type ParserSettings } from "@/lib/parserSettings";
import { candidateIdFromUrl, setCandidateTelegramMessage, upsertCandidate, type TelegramCandidate } from "@/lib/telegramCandidates";
import { sendTelegramMessage } from "@/lib/telegram";
import { archiveUnavailableCarLinks, type LinkHealthResult } from "@/lib/linkHealth";

export type ScanResult = {
  sources: number;
  links: number;
  imported: number;
  sent: number;
  skipped: number;
  skippedReasons: Record<string, number>;
  linkHealth?: LinkHealthResult;
  errors: string[];
  debug?: ScanSourceDebug[];
};

type ScanSourceDebug = {
  url: string;
  status?: number;
  htmlLength?: number;
  autoscoutMarkers?: number;
  kleinanzeigenMarkers?: number;
  listingMarkers?: number;
  links?: number;
  sampleLinks?: string[];
};

const excludeMarkers = [
  "electric",
  "elektro",
  "гибрид",
  "hybrid",
  "plug-in",
  "plugin",
  "phev",
  "motorschaden",
  "getriebeschaden",
  "bastlerfahrzeug",
  "nicht fahrbereit",
  "defekt",
  "teileträger",
  "ohne papiere",
  "unfallfahrzeug ja",
  "totalschaden"
];

export async function scanConfiguredCarSearches(options: { debug?: boolean; settings?: ParserSettings } = {}): Promise<ScanResult> {
  const settings = options.settings || await getParserSettings();
  const sources = expandSearchPages(settings.searchUrls, settings.scanPages);
  const result: ScanResult = {
    sources: sources.length,
    links: 0,
    imported: 0,
    sent: 0,
    skipped: 0,
    skippedReasons: {},
    errors: [],
    debug: options.debug ? [] : undefined
  };
  const rate = await getCachedEnergotransbankEurSellRate();
  const seen = new Set<string>();
  result.linkHealth = await archiveUnavailableCarLinks();
  const existingCarUrls = await getExistingCarSourceUrls();

  for (const sourceUrl of sources) {
    let links: string[] = [];
    try {
      const extracted = await extractListingLinks(sourceUrl, settings);
      links = extracted.links;
      if (options.debug) result.debug?.push(extracted.debug);
    } catch (error) {
      result.errors.push(`${sourceUrl}: ${errorMessage(error)}`);
      continue;
    }

    for (const link of links) {
      const normalized = normalizeUrl(link);
      if (seen.has(normalized)) {
        addSkipped(result, "duplicate_in_scan");
        continue;
      }
      seen.add(normalized);
      if (existingCarUrls.has(normalizeSourceUrl(normalized))) {
        addSkipped(result, "already_on_site");
        continue;
      }
      result.links += 1;

      try {
        const imported = await importCarFromUrl(normalized, rate.value);
        imported.eurRubRate = rate.value;
        imported.exchangeRateSource = rate.source;
        result.imported += 1;

        const filter = getSuitability(imported, settings);
        if (!filter.passed) {
          addSkipped(result, filter.reason || "filter");
          continue;
        }

        const candidate = await upsertCandidate(imported, sourceUrl);
        if (candidate.status !== "new" || candidate.telegramMessageId) {
          addSkipped(result, "already_sent_or_closed");
          continue;
        }

        const message = await sendTelegramMessage(formatCandidateMessage(candidate, filter.reasons), candidateKeyboard(candidate.id, imported.sourceUrl));
        await setCandidateTelegramMessage(candidate.id, message.message_id);
        result.sent += 1;
      } catch (error) {
        result.errors.push(`${normalized}: ${errorMessage(error)}`);
      }
    }
  }

  return result;
}

export function candidateKeyboard(candidateId: string, sourceUrl?: string) {
  return [
    [{ text: "Сформировать описание", callback_data: `describe:${candidateId}` }],
    [{ text: "Добавить в подборку", callback_data: `publish:${candidateId}` }],
    [
      ...(sourceUrl ? [{ text: "Открыть объявление", url: sourceUrl }] : []),
      { text: "Пропустить", callback_data: `skip:${candidateId}` }
    ]
  ].filter((row) => row.length);
}

export function candidateAfterDescriptionKeyboard(candidateId: string, sourceUrl?: string) {
  return [
    [{ text: "Добавить в подборку", callback_data: `publish:${candidateId}` }],
    [
      ...(sourceUrl ? [{ text: "Открыть объявление", url: sourceUrl }] : []),
      { text: "Пропустить", callback_data: `skip:${candidateId}` }
    ]
  ].filter((row) => row.length);
}

export function formatCandidateMessage(candidate: TelegramCandidate, reasons: string[] = []) {
  const car = candidate.car;
  return [
    "Найден подходящий вариант",
    "",
    car.title || [car.brand, car.model, car.year].filter(Boolean).join(" "),
    [
      car.year ? `${car.year} г.` : undefined,
      car.mileageKm ? `${formatNumber(car.mileageKm)} км` : undefined,
      car.fuel,
      car.powerHp ? `${car.powerHp} л.с.` : undefined,
      car.engineVolumeCm3 ? `${formatNumber(car.engineVolumeCm3)} см3` : undefined,
      car.transmission
    ].filter(Boolean).join(" | "),
    car.priceBruttoEur ? `Цена: ${formatNumber(car.priceBruttoEur)} EUR brutto` : undefined,
    car.priceNettoEur ? `Netto: ${formatNumber(car.priceNettoEur)} EUR` : undefined,
    car.serviceFeeRub ? `Цена под ключ ориентир: ${formatNumber(estimatedTotalRub(car))} RUB` : undefined,
    car.location ? `Локация: ${car.location}` : undefined,
    reasons.length ? `Почему прошло фильтр: ${reasons.join(", ")}` : undefined,
    "",
    "Дальше можно сформировать сухое описание или сразу добавить машину в подборку."
  ].filter(Boolean).join("\n");
}

export function formatCandidateWithContent(candidate: TelegramCandidate) {
  const content = candidate.content;
  if (!content) return formatCandidateMessage(candidate);
  return [
    formatCandidateMessage(candidate),
    "",
    "Описание",
    content.shortDescription,
    "",
    "Обзор",
    content.reviewText,
    "",
    "Плюсы",
    ...content.pros.map((item) => `- ${item.title}: ${item.text}`),
    "",
    "Минусы",
    ...content.cons.map((item) => `- ${item.title}: ${item.text}`)
  ].join("\n");
}

async function extractListingLinks(searchUrl: string, settings: ParserSettings) {
  const fetched = await fetchSearchHtml(searchUrl);
  const html = normalizeSearchHtml(fetched.html);
  const links = uniqueStrings([...extractAutoScoutLinks(html, searchUrl), ...extractKleinanzeigenLinks(html, searchUrl)])
    .slice(0, settings.maxLinks);
  return {
    links,
    debug: {
      url: searchUrl,
      status: fetched.status,
      htmlLength: fetched.html.length,
      autoscoutMarkers: countMatches(html, /\/angebote\//gi),
      kleinanzeigenMarkers: countMatches(html, /\/s-anzeige\//gi),
      listingMarkers: countMatches(html, /(?:list-item|data-guid|firstRegistration|vehicle|angebote|s-anzeige)/gi),
      links: links.length,
      sampleLinks: links.slice(0, 3)
    }
  };
}

async function fetchSearchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "de-DE,de;q=0.9,en;q=0.8,ru;q=0.7",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Search page returned ${response.status}.`);
  return { html: await response.text(), status: response.status };
}

function extractAutoScoutLinks(html: string, baseUrl: string) {
  return [
    ...html.matchAll(/href=["']([^"']*\/angebote\/[^"']+)["']/gi),
    ...html.matchAll(/["'](https?:\/\/[^"']*autoscout24\.[^"']*\/angebote\/[^"']+)["']/gi),
    ...html.matchAll(/["'](\/angebote\/[^"']+)["']/gi)
  ]
    .map((match) => cleanListingUrl(absoluteUrl(match[1], baseUrl)))
    .filter((url) => url.includes("autoscout24."));
}

function extractKleinanzeigenLinks(html: string, baseUrl: string) {
  return [
    ...html.matchAll(/href=["']([^"']*\/s-anzeige\/[^"']+)["']/gi),
    ...html.matchAll(/["'](https?:\/\/[^"']*kleinanzeigen\.[^"']*\/s-anzeige\/[^"']+)["']/gi),
    ...html.matchAll(/["'](\/s-anzeige\/[^"']+)["']/gi)
  ]
    .map((match) => cleanListingUrl(absoluteUrl(match[1], baseUrl)))
    .filter((url) => url.includes("kleinanzeigen."));
}

function getSuitability(car: ImportedCar, settings: ParserSettings) {
  const reasons: string[] = [];
  const text = [car.title, car.brand, car.model, car.fuel, car.engineDescription, car.shortDescription, car.reviewText].filter(Boolean).join(" ").toLowerCase();
  if (!car.sourceUrl || !car.brand || !car.model || !car.priceBruttoEur) return { passed: false, reasons, reason: "missing_required_fields" };
  if (excludeMarkers.some((marker) => text.includes(marker))) return { passed: false, reasons, reason: "excluded_marker" };
  if (car.fuel && !/(дизель|бензин|diesel|benzin|petrol|gasoline)/i.test(car.fuel)) return { passed: false, reasons, reason: "fuel" };
  if (car.powerHp && car.powerHp > settings.maxPowerHp) return { passed: false, reasons, reason: "power" };
  if (car.engineVolumeCm3 && car.engineVolumeCm3 > settings.maxEngineCc) return { passed: false, reasons, reason: "engine_volume" };
  if (car.priceBruttoEur > settings.maxPriceEur) return { passed: false, reasons, reason: "germany_price" };
  if (car.mileageKm && car.mileageKm > settings.maxMileageKm) return { passed: false, reasons, reason: "mileage" };
  if (settings.budgetRub && estimatedTotalRub(car) > settings.budgetRub) return { passed: false, reasons, reason: "budget" };

  if (car.powerHp) reasons.push(`до ${settings.maxPowerHp} л.с.`);
  if (car.engineVolumeCm3) reasons.push("объем подходит");
  if (car.priceBruttoEur) reasons.push("цена в лимите");
  if (car.mileageKm) reasons.push("пробег в лимите");
  if (settings.budgetRub) reasons.push("в бюджете");
  return { passed: true, reasons };
}

function expandSearchPages(urls: string[], pages: number) {
  if (pages === 1) return urls;
  return urls.flatMap((url) => {
    try {
      const parsed = new URL(url);
      return Array.from({ length: pages }, (_, index) => {
        parsed.searchParams.set("page", String(index + 1));
        return parsed.toString();
      });
    } catch {
      return [url];
    }
  });
}

function estimatedTotalRub(car: ImportedCar) {
  const taxablePriceEur = car.priceNettoEur || car.priceBruttoEur || 0;
  return Math.round(
    taxablePriceEur * (car.eurRubRate || 0) +
    (car.customsDutyRub || 0) +
    (car.platesInsuranceRub || 0) +
    (car.transportRub || 0) +
    (car.customsFeeRub || 0) +
    (car.recyclingFeeRub || 0) +
    (car.customsChecksRub || 0) +
    (car.serviceFeeRub || 0)
  );
}

function absoluteUrl(url: string, baseUrl: string) {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

function cleanListingUrl(url: string) {
  return url
    .replace(/\\u002F/g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/[),.;\\]+$/, "");
}

function normalizeSearchHtml(html: string) {
  return html
    .replace(/\\u002F/g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&");
}

function normalizeUrl(url: string) {
  return url;
}

function addSkipped(result: ScanResult, reason: string) {
  result.skipped += 1;
  result.skippedReasons[reason] = (result.skippedReasons[reason] || 0) + 1;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);
}

function countMatches(text: string, pattern: RegExp) {
  return [...text.matchAll(pattern)].length;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
