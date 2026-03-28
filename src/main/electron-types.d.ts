// Augment Electron's App type with custom properties used across the main process.
declare namespace Electron {
  interface App {
    isQuitting?: boolean;
  }
}
