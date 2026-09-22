import { describe, expect, it } from 'vitest';

import {
  InvalidLocalDateTimeError,
  zonedDateTimeLocalToIso,
} from './timezone';

describe('zonedDateTimeLocalToIso', () => {
  it('converts Bogota business time to UTC', () => {
    expect(
      zonedDateTimeLocalToIso(
        '2026-09-21T09:00',
        'America/Bogota',
      ),
    ).toBe('2026-09-21T14:00:00.000Z');
  });

  it('uses the business timezone instead of the machine timezone', () => {
    expect(
      zonedDateTimeLocalToIso(
        '2026-01-15T09:00',
        'America/New_York',
      ),
    ).toBe('2026-01-15T14:00:00.000Z');
  });

  it('rejects a nonexistent local time during a DST jump', () => {
    expect(() =>
      zonedDateTimeLocalToIso(
        '2026-03-08T02:30',
        'America/New_York',
      ),
    ).toThrow(InvalidLocalDateTimeError);
  });

  it('rejects an invalid timezone', () => {
    expect(() =>
      zonedDateTimeLocalToIso(
        '2026-09-21T09:00',
        'Invalid/Timezone',
      ),
    ).toThrow(InvalidLocalDateTimeError);
  });

  it('rejects invalid calendar dates', () => {
    expect(() =>
      zonedDateTimeLocalToIso(
        '2026-02-31T09:00',
        'America/Bogota',
      ),
    ).toThrow(InvalidLocalDateTimeError);
  });
});
