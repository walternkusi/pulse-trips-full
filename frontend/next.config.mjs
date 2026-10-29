import { fileURLToPath } from 'node:url';

export default {
  // This folder is the project root. Without it Next.js guesses from stray lockfiles in parent folders.
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
};
