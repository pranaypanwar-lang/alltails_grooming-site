export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: { parseMode?: "Markdown" | "HTML" | null }
): Promise<string | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");

  const body: Record<string, unknown> = { chat_id: chatId, text };
  if (options?.parseMode) {
    body.parse_mode = options.parseMode;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(data.description ?? "Telegram send failed");
  return String(data.result?.message_id ?? null);
}

export async function sendAdminTelegramMessage(
  text: string,
  options?: { parseMode?: "Markdown" | "HTML" | null }
) {
  const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID?.trim();
  if (!chatId) {
    return { sent: false as const, telegramMessageId: null, reason: "ADMIN_TELEGRAM_CHAT_ID not set" };
  }

  const telegramMessageId = await sendTelegramMessage(chatId, text, options);
  return { sent: true as const, telegramMessageId };
}
