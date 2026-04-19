export type CardConfigUpdate<T> = Partial<T> | ((prev: T) => T);
export type CardConfigMeta = { hydrated: boolean };

/**
 * Per-card configuration persisted to localStorage under a namespaced key.
 * Consumers get `[config, setConfig, meta]`; `setConfig` accepts either a
 * `Partial<T>` merge object or a reducer `(prev) => next`.
 */
export declare function useCardConfig<T>(
  cardId: string,
  defaults: T,
): [T, (next: CardConfigUpdate<T>) => void, CardConfigMeta];

export default useCardConfig;
