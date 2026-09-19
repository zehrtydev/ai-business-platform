import { getWorkerRuntimeInfo } from './runtime.js';

const runtime = getWorkerRuntimeInfo();

console.info(
  JSON.stringify({
    level: 'info',
    ...runtime,
    message: 'Worker bootstrap initialized',
  }),
);
