// Release helpers, run through npm scripts (see RELEASING.md).
//
//   node scripts/release.mjs check          Fails unless CHANGELOG.md has notes under "## Unreleased".
//   node scripts/release.mjs stamp          After `npm version` bumped package.json: writes the version
//                                           to src/version.ts and moves the Unreleased notes under a
//                                           "## x.y.z (date)" heading.
//   node scripts/release.mjs notes [x.y.z]  Prints the CHANGELOG.md notes of a version.

import { readFileSync, writeFileSync } from 'node:fs';

const UNRELEASED = '## Unreleased';
const [command, versionArgument] = process.argv.slice(2);
const changelog = readFileSync('CHANGELOG.md', 'utf8');
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));

function sectionBody(heading) {
  const lines = changelog.split('\n');
  const start = lines.findIndex((line) => line === heading || line.startsWith(`${heading} `));
  if (start === -1) return null;
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join('\n')
    .trim();
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

switch (command) {
  case 'check': {
    if (!sectionBody(UNRELEASED)) {
      fail(`CHANGELOG.md has no notes under "${UNRELEASED}". Describe the changes there first.`);
    }
    break;
  }
  case 'stamp': {
    const date = new Date().toISOString().slice(0, 10);
    writeFileSync('src/version.ts', `export const VERSION = '${version}';\n`);
    writeFileSync(
      'CHANGELOG.md',
      changelog.replace(UNRELEASED, `${UNRELEASED}\n\n## ${version} (${date})`),
    );
    break;
  }
  case 'notes': {
    const target = versionArgument ?? version;
    const notes = sectionBody(`## ${target}`);
    if (!notes) fail(`CHANGELOG.md has no notes for ${target}.`);
    console.log(notes);
    break;
  }
  default:
    fail('Usage: node scripts/release.mjs <check|stamp|notes [version]>');
}
