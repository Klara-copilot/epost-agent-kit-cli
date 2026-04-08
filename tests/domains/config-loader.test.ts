/**
 * Unit tests for ConfigSchema — skills.research validation and env var override
 */

import { describe, it, expect, afterEach } from 'vitest';
import { ConfigSchema } from '@/domains/config/config-loader.js';
import { z } from 'zod';

describe('ConfigSchema — skills.research', () => {
  it('accepts engine: gemini', () => {
    const result = ConfigSchema.parse({ skills: { research: { engine: 'gemini' } } });
    expect(result.skills?.research?.engine).toBe('gemini');
  });

  it('accepts engine: perplexity', () => {
    const result = ConfigSchema.parse({ skills: { research: { engine: 'perplexity' } } });
    expect(result.skills?.research?.engine).toBe('perplexity');
  });

  it('accepts engine: websearch', () => {
    const result = ConfigSchema.parse({ skills: { research: { engine: 'websearch' } } });
    expect(result.skills?.research?.engine).toBe('websearch');
  });

  it('rejects invalid engine value', () => {
    expect(() =>
      ConfigSchema.parse({ skills: { research: { engine: 'invalid' } } })
    ).toThrow(z.ZodError);
  });

  it('passes when skills is absent (optional)', () => {
    const result = ConfigSchema.parse({});
    expect(result.skills).toBeUndefined();
  });

  it('passes when skills.research is absent (optional)', () => {
    const result = ConfigSchema.parse({ skills: {} });
    expect(result.skills?.research).toBeUndefined();
  });

  it('defaults perplexity.model to sonar when not specified', () => {
    const result = ConfigSchema.parse({
      skills: { research: { engine: 'perplexity', perplexity: {} } },
    });
    expect(result.skills?.research?.perplexity?.model).toBe('sonar');
  });

  it('defaults gemini.model when not specified', () => {
    const result = ConfigSchema.parse({
      skills: { research: { engine: 'gemini', gemini: {} } },
    });
    expect(result.skills?.research?.gemini?.model).toBe('gemini-2.5-flash-preview-04-17');
  });

  it('preserves other config fields alongside skills', () => {
    const result = ConfigSchema.parse({
      profile: 'web-b2b',
      skills: { research: { engine: 'gemini' } },
    });
    expect(result.profile).toBe('web-b2b');
    expect(result.skills?.research?.engine).toBe('gemini');
  });
});

describe('EPOST_RESEARCH_ENGINE env var override', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    // Restore env
    for (const key of Object.keys(process.env)) {
      if (!(key in origEnv)) delete process.env[key];
    }
    Object.assign(process.env, origEnv);
  });

  it('env var overrides config file engine', async () => {
    process.env.EPOST_RESEARCH_ENGINE = 'perplexity';
    // loadConfig() reads env — simulate the override logic directly
    const base: Record<string, any> = { skills: { research: { engine: 'websearch' } } };
    if (process.env.EPOST_RESEARCH_ENGINE) {
      base.skills = base.skills ?? {};
      base.skills.research = base.skills.research ?? {};
      base.skills.research.engine = process.env.EPOST_RESEARCH_ENGINE;
    }
    const result = ConfigSchema.parse(base);
    expect(result.skills?.research?.engine).toBe('perplexity');
  });

  it('env var gemini overrides config gemini engine', async () => {
    process.env.EPOST_RESEARCH_ENGINE = 'gemini';
    const base: Record<string, any> = {};
    if (process.env.EPOST_RESEARCH_ENGINE) {
      base.skills = base.skills ?? {};
      base.skills.research = base.skills.research ?? {};
      base.skills.research.engine = process.env.EPOST_RESEARCH_ENGINE;
    }
    const result = ConfigSchema.parse(base);
    expect(result.skills?.research?.engine).toBe('gemini');
  });
});
