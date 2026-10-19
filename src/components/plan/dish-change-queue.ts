export interface DishChangeQueue {
  // Runs `send` after the earlier changes to the same dish have finished, and returns what it returned.
  // `seenVersion` is the version of the dish the person saw when they made the change. `send` gets the newer of that and
  // the version the previous change to the dish returned, so quick taps by one person never conflict with each other.
  // `versionOf` reads the dish's new version from the result, or null when there is none (a failure, or a removal).
  // Changes to different dishes don't wait for each other.
  run<R>(dishId: string, seenVersion: number, send: (version: number) => Promise<R>, versionOf: (result: R) => number | null): Promise<R>;
}

export function createDishChangeQueue(): DishChangeQueue {
  const tails = new Map<string, Promise<unknown>>();
  const versions = new Map<string, number>();

  return {
    run(dishId, seenVersion, send, versionOf) {
      const previous = tails.get(dishId) ?? Promise.resolve();
      const result = previous.then(async () => {
        const outcome = await send(Math.max(seenVersion, versions.get(dishId) ?? 0));
        const next = versionOf(outcome);
        if (next !== null) versions.set(dishId, Math.max(next, versions.get(dishId) ?? 0));
        return outcome;
      });
      // A failed change must not stop the ones queued behind it.
      const tail = result.catch(() => undefined);
      tails.set(dishId, tail);
      void tail.then(() => {
        if (tails.get(dishId) === tail) tails.delete(dishId);
      });
      return result;
    },
  };
}
