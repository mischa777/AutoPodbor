export type ExchangeRate = {
  value: number;
  source: string;
  fetchedAt: string;
};

const FALLBACK_EUR_RUB = 100;
const CACHE_TTL_MS = 60 * 60 * 1000;

type CachedExchangeRate = ExchangeRate & {
  updatedAt?: string;
};

export async function getCachedEnergotransbankEurSellRate(): Promise<ExchangeRate> {
  if (typeof window !== "undefined") {
    return getEnergotransbankEurSellRate();
  }

  try {
    const { getAdminFirestore } = await import("@/lib/firebaseServer");
    const docRef = getAdminFirestore().collection("settings").doc("exchangeRate");
    const snapshot = await docRef.get();
    const cached = snapshot.exists ? snapshot.data() as CachedExchangeRate : undefined;
    const cachedAt = cached?.fetchedAt ? Date.parse(cached.fetchedAt) : 0;

    if (cached?.value && Number.isFinite(cached.value) && Date.now() - cachedAt < CACHE_TTL_MS) {
      return {
        value: cached.value,
        source: cached.source || "cached",
        fetchedAt: cached.fetchedAt
      };
    }

    const fresh = await getEnergotransbankEurSellRate();
    await docRef.set({ ...fresh, updatedAt: new Date().toISOString() }, { merge: true });
    return fresh;
  } catch {
    return getEnergotransbankEurSellRate();
  }
}

export async function getEnergotransbankEurSellRate(): Promise<ExchangeRate> {
  const fetchedAt = new Date().toISOString();
  const bankiros = await fetchBankirosRate().catch(() => undefined);
  if (bankiros) return { value: bankiros, source: "Bankiros / Энерготрансбанк, курс продажи EUR", fetchedAt };

  const brobank = await fetchBrobankRate().catch(() => undefined);
  if (brobank) return { value: brobank, source: "Brobank / Энерготрансбанк, курс продажи EUR", fetchedAt };

  return { value: FALLBACK_EUR_RUB, source: "fallback", fetchedAt };
}

async function fetchBankirosRate() {
  const html = await fetchText("https://bankiros.ru/bank/energotransbank/currency");
  const text = normalize(html);
  const match = text.match(/для евро сейчас установлен курс продажи\s*[-–—]?\s*([0-9]+(?:[.,][0-9]+)?)/i);
  return parseRate(match?.[1]);
}

async function fetchBrobankRate() {
  const html = await fetchText("https://brobank.ru/banki/energotransbank/kurs-valut/");
  const text = normalize(html);
  const euroBlock = text.match(/Евро\s+Покупка\s+Продажа\s+Курс ЦБ\s+([0-9]+(?:[.,][0-9]+)?)\s+[+-]?[0-9.,-]*\s+([0-9]+(?:[.,][0-9]+)?)/i);
  return parseRate(euroBlock?.[2] || euroBlock?.[1]);
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "accept": "text/html,application/xhtml+xml",
      "user-agent": "Mozilla/5.0 HohmannAutoTransfer/1.0"
    },
    next: { revalidate: 60 * 30 }
  });
  if (!response.ok) throw new Error(`Rate source returned ${response.status}`);
  return response.text();
}

function normalize(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseRate(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
