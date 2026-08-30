import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import { analyzeReport } from "./services/ai.js";
import fetch from "node-fetch";

const token = process.env.TELEGRAM_BOT_TOKEN;

let bot = null;

if (!token) {
  console.warn("??  TELEGRAM_BOT_TOKEN is not set. Telegram bot will not start.");
} else if (global.__AI_MED_TELEGRAM_BOT__) {
  bot = global.__AI_MED_TELEGRAM_BOT__;
} else {
  bot = new TelegramBot(token, { polling: true });
  global.__AI_MED_TELEGRAM_BOT__ = bot;

  bot
    .getMe()
    .then((info) => console.log(`?? Telegram bot started as @${info.username || info.first_name || "unknown"}`))
    .catch(() => console.log("?? Telegram bot started"));

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      "Welcome to AI-MED Assistant! ??\n\nSend me a medical report as a PDF document or image photo, and I will analyze and summarize it for you."
    );
  });

  async function fetchTelegramFileBuffer(fileId) {
    const file = await bot.getFile(fileId);
    const link = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const res = await fetch(link);
    if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
    return await res.arrayBuffer();
  }

  async function handleAnalysis(chatId, fileId, filename) {
    try {
      await bot.sendChatAction(chatId, "typing");
      const arrayBuf = await fetchTelegramFileBuffer(fileId);
      const buffer = Buffer.from(arrayBuf);
      const result = await analyzeReport(buffer, filename);

      const paramsLines = (result.parameters || [])
        .map((p) => `• ${p.name}: ${p.value} (${p.status})`)
        .join("\n");
      const issuesLines = (result.issues || []).map((i) => `?? ${i}`).join("\n");

      const text = [
        "?? *AI-MED Report Analysis*",
        "",
        `*Summary:*\n${result.summary}`,
        "",
        paramsLines ? `*Parameters:*\n${paramsLines}\n` : undefined,
        issuesLines ? `*Issues & Warnings:*\n${issuesLines}` : undefined,
      ]
        .filter(Boolean)
        .join("\n");

      await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
    } catch (e) {
      const msg = String(e?.message || "");
      if (/429/.test(msg) || /quota/i.test(msg) || /rate limit/i.test(msg)) {
        await bot.sendMessage(chatId, "AI quota exceeded. Please try again in a few moments.");
        return;
      }
      await bot.sendMessage(chatId, `Analysis failed: ${msg || "Unknown error"}`);
    }
  }

  bot.on("document", async (msg) => {
    const doc = msg.document;
    if (!doc) return;
    await handleAnalysis(msg.chat.id, doc.file_id, doc.file_name || "report.pdf");
  });

  bot.on("photo", async (msg) => {
    const photos = msg.photo || [];
    const largest = photos[photos.length - 1];
    if (!largest) return;
    await handleAnalysis(msg.chat.id, largest.file_id, "report.jpg");
  });

  bot.on("polling_error", (err) => {
    const message = err?.message || String(err);
    if (/409\s+Conflict/i.test(message) || /terminated by other getUpdates request/i.test(message)) {
      bot.stopPolling().catch(() => {});
    }
  });
}

export default bot;
