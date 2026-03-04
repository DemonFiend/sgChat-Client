/**
 * Zustand Selector Stability Detector
 *
 * In development mode, wraps a Zustand store to detect selectors that return
 * unstable references. Zustand 5 uses `useSyncExternalStore` directly with NO
 * memoization — if a selector returns a new object/array every call, React 19's
 * consistency check triggers infinite re-renders (error #185).
 *
 * Usage:
 *   import { create } from 'zustand';
 *   import { wrapStoreWithStabilityCheck } from '../lib/stableSelector';
 *   const useMyStore = wrapStoreWithStabilityCheck('MyStore', create<State>(...));
 *
 * In production, wrapStoreWithStabilityCheck is a no-op pass-through.
 */

const isDev = import.meta.env?.DEV ?? false;

// Track which selectors have already been warned about (avoid spam)
const warnedSelectors = new WeakSet<Function>();

/**
 * Wraps a Zustand store hook to check selector stability in dev mode.
 * When a selector returns different values for the same state (via Object.is),
 * logs a detailed error with the selector source and both values.
 */
export function wrapStoreWithStabilityCheck<S extends (...args: any[]) => any>(
  storeName: string,
  store: S,
): S {
  if (!isDev) return store;

  const wrapped = ((selector?: (state: any) => any) => {
    if (!selector) {
      // Selector-less call — this is caught by ESLint, but warn here too
      console.warn(
        `[Zustand/${storeName}] Called without selector — subscribes to entire store. ` +
        `Use a selector: use${storeName}((s) => s.value)`,
      );
      return (store as any)();
    }

    // Check stability: call selector twice with the same state
    if (!warnedSelectors.has(selector)) {
      const state = (store as any).getState();
      try {
        const r1 = selector(state);
        const r2 = selector(state);
        if (!Object.is(r1, r2)) {
          warnedSelectors.add(selector);
          console.error(
            `[Zustand/${storeName}] UNSTABLE SELECTOR detected!\n` +
            `The selector returned different values when called twice with identical state.\n` +
            `This WILL cause React error #185 (infinite re-render loop).\n\n` +
            `Selector: ${selector.toString().slice(0, 300)}\n` +
            `Result 1:`, r1,
            `\nResult 2:`, r2,
            `\n\nFix: Return primitives or stable state references from selectors.\n` +
            `Bad:  (s) => s.items.filter(...)\n` +
            `Good: (s) => s.items  // then filter in component body`,
          );
        }
      } catch {
        // Selector threw — let Zustand handle it normally
      }
    }

    return (store as any)(selector);
  }) as unknown as S;

  // Copy over static methods (getState, setState, subscribe, etc.)
  Object.assign(wrapped, store);

  return wrapped;
}
