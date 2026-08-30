import express from "express";
import { body } from "express-validator";
import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { computeAgeFromDob } from "../utils/date.js";
import validate from "../middleware/validate.js";

const router = express.Router();

// Get the profile of patient
router.get("/me", authenticate, requireRole("patient"), async (req, res) => {
  try {
    const doc = await Patient.findById(req.auth.id).select("-password -googleId");
    if (!doc) {
      return res.notFound("Patient profile not found");
    }
    res.ok(doc, "Profile fetched successfully");
  } catch (error) {
    res.serverError("Failed to fetch profile", [error.message]);
  }
});

// Update patient profile
router.put(
  "/onboarding/update",
  authenticate,
  requireRole("patient"),
  [
    body("name").optional().notEmpty(),
    body("phone").optional().isString(),
    body("dob").optional().isISO8601(),
    body("gender").optional().isIn(["male", "female", "other"]),
    body("bloodGroup").optional().isString(),
    body("emergencyContact").optional().isObject(),
    body("medicalHistory").optional().isObject(),
    body("profileImage").optional().isString(),
  ],
  validate,
  async (req, res) => {
    try {
      const allowedFields = [
        "name",
        "phone",
        "dob",
        "gender",
        "bloodGroup",
        "emergencyContact",
        "medicalHistory",
        "profileImage",
      ];

      const updatePayload = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updatePayload[field] = req.body[field];
        }
      }

      if (updatePayload.dob) {
        updatePayload.age = computeAgeFromDob(updatePayload.dob);
      }

      updatePayload.isVerified = true;

      const doc = await Patient.findByIdAndUpdate(req.auth.id, updatePayload, {
        new: true,
      }).select("-password -googleId");

      if (!doc) {
        return res.notFound("Patient not found");
      }

      res.ok(doc, "Patient profile updated successfully");
    } catch (error) {
      res.serverError("Update failed", [error.message]);
    }
  }
);

// Patient dashboard summary
router.get("/dashboard", authenticate, requireRole("patient"), async (req, res) => {
  try {
    const patientId = req.auth.id;
    const now = new Date();

    const activeStatuses = ["CONFIRMED", "UPCOMING", "IN_PROGRESS", "PENDING", "Scheduled"];

    // 1. Closest upcoming appointment (Next Consultation)
    const nextAppointment = await Appointment.findOne({
      patientId,
      status: { $in: activeStatuses },
      slotEndIso: { $gte: new Date(now.getTime() - 2 * 3600 * 1000).toISOString() }, // include active within 2 hrs
    })
      .populate("doctorId", "name specialization fees hospitalInfo profileImage")
      .sort({ slotStartIso: 1 });

    // 2. All upcoming appointments
    const upcomingAppointments = await Appointment.find({
      patientId,
      status: { $in: activeStatuses },
    })
      .populate("doctorId", "name specialization fees hospitalInfo profileImage")
      .sort({ slotStartIso: 1 })
      .limit(5);

    // 3. Recent completed appointments (History)
    const recentCompleted = await Appointment.find({
      patientId,
      status: { $in: ["COMPLETED", "Completed"] },
    })
      .populate("doctorId", "name specialization fees hospitalInfo profileImage")
      .sort({ completedAt: -1 })
      .limit(5);

    const totalCount = await Appointment.countDocuments({ patientId });
    const completedCount = await Appointment.countDocuments({
      patientId,
      status: { $in: ["COMPLETED", "Completed"] },
    });

    const dashboardData = {
      nextAppointment,
      upcomingAppointments,
      recentCompleted,
      stats: {
        upcomingCount: upcomingAppointments.length,
        completedCount,
        totalAppointments: totalCount,
      },
    };

    res.ok(dashboardData, "Patient dashboard data retrieved successfully");
  } catch (error) {
    console.error("Patient dashboard error:", error);
    res.serverError("Failed to fetch patient dashboard", [error.message]);
  }
});

export default router;
