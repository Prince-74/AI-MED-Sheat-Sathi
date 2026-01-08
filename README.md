# AI-MED HealthCare Assistant 

This repository contains a full-stack health-care assistant web app with a React + Vite frontend and a Node.js/Express backend. The project includes AI-powered report analysis, symptom checking, appointment management, and optional Telegram bot integration.

## Key Features
- Report analyzer (AI integrations)
- Symptom checker and medication assistant
- Appointment, doctor, patient, and report management
- Authentication (Google OAuth + JWT)
- Telegram bot for notifications and assistant features

## Tech Stack
- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express, MongoDB (Mongoose)
- AI: OpenAI / Google Generative AI SDKs
- Extras: Passport (Google OAuth), Telegram Bot API

## Prerequisites
- Node.js (18+ recommended)
- npm or yarn
- MongoDB instance (local or cloud)
- Environment variables for API keys (see below)

## Quickstart

1. Install dependencies

   - Backend

   ```bash
   cd backend
   npm install
   ```

   - Frontend

   ```bash
   cd frontend
   npm install
   ```

2. Environment variables

   - Backend: create `backend/.env` with at least:

     - `MONGODB_URI` — MongoDB connection string
     - `JWT_SECRET` — secret for JWT tokens
     - `PORT` — (optional) server port, default 3000
     - `OPENAI_API_KEY` or Google Generative AI credentials if used
     - `TELEGRAM_BOT_TOKEN` — if using Telegram bot

   - Frontend: create `frontend/.env` (or set Vite env vars)

     - `VITE_API_URL` — URL of backend API (e.g., `http://localhost:3000`)

3. Run the backend and frontend

   - Start backend (development)

   ```bash
   cd backend
   npm run dev
   ```

   - Start frontend (development)

   ```bash
   cd frontend
   npm run dev
   ```

4. Optional: run Telegram bot or server-side bot helper

   - Backend bot

   ```bash
   cd backend
   npm run bot
   ```

   - Frontend helper server bot

   ```bash
   cd frontend
   npm run bot
   ```

## Project Structure (high level)

- `backend/` — Express API, authentication, models, analyzer and bot code
  - `server.js` — main server entry
  - `analyzer.js` / `analyzer.cjs` — AI report analyzer utilities
  - `telegram-bot.js` — Telegram bot entry (also `.cjs` variant)
- `frontend/` — Vite + React app (TypeScript)
  - `src/` — components, pages, hooks, store, service

## Scripts
- Backend: `npm run start` (prod), `npm run dev` (dev), `npm run bot` (telegram bot)
- Frontend: `npm run dev`, `npm run build`, `npm run preview`, `npm run server` (helper)

## Notes
- The repo contains both CommonJS (`*.cjs`) and ESM code. Use Node flags or matching Node versions when running those files.
- AI features require valid API keys and may incur costs depending on provider usage.

## Contributing
- Open an issue for bugs or feature requests.
- Fork the repo, create a branch, add tests/changes, and open a pull request.

## License
This project is provided as-is. Add a license as needed.

---

If you want, I can also:
- Add an example `.env.example` file
- Create simple npm scripts to run backend + frontend concurrently
- Scaffold a GitHub Actions workflow for builds and tests

README updated in [README.md](README.md).
