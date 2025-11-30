# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/e93a0190-f5ea-451b-b375-cb904114c8d7

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/e93a0190-f5ea-451b-b375-cb904114c8d7) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/e93a0190-f5ea-451b-b375-cb904114c8d7) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

---

## Backend API + Telegram Bot setup

The project includes a lightweight Node server that exposes an analysis API and a Telegram bot that uses the same analyzer.

### Required environment variables
Create a `.env` file in the project root (same folder as package.json) with one of the following provider setups.

OpenAI provider:
```
ANALYZER_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Gemini provider:
```
ANALYZER_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-1.5-flash
```

Common (for both providers):
```
OCR_SPACE_API_KEY=your_ocr_space_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
VITE_API_BASE=http://localhost:8787
VITE_TELEGRAM_BOT_USERNAME=your_bot_username
# Optional: fall back to OCR text if AI is unavailable
FALLBACK_OCR_ONLY=false
```

### Install dependencies

```
npm install
```

### Run API server (defaults to http://localhost:8787)

```
npm run server
```

### Run the Telegram bot (long-polling)

```
npm run bot
```

### Run the frontend (Vite dev server on http://localhost:8080)

```
npm run dev
```

### API endpoint

- `POST /api/analyze-report` (multipart/form-data)
  - field: `file` (pdf/png/jpg/jpeg/webp)
  - response:

```json
{
  "text": "... OCR'd text ...",
  "summary": "Concise AI summary",
  "parameters": [{ "name": "Hemoglobin", "value": "15.2 g/dL", "status": "normal" }],
  "issues": ["Potential dehydration"]
}
```

### Telegram bot usage
- Send a document (PDF/image) or photo to the bot; it replies with a summary and parameters.
- Provider is selected by `ANALYZER_PROVIDER` and corresponding API key.