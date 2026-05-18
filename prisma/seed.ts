import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.car.deleteMany();

  await prisma.car.create({
    data: {
      title: "VW Golf Variant 2022",
      brand: "Volkswagen",
      model: "Golf Variant",
      year: 2022,
      month: 6,
      mileageKm: 119650,
      bodyType: "Универсал",
      engineDescription: "1.5 TDI / 110 л.с.",
      engineVolumeCm3: 1498,
      powerHp: 110,
      transmission: "Автомат",
      fuel: "Дизель",
      priceBruttoEur: 10350,
      priceNettoEur: 8697,
      eurRubRate: 100,
      customsDutyRub: 430000,
      platesInsuranceRub: 15000,
      transportRub: 30000,
      customsFeeRub: 15000,
      recyclingFeeRub: 5200,
      customsChecksRub: 45000,
      serviceFeeRub: 150000,
      location: "Гамбург, Германия",
      sourceUrl: "https://www.mobile.de/",
      shortDescription: "Практичный универсал с понятной историей обслуживания и экономичным дизельным мотором.",
      reviewText:
        "Автомобиль выглядит подходящим кандидатом для перегона: умеренный пробег для немецкого рынка, ликвидная комплектация и понятная себестоимость. Перед сделкой стоит отдельно проверить историю обслуживания, состояние кузова по толщиномеру и работу коробки на холодную.",
      status: "available",
      isFeatured: true,
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1400&q=80",
            alt: "Серый универсал на дороге",
            order: 0
          },
          {
            url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80",
            alt: "Автомобиль крупным планом",
            order: 1
          },
          {
            url: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=80",
            alt: "Авто на стоянке",
            order: 2
          }
        ]
      },
      pros: {
        create: [
          {
            title: "Экономичный двигатель",
            text: "Дизельный мотор хорошо подходит для дальних перегонов и обычно дает низкий расход на трассе.",
            order: 0
          },
          {
            title: "Практичный кузов",
            text: "Универсал удобен для семьи и поездок, при этом Golf остается ликвидной моделью на вторичном рынке.",
            order: 1
          }
        ]
      },
      cons: {
        create: [
          {
            title: "Нужна проверка истории",
            text: "Пробег не критичный, но по дизельным авто важно проверить сервисную историю и интервалы обслуживания.",
            order: 0
          },
          {
            title: "Курс влияет на итог",
            text: "Итоговая стоимость чувствительна к курсу EUR/RUB, поэтому расчет нужно обновлять перед сделкой.",
            order: 1
          }
        ]
      }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
