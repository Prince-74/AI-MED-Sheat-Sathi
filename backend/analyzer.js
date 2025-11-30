// analyzer.js - shared report analysis logic (ESM)
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
  "gemini-2.5-flash-lite",
  "gemini-pro",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash-002",
  "gemini-1.5-pro-002",
].filter(Boolean);

function extractJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("Gemini did not return valid JSON");
  }
}

async function generateGeminiJson(prompt) {
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
      if (/404/.test(msg) || /not found/i.test(msg)) {
        continue;
      }
      if (/quota|exceeded|insufficient/i.test(msg)) {
        continue;
      }
    }
  }

  throw lastErr || new Error("Gemini analysis failed - no available models responded");
}

function requiredEnv(name) {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

async function callOcrSpace(buffer, filename, params) {
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
  const parsed = data?.ParsedResults?.map(r => r.ParsedText).join("\n").trim();
  return parsed || "";
}

export async function runOcr(buffer, filename) {
  // Try multiple parameter sets for better robustness across PDFs/images
  const attempts = [
    { language: "eng", isOverlayRequired: false, isTable: true, scale: true, OCREngine: 2, detectOrientation: true },
    { language: "eng", isOverlayRequired: false, isTable: false, scale: true, OCREngine: 2, detectOrientation: true },
    { language: "eng", isOverlayRequired: false, isTable: true, scale: false, OCREngine: 2, detectOrientation: true },
    { language: "eng", isOverlayRequired: false, isTable: true, scale: true, OCREngine: 1, detectOrientation: true },
    { language: "eng", isOverlayRequired: false, isTable: false, scale: true, OCREngine: 1, detectOrientation: true },
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

async function callOpenAIWithRetry(openai, payload, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await openai.chat.completions.create(payload);
    } catch (err) {
      const message = String(err?.message || "");
      const status = Number(err?.status || 0);
      const isRateLimit = status === 429 || /429/.test(message) || /rate limit/i.test(message);
      if (isRateLimit && attempt < retries) {
        const backoffMs = 1000 * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }
      throw err;
    }
  }
}

export async function analyzeWithOpenAI(ocrText) {
  const openaiKey = requiredEnv("OPENAI_API_KEY");
  const openai = new OpenAI({ apiKey: openaiKey });

  const system = "You are a medical report analysis assistant. Extract key parameters, flag abnormalities, and produce a concise, patient-friendly summary. Always output valid JSON.";
  const user = `Here is the OCR text of a patient's medical report.\n\nReport Text:\n${ocrText}\n\nReturn strictly JSON with keys: summary (string), parameters (array of { name, value, status: one of normal|high|low|unknown }), issues (array of strings).`;

  try {
    const response = await callOpenAIWithRetry(openai, {
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
    });

    const content = response.choices?.[0]?.message?.content || "";
    let json;
    try {
      json = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        json = JSON.parse(match[0]);
      } else {
        throw new Error("OpenAI did not return valid JSON");
      }
    }

    const summary = String(json.summary || "No summary available.");
    const parameters = Array.isArray(json.parameters) ? json.parameters.map(p => ({
      name: String(p.name || "Unknown"),
      value: String(p.value || ""),
      status: ["normal", "high", "low", "unknown"].includes((p.status || "unknown").toLowerCase()) ? (p.status || "unknown").toLowerCase() : "unknown",
    })) : [];
    const issues = Array.isArray(json.issues) ? json.issues.map(String) : [];

    return { summary, parameters, issues };
  } catch (err) {
    const allowFallback = String(process.env.FALLBACK_OCR_ONLY || "").toLowerCase() === "true";
    if (allowFallback) {
      return {
        summary: "AI analysis temporarily unavailable. Showing OCR text only.",
        parameters: [],
        issues: [],
      };
    }
    throw err;
  }
}


export async function analyzeWithGemini(ocrText) {
  const prompt = [
    "You are a medical report analysis assistant. Extract key parameters, flag abnormalities, and produce a concise, patient-friendly summary.",
    "Return strictly JSON with keys: summary (string), parameters (array of { name, value, status: one of normal|high|low|unknown }), issues (array of strings).",
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
          status: ["normal", "high", "low", "unknown"].includes((p.status || "unknown").toLowerCase())
            ? (p.status || "unknown").toLowerCase()
            : "unknown",
        }))
      : [];
    const issues = Array.isArray(json.issues) ? json.issues.map(String) : [];

    return { summary, parameters, issues };
  } catch (error) {
    const allowFallback = String(process.env.FALLBACK_OCR_ONLY || "").toLowerCase() === "true";
    if (allowFallback) {
      return {
        summary: "AI analysis temporarily unavailable. Showing OCR text only.",
        parameters: [],
        issues: [],
      };
    }
    throw error;
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
    "You are a virtual triage assistant helping patients understand their symptoms.",
    "Given the user's free-text symptom description, respond strictly in JSON with keys:",
    "condition (string - most probable condition),",
    "urgency (string - one of low|medium|high),",
    "explanation (string - short friendly summary),",
    "recommendations (array of strings describing self-care or next steps),",
    "redFlags (array of strings describing warning signs that require immediate care).",
    "Use clear, empathetic language. Do not mention that you are an AI or reference the prompt instructions.",
    "",
    "Symptoms:",
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
      : [
          "Stay hydrated and rest.",
          "Schedule a consultation with a healthcare professional if symptoms worsen.",
        ];
    const redFlags = Array.isArray(json.redFlags) ? json.redFlags.map(String) : [];

    return { condition, urgency, explanation, recommendations, redFlags };
  } catch (error) {
    // Provide a safe fallback response without AI
    return {
      condition: "Medical review recommended",
      urgency: "medium",
      explanation: "We could not analyze your symptoms automatically. Please monitor your condition and consult a doctor if symptoms persist or worsen.",
      recommendations: [
        "Note when symptoms started and any triggers.",
        "If new or severe symptoms appear, contact a healthcare professional promptly.",
      ],
      redFlags: [],
      error: error.message,
    };
  }
}