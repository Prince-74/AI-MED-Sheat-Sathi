import express from "express";
import { param, body } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import Appointment, { APPOINTMENT_STATUS } from "../models/Appointment.js";
import { generateConsultationToken } from "../services/telehealth/zegoService.js";

const router = express.Router();

export function getEntityId(docOrId) {
  if (!docOrId) return null;
  if (typeof docOrId === "string") return docOrId;
  if (docOrId._id) return docOrId._id.toString();
  if (typeof docOrId.toString === "function") return docOrId.toString();
  return null;
}

/**
 * 1. Join Consultation & Generate Temporary Token
 * POST /api/telehealth/:appointmentId/join
 */
router.post(
  "/:appointmentId/join",
  authenticate,
  [param("appointmentId").isMongoId().withMessage("Valid appointment ID is required")],
  validate,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const userId = req.auth.id;

      const appointment = await Appointment.findById(appointmentId)
        .populate("doctorId", "name specialization hospitalInfo fees")
        .populate("patientId", "name email phone dob age");

      if (!appointment) {
        return res.notFound("Appointment not found", { code: "APPOINTMENT_NOT_FOUND" });
      }

      // 1. Participant Authorization Check (Handles populated objects and raw ObjectIds)
      const appointmentDoctorId = getEntityId(appointment.doctorId);
      const appointmentPatientId = getEntityId(appointment.patientId);

      const isPatient = appointmentPatientId === userId.toString();
      const isDoctor = appointmentDoctorId === userId.toString();

      if (!isPatient && !isDoctor) {
        return res.forbidden("Access denied. You are not an authorized participant in this consultation.", {
          code: "UNAUTHORIZED_CONSULTATION_ACCESS",
        });
      }

      // 2. State & Lifecycle Validations
      if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
        return res.badRequest("Cannot join a cancelled appointment.", { code: "APPOINTMENT_CANCELLED" });
      }

      if (appointment.status === APPOINTMENT_STATUS.REJECTED) {
        return res.badRequest("Cannot join a rejected appointment.", { code: "APPOINTMENT_REJECTED" });
      }

      if (appointment.status === APPOINTMENT_STATUS.COMPLETED) {
        return res.badRequest("This consultation has already concluded.", { code: "APPOINTMENT_COMPLETED" });
      }

      if (appointment.status === APPOINTMENT_STATUS.PENDING) {
        return res.badRequest("This appointment is pending confirmation/payment and cannot be joined yet.", {
          code: "APPOINTMENT_NOT_CONFIRMED",
        });
      }

      // 3. Join-Window Validation (Allow 15 min before start to 60 min after end, or if already IN_PROGRESS)
      if (appointment.status !== APPOINTMENT_STATUS.IN_PROGRESS && appointment.slotStartIso) {
        const now = Date.now();
        const startTime = new Date(appointment.slotStartIso).getTime();
        const endTime = appointment.slotEndIso
          ? new Date(appointment.slotEndIso).getTime()
          : startTime + 30 * 60000;

        const earlyOpenTime = startTime - 15 * 60000; // 15 mins before
        const lateCloseTime = endTime + 60 * 60000; // 60 mins after

        if (now < earlyOpenTime) {
          return res.badRequest("Consultation room opens 15 minutes before the scheduled appointment time.", {
            code: "CONSULTATION_TOO_EARLY",
          });
        }
        if (now > lateCloseTime) {
          return res.badRequest("The scheduled consultation time window has passed.", {
            code: "CONSULTATION_WINDOW_EXPIRED",
          });
        }
      }

      // 4. Generate Temporary Token
      const participantName = isDoctor
        ? `Dr. ${appointment.doctorId?.name || "Doctor"}`
        : appointment.patientId?.name || "Patient";

      const tokenData = generateConsultationToken({
        appointmentId: appointment._id,
        userId,
        userName: participantName,
        role: isDoctor ? "doctor" : "patient",
        roomId: appointment.zegoRoomId || `room_${appointment._id}`,
        expirationSeconds: 3600, // 1 hour
      });

      // 5. Broadcast socket event
      const io = req.app.get("io");
      if (io) {
        io.to(`appointment_${appointment._id}`).emit("participant_joined", {
          userId,
          role: isDoctor ? "doctor" : "patient",
          name: participantName,
          joinedAt: new Date().toISOString(),
          status: appointment.status,
        });
      }

      const consultationTypeNormalized =
        appointment.consultationType === "Voice Call" || appointment.consultationType === "AUDIO"
          ? "AUDIO"
          : "VIDEO";

      res.ok(
        {
          appId: tokenData.appId,
          token: tokenData.token,
          roomId: tokenData.roomId,
          userId: tokenData.userId,
          userName: tokenData.userName,
          role: tokenData.role,
          consultationType: consultationTypeNormalized,
          startedAt: appointment.startedAt || new Date().toISOString(),
          slotStartIso: appointment.slotStartIso,
          slotEndIso: appointment.slotEndIso,
          doctor: {
            id: appointment.doctorId?._id,
            name: appointment.doctorId?.name,
            specialization: appointment.doctorId?.specialization,
          },
          patient: {
            id: appointment.patientId?._id,
            name: appointment.patientId?.name,
          },
        },
        "Temporary consultation room token generated successfully"
      );
    } catch (error) {
      console.error("Telehealth join error:", error);
      res.serverError("Failed to join consultation room", [error.message]);
    }
  }
);

/**
 * 2. End Consultation
 * POST /api/telehealth/:appointmentId/end
 */
router.post(
  "/:appointmentId/end",
  authenticate,
  [param("appointmentId").isMongoId().withMessage("Valid appointment ID is required")],
  validate,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const { prescription, notes } = req.body;
      const userId = req.auth.id;

      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return res.notFound("Appointment not found");
      }

      // Participant check
      const isPatient = getEntityId(appointment.patientId) === userId.toString();
      const isDoctor = getEntityId(appointment.doctorId) === userId.toString();

      if (!isPatient && !isDoctor) {
        return res.forbidden("Access denied. You cannot end this consultation.", {
          code: "UNAUTHORIZED_CONSULTATION_ACCESS",
        });
      }

      appointment.status = APPOINTMENT_STATUS.COMPLETED;
      appointment.completedAt = new Date();

      if (prescription) appointment.prescription = prescription;
      if (notes) appointment.notes = notes;

      await appointment.save();

      const io = req.app.get("io");
      if (io) {
        io.to(`appointment_${appointment._id}`).emit("consultation_ended", {
          appointmentId: appointment._id,
          completedAt: appointment.completedAt,
        });
      }

      res.ok(appointment, "Consultation session successfully completed");
    } catch (error) {
      console.error("Telehealth end error:", error);
      res.serverError("Failed to complete consultation", [error.message]);
    }
  }
);

/**
 * 3. Get Consultation Live Status & Presence
 * GET /api/telehealth/:appointmentId/status
 */
router.get(
  "/:appointmentId/status",
  authenticate,
  [param("appointmentId").isMongoId().withMessage("Valid appointment ID is required")],
  validate,
  async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const userId = req.auth.id;

      const appointment = await Appointment.findById(appointmentId)
        .populate("doctorId", "name specialization")
        .populate("patientId", "name");

      if (!appointment) {
        return res.notFound("Appointment not found", { code: "APPOINTMENT_NOT_FOUND" });
      }

      const isPatient = getEntityId(appointment.patientId) === userId.toString();
      const isDoctor = getEntityId(appointment.doctorId) === userId.toString();

      if (!isPatient && !isDoctor) {
        return res.forbidden("Access denied to consultation status.", {
          code: "UNAUTHORIZED_CONSULTATION_ACCESS",
        });
      }

      res.ok({
        appointmentId: appointment._id,
        status: appointment.status,
        startedAt: appointment.startedAt,
        completedAt: appointment.completedAt,
        consultationType: appointment.consultationType,
        roomId: appointment.zegoRoomId,
      });
    } catch (error) {
      res.serverError("Failed to fetch consultation status", [error.message]);
    }
  }
);

export default router;
