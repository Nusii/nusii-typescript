# Releasing

The package is published to npm as [`@nusii/nusii`](https://www.npmjs.com/package/@nusii/nusii),
owned by the [`nusii`](https://www.npmjs.com/org/nusii) npm organization, by
GitHub Actions. Nobody needs an npm token to release: pushing a version tag is
enough.

## Releasing a new version

1. **While you work**, describe user facing changes in `CHANGELOG.md`, under
   `## Unreleased`:

   ```markdown
   ## Unreleased

   - Add `nusii.proposals.duplicate()`.
   - Fix the type of `Proposal.display_date`.
   ```

2. **Pick the version** following [semver](https://semver.org) and run one of:

   ```bash
   npm version patch   # 0.1.0 -> 0.1.1  bug fixes
   npm version minor   # 0.1.0 -> 0.2.0  new features (or breaking changes while on 0.x)
   npm version major   # 0.1.0 -> 1.0.0  breaking changes
   ```

   This refuses to run with an empty `## Unreleased` section, then runs every
   check (lint, types, tests, build). It writes the version to `package.json`,
   `package-lock.json` and `src/version.ts`, moves the notes under
   `## x.y.z (date)` in the changelog, commits as "Release vx.y.z" and creates
   the `vx.y.z` tag.

3. **Push** the commit and the tag:

   ```bash
   git push --follow-tags
   ```

The [Release workflow](.github/workflows/release.yml) then checks everything
again, publishes to npm with a provenance statement, and creates a
[GitHub release](https://github.com/Nusii/nusii-typescript/releases) with the
changelog notes. Follow it with `gh run watch`, and confirm with:

```bash
npm view @nusii/nusii version
```

### Prereleases

```bash
npm version prerelease --preid beta   # 0.2.0-beta.0
git push --follow-tags
```

Prereleases are published under the `next` dist-tag (`npm install @nusii/nusii@next`),
so `npm install @nusii/nusii` keeps installing the latest stable version.

## When something goes wrong

- **The workflow fails before publishing** (a test, a flaky network...): fix
  the cause, then re-run the workflow from the Actions tab. Re-running is safe:
  a version already on npm or a release already on GitHub is skipped.
- **"Tag does not match package.json version"**: the tag was not created by
  `npm version`. Delete it (`git push --delete origin vx.y.z`, `git tag -d vx.y.z`)
  and use `npm version`.
- **npm answers 404 or "ENEEDAUTH" on publish**: the trusted publisher is missing
  or the workflow file was renamed. Check it with `npm trust list @nusii/nusii`.
- **A broken version went out**: publish a fixed version. `npm deprecate
  @nusii/nusii@x.y.z "Use x.y.z+1"` warns people still installing the broken one.
  Unpublishing is only possible within 72 hours and breaks anyone depending on it.

## How publishing is set up

These steps were done once, for 0.1.0, and are kept here for reference.

1. The first version was published by hand, because npm needs the package to
   exist before a trusted publisher can be attached:

   ```bash
   npm whoami          # the npm account owning the package
   npm publish
   ```

2. GitHub Actions was registered as the package's trusted publisher, which
   allows `.github/workflows/release.yml` in `Nusii/nusii-typescript` to publish:

   ```bash
   npm trust github @nusii/nusii --repo Nusii/nusii-typescript --file release.yml --allow-publish
   npm trust list @nusii/nusii
   ```

To give someone else access to the package (not needed for releases), add them to
the `nusii` organization on npmjs.com.

The unscoped name `nusii` cannot be used: npm rejects it as too similar to the
existing `jsii` package. Scoped names are exempt from that check.
