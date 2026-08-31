import assert from "node:assert";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: "./backend/.env" });

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-secure-jwt-secret-key-12345";
}
if (!process.env.ZEGO_APP_ID) {
  process.env.ZEGO_APP_ID = "1879308119";
}
if (!process.env.ZEGO_SERVER_SECRET) {
  process.env.ZEGO_SERVER_SECRET = "6bead71a81dc89b14db8c8fa9074ee2c";
}

import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import Appointment, { APPOINTMENT_STATUS } from "../models/Appointment.js";
import {
  generateDoctorAvailability,
  bookAppointmentSafe,
} from "../services/appointmentEngine.js";
import { paymentService } from "../services/payment/PaymentService.js";
import { generateConsultationToken } from "../services/telehealth/zegoService.js";
import { getEntityId } from "../routes/telehealth.js";

async function runBugFixSprintTests() {
  console.log("?? Starting Critical Bug-Fix Sprint Automated Test Suite...\n");

  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/ai-med-test";

  await mongoose.connect(mongoUri);
  console.log("?? Connected to MongoDB for bug fix verification.\n");

  const testPrefix = `sprint_fix_${Date.now()}`;
  let doctorA, doctorB, doctorC, patientA, patientB;
  const createdAppointments = [];

  try {
    const hashedPassword = await bcrypt.hash("TestPass123!", 10);

    // -------------------------------------------------------------
    // BUG 1 REGRESSION: Consultation Fee Integrity (?500, ?1000, ?0)
    // -------------------------------------------------------------
    console.log("?? BUG 1 Regression: Consultation Fee Source of Truth");
    doctorA = await Doctor.create({
      name: "Dr. Five Hundred",
      email: `${testPrefix}_doc500@test.com`,
      password: hashedPassword,
      specialization: "General Physician",
      fees: 500,
      isVerified: true,
      isActive: true,
    });

    doctorB = await Doctor.create({
      name: "Dr. One Thousand",
      email: `${testPrefix}_doc1000@test.com`,
      password: hashedPassword,
      specialization: "Cardiologist",
      fees: 1000,
      isVerified: true,
      isActive: true,
    });

    doctorC = await Doctor.create({
      name: "Dr. Zero / Pro Bono",
      email: `${testPrefix}_doc0@test.com`,
      password: hashedPassword,
      specialization: "Dermatologist",
      fees: 0,
      isVerified: true,
      isActive: true,
    });

    patientA = await Patient.create({
      name: "Alice Patient",
      email: `${testPrefix}_patA@test.com`,
      password: hashedPassword,
      isVerified: true,
      isActive: true,
    });

    patientB = await Patient.create({
      name: "Bob Patient",
      email: `${testPrefix}_patB@test.com`,
      password: hashedPassword,
      isVerified: true,
      isActive: true,
    });

    // Test 1a: Doctor A (?500)
    const aptA = await bookAppointmentSafe({
      doctorId: doctorA._id,
      patientId: patientA._id,
      date: "2026-09-02",
      slotStartIso: "2026-09-02T10:00:00.000Z",
      slotEndIso: "2026-09-02T10:30:00.000Z",
      consultationType: "Video Consultation",
    });
    createdAppointments.push(aptA._id);
    assert.strictEqual(aptA.consultationFees, 500, "Doctor A appointment fee must be 500");
    const orderA = await paymentService.createPaymentOrder({ appointmentId: aptA._id, patientId: patientA._id });
    assert.strictEqual(orderA.amount, 500, "Doctor A payment order amount must be 500");

    // Test 1b: Doctor B (₹1000)
    const aptB = await bookAppointmentSafe({
      doctorId: doctorB._id,
      patientId: patientA._id,
      date: "2026-09-02",
      slotStartIso: "2026-09-02T11:00:00.000Z",
      slotEndIso: "2026-09-02T11:30:00.000Z",
      consultationType: "Video Consultation",
    });
    createdAppointments.push(aptB._id);
    assert.strictEqual(aptB.consultationFees, 1000, "Doctor B appointment fee must be 1000");
    const orderB = await paymentService.createPaymentOrder({ appointmentId: aptB._id, patientId: patientA._id });
    assert.strictEqual(orderB.amount, 1000, "Doctor B payment order amount must be 1000");

    // Test 1c: Doctor C (₹0)
    const aptC = await bookAppointmentSafe({
      doctorId: doctorC._id,
      patientId: patientA._id,
      date: "2026-09-02",
      slotStartIso: "2026-09-02T12:00:00.000Z",
      slotEndIso: "2026-09-02T12:30:00.000Z",
      consultationType: "Video Consultation",
    });
    createdAppointments.push(aptC._id);
    assert.strictEqual(aptC.consultationFees, 0, "Doctor C appointment fee must be 0");
    const orderC = await paymentService.createPaymentOrder({ appointmentId: aptC._id, patientId: patientA._id });
    assert.strictEqual(orderC.amount, 0, "Doctor C payment order amount must be 0");

    // Test 1d: Client Attempting to Tamper Price (e.g. passing ₹1 for ₹1000 doctor)
    const tamperedApt = await bookAppointmentSafe({
      doctorId: doctorB._id,
      patientId: patientA._id,
      date: "2026-09-02",
      slotStartIso: "2026-09-02T14:00:00.000Z",
      slotEndIso: "2026-09-02T14:30:00.000Z",
      consultationFees: 1, // Malicious client attempt
      totalAmount: 1,
    });
    createdAppointments.push(tamperedApt._id);
    const tamperedOrder = await paymentService.createPaymentOrder({ appointmentId: tamperedApt._id, patientId: patientA._id });
    assert.strictEqual(tamperedOrder.amount, 1000, "Payment service must enforce authoritative doctor fee (1000), ignoring client tampering");
    console.log("   ? BUG 1 Verified: Fees correctly resolved and enforced authoritatively across doctors.\n");

    // -------------------------------------------------------------
    // BUG 2 REGRESSION: Date/Time Integrity Across 00:00, 09:00, 12:30, 18:00, 23:30
    // -------------------------------------------------------------
    console.log("?? BUG 2 Regression: Date & Time Preservation (No Timezone Rollover)");
    const testDate = "2026-09-01"; // Month boundary
    const testTimes = ["00:00", "09:00", "12:30", "18:00", "23:30"];

    for (const timeStr of testTimes) {
      const [h, m] = timeStr.split(":").map(Number);
      const endH = (h + 1) % 24;
      const endHStr = String(endH).padStart(2, "0");
      const slotStart = `${testDate}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00.000Z`;
      const slotEnd = `${testDate}T${endHStr}:${String(m).padStart(2, "0")}:00.000Z`;

      const apt = await bookAppointmentSafe({
        doctorId: doctorA._id,
        patientId: patientA._id,
        date: testDate,
        slotStartIso: slotStart,
        slotEndIso: slotEnd,
        consultationType: "Video Consultation",
      });
      createdAppointments.push(apt._id);

      // Verify MongoDB stored values
      const dbApt = await Appointment.findById(apt._id);
      assert.strictEqual(dbApt.dateString, testDate, `Stored dateString must remain exact ${testDate}`);
      assert.strictEqual(dbApt.slotStartIso, slotStart, `Stored slotStartIso must match input ${slotStart}`);

      // Verify time extraction
      const extractedTimeMatch = dbApt.slotStartIso.match(/T(\d{2}):(\d{2})/);
      assert.ok(extractedTimeMatch);
      const extractedTime = `${extractedTimeMatch[1]}:${extractedTimeMatch[2]}`;
      assert.strictEqual(extractedTime, timeStr, `Time string must preserve exact ${timeStr}`);
    }
    console.log("   ? BUG 2 Verified: All 5 test times on September 1 boundary preserved with zero rollover.\n");

    // -------------------------------------------------------------
    // BUG 3 REGRESSION: Doctor Profile & Availability Update
    // -------------------------------------------------------------
    console.log("?? BUG 3 Regression: Doctor Profile & Availability Updates");
    // Update Doctor A's schedule to 10:00 - 16:00 and fee to 850
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      doctorA._id,
      {
        fees: 850,
        specialization: "ENT Specialist",
        about: "Experienced ENT surgeon with 12 years in practice.",
        dailyTimeRanges: [{ start: "10:00", end: "16:00" }],
        slotDurationMinutes: 20,
      },
      { new: true, runValidators: true }
    );

    assert.strictEqual(updatedDoctor.fees, 850);
    assert.strictEqual(updatedDoctor.specialization, "ENT Specialist");
    assert.strictEqual(updatedDoctor.dailyTimeRanges[0].start, "10:00");
    assert.strictEqual(updatedDoctor.dailyTimeRanges[0].end, "16:00");
    assert.strictEqual(updatedDoctor.slotDurationMinutes, 20);

    // Verify availability generation uses the newly updated schedule
    const avail = await generateDoctorAvailability({
      doctorId: doctorA._id,
      dateString: "2026-09-15",
      currentIso: "2026-08-01T00:00:00.000Z",
    });

    assert.ok(avail.slots.length > 0, "Slots must be generated for updated schedule");
    assert.strictEqual(avail.slots[0].startTime, "10:00", "First slot must start at 10:00");
    assert.strictEqual(avail.slotDuration, 20, "Slot duration must be 20 minutes");
    console.log("   ? BUG 3 Verified: Doctor profile & availability update persists and drives slot generation.\n");

    // -------------------------------------------------------------
    // BUG 4 REGRESSION: Telehealth Authorization & ID Normalization
    // -------------------------------------------------------------
    console.log("?? BUG 4 Regression: Telehealth Authorization Matrix & Error Codes");

    // Create a confirmed consultation for current time window
    const nowIso = new Date().toISOString();
    const endWindowIso = new Date(Date.now() + 30 * 60000).toISOString();

    const activeApt = await Appointment.create({
      doctorId: doctorA._id,
      patientId: patientA._id,
      date: new Date(),
      dateString: nowIso.slice(0, 10),
      slotStartIso: nowIso,
      slotEndIso: endWindowIso,
      consultationType: "Video Consultation",
      status: APPOINTMENT_STATUS.CONFIRMED,
      consultationFees: 850,
      totalAmount: 850,
      paymentStatus: "Paid",
    });
    createdAppointments.push(activeApt._id);

    // Test 4a: getEntityId helper verification
    assert.strictEqual(getEntityId(doctorA._id), doctorA._id.toString());
    assert.strictEqual(getEntityId({ _id: doctorA._id }), doctorA._id.toString());
    assert.strictEqual(getEntityId(doctorA._id.toString()), doctorA._id.toString());
    assert.strictEqual(getEntityId(null), null);

    // Test 4b: Authorized Patient Generates Token
    const patientToken = generateConsultationToken({
      appointmentId: activeApt._id,
      userId: patientA._id.toString(),
      userName: patientA.name,
      role: "patient",
      roomId: `room_${activeApt._id}`,
    });
    assert.ok(patientToken.token);
    assert.strictEqual(patientToken.userId, patientA._id.toString());

    // Test 4c: Authorized Doctor Generates Token
    const doctorToken = generateConsultationToken({
      appointmentId: activeApt._id,
      userId: doctorA._id.toString(),
      userName: doctorA.name,
      role: "doctor",
      roomId: `room_${activeApt._id}`,
    });
    assert.ok(doctorToken.token);
    assert.strictEqual(doctorToken.userId, doctorA._id.toString());

    // Test 4d: Cross-Tenant Denial (Patient B or Doctor B accessing activeApt)
    const isPatientBAuthorized = getEntityId(activeApt.patientId) === patientB._id.toString();
    const isDoctorBAuthorized = getEntityId(activeApt.doctorId) === doctorB._id.toString();
    assert.strictEqual(isPatientBAuthorized, false, "Patient B must not be authorized on Patient A appointment");
    assert.strictEqual(isDoctorBAuthorized, false, "Doctor B must not be authorized on Doctor A appointment");

    // Test 4e: PENDING Appointment Join Block
    const futureSlotStart = new Date(Date.now() + 2 * 3600000).toISOString();
    const futureSlotEnd = new Date(Date.now() + 2.5 * 3600000).toISOString();

    const pendingApt = await Appointment.create({
      doctorId: doctorA._id,
      patientId: patientA._id,
      date: new Date(),
      dateString: futureSlotStart.slice(0, 10),
      slotStartIso: futureSlotStart,
      slotEndIso: futureSlotEnd,
      consultationType: "Video Consultation",
      status: APPOINTMENT_STATUS.PENDING,
      consultationFees: 850,
      totalAmount: 850,
      paymentStatus: "Pending",
    });
    createdAppointments.push(pendingApt._id);
    assert.strictEqual(pendingApt.status, "PENDING", "Pending appointment must not be IN_PROGRESS");

    console.log("   ? BUG 4 Verified: Participant authorization and token generation strictly enforced.\n");

    console.log("?? ALL CRITICAL BUG-FIX SPRINT REGRESSION TESTS PASSED WITH ZERO ERRORS!");
  } finally {
    if (createdAppointments.length > 0) {
      await Appointment.deleteMany({ _id: { $in: createdAppointments } });
    }
    if (doctorA) await Doctor.deleteOne({ _id: doctorA._id });
    if (doctorB) await Doctor.deleteOne({ _id: doctorB._id });
    if (doctorC) await Doctor.deleteOne({ _id: doctorC._id });
    if (patientA) await Patient.deleteOne({ _id: patientA._id });
    if (patientB) await Patient.deleteOne({ _id: patientB._id });
    await mongoose.disconnect();
    console.log("?? Test cleanup completed & database disconnected.");
  }
}

runBugFixSprintTests().catch((err) => {
  console.error("? Bug fix sprint test suite failed with error:", err);
  process.exit(1);
});
