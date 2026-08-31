import "dotenv/config";
import http from "http";
import express from "express";
import mongoose from "mongoose";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import passport from "passport";
import { Server as SocketIOServer } from "socket.io";
import rateLimit from "express-rate-limit";

import "./config/passport.js";
import response from "./middleware/response.js";
import { getJwtSecret } from "./services/auth/tokenService.js";

import authRoutes from "./routes/auth.js";
import doctorRoutes from "./routes/doctor.js";
import patientRoutes from "./routes/patient.js";
import appointmentRoutes from "./routes/appointment.js";
import paymentRoutes from "./routes/payment.js";
import telehealthRoutes from "./routes/telehealth.js";
import reportRoutes from "./routes/report.js";
import aiRoutes from "./routes/ai.js";

// Fail-Fast: Verify critical security configuration
try {
  getJwtSecret();
} catch (err) {
  console.error("? Startup aborted:", err.message);
  process.exit(1);
}

const app = express();
const server = http.createServer(app);

// ---------- Socket.IO Setup ----------
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT"],
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log(`?? Client connected to Socket.IO: ${socket.id}`);

  socket.on("join_room", (roomId) => {
    socket.join(roomId);
  });

  socket.on("leave_room", (roomId) => {
    socket.leave(roomId);
  });

  socket.on("consultation_joined", ({ appointmentId, userId, role, name }) => {
    socket.join(`appointment_${appointmentId}`);
    socket.to(`appointment_${appointmentId}`).emit("participant_presence", {
      userId,
      role,
      name,
      status: "CONNECTED",
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("consultation_left", ({ appointmentId, userId, role }) => {
    socket.to(`appointment_${appointmentId}`).emit("participant_presence", {
      userId,
      role,
      status: "DISCONNECTED",
      timestamp: new Date().toISOString(),
    });
    socket.leave(`appointment_${appointmentId}`);
  });

  socket.on("disconnect", () => {
    console.log(`?? Client disconnected: ${socket.id}`);
  });
});

// ---------- Rate Limiting ----------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication requests, please try again later." },
});

const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many AI analysis requests, please slow down." },
});

// ---------- Middleware ----------
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false, // Allow API & socket connections
  })
);
app.use(morgan("dev"));

// Strict credentialed CORS
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      const customOrigins = (process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (customOrigins.includes(origin) || customOrigins.includes("*")) {
        return callback(null, true);
      }
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(cookieParser());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(response);
app.use(passport.initialize());

// ---------- MongoDB Connection ----------
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("? MONGO_URI is missing in backend/.env");
} else {
  mongoose
    .connect(mongoUri)
    .then(() => console.log("?? MongoDB connected successfully"))
    .catch((err) => {
      console.error("? MongoDB connection error:", err.message || err);
    });
}

// ---------- Routes ----------
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/appointment", appointmentRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/telehealth", telehealthRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);

// Telegram Bot (Optional auto-start)
try {
  const autostartBot = (process.env.TELEGRAM_BOT_AUTOSTART || "true").toLowerCase() === "true";
  if (autostartBot && process.env.TELEGRAM_BOT_TOKEN) {
    import("./telegram-bot.js").catch((err) => {
      console.warn("Telegram bot failed to initialize:", err.message || err);
    });
  }
} catch (err) {
  console.warn("Telegram bot setup error:", err?.message || err);
}

// ---------- Health Checks ----------
app.get("/api/health", (req, res) =>
  res.ok({ time: new Date().toISOString(), service: "AI-MED" }, "AI-MED Backend OK")
);

app.get("/health", (req, res) =>
  res.status(200).json({ status: "ok", time: new Date().toISOString(), service: "AI-MED" })
);

// ---------- Global Error Handler ----------
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err.message || err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`?? AI-MED Server running on http://localhost:${PORT}`);
});

export { app, server, io };
