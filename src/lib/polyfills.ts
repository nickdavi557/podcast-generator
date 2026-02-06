// Node 18 doesn't have File as a global. Polyfill it from the buffer module.
if (typeof globalThis.File === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { File } = require("node:buffer");
  globalThis.File = File;
}
