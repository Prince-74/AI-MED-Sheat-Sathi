import express from "express";
import { query, body } from "express-validator";
import validate from "../middleware/validate.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";

const router = express.Router();

router.get(
  "/list",
  [
    query("search").optional().isString(),
    query("specialization").optional().isString(),
    query("city").optional().isString(),
    query("category").optional().isString(),
    query("minFees").optional().isInt({ min: 0 }),
    query("maxFees").optional().isInt({ min: 0 }),
    query("sortBy").optional().isIn(["fees", "experience", "name", "createdAt"]),
    query("sortOrder").optional().isIn(["asc", "desc"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  async (req, res) => {
    try {
      const {
        search,
        specialization,
        city,
        category,
        minFees,
        maxFees,
        sortBy = "createdAt",
        sortOrder = "desc",
        page = 1,
        limit = 20,
      } = req.query;

      const filter = { isVerified: true };
      if (specialization) {
        filter.specialization = { $regex: `^${specialization}$`, $options: "i" };
      }
      if (city) {
        filter["hospitalInfo.city"] = { $regex: city, $options: "i" };
      }
      if (category) {
        filter.category = category;
      }

      if (minFees || maxFees) {
        filter.fees = {};
        if (minFees) filter.fees.$gte = Number(minFees);
        if (maxFees) filter.fees.$lte = Number(maxFees);
      }

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { specialization: { $regex: search, $options: "i" } },
          { "hospitalInfo.name": { $regex: search, $options: "i" } },
        ];
      }

      const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
      const skip = (Number(page) - 1) * Number(limit);

      const [items, total] = await Promise.all([
        Doctor.find(filter)
          .select("-password -googleId")
          .sort(sort)
          .skip(skip)
          .limit(Number(limit)),
        Doctor.countDocuments(filter),
      ]);

      res.ok(items, "Doctors fetched", {
        page: Number(page),
        limit: Number(limit),
        total,
      });
    } catch (error) {
      console.error("Doctor fetched failed", error);
      res.serverError("Doctor fetched failed", [error.message]);
    }
  }
);

// Profile of logged-in doctor
router.get("/me", authenticate, requireRole("doctor"), async (req, res) => {
  try {
    const doc = await Doctor.findById(req.auth.id).select("-password -googleId");
    if (!doc) {
      return res.notFound("Doctor not found");
    }
    res.ok(doc, "Profile fetched");
  } catch (error) {
    res.serverError("Failed to fetch profile", [error.message]);
  }
});

// Update doctor profile / onboarding & availability
router.put(
  "/onboarding/update",
  authenticate,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const allowedFields = [
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

      const updatePayload = {};
      const bodyData = req.body || {};

      // 1. Name & Text fields
      if (typeof bodyData.name === "string" && bodyData.name.trim()) {
        updatePayload.name = bodyData.name.trim();
      }
      if (typeof bodyData.specialization === "string" && bodyData.specialization.trim()) {
        updatePayload.specialization = bodyData.specialization.trim();
      }
      if (typeof bodyData.qualification === "string") {
        updatePayload.qualification = bodyData.qualification.trim();
      }
      if (typeof bodyData.about === "string") {
        updatePayload.about = bodyData.about.trim();
      }
      if (typeof bodyData.profileImage === "string") {
        updatePayload.profileImage = bodyData.profileImage.trim();
      }

      // 2. Category Handling (supports array or single string)
      if (Array.isArray(bodyData.category)) {
        updatePayload.category = bodyData.category.filter(Boolean);
      } else if (typeof bodyData.category === "string" && bodyData.category.trim()) {
        updatePayload.category = [bodyData.category.trim()];
      }

      // 3. Numeric fields (fees & experience)
      if (bodyData.fees !== undefined && bodyData.fees !== null && bodyData.fees !== "") {
        const parsedFees = Number(bodyData.fees);
        if (Number.isNaN(parsedFees) || parsedFees < 0) {
          return res.badRequest("Consultation fee must be a valid non-negative number");
        }
        updatePayload.fees = parsedFees;
      }

      if (bodyData.experience !== undefined && bodyData.experience !== null && bodyData.experience !== "") {
        const parsedExp = Number(bodyData.experience);
        if (Number.isNaN(parsedExp) || parsedExp < 0) {
          return res.badRequest("Experience must be a valid non-negative number");
        }
        updatePayload.experience = parsedExp;
      }

      // 4. Hospital Info
      if (bodyData.hospitalInfo && typeof bodyData.hospitalInfo === "object") {
        updatePayload.hospitalInfo = {
          name: String(bodyData.hospitalInfo.name || "").trim(),
          address: String(bodyData.hospitalInfo.address || "").trim(),
          city: String(bodyData.hospitalInfo.city || "").trim(),
        };
      }

      // 5. Availability Date Range
      if (bodyData.availabilityRange && typeof bodyData.availabilityRange === "object") {
        const { startDate, endDate, excludedWeekdays } = bodyData.availabilityRange;
        const rangeObj = {};

        if (startDate && String(startDate).trim()) {
          const s = new Date(startDate);
          if (!isNaN(s.getTime())) {
            rangeObj.startDate = s;
          }
        }
        if (endDate && String(endDate).trim()) {
          const e = new Date(endDate);
          if (!isNaN(e.getTime())) {
            rangeObj.endDate = e;
          }
        }
        if (Array.isArray(excludedWeekdays)) {
          rangeObj.excludedWeekdays = excludedWeekdays
            .map(Number)
            .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6);
        }

        if (rangeObj.startDate && rangeObj.endDate && rangeObj.endDate < rangeObj.startDate) {
          return res.badRequest("Availability end date cannot be earlier than start date");
        }

        updatePayload.availabilityRange = rangeObj;
      }

      // 6. Daily Working Hours & Time Ranges Validation
      if (Array.isArray(bodyData.dailyTimeRanges)) {
        const validatedRanges = [];
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

        for (const range of bodyData.dailyTimeRanges) {
          if (!range || !range.start || !range.end) continue;
          const start = String(range.start).trim();
          const end = String(range.end).trim();

          if (!timeRegex.test(start) || !timeRegex.test(end)) {
            return res.badRequest(`Invalid time format '${start}' or '${end}'. Expected HH:mm (24-hour format).`);
          }

          if (start >= end) {
            return res.badRequest(`Daily time range start '${start}' must be earlier than end '${end}'.`);
          }

          validatedRanges.push({ start, end });
        }
        updatePayload.dailyTimeRanges = validatedRanges;
      }

      // 7. Slot Duration Validation
      if (bodyData.slotDurationMinutes !== undefined && bodyData.slotDurationMinutes !== null) {
        const slotMins = Number(bodyData.slotDurationMinutes);
        if (Number.isNaN(slotMins) || slotMins < 10 || slotMins > 180) {
          return res.badRequest("Slot duration must be between 10 and 180 minutes");
        }
        updatePayload.slotDurationMinutes = slotMins;
      }

      const doc = await Doctor.findByIdAndUpdate(req.auth.id, updatePayload, {
        new: true,
        runValidators: true,
      }).select("-password -googleId");

      if (!doc) {
        return res.notFound("Doctor not found");
      }

      res.ok(doc, "Doctor profile and availability updated successfully");
    } catch (error) {
      console.error("Doctor profile update error:", error);
      res.serverError("Profile update failed", [error.message]);
    }
  }
);

// Doctor dashboard metrics
router.get("/dashboard", authenticate, requireRole("doctor"), async (req, res) => {
  try {
    const doctorId = req.auth.id;
    const now = new Date();

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const doctor = await Doctor.findById(doctorId).select("-password -googleId").lean();
    if (!doctor) {
      return res.notFound("Doctor not found");
    }

    const activeStatuses = ["CONFIRMED", "UPCOMING", "IN_PROGRESS", "Scheduled"];

    // 1. Pending appointment requests requiring doctor approval
    const pendingAppointments = await Appointment.find({
      doctorId,
      status: "PENDING",
    })
      .populate("patientId", "name profileImage age email phone dob")
      .sort({ slotStartIso: 1 });

    // 2. Today's confirmed/active appointments
    const todayAppointments = await Appointment.find({
      doctorId,
      slotStartIso: { $gte: startOfDay.toISOString(), $lte: endOfDay.toISOString() },
      status: { $in: activeStatuses },
    })
      .populate("patientId", "name profileImage age email phone dob")
      .populate("doctorId", "name fees profileImage specialization")
      .sort({ slotStartIso: 1 });

    // 3. Upcoming confirmed appointments beyond today
    const upcomingAppointments = await Appointment.find({
      doctorId,
      slotStartIso: { $gt: endOfDay.toISOString() },
      status: { $in: activeStatuses },
    })
      .populate("patientId", "name profileImage age email phone dob")
      .populate("doctorId", "name fees profileImage specialization")
      .sort({ slotStartIso: 1 })
      .limit(10);

    // 4. Completed consultations
    const completedAppointments = await Appointment.find({
      doctorId,
      status: { $in: ["COMPLETED", "Completed"] },
    })
      .populate("patientId", "name profileImage age email phone")
      .sort({ completedAt: -1 })
      .limit(10);

    const uniquePatientIds = await Appointment.distinct("patientId", { doctorId });
    const totalPatients = uniquePatientIds.length;

    const completedAppointmentCount = await Appointment.countDocuments({
      doctorId,
      status: { $in: ["COMPLETED", "Completed"] },
    });

    const allCompletedForRevenue = await Appointment.find({
      doctorId,
      status: { $in: ["COMPLETED", "Completed"] },
    }).select("consultationFees totalAmount");

    const totalRevenue = allCompletedForRevenue.reduce(
      (sum, apt) => sum + Number(apt.totalAmount ?? apt.consultationFees ?? doctor.fees ?? 0),
      0
    );

    const dashboardData = {
      user: {
        name: doctor.name,
        fees: doctor.fees,
        profileImage: doctor.profileImage,
        specialization: doctor.specialization,
        hospitalInfo: doctor.hospitalInfo,
        dailyTimeRanges: doctor.dailyTimeRanges,
        slotDurationMinutes: doctor.slotDurationMinutes,
      },
      stats: {
        totalPatients,
        todayAppointments: todayAppointments.length,
        pendingCount: pendingAppointments.length,
        totalRevenue,
        completedAppointments: completedAppointmentCount,
        averageRating: 4.9,
      },
      pendingAppointments,
      todayAppointments,
      upcomingAppointments,
      recentCompleted: completedAppointments,
      performance: {
        pateintSatisfaction: 4.9,
        completionRate: "99%",
        responseTime: "< 2min",
      },
    };

    res.ok(dashboardData, "Doctor dashboard data retrieved successfully");
  } catch (error) {
    console.error("Dashboard error:", error);
    res.serverError("Failed to fetch doctor dashboard", [error.message]);
  }
});

router.get("/:doctorId", async (req, res) => {
  try {
    const { doctorId } = req.params;
    const doctor = await Doctor.findById(doctorId).select("-password -googleId").lean();

    if (!doctor) {
      return res.notFound("Doctor not found");
    }
    res.ok(doctor, "Doctor details fetched successfully");
  } catch (error) {
    res.serverError("Fetching doctor failed", [error.message]);
  }
});

export default router;
