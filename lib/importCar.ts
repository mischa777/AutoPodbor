export type ImportedCar = {
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  month?: number;
  mileageKm?: number;
  bodyType?: string;
  engineDescription?: string;
  engineVolumeCm3?: number;
  powerHp?: number;
  powerKw?: number;
  transmission?: string;
  fuel?: string;
  priceBruttoEur?: number;
  priceNettoEur?: number;
  eurRubRate?: number;
  exchangeRateSource?: string;
  customsDutyRub?: number;
  platesInsuranceRub?: number;
  transportRub?: number;
  customsFeeRub?: number;
  recyclingFeeRub?: number;
  customsChecksRub?: number;
  location?: string;
  serviceFeeRub?: number;
  serviceFeePercent?: number;
  marketPriceRub?: number;
  sourceUrl?: string;
  shortDescription?: string;
  reviewText?: string;
  images?: { url: string; alt?: string }[];
  warnings?: string[];
  botMeta?: {
    source?: string;
    method?: string;
    needsManualDetails?: boolean;
    missingFields?: string[];
  };
};

type JsonRecord = Record<string, unknown>;

type NormalizedListing = {
  title?: string;
  brand?: string;
  model?: string;
  priceEur?: number;
  netPriceEur?: number;
  mileageKm?: number;
  firstRegistrationMonth?: number;
  firstRegistrationYear?: number;
  engineCc?: number;
  powerKw?: number;
  powerHp?: number;
  fuelType?: string;
  gearbox?: string;
  bodyType?: string;
  sellersType?: "dealer" | "private" | "unknown";
  vatDeductible?: boolean;
  location?: string;
  url?: string;
  images: string[];
  description?: string;
  warnings: string[];
};

const EXPORT_NUMBERS_INSURANCE_EUR = 100;
const DRIVING_TO_BORDER_EUR = 200;
const CUSTOMS_REPRESENTATIVE_RUB = 65_000;

const KNOWN_BRANDS = [
  "Ford",
  "Kia",
  "Hyundai",
  "Mitsubishi",
  "Renault",
  "Dacia",
  "Fiat",
  "VW",
  "Volkswagen",
  "Skoda",
  "Seat",
  "Toyota",
  "Peugeot",
  "Citroen",
  "Opel",
  "Audi",
  "BMW",
  "Mercedes-Benz",
  "Mercedes",
  "Nissan",
  "Mazda",
  "Honda"
];

export async function importCarFromUrl(url: string, eurRubRate = 100): Promise<ImportedCar> {
  const parsedUrl = new URL(url);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only HTTP and HTTPS links are supported.");
  }

  let { html, status } = await fetchHtml(parsedUrl.toString());
  if (status && [401, 403, 429].includes(status)) {
    throw new Error(`AutoScout24 returned HTTP ${status}; not bypassing block pages.`);
  }
  if (!hasListingMarkers(html.toLowerCase()) || html.length < 100_000) {
    html = await fetchHtmlWithPlaywright(parsedUrl.toString(), html);
  }

  const block = assessBlockStatus(html);
  if (block.status === "blocked") {
    throw new Error(`AutoScout24 returned block page (${block.reason || "unknown block"}); not bypassing it.`);
  }

  const listing = extractListingFromHtml(html, parsedUrl.toString());
  validateListing(listing);
  const calc = calculateImportCost(listing, eurRubRate);
  const title = listing.title || [listing.brand, listing.model, listing.firstRegistrationYear].filter(Boolean).join(" ");
  const fuel = translateFuel(listing.fuelType);
  const transmission = translateTransmission(listing.gearbox);

  return {
    title,
    brand: listing.brand,
    model: listing.model,
    year: listing.firstRegistrationYear,
    month: listing.firstRegistrationMonth,
    mileageKm: listing.mileageKm,
    bodyType: translateBodyType(listing.bodyType),
    engineDescription: buildEngineDescription(listing.engineCc, listing.powerHp, fuel),
    engineVolumeCm3: listing.engineCc,
    powerHp: listing.powerHp,
    powerKw: listing.powerKw,
    transmission,
    fuel,
    priceBruttoEur: listing.priceEur,
    priceNettoEur: calculateNettoFromBrutto(listing.priceEur),
    eurRubRate,
    customsDutyRub: calc.customsDutyRub,
    platesInsuranceRub: 15000,
    transportRub: 30000,
    customsFeeRub: calc.customsFeeRub,
    recyclingFeeRub: calc.recyclingFeeRub,
    customsChecksRub: calc.customsRepresentativeRub,
    serviceFeeRub: calculateServiceFeeRub(calc.preServiceTotalRub),
    serviceFeePercent: 7,
    location: listing.location,
    sourceUrl: parsedUrl.toString(),
    shortDescription: listing.description,
    reviewText: buildReviewText(listing, calc.warnings),
    images: uniqueStrings(listing.images).slice(0, 20).map((imageUrl) => ({ url: imageUrl, alt: title || "Фото автомобиля" })),
    warnings: [...block.warnings, ...listing.warnings, ...calc.warnings]
  };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "de-DE,de;q=0.9,en;q=0.8,ru;q=0.7",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Listing page returned ${response.status}.`);
  }

  return { html: await response.text(), status: response.status };
}

async function fetchHtmlWithPlaywright(url: string, fallbackHtml: string) {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({
        locale: "de-DE",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
      });
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      if (response && [401, 403, 429].includes(response.status())) {
        throw new Error(`AutoScout24 returned HTTP ${response.status()}; not bypassing block pages.`);
      }
      await page.waitForTimeout(3000);
      return await page.content();
    } finally {
      await browser.close();
    }
  } catch {
    return fallbackHtml;
  }
}

function extractListingFromHtml(html: string, url: string): NormalizedListing {
  const text = normalizeSpaces(decodeHtml(stripTags(html)));
  const title = firstString(tagText(html, "title"), meta(html, "og:title"));
  const titleFields = extractFromTitle(title || "");
  const jsonItems = [...extractJsonLd(html), ...extractEmbeddedJson(html)];
  const mapped = mergeListings(
    jsonItems
      .map(listingFromMapping)
      .filter((listing) => listingRelevanceScore(listing) >= 4)
      .sort((left, right) => listingRelevanceScore(right) - listingRelevanceScore(left))
  );
  const description = firstString(meta(html, "og:description"), meta(html, "description"), mapped.description);
  const textListing = titleLooksLikeListing(title || "") || listingRelevanceScore(mapped) >= 5
    ? listingFromText(text)
    : { images: [], warnings: [] };
  const safeTitleFields = genericTitle(titleFields.title) ? { ...titleFields, title: undefined } : titleFields;

  return mergeListing(
    {
      images: [],
      warnings: []
    },
    mapped,
    textListing,
    {
      ...safeTitleFields,
      title: firstNonGenericTitle(mapped.title, safeTitleFields.title, title),
      url,
      description,
      images: uniqueStrings([
        ...mapped.images,
        meta(html, "og:image"),
        ...extractImageUrls(html)
      ]),
      warnings: []
    }
  );
}

function listingFromText(text: string): NormalizedListing {
  const firstReg = parseFirstRegistration(text);
  const power = parsePower(text);
  const netPrice = parseNetPriceEur(text);

  return {
    title: undefined,
    priceEur: parsePriceEur(text),
    netPriceEur: netPrice,
    mileageKm: parseMileageKm(text),
    firstRegistrationMonth: firstReg.month,
    firstRegistrationYear: firstReg.year,
    engineCc: parseEngineCc(text),
    powerKw: power.kw,
    powerHp: power.hp,
    fuelType: normalizeFuel(text),
    gearbox: normalizeGearbox(text),
    sellersType: normalizeSellerType(text),
    vatDeductible: detectVatDeductible(text) || Boolean(netPrice),
    description: text.slice(0, 1200),
    images: [],
    warnings: []
  };
}

function listingFromMapping(data: JsonRecord): NormalizedListing {
  const offers = asRecord(data.offers) || asRecord(get(data, "props.pageProps.listing.offers")) || {};
  const brand = normalizeNamedValue(firstDefined(data.brand, data.manufacturer, get(data, "vehicle.brand")));
  const model = normalizeNamedValue(firstDefined(data.model, data.modelName, get(data, "vehicle.model")));
  const engineBlob = JSON.stringify(firstDefined(data.vehicleEngine, data.engine, data.motor, get(data, "vehicle.engine")) || {});
  const dataBlob = JSON.stringify(data).slice(0, 8000);
  const mileageBlob = JSON.stringify(firstDefined(data.vehicleMileage, data.mileage, data.mileageFromOdometer, get(data, "vehicle.mileage")) || "");
  const firstReg = parseFirstRegistration(String(firstDefined(data.dateVehicleFirstRegistered, data.firstRegistration, data.firstRegistrationDate, get(data, "vehicle.firstRegistration")) || ""));
  const power = parsePower(`${engineBlob} ${dataBlob}`);
  const images = asStringArray(firstDefined(data.image, data.images, get(data, "gallery.images"), get(data, "vehicle.images")));

  return {
    title: firstString(data.name, data.title, data.vehicleTitle, get(data, "vehicle.title")),
    brand,
    model,
    priceEur: firstNumber(offers.price, data.price, data.offerPrice, get(data, "price.amount")),
    netPriceEur: firstNumber(data.netPrice, data.netPriceEur, get(data, "price.net"), parseNetPriceEur(dataBlob)),
    mileageKm: parseMileageKm(mileageBlob),
    firstRegistrationMonth: firstReg.month,
    firstRegistrationYear: firstReg.year,
    engineCc: parseEngineCc(engineBlob) || parseEngineCc(dataBlob),
    powerKw: power.kw,
    powerHp: power.hp,
    fuelType: normalizeFuel(firstString(data.fuelType, data.fuel, data.fuelTypeName, get(data, "vehicle.fuel")) || dataBlob),
    gearbox: normalizeGearbox(firstString(data.vehicleTransmission, data.gearbox, data.transmission, get(data, "vehicle.transmission")) || dataBlob),
    bodyType: firstString(data.bodyType, data.bodyStyle, data.body, get(data, "vehicle.bodyType")),
    sellersType: normalizeSellerType(firstString(data.sellerType, data.sellersType, get(data, "seller.type"))),
    vatDeductible: detectVatDeductible(dataBlob),
    location: firstString(
      get(data, "offers.availableAtOrFrom.address.addressLocality"),
      get(data, "availableAtOrFrom.address.addressLocality"),
      get(data, "seller.address.addressLocality"),
      get(data, "location.city"),
      get(data, "vehicle.location")
    ),
    images,
    description: firstString(data.description, data.subtitle),
    warnings: []
  };
}

function validateListing(listing: NormalizedListing) {
  const score = listingRelevanceScore(listing);
  if (score < 6) {
    throw new Error("AutoScout24 did not return a complete listing page on this host. Try again later or import locally.");
  }

  if (genericTitle(listing.title)) {
    listing.title = [listing.brand, listing.model, listing.firstRegistrationYear].filter(Boolean).join(" ") || undefined;
  }

  if (listing.engineCc && (listing.engineCc < 500 || listing.engineCc > 8000)) {
    listing.engineCc = undefined;
  }
  if (listing.netPriceEur && listing.priceEur && (listing.netPriceEur < listing.priceEur * 0.5 || listing.netPriceEur > listing.priceEur)) {
    listing.netPriceEur = undefined;
    listing.vatDeductible = false;
  }
  if (listing.priceEur) {
    listing.netPriceEur = calculateNettoFromBrutto(listing.priceEur);
    listing.vatDeductible = true;
  }
  if (listing.mileageKm && listing.mileageKm < 1000) {
    listing.mileageKm = undefined;
  }
  if (!listing.brand || !listing.model || !listing.priceEur) {
    throw new Error("AutoScout24 returned partial listing data on this host. The importer refused to fill the form with unreliable values.");
  }
}

function listingRelevanceScore(listing: NormalizedListing) {
  let score = 0;
  if (listing.brand) score += 2;
  if (listing.model) score += 2;
  if (listing.priceEur && listing.priceEur > 500) score += 2;
  if (listing.mileageKm && listing.mileageKm > 1000) score += 1;
  if (listing.firstRegistrationYear && listing.firstRegistrationYear >= 1990) score += 1;
  if (listing.engineCc && listing.engineCc >= 500 && listing.engineCc <= 8000) score += 1;
  if (listing.powerHp && listing.powerHp >= 40 && listing.powerHp <= 800) score += 1;
  if (listing.images?.length) score += 1;
  if (listing.title && !genericTitle(listing.title)) score += 1;
  return score;
}

function firstNonGenericTitle(...values: Array<string | undefined>) {
  return values.find((value) => value && !genericTitle(value));
}

function genericTitle(value?: string) {
  const normalized = normalizeSpaces(value || "").toLowerCase();
  return !normalized || ["startseite", "autoscout24", "auto kaufen", "gebrauchtwagen"].includes(normalized);
}

function extractFromTitle(title: string): NormalizedListing {
  const normalized = normalizeSpaces(title);
  const priceMatch = normalized.match(/(?:für\s*)?€\s*([\d.]+)|für\s*€\s*([\d.]+)|([\d.]+)\s*€/i);
  const brandMatch = KNOWN_BRANDS.map((brand) => ({
    brand,
    match: normalized.match(new RegExp(`\\b${escapeRegex(brand)}\\s+([A-Za-z0-9ÄÖÜäöüß-]+)`, "i"))
  })).find((entry) => entry.match);
  const locationMatch = normalized.match(/\sgebraucht\s+in\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß .-]+?)\s+für\s*€/i)
    || normalized.match(/\sin\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß.-]+)\s+für\s*€/i);

  return {
    title: normalized || undefined,
    brand: brandMatch?.brand,
    model: brandMatch?.match?.[1],
    priceEur: parsePriceEur(priceMatch?.find(Boolean)),
    bodyType: normalized.match(/\b(Kombi|SUV|Limousine|Cabrio|Coupe|Van|Kleinwagen)\b/i)?.[1],
    location: locationMatch?.[1] ? normalizeSpaces(locationMatch[1]) : undefined,
    images: [],
    warnings: []
  };
}

function calculateImportCost(listing: NormalizedListing, eurRubRate: number) {
  const taxablePriceEur = customsPriceEur(listing);
  const warnings: string[] = [];
  if (!taxablePriceEur || !listing.firstRegistrationMonth || !listing.firstRegistrationYear || !listing.engineCc) {
    warnings.push("Не все данные для расчета найдены автоматически: проверьте цену, дату регистрации и объем двигателя.");
  }

  const carPriceRub = Math.round((taxablePriceEur || listing.priceEur || 0) * eurRubRate);
  const customsFeeRub = calculateCustomsFee(carPriceRub);
  const ageYears = listing.firstRegistrationMonth && listing.firstRegistrationYear
    ? calculateVehicleAge(listing.firstRegistrationMonth, listing.firstRegistrationYear)
    : 3;
  const rate = listing.engineCc ? getCustomsRateEurPerCc(ageYears, listing.engineCc, warnings) : undefined;
  const customsDutyRub = rate && listing.engineCc ? Math.round(listing.engineCc * rate * eurRubRate) : 0;
  const recyclingFeeRub = calculateRecyclingFee(listing.powerHp, ageYears, listing.fuelType, warnings);

  return {
    customsDutyRub,
    customsFeeRub,
    recyclingFeeRub,
    exportNumbersInsuranceRub: Math.round(EXPORT_NUMBERS_INSURANCE_EUR * eurRubRate),
    drivingToBorderRub: Math.round(DRIVING_TO_BORDER_EUR * eurRubRate),
    customsRepresentativeRub: CUSTOMS_REPRESENTATIVE_RUB,
    preServiceTotalRub: carPriceRub + customsDutyRub + customsFeeRub + recyclingFeeRub + Math.round(EXPORT_NUMBERS_INSURANCE_EUR * eurRubRate) + Math.round(DRIVING_TO_BORDER_EUR * eurRubRate) + CUSTOMS_REPRESENTATIVE_RUB,
    warnings
  };
}

function calculateServiceFeeRub(preServiceTotalRub: number, marketPriceRub?: number) {
  const base = Math.round(preServiceTotalRub * 0.07);
  if (!marketPriceRub || marketPriceRub <= preServiceTotalRub) return base;
  const margin = marketPriceRub - preServiceTotalRub;
  const marginBased = Math.round(margin * 0.25);
  const capped = Math.min(Math.max(base, marginBased), Math.round(preServiceTotalRub * 0.12));
  return Math.max(base, capped);
}

function customsPriceEur(listing: NormalizedListing) {
  if (listing.priceEur) return calculateNettoFromBrutto(listing.priceEur);
  return listing.priceEur;
}

function calculateNettoFromBrutto(priceEur?: number) {
  return priceEur ? Math.round(priceEur / 1.19) : undefined;
}

function calculateVehicleAge(month: number, year: number) {
  const now = new Date();
  const months = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
  return Math.max(months, 0) / 12;
}

function getCustomsRateEurPerCc(ageYears: number, engineCc: number, warnings: string[]) {
  const bands = ageYears <= 5
    ? [[1000, 1.5], [1500, 1.7], [1800, 2.5], [2300, 2.7], [3000, 3.0], [Infinity, 3.6]]
    : [[1000, 3.0], [1500, 3.2], [1800, 3.5], [2300, 4.8], [3000, 5.0], [Infinity, 5.7]];

  if (ageYears < 3) warnings.push("Автомобиль младше 3 лет: расчет выполнен по льготной сетке 3-5 лет, дату ввоза нужно проверить вручную.");
  if (ageYears > 5) warnings.push("Автомобиль старше 5 лет: пошлина заметно выше.");
  if (engineCc > 3000) warnings.push("Объем двигателя выше 3000 см³: нужна ручная проверка выгоды.");
  else if (engineCc > 1500) warnings.push("Объем двигателя выше 1500 см³: проверьте экономику сделки.");

  return bands.find(([max]) => engineCc <= max)?.[1];
}

function calculateCustomsFee(carPriceRub: number) {
  const bands = [
    [200_000, 775],
    [450_000, 1550],
    [1_200_000, 4924],
    [2_700_000, 8531],
    [4_200_000, 12_000],
    [5_500_000, 15_500],
    [7_000_000, 20_000],
    [Infinity, 30_000]
  ];
  return bands.find(([max]) => carPriceRub <= max)?.[1] || 30_000;
}

function calculateRecyclingFee(powerHp: number | undefined, ageYears: number, fuelType: string | undefined, warnings: string[]) {
  if (isElectricOrHybrid(fuelType)) {
    warnings.push("Электро/гибрид требует ручной проверки из-за таможенных и санкционных рисков.");
    return 0;
  }
  if (!powerHp) {
    warnings.push("Нет мощности: утильсбор требует ручной проверки.");
    return 0;
  }
  if (powerHp > 160) {
    warnings.push("Мощность выше 160 л.с.: возможен высокий утильсбор, нужна ручная проверка.");
    return 0;
  }
  return ageYears > 3 ? 5200 : 3400;
}

function assessBlockStatus(html: string) {
  const title = tagText(html, "title") || "";
  const normalizedTitle = title.toLowerCase();
  const normalizedHtml = html.toLowerCase();
  const text = normalizeSpaces(stripTags(normalizedHtml));
  const responseSize = new TextEncoder().encode(html).length;
  let captchaScore = 0;
  let listingScore = 0;
  const indicators: string[] = [];
  const warnings: string[] = [];

  for (const marker of ["captcha", "access denied", "robot check", "verify you are human", "just a moment", "blocked"]) {
    if (normalizedTitle.includes(marker)) {
      captchaScore += 3;
      indicators.push(marker);
      break;
    }
  }
  for (const phrase of ["solve captcha", "access to this page has been denied", "please verify you are human", "are you a robot", "security check", "unusual traffic", "cloudflare", "too many requests", "rate limit"]) {
    if (text.includes(phrase) || normalizedHtml.includes(phrase)) {
      captchaScore += 3;
      indicators.push(phrase);
      break;
    }
  }
  if (normalizedHtml.includes("captcha") && !indicators.includes("captcha")) {
    captchaScore += 1;
    indicators.push("captcha");
  }
  if (responseSize < 100_000) captchaScore += 2;
  if (!hasListingMarkers(normalizedHtml)) captchaScore += 2;
  if (titleLooksLikeListing(title)) listingScore += 3;
  if (hasListingMarkers(normalizedHtml)) listingScore += 3;
  if (responseSize > 300_000) listingScore += 2;
  if (normalizedHtml.includes("captcha") && listingScore >= 5) {
    warnings.push("captcha indicator found in HTML, but listing markers suggest partial access.");
  }

  if (captchaScore >= 5 && listingScore < 3) return { status: "blocked", reason: indicators[0], warnings };
  if (listingScore >= 5 && captchaScore > 0) return { status: "ambiguous_but_parse_anyway", reason: indicators[0], warnings };
  if (listingScore >= 5) return { status: "accessible", reason: undefined, warnings };
  if (captchaScore > 0 && listingScore >= 3) return { status: "partial", reason: indicators[0], warnings };
  return { status: "accessible", reason: undefined, warnings };
}

function hasListingMarkers(value: string) {
  return ["price", "preis", "mileage", "kilometerstand", "first registration", "erstzulassung", "technical data", "technische daten", "autoscout24", "leistung", "kraftstoff", "getriebe", "vehicle", "offer"].some((marker) => value.includes(marker));
}

function titleLooksLikeListing(title: string) {
  const lower = title.toLowerCase();
  return title.includes("€") || lower.includes("für €") || lower.includes("gebraucht") || KNOWN_BRANDS.some((brand) => lower.includes(brand.toLowerCase()));
}

function extractJsonLd(html: string) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return scripts.flatMap((script) => parseJsonObjects(script[1]));
}

function extractEmbeddedJson(html: string) {
  if (!["__NEXT_DATA__", "window.__INITIAL_STATE__", "apolloState", "initialState", "vehicle", "firstRegistration"].some((marker) => html.includes(marker))) {
    return [];
  }
  return [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap((match) => {
      const raw = match[1];
      if (!["__NEXT_DATA__", "INITIAL_STATE", "apolloState", "initialState", "vehicle", "firstRegistration"].some((marker) => raw.includes(marker))) {
        return [];
      }
      return [...raw.matchAll(/(\{[\s\S]*\})/g)].slice(0, 2).flatMap((candidate) => parseJsonObjects(candidate[1]));
    });
}

function parseJsonObjects(raw: string): JsonRecord[] {
  try {
    return iterJsonObjects(JSON.parse(decodeHtml(raw.trim())));
  } catch {
    return [];
  }
}

function iterJsonObjects(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.flatMap(iterJsonObjects);
  if (!value || typeof value !== "object") return [];
  const record = value as JsonRecord;
  return [record, ...Object.values(record).flatMap(iterJsonObjects)];
}

function mergeListings(listings: NormalizedListing[]) {
  return mergeListing({ images: [], warnings: [] }, ...listings);
}

function mergeListing(...listings: NormalizedListing[]) {
  const merged: NormalizedListing = { images: [], warnings: [] };
  for (const listing of listings) {
    for (const key of Object.keys(listing) as Array<keyof NormalizedListing>) {
      if (key === "images") {
        merged.images = uniqueStrings([...(merged.images || []), ...(listing.images || [])]);
      } else if (key === "warnings") {
        merged.warnings = [...(merged.warnings || []), ...(listing.warnings || [])];
      } else if (isEmpty(merged[key]) && !isEmpty(listing[key])) {
        (merged as Record<string, unknown>)[key] = listing[key];
      }
    }
  }
  return merged;
}

function parsePriceEur(text?: string) {
  if (!text) return undefined;
  const match = text.match(/(?:€|EUR)\s*([\d.\s]+)|([\d.\s]+)\s*(?:€|EUR)/i);
  return parseIntFromText(match?.[1] || match?.[2] || text);
}

function parseNetPriceEur(text?: string) {
  if (!text) return undefined;
  const match = text.match(/(?:€|EUR)\s*([\d.\s]{4,})\s*\(?\s*Netto/i)
    || text.match(/([\d.\s]{4,})\s*(?:€|EUR)?\s*\(?\s*Netto/i)
    || text.match(/Netto\D{0,20}([\d.\s]{4,})/i);
  return parseIntFromText(match?.[1]);
}

function parseMileageKm(text?: string) {
  if (!text) return undefined;
  const match = text.match(/([\d.\s]+)\s*km/i);
  return parseIntFromText(match?.[1]);
}

function parseEngineCc(text?: string) {
  if (!text) return undefined;
  const match = text.match(/([\d.\s]+)\s*(?:cm³|cm3|ccm|cc)/i);
  return parseIntFromText(match?.[1]);
}

function parsePower(text?: string) {
  if (!text) return { kw: undefined, hp: undefined };
  const kw = parseIntFromText(text.match(/(\d+)\s*kW/i)?.[1]);
  const hp = parseIntFromText(text.match(/(\d+)\s*(?:PS|hp|л\.?\s*с\.?)/i)?.[1]);
  return {
    kw: kw || (hp ? Math.round(hp / 1.35962) : undefined),
    hp: hp || (kw ? Math.round(kw * 1.35962) : undefined)
  };
}

function parseFirstRegistration(text?: string) {
  if (!text) return { month: undefined, year: undefined };
  const match = text.match(/(?:(0?[1-9]|1[0-2])[\s./-])?((?:20|19)\d{2})/);
  return {
    month: match?.[1] ? Number(match[1]) : match?.[2] ? 1 : undefined,
    year: match?.[2] ? Number(match[2]) : undefined
  };
}

function normalizeFuel(text?: string) {
  const lower = text?.toLowerCase() || "";
  if (lower.includes("plug-in") || lower.includes("plugin") || lower.includes("phev")) return "plug-in hybrid";
  if (lower.includes("hybrid")) return "hybrid";
  if (lower.includes("elektro") || lower.includes("electric")) return "electric";
  if (lower.includes("diesel")) return "diesel";
  if (lower.includes("benzin") || lower.includes("petrol") || lower.includes("gasoline")) return "benzin";
  return undefined;
}

function normalizeGearbox(text?: string) {
  const lower = text?.toLowerCase() || "";
  if (lower.includes("automatik") || lower.includes("automatic")) return "automatic";
  if (lower.includes("schaltgetriebe") || lower.includes("manuell") || lower.includes("manual")) return "manual";
  return undefined;
}

function normalizeSellerType(text?: string): "dealer" | "private" | "unknown" {
  const lower = text?.toLowerCase() || "";
  if (lower.includes("händler") || lower.includes("haendler") || lower.includes("dealer")) return "dealer";
  if (lower.includes("privat") || lower.includes("private")) return "private";
  return "unknown";
}

function detectVatDeductible(text?: string) {
  const lower = text?.toLowerCase() || "";
  return lower.includes("mwst") && (lower.includes("ausweisbar") || lower.includes("ausweis"));
}

function isElectricOrHybrid(fuelType?: string) {
  const lower = fuelType?.toLowerCase() || "";
  return ["electric", "elektro", "hybrid", "plug-in", "plugin", "phev"].some((marker) => lower.includes(marker));
}

function buildReviewText(listing: NormalizedListing, warnings: string[]) {
  const facts = [
    listing.priceEur ? `Цена brutto: ${listing.priceEur} EUR.` : undefined,
    listing.netPriceEur ? `Netto: ${listing.netPriceEur} EUR.` : undefined,
    listing.vatDeductible ? "MwSt. ausweisbar: расчет можно вести от netto." : undefined,
    listing.mileageKm ? `Пробег: ${listing.mileageKm} км.` : undefined,
    listing.engineCc ? `Объем двигателя: ${listing.engineCc} см³.` : undefined,
    listing.powerHp ? `Мощность: ${listing.powerHp} л.с.` : undefined
  ].filter(Boolean);

  return [
    facts.join(" "),
    listing.description ? `\n\nОписание из объявления:\n${listing.description.slice(0, 900)}` : undefined,
    warnings.length ? `\n\nПредупреждения:\n${warnings.map((warning) => `- ${warning}`).join("\n")}` : undefined
  ].filter(Boolean).join("");
}

function buildEngineDescription(engineVolume?: number, powerHp?: number, fuel?: string) {
  const volume = engineVolume ? `${(engineVolume / 1000).toFixed(1).replace(".", ",")} л` : undefined;
  return [volume, fuel, powerHp ? `${powerHp} л.с.` : undefined].filter(Boolean).join(" / ") || undefined;
}

function translateFuel(value?: string) {
  if (!value) return undefined;
  if (value === "diesel") return "Дизель";
  if (value === "benzin") return "Бензин";
  if (value === "hybrid" || value === "plug-in hybrid") return "Гибрид";
  if (value === "electric") return "Электро";
  return value;
}

function translateTransmission(value?: string) {
  if (!value) return undefined;
  if (value === "automatic") return "Автомат";
  if (value === "manual") return "Механика";
  return value;
}

function translateBodyType(value?: string) {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower.includes("kombi")) return "Универсал";
  if (lower.includes("limousine")) return "Седан";
  if (lower.includes("kleinwagen")) return "Хэтчбек";
  if (lower.includes("suv")) return "SUV";
  return value;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return normalizeSpaces(decodeHtml(stripTags(value)));
  }
  return undefined;
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = typeof value === "number" ? Math.round(value) : parseIntFromText(String(value || ""));
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function firstDefined(...values: unknown[]) {
  return values.find((value) => !isEmpty(value));
}

function parseIntFromText(text?: string) {
  if (!text) return undefined;
  const digits = text.replace(/[^\d]/g, "");
  return digits ? Number(digits) : undefined;
}

function get(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (Array.isArray(current)) return current[Number(key)];
    if (!current || typeof current !== "object") return undefined;
    return (current as JsonRecord)[key];
  }, source);
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : undefined;
}

function asStringArray(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(asStringArray);
  if (value && typeof value === "object") {
    const record = value as JsonRecord;
    return asStringArray(firstDefined(record.url, record.src, record.href));
  }
  return [];
}

function normalizeNamedValue(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    return firstString((value as JsonRecord).name, (value as JsonRecord).value);
  }
  return undefined;
}

function meta(html: string, name: string) {
  const escaped = escapeRegex(name);
  return html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1]
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"))?.[1];
}

function tagText(html: string, tag: string) {
  return html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1];
}

function extractImageUrls(html: string) {
  const normalized = decodeHtml(html)
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/")
    .replace(/&quot;/g, "\"");

  const directImages = [...normalized.matchAll(/https?:\/\/[^"'\\\s<>)]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s<>)]*)?/gi)]
    .map((match) => match[0]);
  const srcSetImages = [...normalized.matchAll(/(?:srcset|images|image|url)["']?\s*[:=]\s*["']([^"']+)["']/gi)]
    .flatMap((match) => match[1].split(","))
    .map((item) => item.trim().split(/\s+/)[0])
    .filter((value) => value.startsWith("http"));
  const autoscoutCdnImages = [...normalized.matchAll(/https?:\/\/[^"'\\\s<>)]+(?:autoscout24|scout24|imgix|cloudfront|akamai)[^"'\\\s<>)]+/gi)]
    .map((match) => match[0])
    .filter((url) => /(?:image|img|picture|photo|gallery|jpg|jpeg|png|webp|format=)/i.test(url));

  return uniqueStrings([...directImages, ...srcSetImages, ...autoscoutCdnImages])
    .map(cleanImageUrl)
    .filter(isLikelyCarImage);
}

function uniqueStrings(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.startsWith("http"))))];
}

function cleanImageUrl(url: string) {
  return url
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/[),.;]+$/, "");
}

function isLikelyCarImage(url: string) {
  const lower = url.toLowerCase();
  if (/(logo|favicon|sprite|placeholder|avatar|profile|dealer|google|facebook|apple|icon)/.test(lower)) return false;
  if (/\.(?:svg|gif)(?:\?|$)/.test(lower)) return false;
  return true;
}

function isEmpty(value: unknown) {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0) || value === "unknown";
}

function normalizeSpaces(text?: string) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function stripTags(value: string) {
  return value.replace(/<[^>]*>/g, " ");
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
