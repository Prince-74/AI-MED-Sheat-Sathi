import express from "express";
import { query, body, param } from "express-validator";
import { authenticate, requireRole } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import Appointment, { APPOINTMENT_STATUS } from "../models/Appointment.js";
import {
  generateDoctorAvailability,
  bookAppointmentSafe,
  transitionAppointmentStatus,
  AppointmentError,
} from "../services/appointmentEngine.js";

const router = express.Router();

// Helper to handle appointment engine errors uniformly
function handleEngineError(res, error, fallbackMessage = "Appointment operation failed") {
  if (error instanceof AppointmentError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      message: error.message,
    });
  }
  console.error("Appointment unexpected error:", error);
  return res.serverError(fallbackMessage, [error.message]);
}

/**
 * 1. Authoritative Backend Slot Availability
 * GET /api/appointment/availability/:doctorId?date=YYYY-MM-DD
 */
router.get(
  "/availability/:doctorId",
  [
    param("doctorId").isMongoId().withMessage("Valid doctor ID is required"),
    query("date").optional().isString(),
  ],
  validate,
  async (req, res) => {
    try {
      const { doctorId } = req.params;
      const dateString = req.query.date || new Date().toISOString().slice(0, 10);

      const availability = await generateDoctorAvailability({
        doctorId,
        dateString,
      });

      res.ok(availability, "Doctor availability retrieved successfully");
    } catch (error) {
      handleEngineError(res, error, "Failed to retrieve doctor availability");
    }
  }
);

/**
 * 2. Booked slots legacy endpoint for backward compatibility
 * GET /api/appointment/booked-slots/:doctorId/:date
 */
router.get("/booked-slots/:doctorId/:date", async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    const datePrefix = String(date).slice(0, 10);

    const bookedAppointments = await Appointment.find({
      doctorId,
      dateString: datePrefix,
      status: { $in: ["PENDING", "CONFIRMED", "UPCOMING", "IN_PROGRESS", "Scheduled"] },
    }).select("slotStartIso");

    const bookedSlots = bookedAppointments.map((apt) => apt.slotStartIso);
    res.ok(bookedSlots, "Booked slots retrieved");
  } catch (error) {
    handleEngineError(res, error, "Failed to fetch booked slots");
  }
});

/**
 * 3. Book Appointment (Concurrency-Safe, Auth-derived Patient)
 * POST /api/appointment/book
 */
router.post(
  "/book",
  authenticate,
  requireRole("patient"),
  [
    body("doctorId").isMongoId().withMessage("Valid doctor ID is required"),
    body("slotStartIso").notEmpty().withMessage("Valid start time (slotStartIso) is required"),
    body("slotEndIso").notEmpty().withMessage("Valid end time (slotEndIso) is required"),
    body("consultationType").optional().isString(),
    body("symptoms").optional().isString(),
    body("date").optional().isString(),
    body("consultationFees").optional().isNumeric(),
    body("platformFees").optional().isNumeric(),
    body("totalAmount").optional().isNumeric(),
  ],
  validate,
  async (req, res) => {
    try {
      const {
        doctorId,
        slotStartIso,
        slotEndIso,
        date,
        consultationType,
        symptoms,
        consultationFees,
        platformFees,
        totalAmount,
      } = req.body;

      // Patient identity comes directly from authenticated session
      const patientId = req.auth.id;

      const appointment = await bookAppointmentSafe({
        doctorId,
        patientId,
        slotStartIso,
        slotEndIso,
        date,
        consultationType,
        symptoms,
        consultationFees,
        platformFees,
        totalAmount,
      });

      // Broadcast real-time notification to doctor room
      const io = req.app.get("io");
      if (io) {
        io.to(`doctor_${doctorId}`).emit("appointment_created", appointment);
      }

      res.created({ appointment }, "Appointment booked successfully");
    } catch (error) {
      handleEngineError(res, error, "Failed to book appointment");
    }
  }
);

/**
 * 4. Doctor Appointment List (Authorized Doctor Only)
 * GET /api/appointment/doctor
 */
router.get(
  "/doctor",
  authenticate,
  requireRole("doctor"),
  [
    query("status").optional().customSanitizer((val) => (Array.isArray(val) ? val : [val])),
    query("date").optional().isString(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  async (req, res) => {
    try {
      const doctorId = req.auth.id;
      const { status, date, page = 1, limit = 50 } = req.query;

      const filter = { doctorId };

      if (status) {
        const statusArray = Array.isArray(status) ? status : [status];
        // Support legacy 'Scheduled' when filtering for CONFIRMED
        if (statusArray.includes("CONFIRMED") && !statusArray.includes("Scheduled")) {
          statusArray.push("Scheduled");
        }
        filter.status = { $in: statusArray };
      }

      if (date) {
        filter.dateString = String(date).slice(0, 10);
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [appointments, total] = await Promise.all([
        Appointment.find(filter)
          .populate("patientId", "name email phone dob age profileImage")
          .populate("doctorId", "name fees phone specialization profileImage hospitalInfo")
          .sort({ slotStartIso: 1 })
          .skip(skip)
          .limit(Number(limit)),
        Appointment.countDocuments(filter),
      ]);

      res.ok(appointments, "Doctor appointments fetched successfully", {
        page: Number(page),
        limit: Number(limit),
        total,
      });
    } catch (error) {
      handleEngineError(res, error, "Failed to fetch doctor appointments");
    }
  }
);

/**
 * 5. Patient Appointment List (Authorized Patient Only)
 * GET /api/appointment/patient
 */
router.get(
  "/patient",
  authenticate,
  requireRole("patient"),
  [
    query("status").optional().customSanitizer((val) => (Array.isArray(val) ? val : [val])),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  async (req, res) => {
    try {
      const patientId = req.auth.id;
      const { status, page = 1, limit = 50 } = req.query;

      const filter = { patientId };

      if (status) {
        const statusArray = Array.isArray(status) ? status : [status];
        if (statusArray.includes("CONFIRMED") && !statusArray.includes("Scheduled")) {
          statusArray.push("Scheduled");
        }
        filter.status = { $in: statusArray };
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [appointments, total] = await Promise.all([
        Appointment.find(filter)
          .populate("doctorId", "name fees phone specialization hospitalInfo profileImage")
          .populate("patientId", "name email profileImage")
          .sort({ slotStartIso: -1 })
          .skip(skip)
          .limit(Number(limit)),
        Appointment.countDocuments(filter),
      ]);

      res.ok(appointments, "Patient appointments fetched successfully", {
        page: Number(page),
        limit: Number(limit),
        total,
      });
    } catch (error) {
      handleEngineError(res, error, "Failed to fetch patient appointments");
    }
  }
);

/**
 * 6. Doctor Accept Appointment (PENDING -> CONFIRMED)
 * PUT /api/appointment/:id/accept
 */
router.put(
  "/:id/accept",
  authenticate,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const appointment = await transitionAppointmentStatus({
        appointmentId: req.params.id,
        targetStatus: APPOINTMENT_STATUS.CONFIRMED,
        actorRole: "doctor",
        actorId: req.auth.id,
      });

      const io = req.app.get("io");
      if (io) {
        io.to(`appointment_${appointment._id}`).emit("status_updated", { status: APPOINTMENT_STATUS.CONFIRMED });
      }

      res.ok(appointment, "Appointment confirmed successfully");
    } catch (error) {
      handleEngineError(res, error, "Failed to accept appointment");
    }
  }
);

/**
 * 7. Doctor Reject Appointment (PENDING -> REJECTED)
 * PUT /api/appointment/:id/reject
 */
router.put(
  "/:id/reject",
  authenticate,
  requireRole("doctor"),
  [body("reason").optional().isString()],
  validate,
  async (req, res) => {
    try {
      const { reason } = req.body;
      const appointment = await transitionAppointmentStatus({
        appointmentId: req.params.id,
        targetStatus: APPOINTMENT_STATUS.REJECTED,
        actorRole: "doctor",
        actorId: req.auth.id,
        reason,
      });

      const io = req.app.get("io");
      if (io) {
        io.to(`appointment_${appointment._id}`).emit("status_updated", { status: APPOINTMENT_STATUS.REJECTED, reason });
      }

      res.ok(appointment, "Appointment rejected");
    } catch (error) {
      handleEngineError(res, error, "Failed to reject appointment");
    }
  }
);

/**
 * 8. Cancel Appointment (Patient or Doctor)
 * PUT /api/appointment/:id/cancel
 */
router.put(
  "/:id/cancel",
  authenticate,
  [body("reason").optional().isString()],
  validate,
  async (req, res) => {
    try {
      const { reason } = req.body;
      const appointment = await transitionAppointmentStatus({
        appointmentId: req.params.id,
        targetStatus: APPOINTMENT_STATUS.CANCELLED,
        actorRole: req.auth.type,
        actorId: req.auth.id,
        reason,
      });

      const io = req.app.get("io");
      if (io) {
        io.to(`appointment_${appointment._id}`).emit("status_updated", { status: APPOINTMENT_STATUS.CANCELLED, reason });
      }

      res.ok(appointment, "Appointment cancelled successfully");
    } catch (error) {
      handleEngineError(res, error, "Failed to cancel appointment");
    }
  }
);

/**
 * 9. Update Status (Controlled State Machine)
 * PUT /api/appointment/status/:id
 */
router.put(
  "/status/:id",
  authenticate,
  [body("status").notEmpty().withMessage("Target status is required")],
  validate,
  async (req, res) => {
    try {
      const { status, reason } = req.body;
      const appointment = await transitionAppointmentStatus({
        appointmentId: req.params.id,
        targetStatus: status,
        actorRole: req.auth.type,
        actorId: req.auth.id,
        reason,
      });

      const io = req.app.get("io");
      if (io) {
        io.to(`appointment_${appointment._id}`).emit("status_updated", { status });
      }

      res.ok(appointment, "Appointment status updated successfully");
    } catch (error) {
      handleEngineError(res, error, "Failed to update appointment status");
    }
  }
);

/**
 * 10. Join Consultation Room
 * GET /api/appointment/join/:id
 */
router.get("/join/:id", authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patientId", "name email profileImage")
      .populate("doctorId", "name specialization profileImage fees");

    if (!appointment) {
      return res.notFound("Appointment not found");
    }

    const userId = req.auth.id.toString();
    const isParticipant =
      appointment.patientId?._id?.toString() === userId ||
      appointment.doctorId?._id?.toString() === userId;

    if (!isParticipant) {
      return res.forbidden("Access denied. You are not a participant in this consultation.");
    }

    if (appointment.status === "Scheduled" || appointment.status === APPOINTMENT_STATUS.CONFIRMED || appointment.status === APPOINTMENT_STATUS.UPCOMING) {
      appointment.status = APPOINTMENT_STATUS.IN_PROGRESS;
      appointment.startedAt = new Date();
      await appointment.save();
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`appointment_${appointment._id}`).emit("call_status", { status: APPOINTMENT_STATUS.IN_PROGRESS });
    }

    res.ok(
      { roomId: appointment.zegoRoomId, appointment },
      "Consultation joined successfully"
    );
  } catch (error) {
    handleEngineError(res, error, "Failed to join consultation");
  }
});

/**
 * 11. End Consultation
 * PUT /api/appointment/end/:id
 */
router.put("/end/:id", authenticate, async (req, res) => {
  try {
    const { prescription, notes } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.notFound("Appointment not found");
    }

    const userId = req.auth.id.toString();
    const isParticipant =
      appointment.patientId?.toString() === userId ||
      appointment.doctorId?.toString() === userId;

    if (!isParticipant) {
      return res.forbidden("Access denied");
    }

    appointment.status = APPOINTMENT_STATUS.COMPLETED;
    appointment.completedAt = new Date();
    if (prescription) appointment.prescription = prescription;
    if (notes) appointment.notes = notes;
    await appointment.save();

    await appointment.populate("patientId doctorId");

    const io = req.app.get("io");
    if (io) {
      io.to(`appointment_${appointment._id}`).emit("call_status", {
        status: APPOINTMENT_STATUS.COMPLETED,
        prescription,
        notes,
      });
    }

    res.ok(appointment, "Consultation completed successfully");
  } catch (error) {
    handleEngineError(res, error, "Failed to end consultation");
  }
});

/**
 * 12. Get Single Appointment by ID (Strict Participant Isolation)
 * GET /api/appointment/:id
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patientId", "name email phone dob age profileImage")
      .populate("doctorId", "name fees phone specialization hospitalInfo profileImage");

    if (!appointment) {
      return res.notFound("Appointment not found");
    }

    const userId = req.auth.id.toString();
    const isDoctor = appointment.doctorId?._id?.toString() === userId;
    const isPatient = appointment.patientId?._id?.toString() === userId;

    if (!isDoctor && !isPatient) {
      return res.forbidden("Access denied. You are not authorized to view this appointment.");
    }

    res.ok({ appointment }, "Appointment fetched successfully");
  } catch (error) {
    handleEngineError(res, error, "Failed to get appointment");
  }
});

export default router;
