import { describe, it, expect, vi, afterEach } from 'vitest';
import { today, isoDate, addDays, addMonths, weekdayOf, startOfWeek, datesBetween, setAppTimezone, dayIdOf } from '../src/lib/dates';

afterEach(() => {
  vi.useRealTimers();
  setAppTimezone('Asia/Riyadh');
});

describe('dates (Asia/Riyadh)', () => {
  it('"today" is the Riyadh date, not the UTC date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-05T22:30:00Z')); // 01:30 Mon in Riyadh, still Sun in UTC
    expect(today()).toBe('2025-01-06');
    expect(isoDate(new Date('2025-01-05T20:59:59Z'))).toBe('2025-01-05'); // 23:59:59 Riyadh
    expect(isoDate(new Date('2025-01-05T21:00:00Z'))).toBe('2025-01-06'); // 00:00:00 Riyadh
  });
  it('weekday of a date key is timezone independent', () => {
    expect(weekdayOf('2025-01-05')).toBe(0); // Sunday
    expect(dayIdOf('2025-01-11')).toBe('sat');
  });
  it('week starts on Sunday by default, configurable', () => {
    expect(startOfWeek('2025-01-08')).toBe('2025-01-05');
    expect(startOfWeek('2025-01-05')).toBe('2025-01-05');
    expect(startOfWeek('2025-01-08', 1)).toBe('2025-01-06');
    expect(startOfWeek('2025-01-04', 6)).toBe('2025-01-04');
  });
  it('addDays / addMonths do not drift across month ends', () => {
    expect(addDays('2025-01-31', 1)).toBe('2025-02-01');
    expect(addDays('2025-03-01', -1)).toBe('2025-02-28');
    expect(addMonths('2025-01-31', 1)).toBe('2025-02-28');
    expect(datesBetween('2025-01-30', '2025-02-02')).toHaveLength(4);
  });
  it('timezone is configurable', () => {
    setAppTimezone('America/Los_Angeles');
    expect(isoDate(new Date('2025-01-06T03:00:00Z'))).toBe('2025-01-05');
  });
});
