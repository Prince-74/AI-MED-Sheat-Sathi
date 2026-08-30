# AI-MED HealthCare Assistant ??

AI-MED is an intelligent full-stack telehealth and medical AI assistant platform built with React, Vite, Node.js (ESM), Express, MongoDB, Socket.IO, ZegoCloud Video Consultation, and Google Gemini / OpenAI.

---

## ?? Key Features

- ?? **AI Medical Report Analyzer**: Upload lab tests, blood work, or radiology PDFs/images to extract parameters and generate patient-friendly simplified summaries with OCR + Gemini/OpenAI.
- ?? **AI Symptom Checker & Triage**: Free-text symptom analysis with urgency classification (low/medium/high), next steps, and emergency warning signs.
- ?? **AI Medication Assistant**: Drug-drug interaction risk checker with severity ratings, clinical precautions, and suggested safe alternatives.
- ????? **Doctor & Patient Telehealth Engine**:
  - Doctor directory with filtering by specialty, fees, city, and ratings.
  - Appointment scheduling with real-time slot conflict prevention.
  - **ZegoCloud Video Consultation**: WebRTC high-definition in-browser video calls with screen sharing and active controls.
  - Doctor digital prescription writing and consultation note management.
- ? **Real-Time Sockets & Alerts**: Instant consultation status updates and appointment alerts powered by Socket.IO.
- ?? **Telegram Bot**: Upload medical reports directly to Telegram for instant AI analysis.
- ?? **ML Ready Gateway**: Dedicated `backend/ml/` integration gateway for future custom machine learning models.

---

## ??? Tech Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS, shadcn/ui, Radix UI, Zustand, TanStack Query, ZegoCloud UIKit, Socket.IO Client.
- **Backend**: Node.js (ESM `"type": "module"`), Express 5.1, Mongoose 8, Passport.js (Google OAuth), Socket.IO, express-rate-limit.
- **AI & Document Processing**: Google Gemini SDK (`@google/generative-ai`), OpenAI API, OCR.Space REST API.

---

## ?? Quickstart

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment Variables

Create `backend/.env`:
```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/ai-med
JWT_SECRET=your_jwt_secret_key
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080

# AI Keys
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
OCR_SPACE_API_KEY=your_ocr_space_key

# Optional Integrations
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_BOT_AUTOSTART=false
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:8000/api/auth/google/callback
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_TELEGRAM_BOT_USERNAME=ai_medd_bot
VITE_ZEGO_APP_ID=1879308119
```

### 3. Run Development Servers

```bash
# Terminal 1 - Backend API & Sockets
cd backend
npm run dev

# Terminal 2 - Frontend Web Application
cd frontend
npm run dev
```

---

## ?? Changelog

All modifications and revamp details are documented in [REVAMP_CHANGELOG.md](REVAMP_CHANGELOG.md).
