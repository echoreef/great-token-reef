import { describe, expect, it } from 'vitest';
import { otherTheme, parseTheme, resolveTheme } from './theme';

describe('parseTheme', () => {
  it('keeps light and dark and drops anything else', () => {
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('system')).toBeNull();
    expect(parseTheme(null)).toBeNull();
  });
});

describe('resolveTheme', () => {
  it('a saved choice wins over the OS', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
  it('without a saved choice it follows the OS', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme(null, false)).toBe('light');
  });
});

describe('otherTheme', () => {
  it('flips', () => {
    expect(otherTheme('dark')).toBe('light');
    expect(otherTheme('light')).toBe('dark');
  });
});
