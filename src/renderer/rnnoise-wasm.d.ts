declare module '@jitsi/rnnoise-wasm' {
  interface RnnoiseModule {
    _rnnoise_init(): void;
    _rnnoise_create(): number;
    _rnnoise_destroy(state: number): void;
    _rnnoise_process_frame(state: number, output: number, input: number): number;
    _malloc(size: number): number;
    _free(ptr: number): void;
    HEAPF32: Float32Array;
  }

  export function createRNNWasmModule(): Promise<RnnoiseModule>;
  export function createRNNWasmModuleSync(): RnnoiseModule;
}
