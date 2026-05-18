from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
from pathlib import Path
from typing import Any


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

AUTOSCOUTBOT_PATH = Path(os.environ.get("AUTOSCOUTBOT_PATH", r"C:\Users\Mishanya\Documents\AutoScoutBot"))
if str(AUTOSCOUTBOT_PATH) not in sys.path:
    sys.path.insert(0, str(AUTOSCOUTBOT_PATH))

from core.cost_calculator import calculate_import_cost, customs_price_eur  # noqa: E402
from parsers.best_effort_url import parse_url_best_effort  # noqa: E402


def translate_fuel(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.lower()
    if normalized == "diesel":
        return "Дизель"
    if normalized == "benzin":
        return "Бензин"
    if normalized in {"hybrid", "plug-in hybrid"}:
        return "Гибрид"
    if normalized == "electric":
        return "Электро"
    return value


def translate_gearbox(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.lower()
    if normalized == "automatic":
        return "Автомат"
    if normalized == "manual":
        return "Механика"
    return value


def translate_body(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.lower()
    if "kombi" in normalized:
        return "Универсал"
    if "limousine" in normalized:
        return "Седан"
    if "kleinwagen" in normalized:
        return "Хэтчбек"
    if "suv" in normalized:
        return "SUV"
    return value


def engine_description(engine_cc: int | None, power_hp: int | None, fuel: str | None) -> str | None:
    parts = []
    if engine_cc:
        parts.append(f"{engine_cc / 1000:.1f}".replace(".", ",") + " л")
    if fuel:
        parts.append(fuel)
    if power_hp:
        parts.append(f"{power_hp} л.с.")
    return " / ".join(parts) or None


def clean_description(value: str | None) -> str | None:
    if not value:
        return None
    value = " ".join(value.split())
    value = trim_autoscout_noise(value)
    return value[:1800]


def trim_autoscout_noise(value: str) -> str:
    markers = (
        "Auf Merkzettel setzen",
        "Merken Teilen Drucken",
        "Drucken",
    )
    for marker in markers:
        if marker in value:
            value = value.split(marker, 1)[1].strip()
    value = re.sub(r"^\d+\s*/\s*\d+\s+", "", value).strip()
    value = re.sub(r"^(?:Merken|Teilen|Drucken)\s+", "", value).strip()
    value = re.sub(r"^(?:Merken|Teilen|Drucken)\s+", "", value).strip()
    value = re.sub(r"^(?:Merken|Teilen|Drucken)\s+", "", value).strip()
    stop_markers = (
        "Finanzieren",
        "Versicherung",
        "Dacia Duster gebraucht",
        "Kontakt zum Anbieter",
        "Anbieter",
        "AutoScout24",
    )
    for marker in stop_markers:
        if marker in value:
            value = value.split(marker, 1)[0].strip()
    return value


def clean_title(listing: Any) -> str:
    description = clean_description(listing.description)
    if description:
        match = re.search(r"([A-Z][A-Za-z0-9ÄÖÜäöüß ./*+-]{8,160}?)\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß .-]+\s+€\s*[\d.]+", description)
        if match:
            return strip_action_prefix(" ".join(match.group(1).split()))
    title = listing.title or "Imported listing"
    seo_match = re.match(r"(.+?)\s+in\s+.+?\s+gebraucht\s+in\s+.+?\s+für\s+€", title)
    if seo_match:
        return seo_match.group(1).strip()
    return strip_action_prefix(title)


def strip_action_prefix(value: str) -> str:
    return re.sub(r"^(?:(?:Merken|Teilen|Drucken)\s+)+", "", value).strip()


def build_review(listing: Any, warnings: list[str]) -> str | None:
    facts = []
    if listing.price_eur:
        facts.append(f"Цена brutto: {listing.price_eur} EUR.")
    if listing.net_price_eur:
        facts.append(f"Netto: {listing.net_price_eur} EUR.")
    if listing.vat_deductible:
        facts.append("MwSt. ausweisbar: расчет можно вести от netto.")
    if listing.mileage_km:
        facts.append(f"Пробег: {listing.mileage_km} км.")
    if listing.engine_cc:
        facts.append(f"Объем двигателя: {listing.engine_cc} см³.")
    if listing.power_hp:
        facts.append(f"Мощность: {listing.power_hp} л.с.")

    sections = [" ".join(facts)] if facts else []
    description = clean_description(listing.description)
    if description:
        sections.append(f"Описание из объявления:\n{description}")
    if warnings:
        sections.append("Предупреждения:\n" + "\n".join(f"- {warning}" for warning in warnings))
    return "\n\n".join(section for section in sections if section)


def calculate_service_fee_rub(pre_service_total_rub: int | None, market_price_rub: int | None = None) -> int | None:
    if pre_service_total_rub is None:
        return None
    base = round(pre_service_total_rub * 0.07)
    if not market_price_rub or market_price_rub <= pre_service_total_rub:
        return base
    margin = market_price_rub - pre_service_total_rub
    margin_based = round(margin * 0.25)
    capped = min(max(base, margin_based), round(pre_service_total_rub * 0.12))
    return max(base, capped)


def listing_to_site_payload(result: Any, eur_rub_rate: float) -> dict[str, Any]:
    listing = result.listing
    warnings: list[str] = []
    if result.warning:
        warnings.append(result.warning)
    if result.block_reason:
        warnings.append(f"Block indicator: {result.block_reason}")
    if result.missing_fields:
        warnings.append("Не найдены поля: " + ", ".join(result.missing_fields))

    calc = None
    try:
      calc = calculate_import_cost(listing, eur_rub_rate)
      warnings.extend(calc.warnings)
    except Exception as exc:
      warnings.append(f"Расчет требует ручной проверки: {exc}")

    taxable_price = customs_price_eur(listing)
    fuel = translate_fuel(listing.fuel_type)
    title = clean_title(listing)

    return {
        "title": title,
        "brand": listing.brand,
        "model": listing.model,
        "year": listing.first_registration_year,
        "month": listing.first_registration_month,
        "mileageKm": listing.mileage_km,
        "bodyType": translate_body(listing.body_type),
        "engineDescription": engine_description(listing.engine_cc, listing.power_hp, fuel),
        "engineVolumeCm3": listing.engine_cc,
        "powerHp": listing.power_hp,
        "powerKw": listing.power_kw,
        "transmission": translate_gearbox(listing.gearbox),
        "fuel": fuel,
        "priceBruttoEur": listing.price_eur,
        "priceNettoEur": listing.net_price_eur or (taxable_price if listing.vat_deductible and taxable_price != listing.price_eur else None),
        "eurRubRate": eur_rub_rate,
        "customsDutyRub": calc.customs_duty_rub if calc else None,
        "platesInsuranceRub": 15000,
        "transportRub": 30000,
        "customsFeeRub": calc.customs_fee_rub if calc else None,
        "recyclingFeeRub": calc.recycling_fee_rub if calc else None,
        "customsChecksRub": calc.customs_representative_rub if calc else 65000,
        "serviceFeeRub": calculate_service_fee_rub(calc.bare_total_rub if calc else None),
        "serviceFeePercent": 7,
        "location": listing.location,
        "sourceUrl": listing.url,
        "shortDescription": clean_description(listing.description),
        "reviewText": build_review(listing, warnings),
        "images": [{"url": url, "alt": title} for url in (listing.images or [])[:20]],
        "warnings": warnings,
        "botMeta": {
            "source": result.source,
            "method": result.method,
            "needsManualDetails": result.needs_manual_details,
            "missingFields": result.missing_fields,
        },
    }


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    parser.add_argument("--eur-rub", type=float, default=100)
    args = parser.parse_args()

    result = await parse_url_best_effort(args.url)
    payload = listing_to_site_payload(result, args.eur_rub)
    print(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    asyncio.run(main())
