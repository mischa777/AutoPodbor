"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/account";
  const { configured, signIn, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await register(email, password);
      }
      router.push(next);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось войти.");
    } finally {
      setLoading(false);
    }
  }

  if (!configured) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
        <h1 className="text-3xl font-semibold text-ink">Вход в аккаунт</h1>
        <p className="mt-3 text-muted">
          Firebase пока не настроен. Добавьте ключи проекта в `.env`, затем перезапустите сайт.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200">
      <h1 className="text-3xl font-semibold text-ink">
        {mode === "login" ? "Вход в аккаунт" : "Создать аккаунт"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        Один вход используется для личного кабинета и служебного доступа к админке.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink">Email</span>
          <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink">Пароль</span>
          <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} />
        </label>
      </div>

      {message && <p className="mt-4 text-sm text-rose-600">{message}</p>}

      <button className="mt-6 w-full rounded-full bg-orbit px-5 py-3 font-semibold text-white disabled:opacity-60" type="submit" disabled={loading}>
        {loading ? "Подождите..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
      </button>
      <button
        className="mt-4 w-full rounded-full bg-mist px-5 py-3 font-semibold text-orbit"
        type="button"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login" ? "Создать личный кабинет" : "Уже есть аккаунт"}
      </button>
    </form>
  );
}
