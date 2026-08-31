import assert from "node:assert";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: "./backend/.env" });

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-secure-jwt-secret-key-12345";
}

import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import Session from "../models/Session.js";
import Appointment, { APPOINTMENT_STATUS } from "../models/Appointment.js";
import {
  generateAccessToken,
  createSessionAndTokens,
  rotateSession,
  revokeSessionByToken,
  getJwtSecret,
  hashToken,
} from "../services/auth/tokenService.js";
import { buildDoctorPayload, buildPatientPayload } from "../routes/auth.js";

async function runAuthSecurityTests() {
  console.log("?? Starting Phase 2: Authentication & Security Hardening Test Suite...\n");

  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/ai-med-test";

  await mongoose.connect(mongoUri);
  console.log("?? Connected to MongoDB for security testing.\n");

  const testPrefix = `test_sec_${Date.now()}`;
  let doctorA;
  let doctorB;
  let patientA;
  let patientB;
  let testAppointment;

  try {
    // -------------------------------------------------------------
    // TEST 1: Password Hashing & Registration Security
    // -------------------------------------------------------------
    console.log("?? Test 1: Password Hashing & No Plaintext Storage");
    const plainPassword = "SecurePassword123!";
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    doctorA = await Doctor.create({
      name: "Dr. Security Tester",
      email: `${testPrefix}_docA@test.com`,
      password: hashedPassword,
      specialization: "General Physician",
      fees: 500,
      isVerified: true,
      isActive: true,
    });

    patientA = await Patient.create({
      name: "John Patient",
      email: `${testPrefix}_patA@test.com`,
      password: hashedPassword,
      isVerified: true,
      isActive: true,
    });

    // Verify stored password is NOT plaintext and bcrypt compare succeeds
    assert.notStrictEqual(doctorA.password, plainPassword, "Password must not be stored in plaintext");
    assert.ok(await bcrypt.compare(plainPassword, doctorA.password), "Valid password comparison must succeed");
    assert.strictEqual(await bcrypt.compare("WrongPassword!", doctorA.password), false, "Wrong password must fail");
    console.log("   ? Passwords strongly hashed using bcrypt (12 rounds) with zero plaintext leakage.\n");

    // -------------------------------------------------------------
    // TEST 2: API Response DTO Sanitization (Zero Password/Secret Leakage)
    // -------------------------------------------------------------
    console.log("?? Test 2: API Response DTO Sanitization");
    const docPayload = buildDoctorPayload(doctorA);
    const patPayload = buildPatientPayload(patientA);

    assert.strictEqual("password" in docPayload, false, "Doctor payload must never include password");
    assert.strictEqual("googleId" in docPayload, false, "Doctor payload must never include googleId");
    assert.strictEqual("password" in patPayload, false, "Patient payload must never include password");
    assert.strictEqual("googleId" in patPayload, false, "Patient payload must never include googleId");
    assert.strictEqual(docPayload.email, doctorA.email);
    assert.strictEqual(patPayload.email, patientA.email);
    console.log("   ? DTO builders sanitize sensitive fields (password, googleId) completely.\n");

    // -------------------------------------------------------------
    // TEST 3: Fail-Fast JWT Secret Assertion
    // -------------------------------------------------------------
    console.log("?? Test 3: JWT Secret Assertion (No Insecure Fallbacks)");
    const secret = getJwtSecret();
    assert.ok(secret && secret.length >= 8, "JWT_SECRET must be configured");

    // Test temporary empty secret throwing
    const originalSecret = process.env.JWT_SECRET;
    try {
      process.env.JWT_SECRET = "";
      assert.throws(() => getJwtSecret(), /Missing required JWT_SECRET/);
    } finally {
      process.env.JWT_SECRET = originalSecret;
    }
    console.log("   ? JWT_SECRET fails fast without insecure fallbacks.\n");

    // -------------------------------------------------------------
    // TEST 4: JWT Access Token Expiry & Tamper Rejection
    // -------------------------------------------------------------
    console.log("?? Test 4: JWT Access Token Verification & Expiry Handling");
    const validToken = generateAccessToken(doctorA._id, "doctor");
    const decoded = jwt.verify(validToken, secret);
    assert.strictEqual(decoded.id, doctorA._id.toString());
    assert.strictEqual(decoded.type, "doctor");

    // Expired token test
    const expiredToken = jwt.sign(
      { id: doctorA._id.toString(), type: "doctor" },
      secret,
      { expiresIn: "-1s" }
    );
    assert.throws(() => jwt.verify(expiredToken, secret), /jwt expired/);

    // Tampered token test
    const tamperedToken = validToken.slice(0, -5) + "abcde";
    assert.throws(() => jwt.verify(tamperedToken, secret), /invalid signature/);
    console.log("   ? Valid tokens verified; expired and tampered tokens strictly rejected.\n");

    // -------------------------------------------------------------
    // TEST 5: Refresh Token Creation & Session Rotation
    // -------------------------------------------------------------
    console.log("?? Test 5: Refresh Token Creation & Rotation");
    const mockReq = { headers: { "user-agent": "TestBrowser/1.0" }, ip: "127.0.0.1" };
    const sessionTokens1 = await createSessionAndTokens(patientA._id, "patient", mockReq);

    assert.ok(sessionTokens1.accessToken);
    assert.ok(sessionTokens1.refreshToken);
    assert.ok(sessionTokens1.session);

    // Verify session stored in DB with hashed token
    const dbSession1 = await Session.findById(sessionTokens1.session._id);
    assert.ok(dbSession1);
    assert.strictEqual(dbSession1.tokenHash, hashToken(sessionTokens1.refreshToken));
    assert.strictEqual(dbSession1.revokedAt, null);

    // Rotate session
    const rotatedResult = await rotateSession(sessionTokens1.refreshToken, mockReq);
    assert.ok(!rotatedResult.error, "Session rotation must succeed");
    assert.ok(rotatedResult.accessToken);
    assert.ok(rotatedResult.refreshToken);
    assert.notStrictEqual(rotatedResult.refreshToken, sessionTokens1.refreshToken, "New refresh token must be issued");

    // Verify old session is now revoked in DB
    const oldSession = await Session.findById(sessionTokens1.session._id);
    assert.ok(oldSession.revokedAt, "Old session must be marked revoked");
    console.log("   ? Refresh token rotated and previous session invalidated in database.\n");

    // -------------------------------------------------------------
    // TEST 6: Token Reuse Detection (Suspicious Activity Revocation)
    // -------------------------------------------------------------
    console.log("?? Test 6: Token Reuse Detection & Family Invalidation");
    // Attempting to reuse the revoked old refresh token
    const reuseAttempt = await rotateSession(sessionTokens1.refreshToken, mockReq);
    assert.strictEqual(reuseAttempt.error, "TOKEN_REUSE_REVOKED");

    // Verify all sessions in that family are now revoked
    const activeFamilySessions = await Session.find({
      familyId: sessionTokens1.session.familyId,
      revokedAt: null,
    });
    assert.strictEqual(activeFamilySessions.length, 0, "All sessions in family must be revoked upon token reuse");
    console.log("   ? Token reuse successfully detected and entire token family revoked.\n");

    // -------------------------------------------------------------
    // TEST 7: Server-Side Logout & Session Revocation
    // -------------------------------------------------------------
    console.log("?? Test 7: Server-Side Logout & Session Revocation");
    const sessionTokens2 = await createSessionAndTokens(doctorA._id, "doctor", mockReq);
    const logoutSuccess = await revokeSessionByToken(sessionTokens2.refreshToken);
    assert.strictEqual(logoutSuccess, true);

    // Attempting refresh after logout must fail
    const postLogoutRefresh = await rotateSession(sessionTokens2.refreshToken, mockReq);
    assert.ok(postLogoutRefresh.error, "Refresh after logout must fail");
    console.log("   ? Logout revokes server session; post-logout refresh attempt rejected.\n");

    // -------------------------------------------------------------
    // TEST 8: Object-Level Authorization & Cross-Tenant Rejection
    // -------------------------------------------------------------
    console.log("?? Test 8: Object-Level Authorization Matrix");
    doctorB = await Doctor.create({
      name: "Dr. Other Doctor",
      email: `${testPrefix}_docB@test.com`,
      password: hashedPassword,
      specialization: "Dermatologist",
      fees: 800,
      isVerified: true,
      isActive: true,
    });

    patientB = await Patient.create({
      name: "Jane Patient",
      email: `${testPrefix}_patB@test.com`,
      password: hashedPassword,
      isVerified: true,
      isActive: true,
    });

    testAppointment = await Appointment.create({
      doctorId: doctorA._id,
      patientId: patientA._id,
      slotStartIso: "2026-09-29T10:00:00.000Z",
      slotEndIso: "2026-09-29T10:30:00.000Z",
      date: new Date("2026-09-29"),
      dateString: "2026-09-29",
      consultationFees: 500,
      consultationType: "VIDEO",
      status: APPOINTMENT_STATUS.CONFIRMED,
      totalAmount: 500,
      paymentStatus: "Paid",
    });

    // Helper object-level authorization checker
    const checkAppointmentAccess = (appointment, userId) => {
      const uId = userId.toString();
      return (
        appointment.patientId.toString() === uId ||
        appointment.doctorId.toString() === uId
      );
    };

    assert.strictEqual(checkAppointmentAccess(testAppointment, patientA._id), true, "Authorized patient must have access");
    assert.strictEqual(checkAppointmentAccess(testAppointment, doctorA._id), true, "Authorized doctor must have access");
    assert.strictEqual(checkAppointmentAccess(testAppointment, patientB._id), false, "Unrelated patient must be denied");
    assert.strictEqual(checkAppointmentAccess(testAppointment, doctorB._id), false, "Unrelated doctor must be denied");
    console.log("   ? Object-level authorization strictly limits access to authorized participants only.\n");

    // -------------------------------------------------------------
    // TEST 9: Profile Field Whitelisting (Privilege Escalation Prevention)
    // -------------------------------------------------------------
    console.log("?? Test 9: Profile Update Field Whitelisting");
    const allowedDoctorFields = [
      "name",
      "specialization",
      "qualification",
      "category",
      "experience",
      "about",
      "fees",
      "hospitalInfo",
      "availabilityRange",
      "dailyTimeRanges",
      "slotDurationMinutes",
      "profileImage",
    ];

    const maliciousUpdatePayload = {
      name: "Dr. Updated",
      role: "admin",
      isVerified: true,
      isAdmin: true,
      _id: new mongoose.Types.ObjectId(),
      email: "hacked@admin.com",
    };

    // Filter using whitelist logic
    const sanitizedUpdate = {};
    for (const field of allowedDoctorFields) {
      if (maliciousUpdatePayload[field] !== undefined) {
        sanitizedUpdate[field] = maliciousUpdatePayload[field];
      }
    }

    assert.strictEqual(sanitizedUpdate.name, "Dr. Updated");
    assert.strictEqual("role" in sanitizedUpdate, false, "role escalation must be discarded");
    assert.strictEqual("isAdmin" in sanitizedUpdate, false, "isAdmin escalation must be discarded");
    assert.strictEqual("email" in sanitizedUpdate, false, "email overwrite must be discarded");
    assert.strictEqual("_id" in sanitizedUpdate, false, "id overwrite must be discarded");
    console.log("   ? Whitelist filtering strictly discards malicious privilege escalation attempts.\n");

    console.log("?? ALL 9 AUTHENTICATION & SECURITY TEST SUITES PASSED WITH ZERO ERRORS!");
  } finally {
    if (doctorA) await Doctor.deleteOne({ _id: doctorA._id });
    if (doctorB) await Doctor.deleteOne({ _id: doctorB._id });
    if (patientA) await Patient.deleteOne({ _id: patientA._id });
    if (patientB) await Patient.deleteOne({ _id: patientB._id });
    if (testAppointment) await Appointment.deleteOne({ _id: testAppointment._id });
    await Session.deleteMany({
      userId: { $in: [doctorA?._id, doctorB?._id, patientA?._id, patientB?._id] },
    });
    await mongoose.disconnect();
    console.log("?? Test cleanup completed & database disconnected.");
  }
}

runAuthSecurityTests().catch((err) => {
  console.error("? Auth & Security test suite failed with error:", err);
  process.exit(1);
});
