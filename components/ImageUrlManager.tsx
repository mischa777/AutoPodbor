"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

export type ImageFormItem = { url: string; alt?: string };

export function ImageUrlManager({ images, setImages }: { images: ImageFormItem[]; setImages: (images: ImageFormItem[]) => void }) {
  return (
    <DynamicPanel
      title="Изображения"
      onAdd={() => setImages([...images, { url: "", alt: "" }])}
    >
      {images.map((image, index) => (
        <div key={index} className="grid gap-3 rounded-2xl bg-mist p-4 md:grid-cols-[1fr_0.7fr_auto]">
          <input className="input" placeholder="Image URL" value={image.url} onChange={(event) => setImages(images.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} />
          <input className="input" placeholder="Alt" value={image.alt || ""} onChange={(event) => setImages(images.map((item, itemIndex) => itemIndex === index ? { ...item, alt: event.target.value } : item))} />
          <RowTools
            onUp={() => index > 0 && setImages(move(images, index, index - 1))}
            onDown={() => index < images.length - 1 && setImages(move(images, index, index + 1))}
            onDelete={() => setImages(images.filter((_, itemIndex) => itemIndex !== index))}
          />
        </div>
      ))}
    </DynamicPanel>
  );
}

export function DynamicTextList({
  title,
  items,
  setItems
}: {
  title: string;
  items: { title: string; text: string }[];
  setItems: (items: { title: string; text: string }[]) => void;
}) {
  return (
    <DynamicPanel title={title} onAdd={() => setItems([...items, { title: "", text: "" }])}>
      {items.map((item, index) => (
        <div key={index} className="grid gap-3 rounded-2xl bg-mist p-4 md:grid-cols-[0.5fr_1fr_auto]">
          <input className="input" placeholder="Короткий заголовок" value={item.title} onChange={(event) => setItems(items.map((current, itemIndex) => itemIndex === index ? { ...current, title: event.target.value } : current))} />
          <textarea className="input min-h-24" placeholder="Подробное описание" value={item.text} onChange={(event) => setItems(items.map((current, itemIndex) => itemIndex === index ? { ...current, text: event.target.value } : current))} />
          <RowTools
            onUp={() => index > 0 && setItems(move(items, index, index - 1))}
            onDown={() => index < items.length - 1 && setItems(move(items, index, index + 1))}
            onDelete={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}
          />
        </div>
      ))}
    </DynamicPanel>
  );
}

function DynamicPanel({ title, children, onAdd }: { title: string; children: React.ReactNode; onAdd: () => void }) {
  return (
    <section className="space-y-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        <button className="inline-flex items-center gap-2 rounded-full bg-orbit px-4 py-2 text-sm font-semibold text-white" type="button" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Добавить
        </button>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function RowTools({ onUp, onDown, onDelete }: { onUp: () => void; onDown: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-start gap-2">
      <button className="icon-btn" type="button" onClick={onUp} aria-label="Выше"><ArrowUp className="h-4 w-4" /></button>
      <button className="icon-btn" type="button" onClick={onDown} aria-label="Ниже"><ArrowDown className="h-4 w-4" /></button>
      <button className="icon-btn text-rose-600" type="button" onClick={onDelete} aria-label="Удалить"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}

function move<T>(items: T[], from: number, to: number) {
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
