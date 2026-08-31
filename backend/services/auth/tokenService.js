import crypto from "crypto";
import jwt from "jsonwebtoken";
import Session from "../../models/Session.js";
import Doctor from "../../models/Doctor.js";
import Patient from "../../models/Patient.js";

export const ACCESS_TOKEN_EXPIRES_IN = "15m";
export const REFRESH_TOKEN_DAYS = 7;

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== "string" || secret.trim() === "") {
    console.error("FATAL: JWT_SECRET environment variable is missing or empty.");
    throw new Error("Missing required JWT_SECRET environment variable");
  }
  return secret;
};

export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const generateAccessToken = (userId, userType) => {
  const secret = getJwtSecret();
  return jwt.sign(
    {
      id: userId.toString(),
      type: userType,
    },
    secret,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
};

export const createSessionAndTokens = async (userId, userType, req) => {
  const accessToken = generateAccessToken(userId, userType);
  const rawRefreshToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawRefreshToken);
  const familyId = crypto.randomUUID();

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  const userAgent = req?.headers?.["user-agent"] || "";
  const ipAddress =
    req?.ip || req?.headers?.["x-forwarded-for"] || req?.socket?.remoteAddress || "";

  const session = await Session.create({
    userId,
    userType,
    tokenHash,
    familyId,
    userAgent,
    ipAddress,
    expiresAt,
    lastUsedAt: new Date(),
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    session,
  };
};

export const rotateSession = async (rawRefreshToken, req) => {
  if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
    return { error: "INVALID_TOKEN" };
  }

  const tokenHash = hashToken(rawRefreshToken);
  const session = await Session.findOne({ tokenHash });

  if (!session) {
    return { error: "SESSION_NOT_FOUND" };
  }

  // Reuse Detection: If an already-revoked token is used again, invalidate whole family
  if (session.revokedAt) {
    console.warn(`?? Suspicious token reuse detected for session family ${session.familyId}! Revoking family.`);
    await Session.updateMany(
      { familyId: session.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    return { error: "TOKEN_REUSE_REVOKED" };
  }

  // Check expiration
  if (new Date() > session.expiresAt) {
    session.revokedAt = new Date();
    await session.save();
    return { error: "SESSION_EXPIRED" };
  }

  // Invalidate previous session
  session.revokedAt = new Date();
  await session.save();

  // Load User to ensure still active
  let user;
  if (session.userType === "doctor") {
    user = await Doctor.findById(session.userId).select("-password -googleId");
  } else {
    user = await Patient.findById(session.userId).select("-password -googleId");
  }

  if (!user || user.isActive === false) {
    return { error: "USER_INACTIVE" };
  }

  // Issue new token pair under same family
  const newAccessToken = generateAccessToken(session.userId, session.userType);
  const newRawRefreshToken = crypto.randomBytes(32).toString("hex");
  const newTokenHash = hashToken(newRawRefreshToken);

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  const userAgent = req?.headers?.["user-agent"] || session.userAgent || "";
  const ipAddress =
    req?.ip || req?.headers?.["x-forwarded-for"] || req?.socket?.remoteAddress || session.ipAddress || "";

  const newSession = await Session.create({
    userId: session.userId,
    userType: session.userType,
    tokenHash: newTokenHash,
    familyId: session.familyId,
    userAgent,
    ipAddress,
    expiresAt,
    lastUsedAt: new Date(),
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRawRefreshToken,
    session: newSession,
    user,
    userType: session.userType,
  };
};

export const revokeSessionByToken = async (rawRefreshToken) => {
  if (!rawRefreshToken || typeof rawRefreshToken !== "string") return false;
  const tokenHash = hashToken(rawRefreshToken);
  const result = await Session.updateOne(
    { tokenHash, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  return result.modifiedCount > 0;
};

export const revokeAllUserSessions = async (userId) => {
  await Session.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
};

export const setRefreshTokenCookie = (res, refreshToken) => {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/api/auth",
    maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  });
};

export const clearRefreshTokenCookie = (res) => {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/api/auth",
  });
};
