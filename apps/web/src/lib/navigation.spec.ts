import { describe, expect, it } from 'vitest';

import { isNavigationItemActive } from './navigation';

describe('isNavigationItemActive', () => {
  it('matches an exact route', () => {
    expect(isNavigationItemActive('/dashboard', '/dashboard')).toBe(true);
  });

  it('matches nested module routes', () => {
    expect(isNavigationItemActive('/contacts/123', '/contacts')).toBe(true);
  });

  it('does not treat dashboard as a prefix route', () => {
    expect(isNavigationItemActive('/dashboard/example', '/dashboard')).toBe(
      false,
    );
  });

  it('rejects unrelated routes', () => {
    expect(isNavigationItemActive('/services', '/contacts')).toBe(false);
  });
});
