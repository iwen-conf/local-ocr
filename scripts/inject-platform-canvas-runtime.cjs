const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const canvasPackageJsonPath = path.join(projectRoot, 'node_modules', '@napi-rs', 'canvas', 'package.json');
const canvasPackage = require(canvasPackageJsonPath);

const TARGET_PACKAGE_BY_PLATFORM = {
  linux: '@napi-rs/canvas-linux-x64-gnu',
  win32: '@napi-rs/canvas-win32-x64-msvc',
};

function execFile(command, args, cwd) {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const details = error.stderr || error.stdout || error.message;
    throw new Error(`${command} ${args.join(' ')} failed: ${details}`.trim());
  }
}

function resolveTargetPackage(platformName) {
  const packageName = TARGET_PACKAGE_BY_PLATFORM[platformName];

  if (!packageName) {
    return null;
  }

  const version = canvasPackage.optionalDependencies?.[packageName];

  if (!version) {
    throw new Error(`Missing @napi-rs/canvas optional dependency mapping for ${packageName}`);
  }

  return {packageName, version};
}

function getCacheDir(packageName, version) {
  return path.join(projectRoot, '.tmp', 'native-runtime-cache', packageName.replace('/', '__'), version);
}

async function ensureCachedPackage(packageName, version) {
  const cacheDir = getCacheDir(packageName, version);
  const packageJsonPath = path.join(cacheDir, 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    return cacheDir;
  }

  await fsp.mkdir(cacheDir, {recursive: true});
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'local-ocr-gui-canvas-'));

  try {
    execFile('npm', ['pack', `${packageName}@${version}`], tempDir);
    const archiveName = fs.readdirSync(tempDir).find((entry) => entry.endsWith('.tgz'));

    if (!archiveName) {
      throw new Error(`Unable to locate npm pack archive for ${packageName}@${version}`);
    }

    execFile('tar', ['-xzf', archiveName, '-C', cacheDir, '--strip-components=1'], tempDir);
  } finally {
    await fsp.rm(tempDir, {recursive: true, force: true});
  }

  return cacheDir;
}

function getResourcesDir(context) {
  if (context.electronPlatformName === 'darwin') {
    const appBundleName = fs.readdirSync(context.appOutDir).find((entry) => entry.endsWith('.app'));

    if (!appBundleName) {
      throw new Error(`Unable to locate macOS app bundle under ${context.appOutDir}`);
    }

    return path.join(context.appOutDir, appBundleName, 'Contents', 'Resources');
  }

  return path.join(context.appOutDir, 'resources');
}

module.exports = async function afterPack(context) {
  const target = resolveTargetPackage(context.electronPlatformName);

  if (!target) {
    return;
  }

  const cachedPackageDir = await ensureCachedPackage(target.packageName, target.version);
  const resourcesDir = getResourcesDir(context);
  const napiScopeDir = path.join(resourcesDir, 'app.asar.unpacked', 'node_modules', '@napi-rs');
  const destinationDir = path.join(napiScopeDir, path.basename(target.packageName));

  await fsp.mkdir(napiScopeDir, {recursive: true});
  await fsp.rm(destinationDir, {recursive: true, force: true});
  await fsp.cp(cachedPackageDir, destinationDir, {recursive: true, force: true});

  console.log(`[afterPack] injected ${target.packageName} into ${destinationDir}`);
};
