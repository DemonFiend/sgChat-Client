declare module 'dtln-rs' {
  interface DtlnPlugin {
    init(): Promise<DtlnPlugin>;
    dtln_create(): Promise<number>;
    dtln_destroy(handle: number): Promise<void>;
    dtln_denoise(handle: number, input: Float32Array, output: Float32Array): Promise<boolean>;
    isReady(): Promise<boolean>;
  }
  export const DtlnPlugin: DtlnPlugin;
  export default function initDTLN(): Promise<DtlnPlugin>;
}
