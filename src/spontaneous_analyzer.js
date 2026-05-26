import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { OLLAMA_BASE_URL, OLLAMA_MODEL } from './config.js';
dotenv.config();

/**
 * Generates a spontaneous application pitch for a target company using a local Ollama model.
 * Reads data/cv.md and data/profile.md for candidate context.
 *
 * @param {{ name: string, url: string, content: string }} company
 * @returns {Promise<string>} formatted pitch report, or an error string on failure
 */
export async function generateCompanyPitch(company) {
  const cvPath = path.join(process.cwd(), 'data', 'cv.md');
  const profilePath = path.join(process.cwd(), 'data', 'profile.md');
  let cvContent = '';
  let profile = '';

  try {
    cvContent = fs.readFileSync(cvPath, 'utf-8');
  } catch {
    console.warn('⚠️ CV not found at data/cv.md. Analysis will be generic.');
  }

  if (fs.existsSync(profilePath)) {
    try {
      profile = fs.readFileSync(profilePath, 'utf-8');
    } catch {
      console.warn('⚠️ Could not read data/profile.md.');
    }
  }

  const systemPrompt = `You are a senior career advisor helping a software engineer find fully-remote opportunities worldwide.
Generate a structured, ready-to-use spontaneous application for the given company.

Candidate profile:
${profile}

Candidate CV:
${cvContent}

Generate a report using Markdown bold (**text**) for headings, optimized for Telegram:

🚀 **WHY THIS COMPANY?**
(2 lines: what they do and why it fits the candidate's background)

🎯 **YOUR ANGLE**
(What specific value the candidate brings — link their experience to this company's domain)

🌍 **REMOTE COMPATIBILITY**
(Does this company appear to support fully-remote work from Europe? Any flags?)

✉️ **COLD OUTREACH MESSAGE**
(Short, professional message to send to a CTO or Hiring Manager. Focused on value delivered.)`;

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Company: ${company.name}\nWebsite: ${company.url}\nContext: ${company.content}`,
          },
        ],
        temperature: 0.3,
        stream: false,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Ollama API error: ${response.status} — ${body} (check OLLAMA_MODEL in config.js matches \`ollama list\`)`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? 'Analysis unavailable.';
  } catch (error) {
    console.error('❌ Error generating pitch:', error.message);
    return 'Error generating pitch.';
  }
}
