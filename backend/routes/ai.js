const express = require("express");
const { body } = require("express-validator");
const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { analyzeSymptoms } = require("../analyzer.cjs");

const router = express.Router();

router.post(
  "/symptom-check",
  authenticate,
  [body("description").isString().trim().isLength({ min: 10 }).withMessage("Please describe your symptoms in a sentence")],
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

module.exports = router;

