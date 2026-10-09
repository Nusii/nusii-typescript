import { defineConfig } from 'tsdown';

// `npm publish --dry-run` passes its dry-run flag on to the `npm pack` that
// these checks run, so no tarball is written and they cannot run. The real
// publish and CI still run them.
const npmDryRun = process.env['npm_config_dry_run'] === 'true';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  platform: 'neutral',
  target: 'es2022',
  dts: true,
  sourcemap: true,
  clean: true,
  // Fail the build when package.json or the type declarations would break for users.
  publint: npmDryRun ? false : { strict: true },
  attw: npmDryRun ? false : { level: 'error' },
});
