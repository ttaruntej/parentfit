import { describe, expect, test } from 'vitest';
import { getCurrentStreak } from '../lib/streak';

describe('getCurrentStreak', () => {
  test('counts consecutive local dates through today', () => {
    const today = new Date('2026-05-15T09:00:00');
    const logs = [
      { date: '2026-05-15T06:00:00.000Z' },
      { date: '2026-05-14T06:00:00.000Z' },
      { date: '2026-05-13T06:00:00.000Z' },
      { date: '2026-05-10T06:00:00.000Z' },
    ];

    expect(getCurrentStreak(logs, today)).toBe(3);
  });

  test('returns zero with no logs', () => {
    expect(getCurrentStreak([], new Date('2026-05-15T09:00:00'))).toBe(0);
  });
});
