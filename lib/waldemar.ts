import type { CarWithRelations } from "@/lib/carTypes";
import { calculateTotalRub, formatEur, formatKm, formatRub, statusLabels } from "@/lib/carTypes";

export async function askWaldemar(car: CarWithRelations, question: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "Ты Вальдемар, спокойный помощник покупателя по выбору автомобиля.",
                "Отвечай по-русски, кратко: 1-3 предложения.",
                "Стиль: сухо, честно, понятно, с аккуратным оптимизмом.",
                "Не продавай, не драматизируй, не используй эмодзи и восклицательные знаки.",
                "Опирайся на контекст автомобиля ниже и на общие автомобильные ориентиры.",
                "Можно давать ориентировочную экспертную оценку по типу двигателя, пробегу, возрасту и классу авто.",
                "Если спрашивают про ресурс двигателя или коробки: не отказывайся. Скажи, что производитель обычно не заявляет точную цифру как гарантию, затем дай практичный ориентир диапазоном и привяжи его к текущему пробегу.",
                "Формулируй уверенно, но без гарантий: 'обычно', 'часто', 'ориентир', 'при нормальном обслуживании'.",
                "Не придумывай историю обслуживания, ДТП, владельцев, состояние кузова или факты, которых нет.",
                "Если точных данных по конкретной версии нет, не отвечай только отказом; дай полезный общий ориентир для похожего мотора.",
                "Если вопрос не про этот автомобиль, коротко верни к машине."
              ].join("\n")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Автомобиль:\n${JSON.stringify(toWaldemarContext(car), null, 2)}\n\nВопрос покупателя: ${question}`
            }
          ]
        }
      ],
      text: { verbosity: "low" },
      max_output_tokens: 220
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || "Waldemar did not answer.";
    throw new Error(message);
  }

  const answer = extractOutputText(payload)?.trim();
  if (!answer) throw new Error("Waldemar response is empty.");
  return trimAnswer(answer);
}

function toWaldemarContext(car: CarWithRelations) {
  return {
    title: car.title,
    brand: car.brand,
    model: car.model,
    year: car.year,
    month: car.month,
    mileageKm: car.mileageKm,
    mileage: formatKm(car.mileageKm),
    bodyType: car.bodyType,
    engine: car.engineDescription,
    engineVolumeCm3: car.engineVolumeCm3,
    powerHp: car.powerHp,
    transmission: car.transmission,
    fuel: car.fuel,
    priceGermany: formatEur(car.priceBruttoEur),
    priceTurnkey: formatRub(calculateTotalRub(car)),
    status: statusLabels[car.status],
    location: car.location,
    shortDescription: car.shortDescription,
    review: car.reviewText,
    pros: car.pros.map((item) => `${item.title}: ${item.text}`),
    cons: car.cons.map((item) => `${item.title}: ${item.text}`)
  };
}

function trimAnswer(answer: string) {
  return answer
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .slice(0, 3)
    .join(" ")
    .slice(0, 700);
}

function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  const direct = (payload as { output_text?: string }).output_text;
  if (direct) return direct;

  const output = (payload as { output?: Array<{ content?: Array<{ text?: string }> }> }).output;
  return output
    ?.flatMap((item) => item.content || [])
    .map((content) => content.text)
    .filter(Boolean)
    .join("");
}
