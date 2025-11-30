// telegram-bot.cjs - CommonJS wrapper to start the Telegram bot from server (uses analyzer.cjs)
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const analyzer = require('./analyzer.cjs');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  // Do not crash server at startup; log and skip bot initialization
  // so the API remains available even if the token is missing.
  // eslint-disable-next-line no-console
  console.warn('⚠️  TELEGRAM_BOT_TOKEN is not set. Telegram bot will not start.');
  return;
}

const bot = new TelegramBot(token, { polling: true });
// Log basic status so server logs show bot is active
bot.getMe()
  .then((info) => console.log(`🤖 Telegram bot started as @${info.username || info.first_name || 'unknown'}`))
  .catch(() => console.log('🤖 Telegram bot started'));

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Send me a report as a document or photo, and I\'ll analyze it.');
});

async function fetchTelegramFileBuffer(fileId) {
  const file = await bot.getFile(fileId);
  const link = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
  // Use dynamic import for node-fetch (v3 ESM) in CommonJS
  const nf = await import('node-fetch');
  const res = await nf.default(link);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
  return await res.arrayBuffer();
}

async function handleAnalysis(chatId, fileId, filename) {
  try {
    await bot.sendChatAction(chatId, 'typing');
    const arrayBuf = await fetchTelegramFileBuffer(fileId);
    const buffer = Buffer.from(arrayBuf);
    const result = await analyzer.analyzeReport(buffer, filename);

    const paramsLines = (result.parameters || []).map(p => `- ${p.name}: ${p.value} (${p.status})`).join('\n');
    const issuesLines = (result.issues || []).map(i => `- ${i}`).join('\n');

    const text = [
      'Report Analysis:',
      '',
      `Summary: ${result.summary}`,
      '',
      paramsLines ? `Parameters:\n${paramsLines}` : undefined,
      issuesLines ? `Issues:\n${issuesLines}` : undefined,
    ].filter(Boolean).join('\n');

    await bot.sendMessage(chatId, text);
  } catch (e) {
    const msg = String(e?.message || '');
    if (/429/.test(msg) || /quota/i.test(msg) || /rate limit/i.test(msg)) {
      await bot.sendMessage(chatId, 'AI quota exceeded. Please try again later. If this persists, enable OCR-only fallback by setting FALLBACK_OCR_ONLY=true on the server.');
      return;
    }
    await bot.sendMessage(chatId, `Analysis failed: ${msg || 'Unknown error'}`);
  }
}

bot.on('document', async (msg) => {
  const doc = msg.document;
  if (!doc) return;
  await handleAnalysis(msg.chat.id, doc.file_id, doc.file_name || 'report.pdf');
});

bot.on('photo', async (msg) => {
  const photos = msg.photo || [];
  const largest = photos[photos.length - 1];
  if (!largest) return;
  await handleAnalysis(msg.chat.id, largest.file_id, 'report.jpg');
});

bot.on('polling_error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Telegram polling error:', err?.message || err);
});

// Export for tests or manual start if needed
module.exports = bot;
