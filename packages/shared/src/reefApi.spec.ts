import { describe, expect, it } from 'vitest';
import { ReefExpeditionStartBody, ReefExpeditionTitleBody, ReefExpeditions } from './reefApi.ts';

describe('expedition schemas', () => {
  it('accepts a start body of a known depth and three species', () => {
    expect(ReefExpeditionStartBody.safeParse({ depth: 'abyss', party: [1, 2, 1000] }).success).toBe(true);
    expect(ReefExpeditionStartBody.safeParse({ depth: 'moon', party: [1, 2, 3] }).success).toBe(false);
    expect(ReefExpeditionStartBody.safeParse({ depth: 'reef', party: [1, 2] }).success).toBe(false);
  });
  it('accepts a title id or null', () => {
    expect(ReefExpeditionTitleBody.safeParse({ title: null }).success).toBe(true);
    expect(ReefExpeditionTitleBody.safeParse({ title: 'leviathan' }).success).toBe(true);
    expect(ReefExpeditionTitleBody.safeParse({ title: '' }).success).toBe(false);
  });
  it('refuses a response with a field the contract does not declare', () => {
    const state = { typicalDayTokens: 1, trip: null, fish: [], finds: [] };
    expect(ReefExpeditions.safeParse(state).success).toBe(true);
    expect(ReefExpeditions.safeParse({ ...state, extra: 1 }).success).toBe(false);
  });
});
