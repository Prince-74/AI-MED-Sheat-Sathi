import mongoose from "mongoose";

export const APPOINTMENT_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  UPCOMING: "UPCOMING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
  // Legacy alias supported for backward compatibility
  SCHEDULED: "Scheduled",
};

export const CONSULTATION_TYPES = {
  VIDEO: "Video Consultation",
  AUDIO: "Voice Call",
  RAW_VIDEO: "VIDEO",
  RAW_AUDIO: "AUDIO",
};

const appointmentSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    dateString: {
      type: String, // YYYY-MM-DD canonical format
      required: true,
      index: true,
    },
    slotStartIso: {
      type: String,
      required: true,
      index: true,
    },
    slotEndIso: {
      type: String,
      required: true,
    },

    consultationType: {
      type: String,
      enum: [
        "Video Consultation",
        "Voice Call",
        "VIDEO",
        "AUDIO",
      ],
      default: "Video Consultation",
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "UPCOMING",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
        "REJECTED",
        "Scheduled", // legacy support
      ],
      default: "CONFIRMED",
      index: true,
    },

    symptoms: { type: String, default: "" },
    zegoRoomId: { type: String, default: "" },
    prescription: { type: String, default: "" },
    notes: { type: String, default: "" },

    // Audit & Lifecycle Metadata
    confirmedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },

    cancelledBy: {
      type: String,
      enum: ["patient", "doctor", "system"],
    },
    cancelReason: { type: String, default: "" },
    cancelledAt: { type: Date },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    rejectReason: { type: String, default: "" },
    rejectedAt: { type: Date },

    // Payment fields (Phase 4 groundwork, direct confirmation for Phase 3)
    consultationFees: { type: Number, required: true },
    platformFees: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "refunded"],
      default: "Paid",
    },

    payoutStatus: {
      type: String,
      enum: ["Pending", "Paid", "Cancelled"],
      default: "Pending",
    },

    payoutDate: { type: Date },
    paymentMethod: { type: String, default: "Direct" },

    // RazorPay / Gateway fields for Phase 4
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    paymentDate: { type: Date },
  },
  { timestamps: true }
);

// Compound queries optimization
appointmentSchema.index({ doctorId: 1, date: 1 });
appointmentSchema.index({ patientId: 1, date: 1 });
appointmentSchema.index({ doctorId: 1, status: 1 });
appointmentSchema.index({ patientId: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, dateString: 1, status: 1 });

// Database-level double-booking prevention:
// Ensures a doctor cannot have 2 overlapping non-terminal appointments for the exact same slot.
appointmentSchema.index(
  { doctorId: 1, slotStartIso: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["PENDING", "CONFIRMED", "UPCOMING", "IN_PROGRESS", "Scheduled"] },
    },
  }
);

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;
