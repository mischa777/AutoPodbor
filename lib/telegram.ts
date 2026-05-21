type InlineButton = {
  text: string;
  callback_data?: string;
  url?: string;
};

type InlineKeyboard = InlineButton[][];

type TelegramResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

type TelegramMessage = {
  message_id: number;
  chat: {
    id: number | string;
  };
};

export type TelegramCallbackQuery = {
  id: string;
  data?: string;
  message?: {
    message_id: number;
    chat: {
      id: number | string;
    };
  };
};

export type TelegramTextMessage = {
  message_id: number;
  text?: string;
  reply_to_message?: {
    message_id: number;
  };
  chat: {
    id: number | string;
  };
};

export function hasTelegramConfig() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function sendTelegramMessage(text: string, keyboard?: InlineKeyboard) {
  const chatId = requiredEnv("TELEGRAM_CHAT_ID");
  return telegramRequest<TelegramMessage>("sendMessage", {
    chat_id: chatId,
    text: trimTelegramText(text),
    disable_web_page_preview: false,
    reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
  });
}

export async function sendTelegramForceReply(chatId: number | string, text: string) {
  return telegramRequest<TelegramMessage>("sendMessage", {
    chat_id: chatId,
    text: trimTelegramText(text),
    reply_markup: {
      force_reply: true,
      selective: true
    }
  });
}

export async function editTelegramMessage(chatId: number | string, messageId: number, text: string, keyboard?: InlineKeyboard) {
  return telegramRequest<TelegramMessage>("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: trimTelegramText(text),
    disable_web_page_preview: false,
    reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return telegramRequest<boolean>("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text
  });
}

async function telegramRequest<T>(method: string, body: Record<string, unknown>) {
  const token = requiredEnv("TELEGRAM_BOT_TOKEN");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = (await response.json()) as TelegramResponse<T>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.description || `Telegram ${method} failed.`);
  }
  return payload.result as T;
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function trimTelegramText(text: string) {
  return text.length > 3900 ? `${text.slice(0, 3890)}...` : text;
}
