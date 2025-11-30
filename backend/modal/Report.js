const mongoose = require("mongoose");

const parameterSchema = new mongoose.Schema({
  name: String,
  value: String,
  status: {
    type: String,
    enum: ["normal", "high", "low", "unknown"],
    default: "unknown",
  },
});

const reportSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "ownerType" },
    ownerType: { type: String, required: true, enum: ["Doctor", "Patient"] },
    filename: { type: String, required: true },
    mimeType: { type: String },
    fileSize: { type: Number },
    fileData: { type: Buffer },
    summary: { type: String, default: "" },
    text: { type: String, default: "" },
    parameters: [parameterSchema],
    issues: [String],
    analysisProvider: { type: String, enum: ["openai", "gemini"], default: "openai" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { collection: "reports" }
);

module.exports = mongoose.model("Report", reportSchema);
