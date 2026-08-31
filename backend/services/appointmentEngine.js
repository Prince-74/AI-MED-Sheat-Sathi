import Appointment, { APPOINTMENT_STATUS } from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";

export const ERROR_CODES = {
  DOCTOR_NOT_FOUND: "DOCTOR_NOT_FOUND",
  PATIENT_NOT_FOUND: "PATIENT_NOT_FOUND",
  INVALID_DATE: "INVALID_DATE",
  PAST_DATE: "PAST_DATE",
  INVALID_TIME: "INVALID_TIME",
  OUTSIDE_AVAILABILITY: "OUTSIDE_AVAILABILITY",
  SLOT_ALREADY_BOOKED: "SLOT_ALREADY_BOOKED",
  INVALID_CONSULTATION_TYPE: "INVALID_CONSULTATION_TYPE",
  APPOINTMENT_NOT_FOUND: "APPOINTMENT_NOT_FOUND",
  UNAUTHORIZED_APPOINTMENT_ACCESS: "UNAUTHORIZED_APPOINTMENT_ACCESS",
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",
  APPOINTMENT_ALREADY_CANCELLED: "APPOINTMENT_ALREADY_CANCELLED",
  APPOINTMENT_ALREADY_COMPLETED: "APPOINTMENT_ALREADY_COMPLETED",
};

export class AppointmentError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = "AppointmentError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Canonical State Transition Policy
const ALLOWED_TRANSITIONS = {
  [APPOINTMENT_STATUS.PENDING]: [
    APPOINTMENT_STATUS.CONFIRMED,
    APPOINTMENT_STATUS.REJECTED,
    APPOINTMENT_STATUS.CANCELLED,
  ],
  [APPOINTMENT_STATUS.CONFIRMED]: [
    APPOINTMENT_STATUS.UPCOMING,
    APPOINTMENT_STATUS.IN_PROGRESS,
    APPOINTMENT_STATUS.CANCELLED,
  ],
  [APPOINTMENT_STATUS.UPCOMING]: [
    APPOINTMENT_STATUS.IN_PROGRESS,
    APPOINTMENT_STATUS.CANCELLED,
  ],
  [APPOINTMENT_STATUS.IN_PROGRESS]: [
    APPOINTMENT_STATUS.COMPLETED,
  ],
  [APPOINTMENT_STATUS.SCHEDULED]: [
    APPOINTMENT_STATUS.CONFIRMED,
    APPOINTMENT_STATUS.UPCOMING,
    APPOINTMENT_STATUS.IN_PROGRESS,
    APPOINTMENT_STATUS.COMPLETED,
    APPOINTMENT_STATUS.CANCELLED,
  ],
  // Terminal states allow no further transitions
  [APPOINTMENT_STATUS.COMPLETED]: [],
  [APPOINTMENT_STATUS.CANCELLED]: [],
  [APPOINTMENT_STATUS.REJECTED]: [],
};

/**
 * Validates if status transition is permissible.
 */
export function canTransitionStatus(currentStatus, targetStatus) {
  if (!currentStatus || !targetStatus) return false;
  if (currentStatus === targetStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

/**
 * Helper to normalize date string to YYYY-MM-DD
 */
export function normalizeDateString(dateInput) {
  if (!dateInput) return null;
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Normalizes consultation type to standard UI string
 */
export function normalizeConsultationType(type) {
  if (!type) return "Video Consultation";
  const normalized = String(type).trim().toUpperCase();
  if (normalized === "AUDIO" || normalized === "VOICE CALL") {
    return "Voice Call";
  }
  return "Video Consultation";
}

/**
 * Authoritative Backend Slot Generation
 * Calculates all potential time slots from doctor settings and checks for existing bookings.
 */
export async function generateDoctorAvailability({ doctorId, dateString, currentIso = new Date().toISOString() }) {
  const normalizedDate = normalizeDateString(dateString);
  if (!normalizedDate) {
    throw new AppointmentError(ERROR_CODES.INVALID_DATE, "Invalid date format. Expected YYYY-MM-DD.");
  }

  const doctor = await Doctor.findById(doctorId).select("-password -googleId").lean();
  if (!doctor || doctor.isActive === false) {
    throw new AppointmentError(ERROR_CODES.DOCTOR_NOT_FOUND, "Doctor not found or currently inactive.", 404);
  }

  const targetDate = new Date(`${normalizedDate}T00:00:00.000Z`);
  const dayOfWeek = targetDate.getUTCDay(); // 0 = Sun, 6 = Sat

  // Check availability date range if configured
  if (doctor.availabilityRange) {
    const { startDate, endDate, excludedWeekdays = [] } = doctor.availabilityRange;
    if (startDate && normalizedDate < startDate.slice(0, 10)) {
      return { date: normalizedDate, slotDuration: doctor.slotDurationMinutes || 30, totalSlots: 0, availableSlots: 0, slots: [] };
    }
    if (endDate && normalizedDate > endDate.slice(0, 10)) {
      return { date: normalizedDate, slotDuration: doctor.slotDurationMinutes || 30, totalSlots: 0, availableSlots: 0, slots: [] };
    }
    if (Array.isArray(excludedWeekdays) && excludedWeekdays.includes(dayOfWeek)) {
      return { date: normalizedDate, slotDuration: doctor.slotDurationMinutes || 30, totalSlots: 0, availableSlots: 0, slots: [] };
    }
  }

  const timeRanges = (doctor.dailyTimeRanges && doctor.dailyTimeRanges.length > 0)
    ? doctor.dailyTimeRanges
    : [
        { start: "09:00", end: "13:00" },
        { start: "14:00", end: "20:00" },
      ]; // Fallback standard working hours

  const slotMinutes = doctor.slotDurationMinutes || 30;

  // Retrieve existing non-cancelled bookings for this doctor on this date
  const activeBookings = await Appointment.find({
    doctorId,
    dateString: normalizedDate,
    status: { $in: ["PENDING", "CONFIRMED", "UPCOMING", "IN_PROGRESS", "Scheduled"] },
  }).select("slotStartIso slotEndIso status").lean();

  const bookedStartTimes = new Set(activeBookings.map((b) => b.slotStartIso));

  const allSlots = [];
  const nowTime = new Date(currentIso).getTime();

  for (const range of timeRanges) {
    if (!range.start || !range.end) continue;
    const [startH, startM] = range.start.split(":").map(Number);
    const [endH, endM] = range.end.split(":").map(Number);

    let cursor = new Date(Date.UTC(
      targetDate.getUTCFullYear(),
      targetDate.getUTCMonth(),
      targetDate.getUTCDate(),
      startH,
      startM,
      0,
      0
    ));

    const rangeEnd = new Date(Date.UTC(
      targetDate.getUTCFullYear(),
      targetDate.getUTCMonth(),
      targetDate.getUTCDate(),
      endH,
      endM,
      0,
      0
    ));

    while (cursor < rangeEnd) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + slotMinutes * 60000);

      if (slotEnd > rangeEnd) break;

      const slotStartIso = slotStart.toISOString();
      const slotEndIso = slotEnd.toISOString();
      const isPast = slotStart.getTime() <= nowTime;
      const isBooked = bookedStartTimes.has(slotStartIso);

      const startTimeFormatted = `${String(slotStart.getUTCHours()).padStart(2, "0")}:${String(slotStart.getUTCMinutes()).padStart(2, "0")}`;
      const endTimeFormatted = `${String(slotEnd.getUTCHours()).padStart(2, "0")}:${String(slotEnd.getUTCMinutes()).padStart(2, "0")}`;

      allSlots.push({
        startTime: startTimeFormatted,
        endTime: endTimeFormatted,
        slotStartIso,
        slotEndIso,
        available: !isPast && !isBooked,
        isPast,
        isBooked,
      });

      cursor = new Date(cursor.getTime() + slotMinutes * 60000);
    }
  }

  const availableSlotsCount = allSlots.filter((s) => s.available).length;

  return {
    date: normalizedDate,
    doctorId: doctor._id,
    doctorName: doctor.name,
    slotDuration: slotMinutes,
    totalSlots: allSlots.length,
    availableSlots: availableSlotsCount,
    slots: allSlots,
  };
}

/**
 * Concurrency-Safe Booking Engine
 * Validates doctor, date, slot availability, and creates appointment with atomic conflict handling.
 */
export async function bookAppointmentSafe({
  doctorId,
  patientId,
  slotStartIso,
  slotEndIso,
  date,
  consultationType,
  symptoms = "",
  consultationFees,
  platformFees = 0,
  totalAmount,
}) {
  if (!doctorId || !patientId || !slotStartIso || !slotEndIso) {
    throw new AppointmentError(ERROR_CODES.INVALID_TIME, "Missing required booking details.");
  }

  const slotStartDate = new Date(slotStartIso);
  const now = new Date();

  if (isNaN(slotStartDate.getTime())) {
    throw new AppointmentError(ERROR_CODES.INVALID_TIME, "Invalid slotStartIso timestamp format.");
  }

  // Reject past slots
  if (slotStartDate.getTime() <= now.getTime()) {
    throw new AppointmentError(ERROR_CODES.PAST_DATE, "Cannot book appointment in the past.", 400);
  }

  const dateString = normalizeDateString(date || slotStartIso);

  const doctor = await Doctor.findById(doctorId);
  if (!doctor || doctor.isActive === false) {
    throw new AppointmentError(ERROR_CODES.DOCTOR_NOT_FOUND, "Doctor does not exist or is inactive.", 404);
  }

  // 1. Check existing booking on this slot
  const existing = await Appointment.findOne({
    doctorId,
    slotStartIso,
    status: { $in: ["PENDING", "CONFIRMED", "UPCOMING", "IN_PROGRESS", "Scheduled"] },
  });

  if (existing) {
    throw new AppointmentError(
      ERROR_CODES.SLOT_ALREADY_BOOKED,
      "This appointment slot is no longer available. Please select another slot.",
      409
    );
  }

  const normalizedType = normalizeConsultationType(consultationType);
  const zegoRoomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const finalFees = Number(consultationFees ?? doctor.fees ?? 0);
  const finalPlatformFees = Number(platformFees ?? 0);
  const finalTotal = Number(totalAmount ?? (finalFees + finalPlatformFees));

  try {
    const isDirectConfirm = false; // Phase 4 requires backend payment verification to confirm
    const appointment = new Appointment({
      doctorId,
      patientId,
      date: new Date(dateString),
      dateString,
      slotStartIso,
      slotEndIso,
      consultationType: normalizedType,
      symptoms: symptoms || "",
      zegoRoomId,
      status: isDirectConfirm ? APPOINTMENT_STATUS.CONFIRMED : APPOINTMENT_STATUS.PENDING,
      confirmedAt: isDirectConfirm ? new Date() : undefined,
      consultationFees: finalFees,
      platformFees: finalPlatformFees,
      totalAmount: finalTotal,
      paymentStatus: isDirectConfirm ? "Paid" : "Pending",
      payoutStatus: "Pending",
      paymentMethod: "Direct",
    });

    await appointment.save();

    return await Appointment.findById(appointment._id)
      .populate("doctorId", "name fees phone specialization hospitalInfo profileImage")
      .populate("patientId", "name email profileImage phone dob age");
  } catch (err) {
    // Intercept MongoDB duplicate key error (code 11000) from partial unique index
    if (err.code === 11000) {
      throw new AppointmentError(
        ERROR_CODES.SLOT_ALREADY_BOOKED,
        "This appointment slot is no longer available. Please select another slot.",
        409
      );
    }
    throw err;
  }
}

/**
 * Centralized Status Transition Execution
 */
export async function transitionAppointmentStatus({
  appointmentId,
  targetStatus,
  actorRole,
  actorId,
  reason = "",
}) {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new AppointmentError(ERROR_CODES.APPOINTMENT_NOT_FOUND, "Appointment not found.", 404);
  }

  // Role authorization checks
  if (actorRole === "doctor" && appointment.doctorId.toString() !== actorId.toString()) {
    throw new AppointmentError(ERROR_CODES.UNAUTHORIZED_APPOINTMENT_ACCESS, "Access denied. You are not the assigned doctor.", 403);
  }
  if (actorRole === "patient" && appointment.patientId.toString() !== actorId.toString()) {
    throw new AppointmentError(ERROR_CODES.UNAUTHORIZED_APPOINTMENT_ACCESS, "Access denied. You are not the booking patient.", 403);
  }

  // Validate state machine rule
  if (!canTransitionStatus(appointment.status, targetStatus)) {
    throw new AppointmentError(
      ERROR_CODES.INVALID_STATUS_TRANSITION,
      `Cannot transition appointment from '${appointment.status}' to '${targetStatus}'.`,
      400
    );
  }

  // Specific role restrictions for transitions
  if (targetStatus === APPOINTMENT_STATUS.CONFIRMED || targetStatus === APPOINTMENT_STATUS.REJECTED) {
    if (actorRole !== "doctor") {
      throw new AppointmentError(ERROR_CODES.UNAUTHORIZED_APPOINTMENT_ACCESS, "Only the assigned doctor can confirm or reject appointments.", 403);
    }
  }

  // Apply state and metadata
  appointment.status = targetStatus;
  appointment.updatedAt = new Date();

  if (targetStatus === APPOINTMENT_STATUS.CONFIRMED) {
    appointment.confirmedAt = new Date();
  } else if (targetStatus === APPOINTMENT_STATUS.IN_PROGRESS) {
    appointment.startedAt = new Date();
  } else if (targetStatus === APPOINTMENT_STATUS.COMPLETED) {
    appointment.completedAt = new Date();
  } else if (targetStatus === APPOINTMENT_STATUS.CANCELLED) {
    appointment.cancelledBy = actorRole;
    appointment.cancelReason = reason || "";
    appointment.cancelledAt = new Date();
  } else if (targetStatus === APPOINTMENT_STATUS.REJECTED) {
    appointment.rejectedBy = actorId;
    appointment.rejectReason = reason || "";
    appointment.rejectedAt = new Date();
  }

  await appointment.save();

  return await Appointment.findById(appointmentId)
    .populate("doctorId", "name fees phone specialization hospitalInfo profileImage")
    .populate("patientId", "name email phone dob age profileImage");
}
