# 🎮 Local Game Translator

A flexible, context-aware game localization and translation platform supporting **LM Studio**, **Ollama**, **Google Gemini**, **OpenAI**, **Anthropic Claude**, **Groq**, **DeepSeek**, and custom self-hosted endpoints.

---

## ✨ Features

- **Game Lore & Big Context Support**: Define rich lore, setting tone, character voices, and custom formatting constraints injected into translation requests.
- **Multi-Provider AI Architecture**:
  - **Translation Engine**: Choose between OpenAI-compatible endpoints (Local LM Studio, Ollama, vLLM, OpenAI, Groq, DeepSeek), Google Gemini, or Anthropic Claude.
  - **QA & Terminology Inspector**: Audits translations, checks placeholder validity (`{player}`, `{0}`, `%s`), and automatically extracts candidate glossary terms into your database.
- **Base Reference JSON Parser**: Import nested JSON hierarchies, arrays, or flat localization files with placeholder preservation.
- **Language Hub & Live Progress**: Add target languages with real-time completion percentage tracking and Server-Sent Events (SSE) live updates.
- **Configurable Batch Concurrency**: Parallel worker pool for fast translation using cloud APIs or single-stream execution for local GPUs.
- **Nested JSON Export**: Download cleanly reconstructed target JSON matching your base reference structure.

---

## 🚀 Quick Start (Local Development)

### 1. Requirements
- Node.js 20+
- (Optional) Local LLM engine (e.g., LM Studio at `http://localhost:1234/v1` or Ollama at `http://localhost:11434/v1`) or Cloud API keys (Gemini, OpenAI, Anthropic).

### 2. Start Dev Environment
```bash
# Install dependencies
npm install

# Run backend + frontend concurrently in dev mode
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ☁️ Hosting on Google Cloud Platform (GCP VM)

### Option A: Docker Deployment (Recommended)

1. **Clone & Setup Environment on your GCP VM**:
```bash
git clone <your-repo-url>
cd LocalTranslator
cp .env.example .env
# Edit .env with any default keys or port if needed
nano .env
```

2. **Launch with Docker Compose**:
```bash
docker compose up -d --build
```
Your service will start on port `3001` with persistent SQLite storage in `./data`.

---

### Option B: Native Node.js / PM2 Deployment

1. **Install Node.js & Build Production Bundle**:
```bash
npm install
npm run build
```

2. **Run with PM2 (Process Manager)**:
```bash
# Install PM2 globally if not installed
npm install -g pm2

# Start server
pm2 start server/server.ts --name "local-translator" --interpreter ./node_modules/.bin/tsx

# Save PM2 state for automatic VM restarts
pm2 save
pm2 startup
```

3. **GCP Firewall Rule**:
Make sure your GCP VPC firewall allows ingress traffic on port `3001` (or port `80`/`443` if using Nginx reverse proxy):
```bash
gcloud compute firewall-rules create allow-local-translator \
  --allow tcp:3001 \
  --target-tags=http-server \
  --description="Allow incoming traffic for Local Translator"
```

---

## ⚙️ AI Provider Settings & Presets

Click the **Settings** gear icon in the top right of the UI to configure:

| Provider | Supported Models / Presets | Base URL |
| :--- | :--- | :--- |
| **LM Studio (Local)** | `translategemma-12b-it`, `qwen2.5-14b-instruct`, etc. | `http://localhost:1234/v1` |
| **Ollama (Local/VM)** | `gemma2:9b`, `llama3.3`, `mistral`, etc. | `http://localhost:11434/v1` |
| **Google Gemini** | `gemini-2.5-flash`, `gemini-3.7-flash`, `gemini-2.5-pro` | Auto-configured via API Key |
| **OpenAI** | `gpt-4o`, `gpt-4o-mini` | `https://api.openai.com/v1` |
| **Groq** | `llama-3.3-70b-versatile` | `https://api.groq.com/openai/v1` |
| **DeepSeek** | `deepseek-chat` | `https://api.deepseek.com/v1` |
| **Anthropic** | `claude-3-7-sonnet-20250219`, `claude-3-5-haiku` | Auto-configured via API Key |

---

## 🏗️ Architecture & Slices

- `server/features/ai_providers`: Decoupled AI drivers (Gemini, OpenAI-compatible, Anthropic, AIService)
- `server/features/games`: Game CRUD, context prompt, JSON flattener & exporter
- `server/features/translations`: Key translations, batch queue, and SSE events
- `server/features/glossary`: Game terminology and glossary pairs
- `server/features/settings`: Multi-provider settings repository & connection test endpoints
- `client/src/features/*`: Modular React UI components with Tailwind CSS (< 300 lines/file)
