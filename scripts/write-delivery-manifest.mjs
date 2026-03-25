import fs from 'node:fs/promises';
import path from 'node:path';

const [bundleDirArg, version, timestamp] = process.argv.slice(2);

if (!bundleDirArg || !version || !timestamp) {
  console.error('usage: node ./scripts/write-delivery-manifest.mjs <bundle-dir> <version> <timestamp>');
  process.exit(1);
}

const bundleDir = path.resolve(bundleDirArg);
const checksumsPath = path.join(bundleDir, 'SHA256SUMS.txt');
const manifestPath = path.join(bundleDir, 'DELIVERY_MANIFEST.json');

const checksumContent = await fs.readFile(checksumsPath, 'utf8');
const checksumEntries = checksumContent
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const match = line.match(/^([a-f0-9]{64})\s+\*?(.+)$/i);

    if (!match) {
      throw new Error(`Invalid checksum line: ${line}`);
    }

    const [, sha256, relativePath] = match;

    return {relativePath, sha256};
  });

const fileRoleByRelativePath = {
  'USAGE.md': 'usage-guide',
  'RELEASE_NOTES.md': 'release-notes',
  [`macos-apple-silicon/Local OCR Desk-${version}-macOS-arm64.dmg`]: 'mac-installer',
  [`windows-x64/Local OCR Desk-${version}-x64-setup.exe`]: 'windows-installer',
  [`windows-x64/Local OCR Desk-${version}-x64-portable.exe`]: 'windows-portable',
  [`windows-x64/Local OCR Desk-${version}-x64-unpacked.zip`]: 'windows-unpacked',
  [`linux-x64/Local OCR Desk-${version}.AppImage`]: 'linux-appimage',
  [`linux-x64/Local OCR Desk-${version}-linux-x64-unpacked.tar.gz`]: 'linux-unpacked',
};

const platformByRelativePath = {
  [`macos-apple-silicon/Local OCR Desk-${version}-macOS-arm64.dmg`]: 'macos-apple-silicon',
  [`windows-x64/Local OCR Desk-${version}-x64-setup.exe`]: 'windows-x64',
  [`windows-x64/Local OCR Desk-${version}-x64-portable.exe`]: 'windows-x64',
  [`windows-x64/Local OCR Desk-${version}-x64-unpacked.zip`]: 'windows-x64',
  [`linux-x64/Local OCR Desk-${version}.AppImage`]: 'linux-x64',
  [`linux-x64/Local OCR Desk-${version}-linux-x64-unpacked.tar.gz`]: 'linux-x64',
};

const files = await Promise.all(
  checksumEntries.map(async ({relativePath, sha256}) => {
    const absolutePath = path.join(bundleDir, relativePath);
    const stats = await fs.stat(absolutePath);

    return {
      platform: platformByRelativePath[relativePath] ?? 'bundle',
      relativePath,
      role: fileRoleByRelativePath[relativePath] ?? 'supporting-file',
      sha256,
      sizeBytes: stats.size,
    };
  }),
);

const manifest = {
  bundleName: path.basename(bundleDir),
  generatedAt: timestamp,
  notes: [
    'All packaged apps include Electron runtime, PP-OCRv5 model assets, and ONNX runtime bindings.',
    'macOS and Windows binaries are unsigned; first-launch security prompts are expected in default system policy.',
    'Windows and Linux unpacked archives are included for internal verification and troubleshooting.',
  ],
  productName: 'Local OCR Desk',
  version,
  files,
};

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
