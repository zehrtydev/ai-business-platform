export class InvalidLocalDateTimeError extends Error {
  constructor() {
    super('The local date-time or timezone is invalid.');
    this.name = 'InvalidLocalDateTimeError';
  }
}

interface DateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function partsInTimeZone(
  timestamp: number,
  timeZone: string,
): DateTimeParts {
  let parts: Intl.DateTimeFormatPart[];

  try {
    parts = new Intl.DateTimeFormat('en-US-u-ca-gregory', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(timestamp));
  } catch {
    throw new InvalidLocalDateTimeError();
  }

  function numberPart(type: Intl.DateTimeFormatPartTypes): number {
    const value = parts.find((part) => part.type === type)?.value;
    const parsed = Number(value);

    if (!Number.isInteger(parsed)) {
      throw new InvalidLocalDateTimeError();
    }

    return parsed;
  }

  return {
    year: numberPart('year'),
    month: numberPart('month'),
    day: numberPart('day'),
    hour: numberPart('hour'),
    minute: numberPart('minute'),
  };
}

function sameParts(
  left: DateTimeParts,
  right: DateTimeParts,
): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  );
}

export function zonedDateTimeLocalToIso(
  value: string,
  timeZone: string,
): string {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());

  const normalizedTimeZone = timeZone.trim();

  if (!match || !normalizedTimeZone) {
    throw new InvalidLocalDateTimeError();
  }

  const requested: DateTimeParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };

  const requestedAsUtc = Date.UTC(
    requested.year,
    requested.month - 1,
    requested.day,
    requested.hour,
    requested.minute,
  );

  const validationDate = new Date(requestedAsUtc);

  if (
    validationDate.getUTCFullYear() !== requested.year ||
    validationDate.getUTCMonth() + 1 !== requested.month ||
    validationDate.getUTCDate() !== requested.day ||
    validationDate.getUTCHours() !== requested.hour ||
    validationDate.getUTCMinutes() !== requested.minute
  ) {
    throw new InvalidLocalDateTimeError();
  }

  let candidate = requestedAsUtc;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = partsInTimeZone(candidate, normalizedTimeZone);

    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
    );

    const adjustment = requestedAsUtc - actualAsUtc;

    if (adjustment === 0) {
      break;
    }

    candidate += adjustment;
  }

  const verified = partsInTimeZone(candidate, normalizedTimeZone);

  if (!sameParts(verified, requested)) {
    throw new InvalidLocalDateTimeError();
  }

  return new Date(candidate).toISOString();
}
