const { flagEmoji, sliderBackground, computeCountdown, FINAL_DATE } = require('../script.js');

// ── flagEmoji ─────────────────────────────────────────────────────────────────

describe('flagEmoji', () => {
  it('produces the correct flag for a known 2-letter code', () => {
    expect(flagEmoji('GB')).toBe('🇬🇧');
    expect(flagEmoji('AU')).toBe('🇦🇺');
    expect(flagEmoji('AT')).toBe('🇦🇹'); // host
    expect(flagEmoji('FR')).toBe('🇫🇷');
    expect(flagEmoji('SE')).toBe('🇸🇪');
  });

  it('is case-insensitive', () => {
    expect(flagEmoji('gb')).toBe('🇬🇧');
    expect(flagEmoji('Se')).toBe('🇸🇪');
  });
});

// ── sliderBackground ──────────────────────────────────────────────────────────

describe('sliderBackground', () => {
  it('returns a CSS gradient string', () => {
    expect(sliderBackground(5)).toMatch(/^linear-gradient/);
  });

  it('fills 0 % at score 0', () => {
    expect(sliderBackground(0)).toBe(
      'linear-gradient(to right, var(--gold) 0%, var(--border) 0%)'
    );
  });

  it('fills 50 % at score 5', () => {
    expect(sliderBackground(5)).toBe(
      'linear-gradient(to right, var(--gold) 50%, var(--border) 50%)'
    );
  });

  it('fills 100 % at score 10', () => {
    expect(sliderBackground(10)).toBe(
      'linear-gradient(to right, var(--gold) 100%, var(--border) 100%)'
    );
  });

  it('fills 30 % at score 3', () => {
    expect(sliderBackground(3)).toBe(
      'linear-gradient(to right, var(--gold) 30%, var(--border) 30%)'
    );
  });
});

// ── computeCountdown ──────────────────────────────────────────────────────────

describe('computeCountdown', () => {
  it('returns null when diff is zero', () => {
    expect(computeCountdown(0)).toBeNull();
  });

  it('returns null when diff is negative', () => {
    expect(computeCountdown(-1)).toBeNull();
    expect(computeCountdown(-86400000)).toBeNull();
  });

  it('computes exactly 1 day', () => {
    expect(computeCountdown(864e5)).toEqual({ days: 1, hours: 0, mins: 0, secs: 0 });
  });

  it('computes mixed units correctly', () => {
    const diff = (2 * 864e5) + (3 * 36e5) + (15 * 6e4) + (45 * 1e3);
    expect(computeCountdown(diff)).toEqual({ days: 2, hours: 3, mins: 15, secs: 45 });
  });

  it('does not overflow seconds into minutes', () => {
    expect(computeCountdown(59_000)).toEqual({ days: 0, hours: 0, mins: 0, secs: 59 });
  });

  it('does not overflow minutes into hours', () => {
    expect(computeCountdown(59 * 6e4)).toEqual({ days: 0, hours: 0, mins: 59, secs: 0 });
  });

  it('does not overflow hours into days', () => {
    expect(computeCountdown(23 * 36e5)).toEqual({ days: 0, hours: 23, mins: 0, secs: 0 });
  });

  it('handles 1 second remaining', () => {
    expect(computeCountdown(1000)).toEqual({ days: 0, hours: 0, mins: 0, secs: 1 });
  });
});

// ── FINAL_DATE ────────────────────────────────────────────────────────────────

describe('FINAL_DATE', () => {
  it('is a valid Date', () => {
    expect(FINAL_DATE).toBeInstanceOf(Date);
    expect(isNaN(FINAL_DATE.getTime())).toBe(false);
  });

  it('is 16 May 2026 at 21:00 CEST (19:00 UTC)', () => {
    expect(FINAL_DATE.toISOString()).toBe('2026-05-16T19:00:00.000Z');
  });

  it('is in the future relative to the contest year', () => {
    expect(FINAL_DATE.getFullYear()).toBe(2026);
    expect(FINAL_DATE.getMonth()).toBe(4); // 0-indexed: May
    expect(FINAL_DATE.getDate()).toBe(16);
  });
});
