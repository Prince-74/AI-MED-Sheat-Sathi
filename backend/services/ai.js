// backend/services/ai.js - Clean ESM AI & OCR service
import "dotenv/config";
import fetch from "node-fetch";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image";

const GEMINI_MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL && process.env.GEMINI_MODEL.trim(),
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
].filter(Boolean);

function extractJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("AI did not return valid JSON");
  }
}

function requiredEnv(name) {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v.trim();
}

export async function generateGeminiJson(prompt) {
  const apiKey = requiredEnv("GEMINI_API_KEY");
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastErr;

  for (const modelName of GEMINI_MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const content = result.response?.text() || "";
      return extractJson(content);
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || "");
      if (/404/.test(msg) || /not found/i.test(msg) || /quota|exceeded|insufficient/i.test(msg)) {
        continue;
      }
    }
  }

  throw lastErr || new Error("Gemini analysis failed - no available models responded");
}

export async function callOcrSpace(buffer, filename, params = {}) {
  const apiKey = requiredEnv("OCR_SPACE_API_KEY");
  const form = new FormData();
  form.set("file", new Blob([buffer]), filename || "report.pdf");
  for (const [k, v] of Object.entries(params)) form.set(k, String(v));

  const res = await fetch(OCR_SPACE_ENDPOINT, {
    method: "POST",
    headers: { apikey: apiKey },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OCR request failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  const parsed = data?.ParsedResults?.map((r) => r.ParsedText).join("\n").trim();
  return parsed || "";
}

export async function runOcr(buffer, filename) {
  const attempts = [
    { language: "eng", isOverlayRequired: false, isTable: true, scale: true, OCREngine: 2, detectOrientation: true },
    { language: "eng", isOverlayRequired: false, isTable: false, scale: true, OCREngine: 2, detectOrientation: true },
    { language: "eng", isOverlayRequired: false, isTable: true, scale: false, OCREngine: 2, detectOrientation: true },
  ];

  let lastErr;
  for (const p of attempts) {
    try {
      const text = await callOcrSpace(buffer, filename, p);
      if (text && text.replace(/\s+/g, "").length > 0) return text;
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  if (lastErr) throw lastErr;
  throw new Error("OCR returned no results");
}

export async function analyzeWithGemini(ocrText) {
  const prompt = [
    "You are an expert medical report analysis assistant.",
    "Extract key parameters, flag abnormalities, and produce a concise, patient-friendly summary.",
    "Return strictly JSON with keys:",
    "summary (string - easy to understand explanation for patient),",
    "parameters (array of { name: string, value: string, status: 'normal'|'high'|'low'|'unknown' }),",
    "issues (array of strings - key health concerns or flagged parameters).",
    "",
    "Report Text:",
    ocrText,
  ].join("\n");

  try {
    const json = await generateGeminiJson(prompt);
    const summary = String(json.summary || "No summary available.");
    const parameters = Array.isArray(json.parameters)
      ? json.parameters.map((p) => ({
          name: String(p.name || "Unknown"),
          value: String(p.value || ""),
          status: ["normal", "high", "low", "unknown"].includes(String(p.status || "").toLowerCase())
            ? String(p.status).toLowerCase()
            : "unknown",
        }))
      : [];
    const issues = Array.isArray(json.issues) ? json.issues.map(String) : [];

    return { summary, parameters, issues };
  } catch (error) {
    if (String(process.env.FALLBACK_OCR_ONLY || "").toLowerCase() === "true") {
      return {
        summary: "AI analysis temporarily unavailable. Showing extracted OCR text only.",
        parameters: [],
        issues: [],
      };
    }
    throw error;
  }
}

export async function analyzeWithOpenAI(ocrText) {
  const openaiKey = requiredEnv("OPENAI_API_KEY");
  const openai = new OpenAI({ apiKey: openaiKey });

  const system = "You are a medical report analysis assistant. Extract key parameters, flag abnormalities, and produce a concise, patient-friendly summary. Always output valid JSON.";
  const user = "Here is the OCR text of a patient's medical report.\n\nReport Text:\n" + ocrText + "\n\nReturn strictly JSON with keys: summary (string), parameters (array of { name, value, status: one of normal|high|low|unknown }), issues (array of strings).";

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
    });

    const content = response.choices?.[0]?.message?.content || "";
    const json = extractJson(content);

    const summary = String(json.summary || "No summary available.");
    const parameters = Array.isArray(json.parameters)
      ? json.parameters.map((p) => ({
          name: String(p.name || "Unknown"),
          value: String(p.value || ""),
          status: ["normal", "high", "low", "unknown"].includes(String(p.status || "").toLowerCase())
            ? String(p.status).toLowerCase()
            : "unknown",
        }))
      : [];
    const issues = Array.isArray(json.issues) ? json.issues.map(String) : [];

    return { summary, parameters, issues };
  } catch (err) {
    if (String(process.env.FALLBACK_OCR_ONLY || "").toLowerCase() === "true") {
      return {
        summary: "AI analysis temporarily unavailable. Showing extracted OCR text only.",
        parameters: [],
        issues: [],
      };
    }
    throw err;
  }
}

export async function analyzeReport(buffer, filename) {
  const ocrText = await runOcr(buffer, filename);
  const provider = (process.env.ANALYZER_PROVIDER || "").toLowerCase();

  if (provider === "gemini" || (!process.env.OPENAI_API_KEY && process.env.GEMINI_API_KEY)) {
    const ai = await analyzeWithGemini(ocrText);
    return { text: ocrText, summary: ai.summary, parameters: ai.parameters, issues: ai.issues };
  }

  const ai = await analyzeWithOpenAI(ocrText);
  return { text: ocrText, summary: ai.summary, parameters: ai.parameters, issues: ai.issues };
}

export async function analyzeSymptoms(description) {
  const symptomText = String(description || "").trim();
  if (!symptomText) {
    throw new Error("Symptom description is required");
  }

  const prompt = [
    "You are an AI virtual triage healthcare assistant helping patients understand their symptoms.",
    "Given the user's free-text symptom description, respond strictly in JSON with keys:",
    "condition (string - most probable condition or assessment),",
    "urgency (string - one of 'low'|'medium'|'high'),",
    "explanation (string - empathetic, easy-to-understand explanation),",
    "recommendations (array of strings describing self-care, home remedies or immediate next steps),",
    "redFlags (array of strings describing warning signs that require emergency medical care).",
    "Always maintain professional, compassionate medical tone. Do not provide definitive diagnosis.",
    "",
    "Patient Symptoms:",
    symptomText,
  ].join("\n");

  try {
    const json = await generateGeminiJson(prompt);
    const condition = String(json.condition || json.diagnosis || "General assessment required");
    const urgencyRaw = String(json.urgency || "medium").toLowerCase();
    const urgency = ["low", "medium", "high"].includes(urgencyRaw) ? urgencyRaw : "medium";
    const explanation = String(json.explanation || json.summary || "Monitor your symptoms and consult a doctor if they persist.");
    const recommendations = Array.isArray(json.recommendations)
      ? json.recommendations.map(String)
      : ["Stay hydrated and rest.", "Schedule a consultation with a healthcare professional if symptoms worsen."];
    const redFlags = Array.isArray(json.redFlags) ? json.redFlags.map(String) : [];

    return { condition, urgency, explanation, recommendations, redFlags };
  } catch (error) {
    return {
      condition: "Medical review recommended",
      urgency: "medium",
      explanation: "We could not analyze your symptoms automatically. Please monitor your condition and consult a qualified healthcare professional.",
      recommendations: [
        "Record when symptoms began and their severity.",
        "Seek immediate medical attention if you experience severe pain, difficulty breathing, or dizziness."
      ],
      redFlags: ["High persistent fever", "Difficulty breathing", "Sudden severe pain"],
      error: error.message,
    };
  }
}

export async function analyzeMedications(medicines) {
  const medText = String(medicines || "").trim();
  if (!medText) {
    throw new Error("Medicines list is required");
  }

  const prompt = [
    "You are a clinical pharmacology AI assistant specializing in drug-drug interactions, contraindications, and patient safety.",
    "Analyze the following list of medications or substances:",
    medText,
    "",
    "Respond strictly in JSON with keys:",
    "interactions (array of { drugs: string (e.g. 'Aspirin + Ibuprofen'), severity: 'high'|'medium'|'low', warning: string }),",
    "alternatives (array of strings - safer alternative medications or lifestyle adjustments if applicable),",
    "summary (string - patient-friendly overall safety summary),",
    "precautions (array of strings - practical timing/dietary instructions e.g. take with food, avoid alcohol).",
  ].join("\n");

  try {
    const json = await generateGeminiJson(prompt);
    const interactions = Array.isArray(json.interactions)
      ? json.interactions.map((item) => ({
          drugs: String(item.drugs || "Specified Medications"),
          severity: ["high", "medium", "low"].includes(String(item.severity).toLowerCase())
            ? String(item.severity).toLowerCase()
            : "medium",
          warning: String(item.warning || "Use with doctor supervision."),
        }))
      : [];

    const alternatives = Array.isArray(json.alternatives) ? json.alternatives.map(String) : [];
    const summary = String(json.summary || "Review all medications with your pharmacist or doctor before making changes.");
    const precautions = Array.isArray(json.precautions) ? json.precautions.map(String) : ["Take medications as prescribed with adequate water."];

    return { interactions, alternatives, summary, precautions };
  } catch (error) {
    return {
      interactions: [
        {
          drugs: medText,
          severity: "low",
          warning: "No severe automated interaction detected. Please verify with your doctor or pharmacist.",
        },
      ],
      alternatives: [],
      summary: "Automated analysis completed with standard precautions. Always consult a physician.",
      precautions: ["Always take prescribed doses at regular intervals."],
      error: error.message,
    };
  }
}
