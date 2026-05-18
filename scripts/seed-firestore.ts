import { createCar } from "@/lib/cars";

async function main() {
  await createCar({
    title: "VW Golf 2022 1.5 TDI",
    brand: "Volkswagen",
    model: "Golf",
    year: 2022,
    month: 5,
    mileageKm: 119650,
    bodyType: "Хэтчбек",
    engineDescription: "1,5 л / Дизель / 110 л.с.",
    engineVolumeCm3: 1498,
    powerHp: 110,
    powerKw: 81,
    transmission: "Механика",
    fuel: "Дизель",
    priceBruttoEur: 10350,
    priceNettoEur: 8697,
    eurRubRate: 90.4,
    customsDutyRub: 229194,
    platesInsuranceRub: 15000,
    transportRub: 30000,
    customsFeeRub: 4269,
    recyclingFeeRub: 5200,
    customsChecksRub: 65000,
    serviceFeeRub: 80544,
    serviceFeePercent: 7,
    marketPriceRub: null,
    location: "Германия",
    sourceUrl: null,
    shortDescription: "Практичный дизельный хэтчбек для спокойной ежедневной эксплуатации.",
    reviewText: "Golf в этом исполнении подойдет тем, кому нужен экономичный и понятный автомобиль без лишней сложности. Механическая коробка и дизельный мотор делают его рациональным вариантом для трассы и смешанного режима.",
    status: "available",
    isFeatured: true,
    images: [
      {
        id: crypto.randomUUID(),
        url: "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1400&q=80",
        alt: "VW Golf",
        order: 0
      },
      {
        id: crypto.randomUUID(),
        url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80",
        alt: "VW Golf interior",
        order: 1
      }
    ],
    pros: [
      { id: crypto.randomUUID(), title: "Экономичный дизель", text: "Подходит для трассы и регулярных поездок.", order: 0 },
      { id: crypto.randomUUID(), title: "Понятная конструкция", text: "Механическая коробка делает автомобиль проще в эксплуатации.", order: 1 }
    ],
    cons: [
      { id: crypto.randomUUID(), title: "Сдержанная динамика", text: "Автомобиль ориентирован на спокойную езду.", order: 0 },
      { id: crypto.randomUUID(), title: "Пробег выше среднего", text: "Подойдет покупателю, который спокойно относится к рабочему пробегу.", order: 1 }
    ]
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
