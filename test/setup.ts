import { afterEach, beforeEach, vi } from 'vitest';

// Keep the developer's own NUSII_* variables (e.g. from .env) out of unit tests.
beforeEach(() => {
  vi.stubEnv('NUSII_API_KEY', '');
  vi.stubEnv('NUSII_ACCESS_TOKEN', '');
  vi.stubEnv('NUSII_BASE_URL', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});
