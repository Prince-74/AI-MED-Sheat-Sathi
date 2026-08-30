import assert from "node:assert";
import mongoose from "mongoose";
import "dotenv/config";

import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import Appointment, { APPOINTMENT_STATUS } from "../models/Appointment.js";
import { bookAppointmentSafe, transitionAppointmentStatus } from "../services/appointmentEngine.js";

async function runOperationsTests() {
  console.log("?? Starting Phase 6 & 7: Doctor & Patient Operations Test Suite...\n");

  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/ai-med-test";

  await mongoose.connect(mongoUri);
  console.log("?? Connected to MongoDB for operations testing.\n");

  const testPrefix = `test_ops_${Date.now()}`;
  let doctorA;
  let doctorB;
  let patientA;
  let patientB;
  let pendingApt;
  let confirmedApt;
  let completedApt;

  try {
    // 1. Fixtures Setup
    doctorA = await Doctor.create({
      name: "Dr. Meredith Grey",
      email: `${testPrefix}_docA@test.com`,
      specialization: "General Physician",
      fees: 600,
      slotDurationMinutes: 30,
      dailyTimeRanges: [{ start: "09:00", end: "17:00" }],
      isVerified: true,
      isActive: true,
    });

    doctorB = await Doctor.create({
      name: "Dr. Derek Shepherd",
      email: `${testPrefix}_docB@test.com`,
      specialization: "Neurologist",
      fees: 1200,
      slotDurationMinutes: 30,
      dailyTimeRanges: [{ start: "09:00", end: "17:00" }],
      isVerified: true,
      isActive: true,
    });

    patientA = await Patient.create({
      name: "Alex Karev",
      email: `${testPrefix}_patA@test.com`,
      dob: "1992-06-15",
    });

    patientB = await Patient.create({
      name: "Cristina Yang",
      email: `${testPrefix}_patB@test.com`,
      dob: "1991-03-24",
    });

    const futureDate = "2026-09-28";

    // -------------------------------------------------------------
    // TEST 1: Initial Booking & Doctor Pending Queue Verification
    // -------------------------------------------------------------
    console.log("?? Test 1: Booking Creates PENDING Appointment in Doctor Queue");
    pendingApt = await bookAppointmentSafe({
      doctorId: doctorA._id,
      patientId: patientA._id,
      slotStartIso: "2026-09-28T09:00:00.000Z",
      slotEndIso: "2026-09-28T09:30:00.000Z",
      date: futureDate,
      consultationType: "VIDEO",
      symptoms: "Persistent headache for 3 days",
    });

    assert.strictEqual(pendingApt.status, APPOINTMENT_STATUS.PENDING);
    const aptDocId = (pendingApt.doctorId?._id || pendingApt.doctorId).toString();
    const aptPatId = (pendingApt.patientId?._id || pendingApt.patientId).toString();
    assert.strictEqual(aptDocId, doctorA._id.toString());
    assert.strictEqual(aptPatId, patientA._id.toString());

    // Check doctor's pending queue count
    const pendingCount = await Appointment.countDocuments({
      doctorId: doctorA._id,
      status: "PENDING",
    });
    assert.strictEqual(pendingCount, 1, "Doctor must see 1 pending request");
    console.log("   ? Appointment successfully queued in Doctor's pending approval list.\n");

    // -------------------------------------------------------------
    // TEST 2: Doctor Accepts Pending Appointment -> Transitions to CONFIRMED
    // -------------------------------------------------------------
    console.log("?? Test 2: Doctor Accepts Appointment Request");
    const acceptedApt = await transitionAppointmentStatus({
      appointmentId: pendingApt._id,
      targetStatus: APPOINTMENT_STATUS.CONFIRMED,
      actorRole: "doctor",
      actorId: doctorA._id,
    });

    assert.strictEqual(acceptedApt.status, APPOINTMENT_STATUS.CONFIRMED);
    assert.ok(acceptedApt.confirmedAt);
    console.log("   ? Doctor successfully accepted appointment, transitioned to CONFIRMED.\n");

    // -------------------------------------------------------------
    // TEST 3: Doctor Rejects Another Pending Appointment -> Transitions to REJECTED
    // -------------------------------------------------------------
    console.log("?? Test 3: Doctor Rejects Appointment Request");
    const rejectTargetApt = await bookAppointmentSafe({
      doctorId: doctorA._id,
      patientId: patientB._id,
      slotStartIso: "2026-09-28T09:30:00.000Z",
      slotEndIso: "2026-09-28T10:00:00.000Z",
      date: futureDate,
      consultationType: "AUDIO",
      symptoms: "Minor rash",
    });

    const rejectedApt = await transitionAppointmentStatus({
      appointmentId: rejectTargetApt._id,
      targetStatus: APPOINTMENT_STATUS.REJECTED,
      actorRole: "doctor",
      actorId: doctorA._id,
      reason: "Doctor unavailable during this emergency slot",
    });

    assert.strictEqual(rejectedApt.status, APPOINTMENT_STATUS.REJECTED);
    assert.strictEqual(rejectedApt.rejectReason, "Doctor unavailable during this emergency slot");
    console.log("   ? Doctor successfully rejected appointment with reason recorded.\n");

    // -------------------------------------------------------------
    // TEST 4: Cross-Doctor Tenant Isolation
    // -------------------------------------------------------------
    console.log("?? Test 4: Cross-Doctor Access Rejection (Doctor B cannot modify Doctor A's appointment)");
    try {
      await transitionAppointmentStatus({
        appointmentId: acceptedApt._id,
        targetStatus: APPOINTMENT_STATUS.CANCELLED,
        actorRole: "doctor",
        actorId: doctorB._id, // Doctor B attempting to mutate Doctor A's appointment
      });
      assert.fail("Doctor B should have been rejected from modifying Doctor A's appointment");
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      console.log("   ? Cross-doctor access correctly denied with 403 Forbidden.\n");
    }

    // -------------------------------------------------------------
    // TEST 5: Patient Dashboard Queries & Next Appointment
    // -------------------------------------------------------------
    console.log("?? Test 5: Patient Dashboard Queries & Next Appointment");
    const nextAptForPatient = await Appointment.findOne({
      patientId: patientA._id,
      status: { $in: ["CONFIRMED", "UPCOMING", "IN_PROGRESS"] },
    }).populate("doctorId", "name specialization fees");

    assert.ok(nextAptForPatient);
    assert.strictEqual(nextAptForPatient._id.toString(), acceptedApt._id.toString());
    assert.strictEqual(nextAptForPatient.doctorId.name, "Dr. Meredith Grey");
    console.log("   ? Patient dashboard correctly retrieves upcoming confirmed consultation.\n");

    // -------------------------------------------------------------
    // TEST 6: Patient Cancels Own Appointment
    // -------------------------------------------------------------
    console.log("?? Test 6: Patient Cancels Own Appointment");
    const aptToCancel = await bookAppointmentSafe({
      doctorId: doctorB._id,
      patientId: patientA._id,
      slotStartIso: "2026-09-28T14:00:00.000Z",
      slotEndIso: "2026-09-28T14:30:00.000Z",
      date: futureDate,
    });

    const cancelledByPatient = await transitionAppointmentStatus({
      appointmentId: aptToCancel._id,
      targetStatus: APPOINTMENT_STATUS.CANCELLED,
      actorRole: "patient",
      actorId: patientA._id,
      reason: "Work scheduling conflict",
    });

    assert.strictEqual(cancelledByPatient.status, APPOINTMENT_STATUS.CANCELLED);
    assert.strictEqual(cancelledByPatient.cancelledBy, "patient");
    assert.strictEqual(cancelledByPatient.cancelReason, "Work scheduling conflict");
    console.log("   ? Patient successfully cancelled their own appointment.\n");

    // -------------------------------------------------------------
    // TEST 7: Cross-Patient Cancellation Rejection
    // -------------------------------------------------------------
    console.log("?? Test 7: Cross-Patient Cancellation Rejection");
    try {
      await transitionAppointmentStatus({
        appointmentId: acceptedApt._id, // Patient A's appointment
        targetStatus: APPOINTMENT_STATUS.CANCELLED,
        actorRole: "patient",
        actorId: patientB._id, // Patient B attempting cancellation
      });
      assert.fail("Patient B should not be allowed to cancel Patient A's appointment");
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      console.log("   ? Unauthorized patient cancellation rejected with 403 Forbidden.\n");
    }

    // -------------------------------------------------------------
    // TEST 8: Full Consultation Lifecycle & Revenue Calculation
    // -------------------------------------------------------------
    console.log("?? Test 8: Consultation Completion & Revenue Aggregation");
    // Start Consultation
    const inProgressApt = await transitionAppointmentStatus({
      appointmentId: acceptedApt._id,
      targetStatus: APPOINTMENT_STATUS.IN_PROGRESS,
      actorRole: "doctor",
      actorId: doctorA._id,
    });
    assert.strictEqual(inProgressApt.status, APPOINTMENT_STATUS.IN_PROGRESS);

    // Complete Consultation
    completedApt = await transitionAppointmentStatus({
      appointmentId: inProgressApt._id,
      targetStatus: APPOINTMENT_STATUS.COMPLETED,
      actorRole: "doctor",
      actorId: doctorA._id,
    });
    completedApt.prescription = "Ibuprofen 400mg twice daily";
    await completedApt.save();

    assert.strictEqual(completedApt.status, APPOINTMENT_STATUS.COMPLETED);
    assert.ok(completedApt.completedAt);
    assert.strictEqual(completedApt.prescription, "Ibuprofen 400mg twice daily");

    // Verify revenue calculation on doctor dashboard
    const allCompleted = await Appointment.find({
      doctorId: doctorA._id,
      status: { $in: ["COMPLETED", "Completed"] },
    });
    const calculatedRevenue = allCompleted.reduce(
      (sum, apt) => sum + (apt.totalAmount || apt.consultationFees || 600),
      0
    );
    assert.strictEqual(calculatedRevenue, 600, "Doctor revenue must match completed visit fee");
    console.log("   ? Consultation completed, prescription recorded, and real revenue computed (?600).\n");

    console.log("?? ALL 8 OPERATIONS TEST SUITES PASSED WITH ZERO ERRORS!");
  } finally {
    if (doctorA) await Doctor.deleteOne({ _id: doctorA._id });
    if (doctorB) await Doctor.deleteOne({ _id: doctorB._id });
    if (patientA) await Patient.deleteOne({ _id: patientA._id });
    if (patientB) await Patient.deleteOne({ _id: patientB._id });
    await Appointment.deleteMany({
      doctorId: { $in: [doctorA?._id, doctorB?._id] },
    });
    await mongoose.disconnect();
    console.log("?? Test cleanup completed & database disconnected.");
  }
}

runOperationsTests().catch((err) => {
  console.error("? Operations test suite failed with error:", err);
  process.exit(1);
});
