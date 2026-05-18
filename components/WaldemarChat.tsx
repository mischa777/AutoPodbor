"use client";

import Link from "next/link";
import { Bot, Send } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

type Message = {
  role: "user" | "assistant";
  text: string;
};

const suggestions = [
  "Кому подойдет этот автомобиль?",
  "Какие слабые стороны?",
  "Нормальный ли пробег?",
  "Стоит рассматривать?"
];

export function WaldemarChat({ carId }: { carId: string }) {
  const { user, loading, configured } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Я Вальдемар. Отвечаю кратко по этой машине."
    }
  ]);
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function ask(text = question) {
    const clean = text.trim();
    if (!clean || state === "loading") return;

    setQuestion("");
    setError("");
    setState("loading");
    setMessages((current) => [...current, { role: "user", text: clean }]);

    try {
      const response = await fetch(`/api/cars/${carId}/waldemar`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: clean })
      });
      const payload = await response.json() as { answer?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Вальдемар не ответил.");
      setMessages((current) => [...current, { role: "assistant", text: payload.answer || "" }]);
      setState("idle");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Вальдемар временно недоступен.");
    }
  }

  if (!configured || loading) return null;

  if (!user) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orbit text-white">
            <Bot className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-2xl font-semibold text-ink">Помощник Вальдемар</h2>
            <p className="text-sm text-muted">Войдите, чтобы задать вопрос по этой машине.</p>
          </div>
        </div>
        <Link className="mt-5 inline-flex rounded-full bg-orbit px-5 py-3 font-semibold text-white" href={`/login?next=/cars/${carId}`}>
          Войти и спросить
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orbit text-white">
          <Bot className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-2xl font-semibold text-ink">Помощник Вальдемар</h2>
          <p className="text-sm text-muted">Коротко отвечает по этой машине.</p>
        </div>
      </div>

      <div className="mt-5 max-h-80 space-y-3 overflow-y-auto rounded-2xl bg-mist p-4">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <p className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-orbit text-white" : "bg-white text-ink ring-1 ring-slate-200"}`}>
              {message.text}
            </p>
          </div>
        ))}
        {state === "loading" && <p className="text-sm text-muted">Вальдемар думает...</p>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.map((item) => (
          <button
            key={item}
            className="rounded-full bg-mist px-3 py-2 text-xs font-semibold text-orbit ring-1 ring-slate-200"
            type="button"
            onClick={() => ask(item)}
            disabled={state === "loading"}
          >
            {item}
          </button>
        ))}
      </div>

      <form
        className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          ask();
        }}
      >
        <input
          className="input"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Спросить Вальдемара..."
          maxLength={500}
        />
        <button className="inline-flex items-center justify-center gap-2 rounded-full bg-orbit px-5 py-3 font-semibold text-white disabled:opacity-60" type="submit" disabled={state === "loading" || !question.trim()}>
          <Send className="h-4 w-4" />
          Спросить
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </section>
  );
}
