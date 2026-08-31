import mongoose from "mongoose";

const healthcareCategoriesList = [
  "Primary Care",
  "Manage Your Condition",
  "Mental & Behavioral Health",
  "Sexual Health",
  "Children's Health",
  "Senior Health",
  "Women's Health",
  "Men's Health",
  "Wellness",
];

const dailyTimeRangeSchema = new mongoose.Schema({
  start: { type: String }, //09:00
  end: { type: String },   //12:00
}, { _id: false });

const availabilityRangeSchema = new mongoose.Schema({
  startDate: { type: String },
  endDate: { type: String },
  excludedWeekdays: { type: [Number], default: [] }, //0-6 (Sun-Sat)
}, { _id: false });

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  googleId: { type: String, unique: true, sparse: true },
  profileImage: { type: String, default: "" },

  specialization: {
    type: String,
    enum: [
      "Cardiologist", "Dermatologist", "Orthopedic", "Pediatrician",
      "Neurologist", "Gynecologist", "General Physician", "ENT Specialist",
      "Psychiatrist", "Ophthalmologist"
    ]
  },
  category: { type: [String], enum: healthcareCategoriesList, required: false },

  qualification: { type: String, required: false },
  experience: { type: Number, default: 0, min: 0 },
  about: { type: String, default: "" },
  fees: { type: Number, default: 500, min: 0 },

  hospitalInfo: {
    name: String,
    address: String,
    city: String,
  },

  availabilityRange: availabilityRangeSchema,
  dailyTimeRanges: {
    type: [dailyTimeRangeSchema],
    default: [
      { start: "09:00", end: "13:00" },
      { start: "14:00", end: "20:00" },
    ],
  },
  slotDurationMinutes: { type: Number, default: 30 },

  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Doctor = mongoose.model("Doctor", doctorSchema);
export default Doctor;