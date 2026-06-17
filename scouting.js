import { scoutCompanies } from './src/company_scouter.js';
import { seedCompaniesFromDirectories } from './src/directory_seeder.js';
import { runCompanyTriage } from './src/triage_filter.js';
import { generateCompanyPitch } from './src/spontaneous_analyzer.js';
import { sendToTelegram } from './src/telegram_sender.js';
import { API_DELAY_MS, TELEGRAM_MAX_CHARS, DIRECTORY_SEED_ENABLED } from './src/config.js';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/** Merges company lists, dropping duplicates by hostname (falling back to raw url). */
function mergeCompanies(...lists) {
  const seen = new Set();
  const keyFor = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };
  return lists.flat().filter(c => {
    if (!c?.url) return false;
    const key = keyFor(c.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function runScouting() {
  console.log('=====================================================');
  console.log(`🔍 COMPANY SCOUT STARTED: ${new Date().toLocaleString()}`);
  console.log('=====================================================');

  console.log('📡 Searching for remote-first tech companies...');
  const searched = await scoutCompanies();
  console.log(`   ↳ ${searched.length} from web search.`);

  let seeded = [];
  if (DIRECTORY_SEED_ENABLED) {
    console.log('📚 Seeding from curated directories (remoteintech, italiaremote)...');
    seeded = await seedCompaniesFromDirectories();
    console.log(`   ↳ ${seeded.length} from directories.`);
  }

  const companies = mergeCompanies(searched, seeded);
  console.log(`📊 Found ${companies.length} potential target companies (after dedup).`);

  if (companies.length === 0) {
    console.log('🏁 No companies found in this session.');
    return;
  }

  const pitchCards = [];

  for (const company of companies) {
    const isTarget = await runCompanyTriage(company);
    if (!isTarget) {
      console.log(`❌ [REJECTED] "${company.name}" — not a remote-friendly tech company.`);
      await wait(API_DELAY_MS);
      continue;
    }

    console.log(`\n🏢 Generating pitch for: "${company.name}"...`);
    const report = await generateCompanyPitch(company);

    const card = `🏢 **COMPANY: ${company.name.toUpperCase()}**\n🌐 [Visit website](${company.url})\n\n${report}`;
    pitchCards.push(card);

    await wait(API_DELAY_MS);
  }

  console.log('\n-----------------------------------------------------');
  console.log('📬 Assembling Spontaneous Applications Dossier...');

  let buffer = `🚀 **SPONTANEOUS APPLICATIONS DOSSIER**\n`;
  buffer += `Remote-first companies identified with strategic pitches.\n\n`;
  buffer += `═`.repeat(15) + `\n\n`;

  let sentCount = 0;

  for (const card of pitchCards) {
    if ((buffer + card).length > TELEGRAM_MAX_CHARS) {
      const sent = await sendToTelegram(buffer);
      if (sent) sentCount++;
      buffer = `📦 **DOSSIER (Continued...)**\n\n`;
    }
    buffer += card + `\n\n` + `═`.repeat(15) + `\n\n`;
  }

  if (buffer.trim() !== '') {
    const sent = await sendToTelegram(buffer);
    if (sent) sentCount++;
  }

  console.log(`✅ Dossier sent to Telegram! Messages: ${sentCount}`);
  console.log('=====================================================');
}

runScouting();
