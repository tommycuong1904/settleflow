/**
 * A single-use rendezvous barrier for deterministic concurrency tests.
 *
 * `count` callers await `wait()`; all are released together only after every
 * caller has arrived. This lets concurrent operations reach a specific point
 * (e.g. a database INSERT) at the same time without sleeps, timeouts, or
 * timing assumptions, and without assuming which caller arrives first.
 *
 * Test support only — never import from production code.
 */
export function createBarrier(count: number): { wait: () => Promise<void> } {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("createBarrier: count must be a positive integer");
  }
  let arrived = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    async wait(): Promise<void> {
      arrived += 1;
      if (arrived >= count) release();
      await gate;
    },
  };
}
