// server.js - unified backend entry (CommonJS)
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");
const passportLib = require("passport");

require("./config/passport");
const response = require("./middleware/response");

const app = express();

// ---------- Middleware ----------
app.use(helmet());
app.use(morgan("dev"));
app.use(
  cors({
    origin:
      (process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) || "*",
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ---------- MongoDB Connection ----------
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error("❌ MONGO_URI is missing in backend/.env");
} else {
  mongoose
    .connect(mongoUri)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err);
      if (err?.code === "ENOTFOUND") {
        console.error("ℹ️  DNS lookup failed for your MongoDB host. Check internet/DNS, VPN/proxy settings, and that the cluster hostname in MONGO_URI is correct.");
      }
    });
}

app.use(response);
app.use(passportLib.initialize());

// ---------- Inactivity timer ----------
const INACTIVITY_TIMEOUT_MINUTES = parseInt(process.env.INACTIVITY_TIMEOUT_MINUTES || "10", 10);
let inactivityTimer = null;
function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    console.warn(`⚠️  No activity for ${INACTIVITY_TIMEOUT_MINUTES} minute(s). Shutting down server due to inactivity.`);
    try {
      if (server && typeof server.close === "function") {
        server.close(() => {
          console.log("ℹ️  Server closed gracefully due to inactivity.");
          process.exit(0);
        });
        // Force exit after 30s if close doesn't complete
        setTimeout(() => process.exit(0), 30000);
      } else {
        process.exit(0);
      }
    } catch (err) {
      console.error("Error while shutting down:", err);
      process.exit(1);
    }
  }, INACTIVITY_TIMEOUT_MINUTES * 60 * 1000);
}

// Reset inactivity on every incoming request
app.use((req, res, next) => {
  resetInactivityTimer();
  next();
});

// ---------- Routes ----------
app.use("/api/auth", require("./routes/auth"));
app.use("/api/doctor", require("./routes/doctor"));
app.use("/api/patient", require("./routes/patient"));
app.use("/api/appointment", require("./routes/appointment"));
app.use("/api/reports", require("./routes/report"));
app.use("/api/ai", require("./routes/ai"));
// app.use("/api/payment", require("./routes/payment"));


// Start Telegram bot (optional). If TELEGRAM_BOT_TOKEN is missing, the bot module
// will warn and not start but the API server will continue running.
try {
  const autostartBot = (process.env.TELEGRAM_BOT_AUTOSTART || 'true').toLowerCase() === 'true';
  if (autostartBot) {
    require('./telegram-bot.cjs');
  } else {
    console.log('ℹ️  Telegram bot autostart is disabled (TELEGRAM_BOT_AUTOSTART=false).');
  }
} catch (err) {
  console.warn('Telegram bot failed to start:', err?.message || err);
}



// ---------- Health Check ----------
app.get("/api/health", (req, res) =>
  res.ok({ time: new Date().toISOString(), service: "AI-MED" }, "OK")
);

// Root health endpoint (useful for external pingers that hit /health)
app.get("/health", (req, res) =>
  res.status(200).json({ status: "ok", time: new Date().toISOString(), service: "AI-MED" })
);

// ---------- Start Server ----------
const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  // start/reset inactivity timer when server starts
  resetInactivityTimer();
});

