import { describe, expect, it } from 'vitest';

import { createDatabase } from './client.js';

describe('createDatabase', () => {
  it('rejects an empty connection string', () => {
    expect(() => createDatabase('')).toThrow(
      'Database connection string is required.',
    );
  });

  it('rejects a whitespace-only connection string', () => {
    expect(() => createDatabase('   ')).toThrow(
      'Database connection string is required.',
    );
  });
});
