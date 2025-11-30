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
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.use(response);
app.use(passportLib.initialize());

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
  require('./telegram-bot.cjs');
} catch (err) {
  console.warn('Telegram bot failed to start:', err?.message || err);
}



// ---------- Health Check ----------
app.get("/api/health", (req, res) =>
  res.ok({ time: new Date().toISOString(), service: "AI-MED" }, "OK")
);

// ---------- Start Server ----------
const PORT = process.env.PORT || 8000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);

