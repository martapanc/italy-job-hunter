import { DIRECTORY_SEED_MAX_PER_SOURCE } from './config.js';

/**
 * Seeds scout candidates from curated remote-company directories.
 *
 * Unlike the Tavily scout search (which finds companies via the open web), these are
 * hand-maintained directories of remote-friendly companies. Both expose their data in a
 * cleanly parseable form, so we read them directly — no search API needed:
 *
 *   - remoteintech.company  → GitHub repo `remoteintech/remote-jobs`, one Markdown file with
 *                             YAML frontmatter per company under `src/companies/`.
 *   - italiaremote.com      → Next.js SSG site; the full company list is inlined in the
 *                             `__NEXT_DATA__` JSON blob on the /companies page.
 *
 * Every source is wrapped in its own try/catch and returns [] on failure, so a flaky network
 * or an upstream layout change degrades gracefully instead of breaking a scouting run.
 *
 * @module directory_seeder
 */

const REMOTEINTECH_API =
  'https://api.github.com/repos/remoteintech/remote-jobs/contents/src/companies';
const REMOTEINTECH_RAW =
  'https://raw.githubusercontent.com/remoteintech/remote-jobs/main/src/companies';
const ITALIAREMOTE_URL = 'https://italiaremote.com/companies';

/** Returns up to `n` items chosen at random from `arr` (Fisher–Yates partial shuffle). */
function sample(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.max(0, n));
}

/** Parses a leading `--- ... ---` YAML frontmatter block into a flat key→string map. */
function parseFrontmatter(markdown) {
  const match = /^---\n([\s\S]*?)\n---/.exec(markdown);
  if (!match) return { frontmatter: {}, body: markdown };

  const frontmatter = {};
  for (const line of match[1].split('\n')) {
    const kv = /^([a-zA-Z0-9_]+):\s*(.*)$/.exec(line);
    if (kv && kv[2] !== '') frontmatter[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  const body = markdown.slice(match[0].length).trim();
  return { frontmatter, body };
}

/**
 * Fetches a random sample of companies from the remoteintech.company directory.
 * @param {number} limit
 * @returns {Promise<Array<{name: string, url: string, content: string}>>}
 */
export async function fetchRemoteInTechCompanies(limit) {
  try {
    const listRes = await fetch(REMOTEINTECH_API, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'italy-job-hunter' },
    });
    if (!listRes.ok) throw new Error(`GitHub API ${listRes.status}`);

    const files = await listRes.json();
    const slugs = (Array.isArray(files) ? files : [])
      .map(f => f?.name)
      .filter(name => typeof name === 'string' && name.endsWith('.md'));

    const companies = [];
    for (const slug of sample(slugs, limit)) {
      try {
        const res = await fetch(`${REMOTEINTECH_RAW}/${slug}`);
        if (!res.ok) continue;
        const { frontmatter, body } = parseFrontmatter(await res.text());

        const name = frontmatter.title || slug.replace(/\.md$/, '');
        const url = frontmatter.website || frontmatter.careers_url;
        if (!url) continue;

        const blurb = body.replace(/^#.*$/gm, '').replace(/\s+/g, ' ').trim().slice(0, 500);
        const meta = [frontmatter.region, frontmatter.remote_policy]
          .filter(Boolean)
          .join(', ');

        companies.push({
          name,
          url,
          content: [meta && `[${meta}]`, blurb].filter(Boolean).join(' '),
        });
      } catch {
        // Skip an individual company that fails to fetch/parse.
      }
    }
    return companies;
  } catch (error) {
    console.error('⚠️ remoteintech seed failed:', error.message);
    return [];
  }
}

/**
 * Fetches a random sample of companies from the italiaremote.com directory.
 * @param {number} limit
 * @returns {Promise<Array<{name: string, url: string, content: string}>>}
 */
export async function fetchItaliaRemoteCompanies(limit) {
  try {
    const res = await fetch(ITALIAREMOTE_URL, {
      headers: { 'User-Agent': 'italy-job-hunter' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const match = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
    if (!match) throw new Error('__NEXT_DATA__ not found');

    const list = JSON.parse(match[1])?.props?.pageProps?.companies;
    const companies = (Array.isArray(list) ? list : []).filter(c => c?.name && c?.url);

    return sample(companies, limit).map(c => {
      const facts = [
        c.type,
        c.remote_policy && `remote: ${c.remote_policy}`,
        Array.isArray(c.tags) && c.tags.length ? `tech: ${c.tags.slice(0, 10).join(', ')}` : null,
      ].filter(Boolean);

      return {
        name: c.name,
        url: c.url,
        content: `Italian remote-friendly company. ${facts.join('. ')}.`.trim(),
      };
    });
  } catch (error) {
    console.error('⚠️ italiaremote seed failed:', error.message);
    return [];
  }
}

/**
 * Seeds scout candidates from all curated directories, deduplicated by hostname.
 * @param {number} [perSource=DIRECTORY_SEED_MAX_PER_SOURCE]
 * @returns {Promise<Array<{name: string, url: string, content: string}>>}
 */
export async function seedCompaniesFromDirectories(perSource = DIRECTORY_SEED_MAX_PER_SOURCE) {
  const [remoteInTech, italiaRemote] = await Promise.all([
    fetchRemoteInTechCompanies(perSource),
    fetchItaliaRemoteCompanies(perSource),
  ]);

  const seen = new Set();
  const dedupKey = url => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  return [...remoteInTech, ...italiaRemote].filter(c => {
    const key = dedupKey(c.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
