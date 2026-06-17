import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fetchRemoteInTechCompanies,
  fetchItaliaRemoteCompanies,
  seedCompaniesFromDirectories,
} from '../src/directory_seeder.js';

vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));

const COMPANY_MD = `---
title: "Acme Remote"
slug: acme-remote
website: https://acme.example
careers_url: https://acme.example/careers
region: europe
remote_policy: remote-only
---

## Company blurb

Acme builds developer tools for distributed teams.

## Company size

Medium.
`;

const ITALIA_HTML = `<!DOCTYPE html><html><body>
<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
  props: {
    pageProps: {
      companies: [
        { name: '20tab', url: 'https://www.20tab.com/', type: 'Consulting', remote_policy: 'Full', tags: ['Python', 'React'] },
        { name: 'NoUrl', type: 'Product' },
      ],
    },
  },
})}</script>
</body></html>`;

/** Routes a mocked fetch by URL substring. */
function routedFetch(routes) {
  return vi.fn(async (url) => {
    for (const [needle, response] of routes) {
      if (url.includes(needle)) return response;
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
}

const okJson = (data) => ({ ok: true, json: async () => data, text: async () => JSON.stringify(data) });
const okText = (text) => ({ ok: true, text: async () => text });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchRemoteInTechCompanies', () => {
  it('parses frontmatter into {name, url, content}', async () => {
    vi.stubGlobal('fetch', routedFetch([
      ['api.github.com', okJson([{ name: 'acme-remote.md' }])],
      ['raw.githubusercontent.com', okText(COMPANY_MD)],
    ]));

    const result = await fetchRemoteInTechCompanies(5);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Acme Remote');
    expect(result[0].url).toBe('https://acme.example');
    expect(result[0].content).toContain('europe, remote-only');
    expect(result[0].content).toContain('developer tools');
  });

  it('returns [] when the GitHub API errors, without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(fetchRemoteInTechCompanies(3)).resolves.toEqual([]);
  });

  it('skips company files that lack a website/careers url', async () => {
    vi.stubGlobal('fetch', routedFetch([
      ['api.github.com', okJson([{ name: 'nourl.md' }])],
      ['raw.githubusercontent.com', okText('---\ntitle: "No URL"\nregion: europe\n---\nblurb')],
    ]));
    await expect(fetchRemoteInTechCompanies(3)).resolves.toEqual([]);
  });
});

describe('fetchItaliaRemoteCompanies', () => {
  it('extracts companies from __NEXT_DATA__ and skips entries without a url', async () => {
    vi.stubGlobal('fetch', routedFetch([['italiaremote.com', okText(ITALIA_HTML)]]));

    const result = await fetchItaliaRemoteCompanies(10);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('20tab');
    expect(result[0].url).toBe('https://www.20tab.com/');
    expect(result[0].content).toContain('Italian remote-friendly');
    expect(result[0].content).toContain('Python');
  });

  it('returns [] when the response is not ok, without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchItaliaRemoteCompanies(3)).resolves.toEqual([]);
  });

  it('returns [] when __NEXT_DATA__ is absent', async () => {
    vi.stubGlobal('fetch', routedFetch([['italiaremote.com', okText('<html><body>no data</body></html>')]]));
    await expect(fetchItaliaRemoteCompanies(3)).resolves.toEqual([]);
  });
});

describe('seedCompaniesFromDirectories', () => {
  it('merges both sources and deduplicates by hostname', async () => {
    const sameHostMd = COMPANY_MD.replace('https://acme.example', 'https://20tab.com');
    vi.stubGlobal('fetch', routedFetch([
      ['api.github.com', okJson([{ name: 'twentytab.md' }])],
      ['raw.githubusercontent.com', okText(sameHostMd)],
      ['italiaremote.com', okText(ITALIA_HTML)],
    ]));

    const result = await seedCompaniesFromDirectories(5);
    const hosts = result.map(c => new URL(c.url).hostname.replace(/^www\./, ''));
    expect(new Set(hosts).size).toBe(hosts.length); // no duplicate hostnames
    expect(hosts).toContain('20tab.com');
  });

  it('still returns the working source when the other fails', async () => {
    vi.stubGlobal('fetch', routedFetch([
      ['api.github.com', { ok: false, status: 500 }],
      ['italiaremote.com', okText(ITALIA_HTML)],
    ]));

    const result = await seedCompaniesFromDirectories(5);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('20tab');
  });
});
