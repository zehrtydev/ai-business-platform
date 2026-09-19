import { describe, expect, it } from 'vitest';

import { getWorkerRuntimeInfo } from './runtime.js';

describe('worker runtime', () => {
  it('reports the worker as ready', () => {
    expect(getWorkerRuntimeInfo()).toEqual({
      service: 'worker',
      status: 'ready',
    });
  });
});
