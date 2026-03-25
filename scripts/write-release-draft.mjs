import fs from 'node:fs/promises';
import path from 'node:path';

const [bundleDirArg] = process.argv.slice(2);

if (!bundleDirArg) {
  console.error('usage: node ./scripts/write-release-draft.mjs <bundle-dir>');
  process.exit(1);
}

const bundleDir = path.resolve(bundleDirArg);
const manifestPath = path.join(bundleDir, 'DELIVERY_MANIFEST.json');
const releaseNotesPath = path.join(bundleDir, 'RELEASE_NOTES.md');
const outputMarkdownPath = path.join(bundleDir, 'RELEASE_DRAFT.md');
const outputJsonPath = path.join(bundleDir, 'RELEASE_DRAFT.json');

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const releaseNotesMarkdown = await fs.readFile(releaseNotesPath, 'utf8');

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function assetLabel(file) {
  switch (file.role) {
    case 'mac-installer':
      return 'macOS Apple Silicon DMG';
    case 'windows-installer':
      return 'Windows x64 Installer';
    case 'windows-portable':
      return 'Windows x64 Portable';
    case 'windows-unpacked':
      return 'Windows x64 Unpacked Archive';
    case 'linux-appimage':
      return 'Linux x64 AppImage';
    case 'linux-unpacked':
      return 'Linux x64 Unpacked Archive';
    default:
      return file.role;
  }
}

const distributableAssets = manifest.files.filter((file) => file.platform !== 'bundle');
const tagName = `v${manifest.version}`;
const title = `${manifest.productName} ${tagName}`;
const bundleTarRelativePath = `${manifest.bundleName}.tar`;

const artifactTable = [
  '| Asset | File | Size | SHA256 |',
  '| --- | --- | --- | --- |',
  ...distributableAssets.map((file) => `| ${assetLabel(file)} | \`${path.basename(file.relativePath)}\` | ${formatBytes(file.sizeBytes)} | \`${file.sha256}\` |`),
].join('\n');

const bodyMarkdown = [
  `# ${title}`,
  '',
  `Generated at: ${manifest.generatedAt}`,
  '',
  '## Summary',
  '',
  ...manifest.notes.map((note) => `- ${note}`),
  '',
  '## Assets',
  '',
  artifactTable,
  '',
  '## Bundle Files',
  '',
  `- Full delivery archive: \`${bundleTarRelativePath}\``,
  `- Usage guide: \`USAGE.md\``,
  `- Release notes: \`RELEASE_NOTES.md\``,
  `- Delivery manifest: \`DELIVERY_MANIFEST.json\``,
  `- Checksums: \`SHA256SUMS.txt\``,
  '',
  '## Release Notes',
  '',
  releaseNotesMarkdown.trim(),
  '',
].join('\n');

const releaseDraft = {
  assets: distributableAssets.map((file) => ({
    label: assetLabel(file),
    platform: file.platform,
    relativePath: file.relativePath,
    role: file.role,
    sha256: file.sha256,
    sizeBytes: file.sizeBytes,
  })),
  bodyMarkdown,
  bundleName: manifest.bundleName,
  bundleTarRelativePath,
  draft: true,
  generatedAt: manifest.generatedAt,
  prerelease: false,
  title,
  tagName,
  version: manifest.version,
};

await fs.writeFile(outputMarkdownPath, `${bodyMarkdown}\n`);
await fs.writeFile(outputJsonPath, `${JSON.stringify(releaseDraft, null, 2)}\n`);
