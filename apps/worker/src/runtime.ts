export function getWorkerRuntimeInfo() {
  return {
    service: 'worker',
    status: 'ready' as const,
  };
}
