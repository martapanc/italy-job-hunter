import { searchJobs } from './src/search_engine.js';
import { runJobTriage } from './src/triage_filter.js';
import { analyzeJobListing } from './src/deepseek_analyzer.js';
import { sendToTelegram } from './src/telegram_sender.js';
import { loadSeen, saveSeen } from './src/seen_store.js';
import { API_DELAY_MS, TELEGRAM_MAX_CHARS, MIN_MATCH_SCORE } from './src/config.js';

/** Extracts the numeric match score from an analysis report string. Returns null if not found. */
function parseMatchScore(report) {
  const match = report.match(/MATCH SCORE[^:]*:\s*(\d+)%/i);
  return match ? parseInt(match[1], 10) : null;
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runHunter() {
  console.log('=====================================================');
  console.log(`🚀 JOB HUNTER STARTED: ${new Date().toLocaleString()}`);
  console.log('=====================================================');

  // Stage 1: web search (two parallel Tavily queries, merged + deduplicated)
  console.log('🔍 [STAGE 1] Scanning job boards and the web with Tavily...');
  const rawListings = await searchJobs();
  console.log(`📊 Found ${rawListings.length} raw listings after deduplication.`);

  if (rawListings.length === 0) {
    console.log('🏁 No listings found. Ending run.');
    return;
  }

  // Skip URLs already processed in previous runs
  const seen = loadSeen();
  const newListings = rawListings.filter(a => !seen.has(a.url));
  console.log(`🗂  ${newListings.length} new listings (${rawListings.length - newListings.length} already seen).`);

  if (newListings.length === 0) {
    console.log('🏁 All listings already processed. Ending run.');
    return;
  }

  console.log('-----------------------------------------------------');
  console.log('🧠 [STAGE 2] Triage (Groq) + analysis (Ollama)...');

  const approvedCards = [];

  for (const listing of newListings) {
    const passed = await runJobTriage(listing);

    if (passed) {
      console.log(`✅ [APPROVED] "${listing.title}" at ${listing.url}`);
      console.log('🤖 [STAGE 3] Generating analysis with local Ollama model...');
      const report = await analyzeJobListing(listing);
      const score = parseMatchScore(report);

      if (score !== null && score < MIN_MATCH_SCORE) {
        console.log(`📉 [FILTERED] "${listing.title}" — score ${score}% below threshold (${MIN_MATCH_SCORE}%).`);
      } else {
        const card = `💼 **${listing.title.toUpperCase()}**\n\n${report}\n\n🔗 [View listing](${listing.url})`;
        approvedCards.push(card);
      }
    } else {
      console.log(`❌ [REJECTED] "${listing.title} at ${listing.url}"`);
    }

    seen.add(listing.url);
    await wait(API_DELAY_MS);
  }

  saveSeen(seen);

  console.log('-----------------------------------------------------');
  if (approvedCards.length === 0) {
    console.log('🏁 No matches today. No notification sent.');
    console.log('=====================================================');
    return;
  }

  console.log(`📬 Sending report for ${approvedCards.length} position(s)...`);

  let buffer = `🔔 **JOB HUNTER — OPPORTUNITY REPORT**\n\n`;
  buffer += `${approvedCards.length} match(es) found.\n\n`;
  buffer += `═`.repeat(15) + `\n\n`;

  let sentCount = 0;

  for (const card of approvedCards) {
    if ((buffer + card).length > TELEGRAM_MAX_CHARS) {
      const sent = await sendToTelegram(buffer);
      if (sent) sentCount++;
      buffer = `📦 **OPPORTUNITY REPORT (Continued...)**\n\n`;
    }
    buffer += card + `\n\n` + `═`.repeat(15) + `\n\n`;
  }

  if (buffer.trim() !== '') {
    const sent = await sendToTelegram(buffer);
    if (sent) sentCount++;
  }

  console.log(`✅ Report delivered! Messages sent: ${sentCount}`);
  console.log('=====================================================');
}

runHunter();
