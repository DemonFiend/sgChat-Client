// Type augmentation for electron-store v10.
// The default types from conf v14 + type-fest v4 break `get`/`set` resolution
// under TypeScript 5.9 due to DotNotationKeyOf complexity.
// This declaration re-exports a simplified type that restores the get/set API.

declare module 'electron-store' {
  import { EventTarget } from 'events';

  interface Options<T extends Record<string, any>> {
    defaults?: T;
    name?: string;
    cwd?: string;
    encryptionKey?: string | Buffer;
    clearInvalidConfig?: boolean;
    serialize?: (value: T) => string;
    deserialize?: (text: string) => T;
    projectVersion?: string;
    migrations?: Record<string, (store: ElectronStore<T>) => void>;
  }

  class ElectronStore<T extends Record<string, any> = Record<string, unknown>> {
    constructor(options?: Options<T>);

    readonly path: string;
    readonly events: EventTarget;
    store: T;
    readonly size: number;

    get<Key extends keyof T>(key: Key): T[Key];
    get<Key extends keyof T>(key: Key, defaultValue: Required<T>[Key]): Required<T>[Key];

    set<Key extends keyof T>(key: Key, value?: T[Key]): void;
    set(key: string, value: unknown): void;
    set(object: Partial<T>): void;

    has(key: keyof T): boolean;
    reset(...keys: Array<keyof T>): void;
    delete(key: keyof T): void;
    clear(): void;

    onDidChange<Key extends keyof T>(
      key: Key,
      callback: (newValue?: T[Key], oldValue?: T[Key]) => void,
    ): () => void;

    onDidAnyChange(
      callback: (newValue?: T, oldValue?: T) => void,
    ): () => void;

    static initRenderer(): void;
    openInEditor(): Promise<void>;

    [Symbol.iterator](): Iterator<[keyof T, T[keyof T]]>;
  }

  export default ElectronStore;
  export { Options };
}
