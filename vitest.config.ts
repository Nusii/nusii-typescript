import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/**/*.test.ts'],
          exclude: ['test/integration.test.ts'],
          setupFiles: ['test/setup.ts'],
        },
      },
      {
        // Talks to a real Nusii account, see test/integration.test.ts.
        test: {
          name: 'integration',
          include: ['test/integration.test.ts'],
          testTimeout: 60_000,
        },
      },
    ],
  },
});
