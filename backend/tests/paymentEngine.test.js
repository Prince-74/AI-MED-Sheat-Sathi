import assert from "node:assert";
import mongoose from "mongoose";
import "dotenv/config";

import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import Appointment, { APPOINTMENT_STATUS } from "../models/Appointment.js";
import Payment, { PAYMENT_STATUS } from "../models/Payment.js";
import { bookAppointmentSafe } from "../services/appointmentEngine.js";
import {
  paymentService,
  PAYMENT_ERROR_CODES,
  PaymentServiceError,
} from "../services/payment/PaymentService.js";

async function runPaymentTests() {
  console.log("?? Starting Payment & Booking Confirmation Test Suite...\n");

  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/ai-med-test";

  await mongoose.connect(mongoUri);
  console.log("?? Connected to MongoDB for payment testing.\n");

  const testEmailPrefix = `test_payment_${Date.now()}`;
  let testDoctor;
  let testPatient1;
  let testPatient2;
  let testAppointment1;
  let testAppointment2;

  try {
    // 1. Setup Test Fixtures
    testDoctor = await Doctor.create({
      name: "Dr. Marcus Vance",
      email: `${testEmailPrefix}_doc@test.com`,
      specialization: "Neurologist",
      fees: 750, // Authoritative price
      slotDurationMinutes: 30,
      dailyTimeRanges: [{ start: "09:00", end: "12:00" }],
      isVerified: true,
      isActive: true,
    });

    testPatient1 = await Patient.create({
      name: "Emma Watson",
      email: `${testEmailPrefix}_p1@test.com`,
      dob: "1994-02-15",
    });

    testPatient2 = await Patient.create({
      name: "Liam Neeson",
      email: `${testEmailPrefix}_p2@test.com`,
      dob: "1988-11-03",
    });

    // -------------------------------------------------------------
    // TEST 1: Initial Booking Creates PENDING / Unconfirmed Appointment
    // -------------------------------------------------------------
    console.log("?? Test 1: Initial Booking Creates PENDING Appointment");
    const futureDate = "2026-09-20";
    testAppointment1 = await bookAppointmentSafe({
      doctorId: testDoctor._id,
      patientId: testPatient1._id,
      slotStartIso: "2026-09-20T09:00:00.000Z",
      slotEndIso: "2026-09-20T09:30:00.000Z",
      date: futureDate,
      consultationType: "VIDEO",
      symptoms: "Recurring migraines",
    });

    assert.ok(testAppointment1._id);
    assert.strictEqual(testAppointment1.status, APPOINTMENT_STATUS.PENDING, "Initial appointment must be PENDING");
    assert.strictEqual(testAppointment1.paymentStatus, "Pending", "Initial paymentStatus must be Pending");
    console.log("   ? Appointment created in PENDING state awaiting payment.\n");

    // -------------------------------------------------------------
    // TEST 2: Create Payment Order with Backend Price Authority
    // -------------------------------------------------------------
    console.log("?? Test 2: Payment Order Creation & Backend Price Authority");
    const orderData = await paymentService.createPaymentOrder({
      appointmentId: testAppointment1._id,
      patientId: testPatient1._id,
    });

    assert.ok(orderData.orderId.startsWith("MOCK_ORD_"));
    assert.strictEqual(orderData.amount, 750, "Amount must match doctor fee of 750");
    assert.strictEqual(orderData.currency, "INR");
    assert.strictEqual(orderData.provider, "MOCK");

    const savedPayment = await Payment.findOne({ providerOrderId: orderData.orderId });
    assert.ok(savedPayment);
    assert.strictEqual(savedPayment.status, PAYMENT_STATUS.PENDING);
    assert.strictEqual(savedPayment.amount, 750);
    console.log("   ? Payment order created with authoritative backend price (?750).\n");

    // -------------------------------------------------------------
    // TEST 3: Unauthorized Patient Cannot Initiate / Access Payment
    // -------------------------------------------------------------
    console.log("?? Test 3: Payment Ownership Authorization (Cross-Tenant Rejection)");
    try {
      await paymentService.createPaymentOrder({
        appointmentId: testAppointment1._id,
        patientId: testPatient2._id, // Patient 2 attempting for Patient 1's appointment
      });
      assert.fail("Should have rejected cross-patient payment initiation");
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert.strictEqual(err.code, PAYMENT_ERROR_CODES.UNAUTHORIZED_PAYMENT_ACCESS);
      console.log("   ? Cross-user payment attempt rejected with 403 Access Denied.\n");
    }

    // -------------------------------------------------------------
    // TEST 4: Successful Payment Verification Confirms Appointment & Generates Receipt
    // -------------------------------------------------------------
    console.log("?? Test 4: Payment Verification Success -> Appointment CONFIRMED & Receipt Generated");
    const verification = await paymentService.verifyPaymentResult({
      providerOrderId: orderData.orderId,
      result: "SUCCESS",
      patientId: testPatient1._id,
    });

    assert.strictEqual(verification.success, true);
    assert.strictEqual(verification.payment.status, PAYMENT_STATUS.PAID);
    assert.ok(verification.payment.receiptId.startsWith("RCP-"));
    assert.strictEqual(verification.appointment.status, APPOINTMENT_STATUS.CONFIRMED);
    assert.strictEqual(verification.appointment.paymentStatus, "Paid");
    assert.ok(verification.receipt);
    assert.strictEqual(verification.receipt.amount, 750);
    assert.strictEqual(verification.receipt.receiptId, verification.payment.receiptId);
    console.log("   ? Payment successfully marked PAID, Appointment transitioned to CONFIRMED, and Receipt generated.\n");

    // -------------------------------------------------------------
    // TEST 5: Verification Idempotency (Multiple Invocations Are Safe)
    // -------------------------------------------------------------
    console.log("?? Test 5: Payment Verification Idempotency");
    const repeatVerify = await paymentService.verifyPaymentResult({
      providerOrderId: orderData.orderId,
      result: "SUCCESS",
      patientId: testPatient1._id,
    });

    assert.strictEqual(repeatVerify.success, true);
    assert.strictEqual(repeatVerify.alreadyProcessed, true);
    assert.strictEqual(repeatVerify.payment.status, PAYMENT_STATUS.PAID);
    assert.strictEqual(repeatVerify.receipt.receiptId, verification.payment.receiptId);

    const paymentCount = await Payment.countDocuments({ providerOrderId: orderData.orderId });
    assert.strictEqual(paymentCount, 1, "Must not create duplicate payment records");
    console.log("   ? Repeated verification is completely idempotent and safe.\n");

    // -------------------------------------------------------------
    // TEST 6: Simulated Payment Failure Leaves Appointment Unconfirmed
    // -------------------------------------------------------------
    console.log("?? Test 6: Simulated Payment Failure UX & State Safety");
    testAppointment2 = await bookAppointmentSafe({
      doctorId: testDoctor._id,
      patientId: testPatient1._id,
      slotStartIso: "2026-09-20T09:30:00.000Z",
      slotEndIso: "2026-09-20T10:00:00.000Z",
      date: futureDate,
    });

    const order2 = await paymentService.createPaymentOrder({
      appointmentId: testAppointment2._id,
      patientId: testPatient1._id,
    });

    const failureResult = await paymentService.verifyPaymentResult({
      providerOrderId: order2.orderId,
      result: "FAILURE",
      patientId: testPatient1._id,
      metadata: { failureReason: "Card declined by issuing bank" },
    });

    assert.strictEqual(failureResult.success, false);
    assert.strictEqual(failureResult.status, PAYMENT_STATUS.FAILED);

    const checkApt2 = await Appointment.findById(testAppointment2._id);
    assert.strictEqual(checkApt2.status, APPOINTMENT_STATUS.PENDING, "Failed payment must NOT confirm appointment");
    assert.strictEqual(checkApt2.paymentStatus, "Pending");
    console.log("   ? Failed payment leaves appointment unconfirmed in PENDING state.\n");

    // -------------------------------------------------------------
    // TEST 7: Payment Cancellation
    // -------------------------------------------------------------
    console.log("?? Test 7: Payment Cancellation by Patient");
    const order3 = await paymentService.createPaymentOrder({
      appointmentId: testAppointment2._id,
      patientId: testPatient1._id,
    });

    const cancelResult = await paymentService.verifyPaymentResult({
      providerOrderId: order3.orderId,
      result: "CANCEL",
      patientId: testPatient1._id,
    });

    assert.strictEqual(cancelResult.success, false);
    assert.strictEqual(cancelResult.status, PAYMENT_STATUS.CANCELLED);
    console.log("   ? Payment cancellation recorded without confirming appointment.\n");

    // -------------------------------------------------------------
    // TEST 8: Receipt Authorization & Security
    // -------------------------------------------------------------
    console.log("?? Test 8: Receipt Access Control");
    // Authorized Patient
    const patientReceipt = await paymentService.getReceipt({
      paymentId: verification.payment._id,
      userId: testPatient1._id,
      userRole: "patient",
    });
    assert.strictEqual(patientReceipt.receiptId, verification.receipt.receiptId);
    console.log("   ? Authorized booking patient can access receipt.");

    // Authorized Doctor
    const doctorReceipt = await paymentService.getReceipt({
      paymentId: verification.payment._id,
      userId: testDoctor._id,
      userRole: "doctor",
    });
    assert.strictEqual(doctorReceipt.receiptId, verification.receipt.receiptId);
    console.log("   ? Assigned doctor can access receipt.");

    // Unauthorized Third-Party Patient
    try {
      await paymentService.getReceipt({
        paymentId: verification.payment._id,
        userId: testPatient2._id,
        userRole: "patient",
      });
      assert.fail("Third-party patient should not be allowed to view receipt");
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      console.log("   ? Unauthorized user denied receipt access (403).\n");
    }

    console.log("?? ALL 8 PAYMENT TEST SUITES PASSED WITH ZERO ERRORS!");
  } finally {
    if (testDoctor) await Doctor.deleteOne({ _id: testDoctor._id });
    if (testPatient1) await Patient.deleteOne({ _id: testPatient1._id });
    if (testPatient2) await Patient.deleteOne({ _id: testPatient2._id });
    if (testAppointment1) await Appointment.deleteOne({ _id: testAppointment1._id });
    if (testAppointment2) await Appointment.deleteOne({ _id: testAppointment2._id });
    await Payment.deleteMany({ patientId: { $in: [testPatient1?._id, testPatient2?._id] } });
    await mongoose.disconnect();
    console.log("?? Test cleanup completed & database disconnected.");
  }
}

runPaymentTests().catch((err) => {
  console.error("? Payment test suite failed with error:", err);
  process.exit(1);
});
