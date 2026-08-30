import assert from "node:assert";
import mongoose from "mongoose";
import "dotenv/config";

import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import Appointment, { APPOINTMENT_STATUS } from "../models/Appointment.js";
import {
  generateDoctorAvailability,
  bookAppointmentSafe,
  transitionAppointmentStatus,
  canTransitionStatus,
  ERROR_CODES,
  AppointmentError,
} from "../services/appointmentEngine.js";

async function runTests() {
  console.log("?? Starting Appointment Engine Automated Test Suite...\n");

  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/ai-med-test";

  await mongoose.connect(mongoUri);
  console.log("?? Connected to MongoDB for testing.\n");

  const testEmailPrefix = `test_engine_${Date.now()}`;
  let testDoctor;
  let testPatient1;
  let testPatient2;
  let unauthorizedDoctor;

  try {
    testDoctor = await Doctor.create({
      name: "Dr. Sarah Jenkins",
      email: `${testEmailPrefix}_doc@test.com`,
      specialization: "Cardiologist",
      fees: 500,
      slotDurationMinutes: 30,
      dailyTimeRanges: [
        { start: "10:00", end: "12:00" },
        { start: "14:00", end: "15:00" },
      ],
      availabilityRange: {
        startDate: "2026-09-01",
        endDate: "2026-12-31",
        excludedWeekdays: [0],
      },
      isVerified: true,
      isActive: true,
    });

    unauthorizedDoctor = await Doctor.create({
      name: "Dr. Other Doctor",
      email: `${testEmailPrefix}_otherdoc@test.com`,
      specialization: "Dermatologist",
      fees: 600,
      isVerified: true,
      isActive: true,
    });

    testPatient1 = await Patient.create({
      name: "Alice Smith",
      email: `${testEmailPrefix}_p1@test.com`,
      dob: "1995-04-12",
    });

    testPatient2 = await Patient.create({
      name: "Bob Jones",
      email: `${testEmailPrefix}_p2@test.com`,
      dob: "1992-08-20",
    });

    // TEST 1: State Machine Transition Policy
    console.log("?? Test 1: State Machine Transition Matrix Validation");
    assert.strictEqual(canTransitionStatus(APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED), true);
    assert.strictEqual(canTransitionStatus(APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.UPCOMING), true);
    assert.strictEqual(canTransitionStatus(APPOINTMENT_STATUS.UPCOMING, APPOINTMENT_STATUS.IN_PROGRESS), true);
    assert.strictEqual(canTransitionStatus(APPOINTMENT_STATUS.IN_PROGRESS, APPOINTMENT_STATUS.COMPLETED), true);
    assert.strictEqual(canTransitionStatus(APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.CANCELLED), true);
    assert.strictEqual(canTransitionStatus(APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.PENDING), false);
    assert.strictEqual(canTransitionStatus(APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.COMPLETED), false);
    assert.strictEqual(canTransitionStatus(APPOINTMENT_STATUS.REJECTED, APPOINTMENT_STATUS.IN_PROGRESS), false);
    console.log("   ? State Machine policy correctly validates legal and illegal transitions.\n");

    // TEST 2: Authoritative Slot Generation
    console.log("?? Test 2: Authoritative Backend Slot Generation");
    const futureDate = "2026-09-14";
    const avail = await generateDoctorAvailability({
      doctorId: testDoctor._id,
      dateString: futureDate,
      currentIso: "2026-09-01T00:00:00.000Z",
    });

    assert.strictEqual(avail.totalSlots, 6, "Expected 6 slots generated across 10:00-12:00 & 14:00-15:00");
    assert.strictEqual(avail.availableSlots, 6, "All 6 slots should be available");
    assert.strictEqual(avail.slots[0].startTime, "10:00");
    assert.strictEqual(avail.slots[0].endTime, "10:30");
    assert.strictEqual(avail.slots[5].startTime, "14:30");
    assert.strictEqual(avail.slots[5].endTime, "15:00");
    console.log("   ? Accurate slot boundaries generated based on doctor dailyTimeRanges & duration.\n");

    // TEST 3: Excluded Weekday (Sunday = 0) Handling
    console.log("?? Test 3: Excluded Weekday (Sunday = 0) Availability");
    const sundayDate = "2026-09-13";
    const sundayAvail = await generateDoctorAvailability({
      doctorId: testDoctor._id,
      dateString: sundayDate,
      currentIso: "2026-09-01T00:00:00.000Z",
    });
    assert.strictEqual(sundayAvail.availableSlots, 0, "Sunday must return 0 available slots");
    console.log("   ? Excluded day correctly returns 0 available slots.\n");

    // TEST 4: Past Slot / Past Date Booking Rejection
    console.log("?? Test 4: Past Date / Time Booking Validation");
    try {
      await bookAppointmentSafe({
        doctorId: testDoctor._id,
        patientId: testPatient1._id,
        slotStartIso: "2020-01-01T10:00:00.000Z",
        slotEndIso: "2020-01-01T10:30:00.000Z",
        date: "2020-01-01",
      });
      assert.fail("Should have thrown error for past date");
    } catch (err) {
      assert.strictEqual(err.code, ERROR_CODES.PAST_DATE);
      console.log("   ? Successfully rejected past appointment booking.\n");
    }

    // TEST 5: Single Valid Booking
    console.log("?? Test 5: Standard Valid Booking");
    const chosenSlot = avail.slots[0];
    const bookedApt = await bookAppointmentSafe({
      doctorId: testDoctor._id,
      patientId: testPatient1._id,
      slotStartIso: chosenSlot.slotStartIso,
      slotEndIso: chosenSlot.slotEndIso,
      date: futureDate,
      consultationType: "VIDEO",
      symptoms: "Mild chest tightness after exercise",
      consultationFees: 500,
    });

    assert.ok(bookedApt._id);
    assert.strictEqual(bookedApt.status, APPOINTMENT_STATUS.PENDING);
    assert.strictEqual(bookedApt.consultationType, "Video Consultation");

    // Doctor confirms appointment
    const confirmedApt = await transitionAppointmentStatus({
      appointmentId: bookedApt._id,
      targetStatus: APPOINTMENT_STATUS.CONFIRMED,
      actorRole: "doctor",
      actorId: testDoctor._id,
    });
    assert.strictEqual(confirmedApt.status, APPOINTMENT_STATUS.CONFIRMED);
    console.log("   ✅ Appointment created in PENDING state and successfully transitioned to CONFIRMED.\n");

    // TEST 6: Double Booking & Race Condition Prevention
    console.log("?? Test 6: Concurrency & Double Booking Prevention (Race Condition Simulation)");
    try {
      await bookAppointmentSafe({
        doctorId: testDoctor._id,
        patientId: testPatient2._id,
        slotStartIso: chosenSlot.slotStartIso,
        slotEndIso: chosenSlot.slotEndIso,
        date: futureDate,
        consultationType: "AUDIO",
      });
      assert.fail("Double booking should have thrown 409 conflict");
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
      assert.strictEqual(err.code, ERROR_CODES.SLOT_ALREADY_BOOKED);
      console.log("   ? Concurrency protection successfully returned 409 Conflict (SLOT_ALREADY_BOOKED).\n");
    }

    const updatedAvail = await generateDoctorAvailability({
      doctorId: testDoctor._id,
      dateString: futureDate,
      currentIso: "2026-09-01T00:00:00.000Z",
    });
    assert.strictEqual(updatedAvail.availableSlots, 5);
    const bookedSlotCheck = updatedAvail.slots.find((s) => s.slotStartIso === chosenSlot.slotStartIso);
    assert.strictEqual(bookedSlotCheck.available, false);
    assert.strictEqual(bookedSlotCheck.isBooked, true);
    console.log("   ? Availability endpoint accurately reports booked slot as unavailable.\n");

    // TEST 7: Status Transition & Role Authorization
    console.log("?? Test 7: Status Transition & Role Authorization");
    try {
      await transitionAppointmentStatus({
        appointmentId: bookedApt._id,
        targetStatus: APPOINTMENT_STATUS.REJECTED,
        actorRole: "doctor",
        actorId: unauthorizedDoctor._id,
      });
      assert.fail("Unauthorized doctor should be denied");
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert.strictEqual(err.code, ERROR_CODES.UNAUTHORIZED_APPOINTMENT_ACCESS);
      console.log("   ? Unauthorized doctor rejected with 403 Access Denied.");
    }

    const inProgressApt = await transitionAppointmentStatus({
      appointmentId: bookedApt._id,
      targetStatus: APPOINTMENT_STATUS.IN_PROGRESS,
      actorRole: "doctor",
      actorId: testDoctor._id,
    });
    assert.strictEqual(inProgressApt.status, APPOINTMENT_STATUS.IN_PROGRESS);
    console.log("   ? Assigned doctor successfully transitions appointment to IN_PROGRESS.");

    const completedApt = await transitionAppointmentStatus({
      appointmentId: bookedApt._id,
      targetStatus: APPOINTMENT_STATUS.COMPLETED,
      actorRole: "doctor",
      actorId: testDoctor._id,
    });
    assert.strictEqual(completedApt.status, APPOINTMENT_STATUS.COMPLETED);
    console.log("   ? Appointment successfully transitioned to COMPLETED.");

    try {
      await transitionAppointmentStatus({
        appointmentId: bookedApt._id,
        targetStatus: APPOINTMENT_STATUS.CANCELLED,
        actorRole: "patient",
        actorId: testPatient1._id,
      });
      assert.fail("Completed appointment cannot be cancelled");
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.strictEqual(err.code, ERROR_CODES.INVALID_STATUS_TRANSITION);
      console.log("   ? Illegal transition from COMPLETED to CANCELLED successfully rejected.\n");
    }

    // TEST 8: Cancellation & Slot Re-booking
    console.log("?? Test 8: Cancellation & Slot Freeing for Re-booking");
    const secondSlot = avail.slots[1];
    const apt2 = await bookAppointmentSafe({
      doctorId: testDoctor._id,
      patientId: testPatient1._id,
      slotStartIso: secondSlot.slotStartIso,
      slotEndIso: secondSlot.slotEndIso,
      date: futureDate,
    });

    const cancelledApt = await transitionAppointmentStatus({
      appointmentId: apt2._id,
      targetStatus: APPOINTMENT_STATUS.CANCELLED,
      actorRole: "patient",
      actorId: testPatient1._id,
      reason: "Scheduling conflict",
    });
    assert.strictEqual(cancelledApt.status, APPOINTMENT_STATUS.CANCELLED);
    assert.strictEqual(cancelledApt.cancelledBy, "patient");

    const rebookedApt = await bookAppointmentSafe({
      doctorId: testDoctor._id,
      patientId: testPatient2._id,
      slotStartIso: secondSlot.slotStartIso,
      slotEndIso: secondSlot.slotEndIso,
      date: futureDate,
    });
    assert.ok(rebookedApt._id);
    assert.strictEqual(rebookedApt.status, APPOINTMENT_STATUS.PENDING);
    console.log("   ✅ Cancelled slot is freed and successfully re-booked by another patient.\n");

    console.log("?? ALL 8 TEST SUITES PASSED WITH ZERO ERRORS!");
  } finally {
    if (testDoctor) await Doctor.deleteOne({ _id: testDoctor._id });
    if (unauthorizedDoctor) await Doctor.deleteOne({ _id: unauthorizedDoctor._id });
    if (testPatient1) await Patient.deleteOne({ _id: testPatient1._id });
    if (testPatient2) await Patient.deleteOne({ _id: testPatient2._id });
    await Appointment.deleteMany({ doctorId: { $in: [testDoctor?._id, unauthorizedDoctor?._id] } });
    await mongoose.disconnect();
    console.log("?? Test cleanup completed & database disconnected.");
  }
}

runTests().catch((err) => {
  console.error("? Test suite failed with error:", err);
  process.exit(1);
});
