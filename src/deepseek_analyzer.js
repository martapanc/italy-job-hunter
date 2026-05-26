import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { OLLAMA_BASE_URL, OLLAMA_MODEL } from './config.js';
dotenv.config();

/**
 * Analyzes a job listing against the user's CV using a local Ollama model.
 * Reads data/cv.md for the candidate's experience and data/profile.md for job preferences.
 *
 * @param {{ title: string, url: string, content: string }} listing
 * @returns {Promise<string>} compatibility report, or an error string on failure
 */
export async function analyzeJobListing(listing) {
  try {
    const cvPath = path.join(process.cwd(), 'data', 'cv.md');
    const profilePath = path.join(process.cwd(), 'data', 'profile.md');
    const cvContent = fs.readFileSync(cvPath, 'utf-8');
    const profile = fs.existsSync(profilePath) ? fs.readFileSync(profilePath, 'utf-8') : '';

    const systemPrompt = `You are a senior tech recruiter and career advisor.
Analyze the job listing against the candidate's CV and profile. Generate a concise report in English,
optimized for Telegram (bold headings, bullet points, no long walls of text).

Candidate profile:
${profile}

Structure the response exactly like this:
🎯 **MATCH SCORE**: [0–100% based on tech stack and experience overlap]
✅ **STRENGTHS**: [2–3 bullet points — what the candidate brings that fits this role]
⚠️ **GAPS**: [What is missing or worth preparing for the interview]
📝 **OUTREACH HOOK**: [2–3 sentence message ready to send to a recruiter or via LinkedIn]
🌍 **REMOTE/LOCATION NOTE**: [Flag any geographic restrictions or timezone requirements. Note: UK roles are fine (candidate holds ILR). Flag US-only restrictions or on-site requirements.]`;

    const userContent = `### CANDIDATE CV:\n${cvContent}\n\n### JOB LISTING:\nTitle: ${listing.title}\nLink: ${listing.url}\nText: ${listing.content}`;

    const response = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 800,
        stream: false,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Ollama API error: ${response.status} — ${body} (check OLLAMA_MODEL in config.js matches \`ollama list\`)`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? 'Unable to generate analysis.';

  } catch (error) {
    console.error('❌ Error during job analysis:', error.message);
    return 'Unable to generate job analysis.';
  }
}
