"use client";

import { useState, useTransition } from "react";
import { Play, Save, ShieldCheck } from "lucide-react";
import type { ParserSettings } from "@/lib/parserSettings";

type ParserControlPanelProps = {
  initialSettings: ParserSettings;
};

type ApiResult = Record<string, unknown>;
type ParserSettingsForm = {
  searchUrlsText: string;
  budgetRub: string;
  maxPriceEur: string;
  maxMileageKm: string;
  maxPowerHp: string;
  maxEngineCc: string;
  scanPages: string;
  maxLinks: string;
};

export function ParserControlPanel({ initialSettings }: ParserControlPanelProps) {
  const [settings, setSettings] = useState<ParserSettingsForm>({
    searchUrlsText: initialSettings.searchUrls.join("\n"),
    budgetRub: String(initialSettings.budgetRub),
    maxPriceEur: String(initialSettings.maxPriceEur),
    maxMileageKm: String(initialSettings.maxMileageKm),
    maxPowerHp: String(initialSettings.maxPowerHp),
    maxEngineCc: String(initialSettings.maxEngineCc),
    scanPages: String(initialSettings.scanPages),
    maxLinks: String(initialSettings.maxLinks)
  });
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function setField(key: keyof ParserSettingsForm, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function saveSettings() {
    runRequest("/api/admin/parser/settings", {
      method: "POST",
      body: JSON.stringify(toPayload(settings))
    });
  }

  function runParser() {
    runRequest("/api/admin/parser/run?debug=1", { method: "POST" });
  }

  function checkLinks() {
    runRequest("/api/admin/parser/check-links", { method: "POST" });
  }

  function runRequest(url: string, init: RequestInit) {
    setError("");
    setResult(null);
    startTransition(async () => {
      try {
        const response = await fetch(url, {
          ...init,
          headers: { "content-type": "application/json", ...(init.headers || {}) }
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Request failed.");
        setResult(payload);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Request failed.");
      }
    });
  }

  return (
    <section className="mb-8 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
      <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Настройки парсера</h2>
          <p className="mt-1 text-sm text-muted">Поиск идет по бюджету и техническим ограничениям. Уже добавленные ссылки повторно не отправляются.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold text-orbit ring-1 ring-slate-200" type="button" onClick={saveSettings} disabled={isPending}>
            <Save className="h-4 w-4" /> Сохранить
          </button>
          <button className="inline-flex items-center gap-2 rounded-full bg-orbit px-4 py-2 font-semibold text-white" type="button" onClick={runParser} disabled={isPending}>
            <Play className="h-4 w-4" /> Запустить
          </button>
          <button className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 font-semibold text-white" type="button" onClick={checkLinks} disabled={isPending}>
            <ShieldCheck className="h-4 w-4" /> Проверить ссылки
          </button>
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Ссылки поиска</span>
        <textarea
          className="input min-h-28 bg-white"
          value={settings.searchUrlsText}
          onChange={(event) => setField("searchUrlsText", event.target.value)}
          placeholder="https://www.autoscout24.de/lst?..."
        />
      </label>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <NumberInput label="Бюджет под ключ, ₽" value={settings.budgetRub} onChange={(value) => setField("budgetRub", value)} />
        <NumberInput label="Цена в Германии до, EUR" value={settings.maxPriceEur} onChange={(value) => setField("maxPriceEur", value)} />
        <NumberInput label="Пробег до, км" value={settings.maxMileageKm} onChange={(value) => setField("maxMileageKm", value)} />
        <NumberInput label="Мощность до, л.с." value={settings.maxPowerHp} onChange={(value) => setField("maxPowerHp", value)} />
        <NumberInput label="Объем до, см3" value={settings.maxEngineCc} onChange={(value) => setField("maxEngineCc", value)} />
        <NumberInput label="Страниц выдачи" value={settings.scanPages} onChange={(value) => setField("scanPages", value)} />
        <NumberInput label="Ссылок за запуск" value={settings.maxLinks} onChange={(value) => setField("maxLinks", value)} />
      </div>

      {isPending && <p className="mt-4 text-sm font-semibold text-orbit">Выполняю...</p>}
      {error && <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</p>}
      {result && (
        <pre className="mt-4 max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </section>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number | string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <input className="input bg-white" type="number" min="0" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function toPayload(settings: ParserSettingsForm) {
  return {
    searchUrlsText: settings.searchUrlsText,
    budgetRub: Number(settings.budgetRub),
    maxPriceEur: Number(settings.maxPriceEur),
    maxMileageKm: Number(settings.maxMileageKm),
    maxPowerHp: Number(settings.maxPowerHp),
    maxEngineCc: Number(settings.maxEngineCc),
    scanPages: Number(settings.scanPages),
    maxLinks: Number(settings.maxLinks)
  };
}
