// Shim for electron-store's ESM `import electron from 'electron'`.
// When esbuild bundles electron-store (ESM) into CJS output, it wraps
// `require("electron")` with __toESM which looks for `.default`.
// Electron's CJS module doesn't have `.default`, causing `app` to be undefined.
// This shim re-exports electron with a `.default` property so the bundled
// electron-store code works correctly.
const electron = require('electron');
module.exports = electron;
module.exports.default = electron;
