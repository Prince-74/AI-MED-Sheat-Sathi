import express from "express";
import { body } from "express-validator";
import bcrypt from "bcryptjs";
import passport from "passport";

import validate from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import {
  createSessionAndTokens,
  rotateSession,
  revokeSessionByToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "../services/auth/tokenService.js";

const router = express.Router();

export const buildDoctorPayload = (doctor) => ({
  id: doctor._id.toString(),
  type: "doctor",
  name: doctor.name,
  email: doctor.email,
  profileImage: doctor.profileImage || "",
  specialization: doctor.specialization || "",
  fees: doctor.fees || 0,
  hospitalInfo: doctor.hospitalInfo || {},
  isVerified: Boolean(doctor.isVerified),
});

export const buildPatientPayload = (patient) => ({
  id: patient._id.toString(),
  type: "patient",
  name: patient.name,
  email: patient.email,
  profileImage: patient.profileImage || "",
  dob: patient.dob || null,
  age: patient.age || null,
  gender: patient.gender || "",
  bloodGroup: patient.bloodGroup || "",
  isVerified: Boolean(patient.isVerified),
});

// -------------------------------------------------------------
// 1. Doctor Registration
// -------------------------------------------------------------
router.post(
  "/doctor/register",
  [
    body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Doctor name must be 2-100 characters"),
    body("email").trim().isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
      .withMessage("Password must contain both letters and numbers"),
  ],
  validate,
  async (req, res) => {
    try {
      const email = req.body.email.toLowerCase();
      const exists = await Doctor.findOne({ email });
      if (exists) {
        return res.badRequest("Account already exists with this email address");
      }

      const hashedPassword = await bcrypt.hash(req.body.password, 12);

      const doctor = await Doctor.create({
        name: req.body.name.trim(),
        email,
        password: hashedPassword,
        specialization: req.body.specialization || "General Physician",
        fees: req.body.fees ? Number(req.body.fees) : 500,
        dailyTimeRanges: req.body.dailyTimeRanges || [
          { start: "09:00", end: "13:00" },
          { start: "14:00", end: "20:00" },
        ],
        slotDurationMinutes: req.body.slotDurationMinutes || 30,
        isVerified: true,
        isActive: true,
      });

      const { accessToken, refreshToken } = await createSessionAndTokens(
        doctor._id,
        "doctor",
        req
      );

      setRefreshTokenCookie(res, refreshToken);

      res.created(
        {
          token: accessToken,
          refreshToken,
          user: buildDoctorPayload(doctor),
        },
        "Doctor registered successfully"
      );
    } catch (error) {
      console.error("Doctor register error:", error);
      res.serverError("Registration failed", [error.message]);
    }
  }
);

// -------------------------------------------------------------
// 2. Doctor Login
// -------------------------------------------------------------
router.post(
  "/doctor/login",
  [
    body("email").trim().isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  async (req, res) => {
    try {
      const email = req.body.email.toLowerCase();
      const doctor = await Doctor.findOne({ email });

      if (!doctor || !doctor.password) {
        return res.unauthorized("Invalid email or password");
      }

      if (doctor.isActive === false) {
        return res.forbidden("Account is deactivated. Please contact support.");
      }

      const match = await bcrypt.compare(req.body.password, doctor.password);
      if (!match) {
        return res.unauthorized("Invalid email or password");
      }

      const { accessToken, refreshToken } = await createSessionAndTokens(
        doctor._id,
        "doctor",
        req
      );

      setRefreshTokenCookie(res, refreshToken);

      res.ok(
        {
          token: accessToken,
          refreshToken,
          user: buildDoctorPayload(doctor),
        },
        "Login successful"
      );
    } catch (error) {
      console.error("Doctor login error:", error);
      res.serverError("Login failed", [error.message]);
    }
  }
);

// -------------------------------------------------------------
// 3. Patient Registration
// -------------------------------------------------------------
router.post(
  "/patient/register",
  [
    body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Patient name must be 2-100 characters"),
    body("email").trim().isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
      .withMessage("Password must contain both letters and numbers"),
  ],
  validate,
  async (req, res) => {
    try {
      const email = req.body.email.toLowerCase();
      const exists = await Patient.findOne({ email });
      if (exists) {
        return res.badRequest("Account already exists with this email address");
      }

      const hashedPassword = await bcrypt.hash(req.body.password, 12);

      const patient = await Patient.create({
        name: req.body.name.trim(),
        email,
        password: hashedPassword,
        isVerified: true,
        isActive: true,
      });

      const { accessToken, refreshToken } = await createSessionAndTokens(
        patient._id,
        "patient",
        req
      );

      setRefreshTokenCookie(res, refreshToken);

      res.created(
        {
          token: accessToken,
          refreshToken,
          user: buildPatientPayload(patient),
        },
        "Patient registered successfully"
      );
    } catch (error) {
      console.error("Patient register error:", error);
      res.serverError("Registration failed", [error.message]);
    }
  }
);

// -------------------------------------------------------------
// 4. Patient Login
// -------------------------------------------------------------
router.post(
  "/patient/login",
  [
    body("email").trim().isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  async (req, res) => {
    try {
      const email = req.body.email.toLowerCase();
      const patient = await Patient.findOne({ email });

      if (!patient || !patient.password) {
        return res.unauthorized("Invalid email or password");
      }

      if (patient.isActive === false) {
        return res.forbidden("Account is deactivated. Please contact support.");
      }

      const match = await bcrypt.compare(req.body.password, patient.password);
      if (!match) {
        return res.unauthorized("Invalid email or password");
      }

      const { accessToken, refreshToken } = await createSessionAndTokens(
        patient._id,
        "patient",
        req
      );

      setRefreshTokenCookie(res, refreshToken);

      res.ok(
        {
          token: accessToken,
          refreshToken,
          user: buildPatientPayload(patient),
        },
        "Login successful"
      );
    } catch (error) {
      console.error("Patient login error:", error);
      res.serverError("Login failed", [error.message]);
    }
  }
);

// -------------------------------------------------------------
// 5. Token Refresh & Session Rotation
// -------------------------------------------------------------
router.post("/refresh", async (req, res) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rawRefreshToken) {
      clearRefreshTokenCookie(res);
      return res.unauthorized("Missing refresh token");
    }

    const rotationResult = await rotateSession(rawRefreshToken, req);

    if (rotationResult.error) {
      clearRefreshTokenCookie(res);
      if (rotationResult.error === "TOKEN_REUSE_REVOKED") {
        return res.unauthorized("Session revoked due to security violation");
      }
      return res.unauthorized("Invalid or expired session. Please log in again.");
    }

    const { accessToken, refreshToken, user, userType } = rotationResult;
    setRefreshTokenCookie(res, refreshToken);

    const userPayload =
      userType === "doctor" ? buildDoctorPayload(user) : buildPatientPayload(user);

    res.ok(
      {
        token: accessToken,
        refreshToken,
        user: userPayload,
      },
      "Token refreshed successfully"
    );
  } catch (error) {
    console.error("Refresh error:", error);
    clearRefreshTokenCookie(res);
    res.serverError("Failed to refresh session", [error.message]);
  }
});

// -------------------------------------------------------------
// 6. Server-Side Logout & Session Revocation
// -------------------------------------------------------------
router.post("/logout", async (req, res) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (rawRefreshToken) {
      await revokeSessionByToken(rawRefreshToken);
    }

    clearRefreshTokenCookie(res);
    res.ok(null, "Logged out successfully");
  } catch (error) {
    console.error("Logout error:", error);
    clearRefreshTokenCookie(res);
    res.ok(null, "Logged out");
  }
});

// -------------------------------------------------------------
// 7. Get Current Authenticated User (Profile Session Verification)
// -------------------------------------------------------------
router.get("/me", authenticate, async (req, res) => {
  try {
    const userPayload =
      req.auth.type === "doctor"
        ? buildDoctorPayload(req.user)
        : buildPatientPayload(req.user);

    res.ok({ user: userPayload }, "Current session authenticated");
  } catch (error) {
    res.serverError("Failed to get profile", [error.message]);
  }
});

// -------------------------------------------------------------
// 8. Google OAuth
// -------------------------------------------------------------
router.get("/google", (req, res, next) => {
  const userType = req.query.type === "doctor" ? "doctor" : "patient";
  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: userType,
    prompt: "select_account",
  })(req, res, next);
});

const googleCallbackAuth = passport.authenticate("google", {
  session: false,
  failureRedirect: "/api/auth/failure",
});

const handleGoogleCallback = async (req, res) => {
  try {
    const { user, type } = req.user;
    const { accessToken, refreshToken } = await createSessionAndTokens(user._id, type, req);

    setRefreshTokenCookie(res, refreshToken);

    const payload = type === "doctor" ? buildDoctorPayload(user) : buildPatientPayload(user);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    const redirectUrl = `${frontendUrl}/auth/success?token=${accessToken}&type=${type}&user=${encodeURIComponent(
      JSON.stringify(payload)
    )}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Google callback error:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const message = encodeURIComponent(error.message || "Google authentication failed");
    res.redirect(`${frontendUrl}/auth/error?message=${message}`);
  }
};

router.get("/google/callback", googleCallbackAuth, handleGoogleCallback);
router.get("/callback/google", googleCallbackAuth, handleGoogleCallback);
router.get("/failure", (req, res) => res.badRequest("Google authentication failed"));

export default router;
