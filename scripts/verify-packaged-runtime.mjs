import fs from 'node:fs';
import path from 'node:path';

const platform = process.argv[2];

if (!platform) {
  console.error('usage: node ./scripts/verify-packaged-runtime.mjs <mac|win|linux>');
  process.exit(1);
}

const requiredModelFiles = [
  'ch_PP-OCRv5_server_det.onnx',
  'ch_PP-OCRv5_rec_server_infer.onnx',
  'en_PP-OCRv5_rec_mobile_infer.onnx',
  'ppocrv5_dict.txt',
  'ppocrv5_en_dict.txt',
];

const platformConfig = {
  linux: {
    appPath: path.join('release', 'linux-unpacked'),
    canvasBindingName: 'skia.linux-x64-gnu.node',
    canvasPackageDir: path.join(
      'release',
      'linux-unpacked',
      'resources',
      'app.asar.unpacked',
      'node_modules',
      '@napi-rs',
      'canvas-linux-x64-gnu',
    ),
    onnxBindingPath: path.join(
      'release',
      'linux-unpacked',
      'resources',
      'app.asar.unpacked',
      'node_modules',
      'onnxruntime-node',
      'bin',
      'napi-v6',
      'linux',
      'x64',
      'onnxruntime_binding.node',
    ),
    resourcesDir: path.join('release', 'linux-unpacked', 'resources'),
  },
  mac: {
    appPath: path.join('release', 'mac-arm64', 'Local OCR Desk.app'),
    canvasBindingName: 'skia.darwin-arm64.node',
    canvasPackageDir: path.join(
      'release',
      'mac-arm64',
      'Local OCR Desk.app',
      'Contents',
      'Resources',
      'app.asar.unpacked',
      'node_modules',
      '@napi-rs',
      'canvas-darwin-arm64',
    ),
    onnxBindingPath: path.join(
      'release',
      'mac-arm64',
      'Local OCR Desk.app',
      'Contents',
      'Resources',
      'app.asar.unpacked',
      'node_modules',
      'onnxruntime-node',
      'bin',
      'napi-v6',
      'darwin',
      'arm64',
      'onnxruntime_binding.node',
    ),
    resourcesDir: path.join('release', 'mac-arm64', 'Local OCR Desk.app', 'Contents', 'Resources'),
  },
  win: {
    appPath: path.join('release', 'win-unpacked', 'Local OCR Desk.exe'),
    canvasBindingName: 'skia.win32-x64-msvc.node',
    canvasPackageDir: path.join(
      'release',
      'win-unpacked',
      'resources',
      'app.asar.unpacked',
      'node_modules',
      '@napi-rs',
      'canvas-win32-x64-msvc',
    ),
    onnxBindingPath: path.join(
      'release',
      'win-unpacked',
      'resources',
      'app.asar.unpacked',
      'node_modules',
      'onnxruntime-node',
      'bin',
      'napi-v6',
      'win32',
      'x64',
      'onnxruntime_binding.node',
    ),
    resourcesDir: path.join('release', 'win-unpacked', 'resources'),
  },
};

const config = platformConfig[platform];

if (!config) {
  console.error(`unknown platform: ${platform}`);
  process.exit(1);
}

function assertExists(targetPath, description, predicate = fs.existsSync) {
  if (!predicate(targetPath)) {
    throw new Error(`Missing ${description}: ${targetPath}`);
  }

  console.log(`[verify] ok ${description}: ${targetPath}`);
}

function findFile(rootDir, fileName) {
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, {withFileTypes: true});

    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      if (entry.isFile() && entry.name === fileName) {
        return entryPath;
      }
    }
  }

  return null;
}

assertExists(config.appPath, 'packaged application');

for (const fileName of requiredModelFiles) {
  assertExists(path.join(config.resourcesDir, 'ocr-models', fileName), `OCR model asset ${fileName}`);
}

assertExists(config.onnxBindingPath, 'onnxruntime native binding');
assertExists(config.canvasPackageDir, 'canvas native package directory', (targetPath) => fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory());

const canvasBindingPath = findFile(config.canvasPackageDir, config.canvasBindingName);

if (!canvasBindingPath) {
  throw new Error(`Missing canvas native binding ${config.canvasBindingName} under ${config.canvasPackageDir}`);
}

console.log(`[verify] ok canvas native binding: ${canvasBindingPath}`);
