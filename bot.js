import { spawn } from 'child_process';
import dotenv from 'dotenv';
dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const CHAT_ID = String(process.env.TELEGRAM_CHAT_ID?.trim());
const API = `https://api.telegram.org/bot${TOKEN}`;

if (!TOKEN || !CHAT_ID) {
  console.error('❌ TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required.');
  process.exit(1);
}

let offset = 0;
let running = false;

async function sendMessage(text) {
  try {
    await fetch(`${API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch (err) {
    console.error('❌ Failed to send Telegram message:', err.message);
  }
}

function runScript(script, label) {
  if (running) {
    sendMessage('⚠️ Una pipeline è già in esecuzione. Attendi che finisca.');
    return;
  }

  running = true;
  sendMessage(`🚀 <b>${label}</b> avviato...`);

  const child = spawn('node', [script], { stdio: 'inherit' });

  child.on('close', (code) => {
    running = false;
    if (code === 0) {
      sendMessage(`✅ <b>${label}</b> completato.`);
    } else {
      sendMessage(`❌ <b>${label}</b> terminato con errore (codice ${code}).`);
    }
  });
}

async function poll() {
  try {
    const res = await fetch(`${API}/getUpdates?offset=${offset}&timeout=30`);
    const data = await res.json();

    for (const update of data.result ?? []) {
      offset = update.update_id + 1;

      const fromId = String(update.message?.chat?.id);
      const text = update.message?.text?.trim();

      // Ignore messages from anyone other than the configured chat
      if (fromId !== CHAT_ID) continue;

      if (text === '/hunt') runScript('index.js', 'Job Hunt');
      else if (text === '/scout') runScript('scouting.js', 'Company Scout');
      else if (text === '/status') sendMessage(running ? '⏳ Pipeline in esecuzione...' : '💤 Bot in attesa.');
      else if (text?.startsWith('/')) sendMessage('Comandi disponibili:\n/hunt — avvia la ricerca lavoro\n/scout — avvia lo scouting aziende\n/status — controlla se una pipeline è in corso');
    }
  } catch (err) {
    console.error('❌ Poll error:', err.message);
  }

  // Long-polling: immediately restart the cycle
  poll();
}

console.log('🤖 Bot is running. Listening for /hunt, /scout, /status...');
poll();
