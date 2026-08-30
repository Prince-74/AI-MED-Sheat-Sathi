import express from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { analyzeSymptoms, analyzeMedications } from "../services/ai.js";

const router = express.Router();

// AI Symptom Checker
router.post(
  "/symptom-check",
  authenticate,
  [
    body("description")
      .isString()
      .trim()
      .isLength({ min: 5 })
      .withMessage("Please describe your symptoms in a few words"),
  ],
  validate,
  async (req, res) => {
    try {
      const result = await analyzeSymptoms(req.body.description);
      res.ok(result, "Symptom analysis generated");
    } catch (error) {
      console.error("Symptom analysis error", error);
      res.serverError("Failed to analyze symptoms", [error.message]);
    }
  }
);

// AI Medication Assistant / Drug Interaction Checker
router.post(
  "/medication-check",
  authenticate,
  [
    body("medicines")
      .isString()
      .trim()
      .isLength({ min: 2 })
      .withMessage("Please provide at least one medicine or drug name"),
  ],
  validate,
  async (req, res) => {
    try {
      const result = await analyzeMedications(req.body.medicines);
      res.ok(result, "Medication analysis generated");
    } catch (error) {
      console.error("Medication analysis error", error);
      res.serverError("Failed to analyze medication interactions", [error.message]);
    }
  }
);

export default router;
