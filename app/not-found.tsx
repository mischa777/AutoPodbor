import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-mist px-4 text-center">
      <h1 className="text-4xl font-semibold text-ink">Страница не найдена</h1>
      <p className="mt-3 text-muted">Возможно, объявление было удалено или ссылка указана неверно.</p>
      <Link className="mt-6 rounded-full bg-orbit px-6 py-3 font-semibold text-white" href="/">
        На главную
      </Link>
    </main>
  );
}
