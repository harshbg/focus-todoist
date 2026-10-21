import { describe, expect, it } from 'vitest';
import { shortDuration } from './format';

describe('shortDuration', () => {
  it('reads like the daily quest', () => {
    expect(shortDuration(0)).toBe('0m');
    expect(shortDuration(30)).toBe('30m');
    expect(shortDuration(240)).toBe('4h');
    expect(shortDuration(90)).toBe('1h30');
    expect(shortDuration(65)).toBe('1h05');
  });
});
