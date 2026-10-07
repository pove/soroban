/** Minimal observable state container. */

/**
 * @template S
 * @param {S} initial
 */
export function createStore(initial) {
  let state = initial;
  const subscribers = new Set();

  return {
    get: () => state,

    /** Replaces the state; subscribers run only when the reference actually changed. */
    set(next) {
      if (next === state) return;
      const previous = state;
      state = next;
      subscribers.forEach((subscriber) => subscriber(state, previous));
    },

    /** @returns {() => void} unsubscribe */
    subscribe(subscriber) {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },
  };
}
