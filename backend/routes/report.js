const express = require("express");
const multer = require("multer");
const { authenticate } = require("../middleware/auth");
const Report = require("../modal/Report");
const { analyzeReport } = require("../analyzer.cjs");

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const sanitizeReport = (report) => {
  if (!report) return null;
  const plain = typeof report.toObject === "function" ? report.toObject() : report;
  const { fileData, __v, ...rest } = plain;
  return rest;
};

router.post(
  "/analyze",
  authenticate,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.badRequest("No file uploaded");
      }

      const analysis = await analyzeReport(req.file.buffer, req.file.originalname);
      const ownerType = req.auth.type === "doctor" ? "Doctor" : "Patient";
      const provider = (process.env.ANALYZER_PROVIDER || "openai").toLowerCase();

      const savedReport = await Report.create({
        ownerId: req.user._id,
        ownerType,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        fileData: req.file.buffer,
        summary: analysis.summary,
        text: analysis.text,
        parameters: analysis.parameters,
        issues: analysis.issues,
        analysisProvider: provider.includes("gemini") ? "gemini" : "openai",
      });

      res.created(
        {
          report: sanitizeReport(savedReport),
        },
        "Report analyzed and saved"
      );
    } catch (error) {
      console.error("Report analysis error", error);
      res.serverError("Failed to analyze report", [error.message]);
    }
  }
);

router.get("/", authenticate, async (req, res) => {
  try {
    const reports = await Report.find({ ownerId: req.user._id })
      .sort({ uploadedAt: -1 })
      .select("-fileData")
      .lean();
    res.ok(reports, "Reports fetched");
  } catch (error) {
    res.serverError("Failed to fetch reports", [error.message]);
  }
});

router.get("/:id", authenticate, async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, ownerId: req.user._id })
      .select("-fileData")
      .lean();
    if (!report) {
      return res.notFound("Report not found");
    }
    res.ok(report, "Report fetched");
  } catch (error) {
    res.serverError("Failed to fetch report", [error.message]);
  }
});

router.get("/:id/download", authenticate, async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!report || !report.fileData) {
      return res.notFound("Report not found");
    }

    res.setHeader("Content-Type", report.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${report.filename}"`);
    return res.send(report.fileData);
  } catch (error) {
    res.serverError("Failed to download report", [error.message]);
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const deleted = await Report.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });
    if (!deleted) {
      return res.notFound("Report not found");
    }
    res.ok({}, "Report deleted");
  } catch (error) {
    res.serverError("Failed to delete report", [error.message]);
  }
});

module.exports = router;

