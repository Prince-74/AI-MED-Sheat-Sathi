// telegram-bot.js - Telegram bot that reuses the analyzer (ESM)
import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";
import { analyzeReport } from "./analyzer.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN env variable");
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Send me a report as a document or photo, and I'll analyze it.");
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

    const paramsLines = (result.parameters || []).map(p => `- ${p.name}: ${p.value} (${p.status})`).join("\n");
    const issuesLines = (result.issues || []).map(i => `- ${i}`).join("\n");

    const text = [
      "Report Analysis:",
      "",
      `Summary: ${result.summary}`,
      "",
      paramsLines ? `Parameters:\n${paramsLines}` : undefined,
      issuesLines ? `Issues:\n${issuesLines}` : undefined,
    ].filter(Boolean).join("\n");

    await bot.sendMessage(chatId, text);
  } catch (e) {
    const msg = String(e?.message || "");
    if (/429/.test(msg) || /quota/i.test(msg) || /rate limit/i.test(msg)) {
      await bot.sendMessage(chatId, "AI quota exceeded. Please try again later. If this persists, enable OCR-only fallback by setting FALLBACK_OCR_ONLY=true on the server.");
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

// Optional: catch-all errors
bot.on("polling_error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Polling error:", err?.message);
});
