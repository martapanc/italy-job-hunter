import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runJobTriage } from '../src/triage_filter.js';

vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));

const mockListing = {
  title: 'Senior Full Stack Engineer — Fully Remote',
  content: 'We are hiring a senior full-stack engineer. Fully remote, anywhere in Europe. Stack: Node.js, React, TypeScript.',
};

describe('runJobTriage', () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.GROQ_API_KEY;
    vi.restoreAllMocks();
  });

  it('returns true when Groq responds with "YES"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'YES' } }] }),
    }));
    expect(await runJobTriage(mockListing)).toBe(true);
  });

  it('returns false when Groq responds with "NO"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'NO' } }] }),
    }));
    expect(await runJobTriage(mockListing)).toBe(false);
  });

  it('returns true when response contains "YES" with trailing text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'YES, this matches' } }] }),
    }));
    expect(await runJobTriage(mockListing)).toBe(true);
  });

  it('returns false when GROQ_API_KEY is missing', async () => {
    delete process.env.GROQ_API_KEY;
    expect(await runJobTriage(mockListing)).toBe(false);
  });

  it('returns false on network error without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
    await expect(runJobTriage(mockListing)).resolves.toBe(false);
  });
});
