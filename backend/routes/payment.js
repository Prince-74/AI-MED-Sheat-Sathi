import express from "express";
import { body, param } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import {
  paymentService,
  PaymentServiceError,
} from "../services/payment/PaymentService.js";
import Payment from "../models/Payment.js";

const router = express.Router();

function handlePaymentError(res, error, fallbackMessage = "Payment operation failed") {
  if (error instanceof PaymentServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      message: error.message,
    });
  }
  console.error("Payment error:", error);
  return res.serverError(fallbackMessage, [error.message]);
}

/**
 * 1. Create Payment Order
 * POST /api/payment/create-order
 */
router.post(
  "/create-order",
  authenticate,
  [body("appointmentId").isMongoId().withMessage("Valid appointment ID is required")],
  validate,
  async (req, res) => {
    try {
      const { appointmentId } = req.body;
      const patientId = req.auth.id;

      const orderData = await paymentService.createPaymentOrder({
        appointmentId,
        patientId,
      });

      res.created(orderData, "Payment order created successfully");
    } catch (error) {
      handlePaymentError(res, error, "Failed to create payment order");
    }
  }
);

/**
 * 2. Verify Payment Result (Idempotent)
 * POST /api/payment/verify
 */
router.post(
  "/verify",
  authenticate,
  [
    body("orderId").notEmpty().withMessage("Order ID is required"),
    body("result").optional().isIn(["SUCCESS", "FAILURE", "CANCEL", "CANCELLED"]),
    body("providerPaymentId").optional().isString(),
  ],
  validate,
  async (req, res) => {
    try {
      const { orderId, providerPaymentId, result = "SUCCESS", metadata } = req.body;
      const patientId = req.auth.id;

      const verification = await paymentService.verifyPaymentResult({
        providerOrderId: orderId,
        providerPaymentId,
        result,
        patientId,
        metadata,
      });

      if (verification.success) {
        // Broadcast real-time event to socket rooms if available
        const io = req.app.get("io");
        if (io) {
          io.to(`doctor_${verification.appointment.doctorId._id}`).emit(
            "appointment_confirmed",
            verification.appointment
          );
          io.to(`appointment_${verification.appointment._id}`).emit(
            "payment_confirmed",
            verification.receipt
          );
        }

        return res.ok(verification, "Payment verified and appointment confirmed successfully");
      }

      // If simulated failure or cancellation
      return res.badRequest(verification.message || "Payment verification failed", verification);
    } catch (error) {
      handlePaymentError(res, error, "Failed to verify payment");
    }
  }
);

/**
 * 3. Get Receipt by Payment ID
 * GET /api/payment/:id/receipt
 */
router.get(
  "/:id/receipt",
  authenticate,
  [param("id").isMongoId().withMessage("Valid payment ID is required")],
  validate,
  async (req, res) => {
    try {
      const paymentId = req.params.id;
      const userId = req.auth.id;
      const userRole = req.auth.type;

      const receipt = await paymentService.getReceipt({
        paymentId,
        userId,
        userRole,
      });

      res.ok(receipt, "Payment receipt retrieved successfully");
    } catch (error) {
      handlePaymentError(res, error, "Failed to retrieve receipt");
    }
  }
);

/**
 * 4. Get Payment by Appointment ID
 * GET /api/payment/appointment/:appointmentId
 */
router.get(
  "/appointment/:appointmentId",
  authenticate,
  [param("appointmentId").isMongoId().withMessage("Valid appointment ID is required")],
  validate,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const userId = req.auth.id;

      const payment = await Payment.findOne({ appointmentId })
        .populate("appointmentId")
        .populate("doctorId", "name specialization fees hospitalInfo")
        .populate("patientId", "name email");

      if (!payment) {
        return res.notFound("Payment record not found for this appointment");
      }

      // Ownership authorization check
      const isPatient = payment.patientId._id.toString() === userId.toString();
      const isDoctor = payment.doctorId._id.toString() === userId.toString();

      if (!isPatient && !isDoctor) {
        return res.forbidden("Access denied to this payment record");
      }

      res.ok(payment, "Payment record retrieved successfully");
    } catch (error) {
      handlePaymentError(res, error, "Failed to retrieve payment");
    }
  }
);

export default router;
