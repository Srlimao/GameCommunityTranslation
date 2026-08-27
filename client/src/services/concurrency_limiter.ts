/**
 * Lightweight Promise Concurrency Limiter
 * Limits simultaneous async operations to avoid browser socket exhaustion
 */
export function pLimit(concurrency: number) {
  let activeCount = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    activeCount--;
    if (queue.length > 0 && activeCount < concurrency) {
      const run = queue.shift();
      if (run) run();
    }
  };

  return function <T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const execute = () => {
        activeCount++;
        fn()
          .then(resolve)
          .catch(reject)
          .finally(next);
      };

      if (activeCount < concurrency) {
        execute();
      } else {
        queue.push(execute);
      }
    });
  };
}

/**
 * Executes an array of async tasks with a maximum concurrency limit
 * and an optional progress callback.
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<R>,
  onProgress?: (completed: number, total: number) => void
): Promise<R[]> {
  const limit = pLimit(concurrency);
  let completed = 0;
  const total = items.length;

  const promises = items.map((item, index) =>
    limit(async () => {
      const result = await task(item, index);
      completed++;
      if (onProgress) onProgress(completed, total);
      return result;
    })
  );

  return Promise.all(promises);
}
