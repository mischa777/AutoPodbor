"use client";

import Image from "next/image";
import { useState } from "react";
import type { CarImage } from "@/lib/carTypes";

export function CarGallery({ images, title }: { images: CarImage[]; title: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-slate-200 shadow-soft">
        {current ? (
          <Image src={current.url} alt={current.alt || title} fill priority className="object-cover" sizes="(min-width: 1024px) 60vw, 100vw" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 text-muted">
            Фото автомобиля пока не добавлены
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActive(index)}
              className={`relative aspect-[16/10] overflow-hidden rounded-xl ring-2 ${active === index ? "ring-orbit" : "ring-transparent"}`}
              aria-label={`Показать фото ${index + 1}`}
            >
              <Image src={image.url} alt={image.alt || title} fill className="object-cover" sizes="150px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
