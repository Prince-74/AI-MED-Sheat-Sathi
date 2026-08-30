import Payment, { PAYMENT_STATUS, PAYMENT_PROVIDER } from "../../models/Payment.js";
import Appointment, { APPOINTMENT_STATUS } from "../../models/Appointment.js";
import Doctor from "../../models/Doctor.js";
import { MockPaymentProvider } from "./MockPaymentProvider.js";

export const PAYMENT_ERROR_CODES = {
  PAYMENT_NOT_FOUND: "PAYMENT_NOT_FOUND",
  PAYMENT_ALREADY_COMPLETED: "PAYMENT_ALREADY_COMPLETED",
  PAYMENT_ALREADY_FAILED: "PAYMENT_ALREADY_FAILED",
  INVALID_PAYMENT_STATE: "INVALID_PAYMENT_STATE",
  PAYMENT_AMOUNT_MISMATCH: "PAYMENT_AMOUNT_MISMATCH",
  PAYMENT_CURRENCY_MISMATCH: "PAYMENT_CURRENCY_MISMATCH",
  PAYMENT_VERIFICATION_FAILED: "PAYMENT_VERIFICATION_FAILED",
  UNAUTHORIZED_PAYMENT_ACCESS: "UNAUTHORIZED_PAYMENT_ACCESS",
  APPOINTMENT_NOT_PAYABLE: "APPOINTMENT_NOT_PAYABLE",
  APPOINTMENT_NOT_FOUND: "APPOINTMENT_NOT_FOUND",
  APPOINTMENT_ALREADY_CONFIRMED: "APPOINTMENT_ALREADY_CONFIRMED",
};

export class PaymentServiceError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = "PaymentServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class PaymentService {
  constructor(provider = new MockPaymentProvider()) {
    this.provider = provider;
  }

  /**
   * Set active payment provider (Mock, Razorpay, etc.)
   */
  setProvider(provider) {
    this.provider = provider;
  }

  /**
   * Generates a unique receipt ID
   */
  generateReceiptId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `RCP-${timestamp}-${random}`;
  }

  /**
   * Create Payment Order
   * Validates appointment and derives authoritative price from backend doctor data.
   */
  async createPaymentOrder({ appointmentId, patientId }) {
    if (!appointmentId || !patientId) {
      throw new PaymentServiceError(
        PAYMENT_ERROR_CODES.APPOINTMENT_NOT_FOUND,
        "Appointment ID and Patient ID are required.",
        400
      );
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate("doctorId", "name specialization fees hospitalInfo")
      .populate("patientId", "name email phone");

    if (!appointment) {
      throw new PaymentServiceError(
        PAYMENT_ERROR_CODES.APPOINTMENT_NOT_FOUND,
        "Appointment not found.",
        404
      );
    }

    // Ownership check: only booking patient can create payment order
    if (appointment.patientId._id.toString() !== patientId.toString()) {
      throw new PaymentServiceError(
        PAYMENT_ERROR_CODES.UNAUTHORIZED_PAYMENT_ACCESS,
        "Access denied. You do not own this appointment.",
        403
      );
    }

    // Check if appointment is in payable state
    if (appointment.paymentStatus === "Paid") {
      throw new PaymentServiceError(
        PAYMENT_ERROR_CODES.PAYMENT_ALREADY_COMPLETED,
        "This appointment has already been paid for.",
        409
      );
    }

    if (appointment.status === APPOINTMENT_STATUS.CANCELLED || appointment.status === APPOINTMENT_STATUS.REJECTED) {
      throw new PaymentServiceError(
        PAYMENT_ERROR_CODES.APPOINTMENT_NOT_PAYABLE,
        `Cannot initiate payment for an appointment that is ${appointment.status}.`,
        400
      );
    }

    // Backend is the single source of truth for the payable amount
    const doctorFee = Number(appointment.doctorId?.fees ?? appointment.consultationFees ?? 0);
    const platformFee = Number(appointment.platformFees ?? 0);
    const authoritativeAmount = doctorFee + platformFee;

    // Check if an existing active payment order exists
    const existingPayment = await Payment.findOne({
      appointmentId,
      status: { $in: [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.PENDING] },
    });

    if (existingPayment) {
      return {
        orderId: existingPayment.providerOrderId,
        amount: existingPayment.amount,
        currency: existingPayment.currency,
        provider: existingPayment.provider,
        appointmentId: appointment._id,
        doctor: {
          name: appointment.doctorId?.name,
          specialization: appointment.doctorId?.specialization,
          fees: doctorFee,
        },
        slot: {
          slotStartIso: appointment.slotStartIso,
          slotEndIso: appointment.slotEndIso,
          consultationType: appointment.consultationType,
        },
      };
    }

    // Generate new order from provider
    const orderData = await this.provider.createOrder({
      amount: authoritativeAmount,
      currency: "INR",
      appointmentId: appointment._id,
      metadata: {
        patientId: appointment.patientId._id,
        doctorId: appointment.doctorId._id,
      },
    });

    const payment = new Payment({
      appointmentId: appointment._id,
      patientId: appointment.patientId._id,
      doctorId: appointment.doctorId._id,
      amount: authoritativeAmount,
      currency: "INR",
      status: PAYMENT_STATUS.PENDING,
      provider: this.provider.name,
      providerOrderId: orderData.providerOrderId,
      metadata: orderData.raw || {},
    });

    await payment.save();

    return {
      orderId: payment.providerOrderId,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      appointmentId: appointment._id,
      doctor: {
        name: appointment.doctorId?.name,
        specialization: appointment.doctorId?.specialization,
        fees: doctorFee,
      },
      slot: {
        slotStartIso: appointment.slotStartIso,
        slotEndIso: appointment.slotEndIso,
        consultationType: appointment.consultationType,
      },
    };
  }

  /**
   * Verify Payment Result
   * Idempotently processes payment result and confirms appointment.
   */
  async verifyPaymentResult({ providerOrderId, providerPaymentId, result = "SUCCESS", patientId, metadata = {} }) {
    if (!providerOrderId || !patientId) {
      throw new PaymentServiceError(
        PAYMENT_ERROR_CODES.PAYMENT_NOT_FOUND,
        "Order ID and Patient ID are required.",
        400
      );
    }

    const payment = await Payment.findOne({ providerOrderId });
    if (!payment) {
      throw new PaymentServiceError(
        PAYMENT_ERROR_CODES.PAYMENT_NOT_FOUND,
        "Payment record not found for this order.",
        404
      );
    }

    // Ownership check
    if (payment.patientId.toString() !== patientId.toString()) {
      throw new PaymentServiceError(
        PAYMENT_ERROR_CODES.UNAUTHORIZED_PAYMENT_ACCESS,
        "Access denied. You do not own this payment order.",
        403
      );
    }

    const appointment = await Appointment.findById(payment.appointmentId)
      .populate("doctorId", "name specialization fees hospitalInfo profileImage")
      .populate("patientId", "name email phone dob age");

    // Idempotency: If already paid, return existing success state safely
    if (payment.status === PAYMENT_STATUS.PAID) {
      return {
        success: true,
        alreadyProcessed: true,
        payment,
        appointment,
        receipt: this.buildReceiptPayload(payment, appointment),
      };
    }

    // Call provider verification
    const verification = await this.provider.verifyPayment({
      providerOrderId,
      providerPaymentId,
      result,
      metadata,
    });

    if (verification.verified && verification.status === "PAID") {
      // 1. Update Payment record to PAID
      payment.status = PAYMENT_STATUS.PAID;
      payment.providerPaymentId = verification.providerPaymentId;
      payment.paidAt = verification.paidAt || new Date();
      payment.receiptId = this.generateReceiptId();
      await payment.save();

      // 2. Update Appointment to CONFIRMED
      appointment.status = APPOINTMENT_STATUS.CONFIRMED;
      appointment.paymentStatus = "Paid";
      appointment.confirmedAt = new Date();
      await appointment.save();

      const receipt = this.buildReceiptPayload(payment, appointment);

      return {
        success: true,
        payment,
        appointment,
        receipt,
      };
    }

    if (verification.status === "CANCELLED") {
      payment.status = PAYMENT_STATUS.CANCELLED;
      payment.failureReason = verification.error || "Cancelled by patient";
      await payment.save();

      return {
        success: false,
        status: PAYMENT_STATUS.CANCELLED,
        payment,
        appointment,
        message: "Payment was cancelled. Appointment remains unconfirmed.",
      };
    }

    // Payment Failed
    payment.status = PAYMENT_STATUS.FAILED;
    payment.failureReason = verification.error || "Payment verification failed.";
    await payment.save();

    return {
      success: false,
      status: PAYMENT_STATUS.FAILED,
      payment,
      appointment,
      message: payment.failureReason,
    };
  }

  /**
   * Get Receipt Details with Authorization Check
   */
  async getReceipt({ paymentId, userId, userRole }) {
    const payment = await Payment.findById(paymentId)
      .populate("appointmentId")
      .populate("patientId", "name email phone")
      .populate("doctorId", "name specialization fees hospitalInfo");

    if (!payment) {
      throw new PaymentServiceError(
        PAYMENT_ERROR_CODES.PAYMENT_NOT_FOUND,
        "Payment receipt not found.",
        404
      );
    }

    // Only booking patient or assigned doctor may view the receipt
    const isPatient = payment.patientId._id.toString() === userId.toString();
    const isDoctor = payment.doctorId._id.toString() === userId.toString();

    if (!isPatient && !isDoctor) {
      throw new PaymentServiceError(
        PAYMENT_ERROR_CODES.UNAUTHORIZED_PAYMENT_ACCESS,
        "Access denied. You are not authorized to view this receipt.",
        403
      );
    }

    return this.buildReceiptPayload(payment, payment.appointmentId);
  }

  /**
   * Build clean receipt payload
   */
  buildReceiptPayload(payment, appointment) {
    return {
      receiptId: payment.receiptId || `RCP-${payment._id}`,
      paymentId: payment._id,
      orderId: payment.providerOrderId,
      providerPaymentId: payment.providerPaymentId || "MOCK_PAY_COMPLETED",
      amount: payment.amount,
      currency: payment.currency || "INR",
      status: payment.status,
      paidAt: payment.paidAt || payment.updatedAt,
      provider: payment.provider,
      patient: {
        id: appointment?.patientId?._id || payment.patientId,
        name: appointment?.patientId?.name || "Patient",
        email: appointment?.patientId?.email,
      },
      doctor: {
        id: appointment?.doctorId?._id || payment.doctorId,
        name: appointment?.doctorId?.name || "Doctor",
        specialization: appointment?.doctorId?.specialization,
        hospital: appointment?.doctorId?.hospitalInfo?.name,
      },
      appointment: {
        id: appointment?._id || payment.appointmentId,
        date: appointment?.dateString || (appointment?.date ? new Date(appointment.date).toISOString().slice(0, 10) : ""),
        slotStartIso: appointment?.slotStartIso,
        slotEndIso: appointment?.slotEndIso,
        consultationType: appointment?.consultationType || "Video Consultation",
        status: appointment?.status || "CONFIRMED",
      },
    };
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
