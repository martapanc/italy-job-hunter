# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Hunt mode: search job listings and send match reports to Telegram
npm run scout      # Scout mode: find remote-first companies and generate cold-outreach pitches
npm run bot        # Start the Telegram bot that accepts /hunt, /scout, /status commands
npm test           # Run the full Vitest test suite (offline, no real API calls)
```

To run a single test file:
```bash
npx vitest run tests/triage_filter.test.js
```

## Personalizing for a new user

Edit these two files before running:
- **`data/cv.md`** — the candidate's full CV in Markdown; embedded verbatim in analysis prompts
- **`data/profile.md`** — job preferences (location, level, remote requirements, tech background); also embedded in prompts

## Architecture

Two independent pipelines share common modules in `src/`:

**Hunt pipeline** (`index.js`):
1. `search_engine.js` (`searchJobs`) — two parallel Tavily searches (broad web + job-board-targeted via `includeDomains`), merged and deduplicated by URL
2. `seen_store.js` — skip URLs already in `data/seen_urls.json`
3. `triage_filter.js` (`runJobTriage`) — Groq/llama boolean YES/NO: fully-remote + senior-level + engineering role
4. `deepseek_analyzer.js` (`analyzeJobListing`) — local Ollama model: CV match analysis; listings scoring below `MIN_MATCH_SCORE` (default 60%) are dropped
5. `telegram_sender.js` (`sendToTelegram`) — chunked delivery to Telegram (≤4000 chars/message)

**Scout pipeline** (`scouting.js`):
1. `company_scouter.js` (`scoutCompanies`) — Tavily search for remote-first tech companies worldwide
2. `triage_filter.js` (`runCompanyTriage`) — Groq boolean filter: remote-friendly tech company
3. `spontaneous_analyzer.js` (`generateCompanyPitch`) — local Ollama model: generates cold-outreach pitch
4. `telegram_sender.js` — same module as hunt

**Bot** (`bot.js`): Long-polling Telegram bot that spawns `index.js` or `scouting.js` as child processes. Prevents concurrent runs with a `running` flag.

## Key design decisions

- **`src/config.js`** is the single source of truth for all tunable constants: queries, model names, thresholds, delays. Edit here rather than touching pipeline logic.
- **`data/profile.md`** and **`data/cv.md`** are read at runtime and embedded in AI prompts — no rebuild needed to update them.
- **Triage uses Groq** (fast, free-tier API) for cheap boolean filtering; **analysis uses Ollama** (local, no API key). This keeps external API costs near zero while offloading heavier reasoning to the local model.
- **Ollama endpoint** is OpenAI-compatible (`/v1/chat/completions`). Base URL and model are set via `OLLAMA_BASE_URL` / `OLLAMA_MODEL` in `config.js` (defaults: `http://localhost:11434`, `deepseek-r1:7b`).
- **`API_DELAY_MS` (2500 ms)** is inserted between all Groq calls to respect free-tier rate limits.
- **Tests mock all external calls** (`fetch`, `fs`, `dotenv`) via `vi.stubGlobal` / `vi.mock`. No API keys or running Ollama needed.
- **ESM throughout** (`"type": "module"` in package.json) — use `import`/`export`, not `require`. Native `fetch` (Node 18+) is used directly.

## Environment variables

Copy `.env.example` to `.env` and fill in:
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- `TAVILY_API_KEY`
- `GROQ_API_KEY`

Ollama requires no API key — it must be running locally with the target model pulled (`ollama pull deepseek-r1:7b`).
