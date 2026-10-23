import { defineConfig } from 'vitest/config';

/** The package's own checkout: `cortico` comes from npm, as it does for any extension author. */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: { CORTICO_LANGUAGE: 'zh' },
    testTimeout: 30000,
    pool: 'forks',
  },
});
