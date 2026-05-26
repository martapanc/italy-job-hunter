import dotenv from 'dotenv';
import { TRIAGE_MODEL } from './config.js';
dotenv.config();

/**
 * Boolean triage for a single job listing via Groq.
 * Accepts only fully-remote senior/lead engineering roles with no geographic restrictions
 * that would block a European remote worker.
 *
 * @param {{ title: string, content: string }} listing
 * @returns {Promise<boolean>} true if the listing passes, false otherwise
 */
export async function runJobTriage(listing) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error('❌ Error: GROQ_API_KEY not configured in .env');
    return false;
  }

  const systemPrompt = `You are a strict boolean filter for remote job listings.
Respond ONLY with "YES" or "NO". No explanations, no punctuation.

Respond YES if ALL of the following are true:
1. The job is FULLY REMOTE (not hybrid, not on-site).
2. Remote work from Europe or the UK is not explicitly excluded (e.g. it does not say "US residents only" or "must have US work authorization"). UK roles are fine — the candidate holds Indefinite Leave to Remain.
3. The role is NOT explicitly junior or entry-level (senior, mid-level, unspecified level, and lead/staff are all acceptable).
4. The role is a software engineering role: full-stack, backend, frontend, platform, or data engineering.
5. It is a genuine job offer, not a profile page, forum post, or news article.

Respond NO if:
- The job requires on-site or hybrid attendance.
- It explicitly restricts to US residents only or requires US work authorization.
- The role is explicitly junior, entry-level, or an internship.
- The role is C-level, VP, or non-engineering Director.
- It is not a real job listing.`;

  const userContent = `Title: ${listing.title}\nContent: ${listing.content}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: TRIAGE_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.0,
        max_tokens: 5,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const detail = errorData.error?.message || response.statusText;
      throw new Error(`Groq API Error: ${response.status} - ${detail}`);
    }

    const data = await response.json();
    const clean = data.choices[0].message.content.trim().toUpperCase();
    return clean.includes('YES');

  } catch (error) {
    console.error('❌ Error during Groq triage:', error.message);
    return false;
  }
}

/**
 * Boolean triage for a scouted company via Groq.
 * Accepts tech companies that are remote-friendly and plausibly hire senior engineers.
 *
 * @param {{ name: string, url: string, content: string }} company
 * @returns {Promise<boolean>} true if the company passes, false otherwise
 */
export async function runCompanyTriage(company) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error('❌ Error: GROQ_API_KEY not configured in .env');
    return false;
  }

  const systemPrompt = `You are a boolean filter. Respond ONLY "YES" or "NO". No explanations.

Respond YES if the company:
- Is a software/tech company (product, SaaS, agency, or startup)
- Appears to be remote-friendly or remote-first
- Would plausibly hire senior software engineers

Respond NO if:
- It is clearly not a software/tech company
- It explicitly requires on-site or local presence only
- It is a recruitment agency rather than a direct employer`;

  const userContent = `Company: ${company.name}\nURL: ${company.url}\nDescription: ${company.content}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: TRIAGE_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.0,
        max_tokens: 5,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Groq API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const clean = data.choices[0].message.content.trim().toUpperCase();
    return clean.includes('YES');

  } catch (error) {
    console.error('❌ Error during company triage:', error.message);
    return false;
  }
}
