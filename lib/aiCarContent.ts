type CarContentInput = {
  title?: string;
  brand?: string;
  model?: string;
  year?: string;
  month?: string;
  mileageKm?: string;
  bodyType?: string;
  engineDescription?: string;
  engineVolumeCm3?: string;
  powerHp?: string;
  transmission?: string;
  fuel?: string;
  priceBruttoEur?: string;
  priceNettoEur?: string;
  eurRubRate?: string;
  customsDutyRub?: string;
  platesInsuranceRub?: string;
  transportRub?: string;
  customsFeeRub?: string;
  recyclingFeeRub?: string;
  customsChecksRub?: string;
  serviceFeeRub?: string;
  marketPriceRub?: string;
  location?: string;
  sourceUrl?: string;
  shortDescription?: string;
};

type EditorialInput = Pick<
  CarContentInput,
  | "title"
  | "brand"
  | "model"
  | "year"
  | "month"
  | "mileageKm"
  | "bodyType"
  | "engineDescription"
  | "engineVolumeCm3"
  | "powerHp"
  | "transmission"
  | "fuel"
  | "location"
>;

export type GeneratedCarContent = {
  shortDescription: string;
  reviewText: string;
  pros: { title: string; text: string }[];
  cons: { title: string; text: string }[];
};

const contentSchema = {
  type: "object",
  additionalProperties: false,
  required: ["shortDescription", "reviewText", "pros", "cons"],
  properties: {
    shortDescription: {
      type: "string",
      description: "One buyer-facing Russian sentence, dry and concise."
    },
    reviewText: {
      type: "string",
      description: "Two or three short buyer-facing Russian sentences. No diagnostics or import/service text."
    },
    pros: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "text"],
        properties: {
          title: { type: "string", description: "Two to four words." },
          text: { type: "string", description: "One short sentence, up to 110 characters." }
        }
      }
    },
    cons: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "text"],
        properties: {
          title: { type: "string", description: "Two to four words." },
          text: { type: "string", description: "One short sentence, up to 110 characters." }
        }
      }
    }
  }
};

const bannedEditorialTerms = [
  "\u0446\u0435\u043d\u0430",
  "\u0441\u0442\u043e\u0438\u043c\u043e\u0441\u0442\u044c",
  "netto",
  "brutto",
  "\u043d\u0434\u0441",
  "\u0440\u0430\u0441\u0442\u0430\u043c\u043e\u0436",
  "\u0442\u0430\u043c\u043e\u0436",
  "\u0438\u043c\u043f\u043e\u0440\u0442",
  "\u043a\u0443\u0440\u0441",
  "\u043a\u043e\u043c\u0438\u0441\u0441\u0438",
  "\u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a",
  "\u0434\u0430\u043d\u043d\u044b\u0435",
  "\u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d",
  "\u043f\u0430\u0440\u0441\u0438\u043d\u0433",
  "\u043f\u043e\u043b\u0443\u0447\u0435\u043d",
  "\u0440\u0430\u0441\u0447\u0435\u0442",
  "\u043f\u0440\u043e\u0432\u0435\u0440",
  "\u0442\u0440\u0435\u0431\u0443",
  "\u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436",
  "\u0443\u0442\u043e\u0447\u043d",
  "\u0434\u0438\u0430\u0433\u043d\u043e\u0441\u0442",
  "\u0441\u043a\u0440\u044b\u0442"
];

export async function generateCarContent(input: CarContentInput): Promise<GeneratedCarContent> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const editorialInput = toEditorialInput(input);
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
                "Ты пишешь текст карточки автомобиля для покупателя.",
                "Стиль: сухо, коротко, понятно, с аккуратным оптимизмом.",
                "Не пиши как технический инспектор и не давай список проверок.",
                "Пиши только о потребительских свойствах автомобиля: практичность, экономичность, комфорт, динамика, кузов, коробка, возраст, пробег.",
                "Описание: одно короткое предложение.",
                "Обзор: две-три короткие фразы без длинных условий.",
                "Плюсы и минусы: короткие пункты, без служебных пояснений.",
                "Минусы должны быть мягкими и понятными покупателю: например 'механическая коробка', 'пробег выше среднего', 'скромная динамика'.",
                "Запрещено упоминать цену, стоимость, netto/brutto, НДС, растаможку, импорт, курс валют, комиссию, источник объявления, данные, получение данных, парсинг.",
                "Запрещено писать про проверки, подтверждение, уточнение, диагностику, скрытые проблемы, следы эксплуатации и сервисные рекомендации.",
                "Не используй рекламные фразы, эмоции, эмодзи и восклицательные знаки."
              ].join("\n")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Сформируй краткое описание, обзор, плюсы и минусы по этим характеристикам JSON:\n${JSON.stringify(editorialInput, null, 2)}`
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "car_editorial_content",
          strict: true,
          schema: contentSchema
        },
        verbosity: "low"
      },
      max_output_tokens: 1000
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || "OpenAI content generation failed.";
    throw new Error(message);
  }

  const text = extractOutputText(payload);
  if (!text) throw new Error("OpenAI response did not contain generated JSON.");

  const content = JSON.parse(text) as GeneratedCarContent;
  assertNoServiceText(content);
  return content;
}

function toEditorialInput(input: CarContentInput): EditorialInput {
  return {
    title: input.title,
    brand: input.brand,
    model: input.model,
    year: input.year,
    month: input.month,
    mileageKm: input.mileageKm,
    bodyType: input.bodyType,
    engineDescription: input.engineDescription,
    engineVolumeCm3: input.engineVolumeCm3,
    powerHp: input.powerHp,
    transmission: input.transmission,
    fuel: input.fuel,
    location: input.location
  };
}

function assertNoServiceText(content: GeneratedCarContent) {
  const combined = [
    content.shortDescription,
    content.reviewText,
    ...content.pros.flatMap((item) => [item.title, item.text]),
    ...content.cons.flatMap((item) => [item.title, item.text])
  ]
    .join("\n")
    .toLowerCase();

  const blockedTerm = bannedEditorialTerms.find((term) => combined.includes(term));
  if (blockedTerm) {
    throw new Error(`Generated text included a forbidden term: ${blockedTerm}.`);
  }
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
