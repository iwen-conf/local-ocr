import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const deliveryRoot = path.join(projectRoot, 'output', 'delivery');

function parseArgs(argv) {
  const options = {
    bundleDir: null,
    clobber: false,
    execute: false,
    provider: 'github',
    remote: null,
    target: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    switch (argument) {
      case '--bundle-dir':
        options.bundleDir = argv[++index] ?? null;
        break;
      case '--provider':
        options.provider = argv[++index] ?? options.provider;
        break;
      case '--remote':
        options.remote = argv[++index] ?? null;
        break;
      case '--target':
        options.target = argv[++index] ?? null;
        break;
      case '--execute':
        options.execute = true;
        break;
      case '--clobber':
        options.clobber = true;
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

async function findLatestBundleDir() {
  const entries = await fs.readdir(deliveryRoot, {withFileTypes: true});
  const candidates = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('Local-OCR-Desk-'))
    .map((entry) => entry.name)
    .sort();

  if (candidates.length === 0) {
    throw new Error(`No delivery bundle directories found under ${deliveryRoot}`);
  }

  return path.join(deliveryRoot, candidates.at(-1));
}

function parseRemoteUrl(remoteUrl) {
  const sshMatch = remoteUrl.match(/^(?:ssh:\/\/)?git@([^/:]+)[:/]([^/]+)\/(.+?)(?:\.git)?$/);

  if (sshMatch) {
    const [, host, owner, repo] = sshMatch;
    return {host, owner, repo};
  }

  const httpsMatch = remoteUrl.match(/^https?:\/\/([^/]+)\/([^/]+)\/(.+?)(?:\.git)?$/);

  if (httpsMatch) {
    const [, host, owner, repo] = httpsMatch;
    return {host, owner, repo};
  }

  throw new Error(`Unsupported remote URL: ${remoteUrl}`);
}

function getRemoteUrl(remoteName) {
  return execFileSync('git', ['remote', 'get-url', remoteName], {
    cwd: projectRoot,
    encoding: 'utf8',
  }).trim();
}

function run(command, args, {cwd = projectRoot} = {}) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function tryRun(command, args, options) {
  try {
    return {ok: true, output: run(command, args, options)};
  } catch (error) {
    const stderr = error.stderr?.toString?.() ?? '';
    const stdout = error.stdout?.toString?.() ?? '';
    return {
      error,
      ok: false,
      output: `${stdout}${stderr}`.trim(),
    };
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function providerDefaults(provider) {
  if (provider === 'gitea') {
    return {remote: 'origin'};
  }

  return {remote: 'github'};
}

function getPublishRemoteRef(remoteName) {
  const currentBranch = run('git', ['branch', '--show-current']);

  if (!currentBranch) {
    throw new Error('Unable to determine current branch for release publication');
  }

  return `${remoteName}/${currentBranch}`;
}

function ensurePublishPreconditions({provider, remoteName}) {
  const statusOutput = run('git', ['status', '--porcelain=v1', '--untracked-files=all']);
  const dirtyLines = statusOutput
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .filter((line) => !line.endsWith(' output/') && !line.endsWith(' .DS_Store'));

  if (dirtyLines.length > 0) {
    throw new Error(
      `Refusing to publish from a dirty worktree. Commit or stash these changes first:\n${dirtyLines.join('\n')}`,
    );
  }

  const headSha = run('git', ['rev-parse', 'HEAD']);
  const remoteRef = getPublishRemoteRef(remoteName);
  const remoteShaResult = tryRun('git', ['rev-parse', remoteRef]);

  if (!remoteShaResult.ok) {
    throw new Error(`Unable to resolve remote tracking ref ${remoteRef}. Push or fetch the branch before publishing.`);
  }

  if (headSha !== remoteShaResult.output) {
    throw new Error(
      `Refusing to publish because local HEAD (${headSha}) does not match ${remoteRef} (${remoteShaResult.output}). Push the release commit first.`,
    );
  }

  if (provider === 'github') {
    const authStatus = tryRun('gh', ['auth', 'status']);

    if (!authStatus.ok) {
      throw new Error(`GitHub CLI authentication check failed:\n${authStatus.output}`);
    }

    return;
  }

  if (!process.env.GITEA_TOKEN) {
    throw new Error('GITEA_TOKEN is required for Gitea release publishing');
  }
}

function resolveAssetEntries(bundleDir, releaseDraft) {
  const assetEntries = releaseDraft.assets.map((asset) => ({
    label: asset.label,
    path: path.join(bundleDir, asset.relativePath),
    relativePath: asset.relativePath,
  }));

  assetEntries.push({
    label: 'Checksums',
    path: path.join(bundleDir, 'SHA256SUMS.txt'),
    relativePath: 'SHA256SUMS.txt',
  });
  assetEntries.push({
    label: 'Delivery Manifest',
    path: path.join(bundleDir, 'DELIVERY_MANIFEST.json'),
    relativePath: 'DELIVERY_MANIFEST.json',
  });
  assetEntries.push({
    label: 'Full Delivery Archive',
    path: path.join(path.dirname(bundleDir), releaseDraft.bundleTarRelativePath),
    relativePath: releaseDraft.bundleTarRelativePath,
  });

  return assetEntries;
}

function logDryRun(header, lines) {
  console.log(`[dry-run] ${header}`);

  for (const line of lines) {
    console.log(line);
  }
}

async function publishGithub({assetEntries, execute, releaseDraft, repoSpec, target, clobber}) {
  const notesFile = path.join(releaseDraft.bundleDir, 'RELEASE_DRAFT.md');
  const commonArgs = ['-R', repoSpec];
  let releaseExists = false;

  try {
    run('gh', ['release', 'view', releaseDraft.tagName, ...commonArgs, '--json', 'id']);
    releaseExists = true;
  } catch {
    releaseExists = false;
  }

  const createArgs = [
    'release',
    'create',
    releaseDraft.tagName,
    '--title',
    releaseDraft.title,
    '--notes-file',
    notesFile,
    ...(releaseDraft.draft ? ['--draft'] : []),
    ...(releaseDraft.prerelease ? ['--prerelease'] : []),
    ...(target ? ['--target', target] : []),
    ...commonArgs,
  ];

  const editArgs = [
    'release',
    'edit',
    releaseDraft.tagName,
    '--title',
    releaseDraft.title,
    '--notes-file',
    notesFile,
    `--draft=${releaseDraft.draft ? 'true' : 'false'}`,
    ...(releaseDraft.prerelease ? ['--prerelease'] : []),
    ...(target ? ['--target', target] : []),
    ...commonArgs,
  ];

  const uploadArgs = [
    'release',
    'upload',
    releaseDraft.tagName,
    ...assetEntries.map((asset) => asset.path),
    ...(clobber ? ['--clobber'] : []),
    ...commonArgs,
  ];

  if (!execute) {
    logDryRun('GitHub release plan', [
      `repo: ${repoSpec}`,
      `tag: ${releaseDraft.tagName}`,
      `action: ${releaseExists ? 'edit existing draft/release' : 'create new draft/release'}`,
      `command: gh ${releaseExists ? editArgs.join(' ') : createArgs.join(' ')}`,
      `command: gh ${uploadArgs.join(' ')}`,
    ]);
    return;
  }

  ensurePublishPreconditions({provider: 'github', remoteName: 'github'});
  run('gh', releaseExists ? editArgs : createArgs);
  run('gh', uploadArgs);

  console.log(`[publish] github release updated: ${repoSpec} ${releaseDraft.tagName}`);
}

async function requestGitea(url, {body, headers = {}, method = 'GET'} = {}) {
  const token = process.env.GITEA_TOKEN;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `token ${token}`,
      ...headers,
    },
    body,
  });

  if (response.status === 404) {
    return {notFound: true, response};
  }

  if (!response.ok) {
    throw new Error(`${method} ${url} failed with ${response.status}: ${await response.text()}`);
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    return {response};
  }

  return {data: await response.json(), response};
}

async function publishGitea({assetEntries, clobber, execute, releaseDraft, remoteInfo, target}) {
  const apiBase = `https://${remoteInfo.host}/api/v1/repos/${remoteInfo.owner}/${remoteInfo.repo}`;
  const releaseUrl = `${apiBase}/releases`;
  const releaseByTagUrl = `${apiBase}/releases/tags/${encodeURIComponent(releaseDraft.tagName)}`;
  const body = {
    body: releaseDraft.bodyMarkdown,
    draft: releaseDraft.draft,
    name: releaseDraft.title,
    prerelease: releaseDraft.prerelease,
    tag_name: releaseDraft.tagName,
    ...(target ? {target_commitish: target} : {}),
  };

  if (!execute) {
    logDryRun('Gitea release plan', [
      `repo: ${remoteInfo.host}/${remoteInfo.owner}/${remoteInfo.repo}`,
      `tag: ${releaseDraft.tagName}`,
      `create-or-update: POST/PATCH ${releaseUrl}`,
      `lookup: GET ${releaseByTagUrl}`,
      ...assetEntries.map((asset) => `upload: POST ${releaseUrl}/{id}/assets?name=${encodeURIComponent(path.basename(asset.path))} <- ${asset.path}`),
      clobber ? 'existing assets with matching names will be deleted first' : 'existing assets with matching names will be kept and skipped',
    ]);
    return;
  }

  ensurePublishPreconditions({provider: 'gitea', remoteName: 'origin'});
  const existingReleaseResult = await requestGitea(releaseByTagUrl);
  let release;

  if (existingReleaseResult.notFound) {
    release = (await requestGitea(releaseUrl, {
      body: JSON.stringify(body),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })).data;
  } else {
    const releaseId = existingReleaseResult.data.id;
    release = (await requestGitea(`${releaseUrl}/${releaseId}`, {
      body: JSON.stringify(body),
      headers: {'Content-Type': 'application/json'},
      method: 'PATCH',
    })).data;
  }

  const assetsUrl = `${releaseUrl}/${release.id}/assets`;
  const assetsResult = await requestGitea(assetsUrl);
  const existingAssets = new Map((assetsResult.data ?? []).map((asset) => [asset.name, asset]));

  for (const asset of assetEntries) {
    const assetName = path.basename(asset.path);
    const existingAsset = existingAssets.get(assetName);

    if (existingAsset && !clobber) {
      console.log(`[publish] gitea asset exists, skipping: ${assetName}`);
      continue;
    }

    if (existingAsset && clobber) {
      await requestGitea(`${assetsUrl}/${existingAsset.id}`, {method: 'DELETE'});
    }

    const form = new FormData();
    form.append('attachment', new Blob([await fs.readFile(asset.path)]), assetName);

    await requestGitea(`${assetsUrl}?name=${encodeURIComponent(assetName)}`, {
      body: form,
      method: 'POST',
    });

    console.log(`[publish] gitea asset uploaded: ${assetName}`);
  }

  console.log(`[publish] gitea release updated: ${remoteInfo.host}/${remoteInfo.owner}/${remoteInfo.repo} ${releaseDraft.tagName}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const defaults = providerDefaults(options.provider);
  const bundleDir = options.bundleDir ? path.resolve(options.bundleDir) : await findLatestBundleDir();
  const releaseDraft = await readJson(path.join(bundleDir, 'RELEASE_DRAFT.json'));
  const remoteName = options.remote ?? defaults.remote;
  const remoteInfo = parseRemoteUrl(getRemoteUrl(remoteName));
  const assetEntries = resolveAssetEntries(bundleDir, releaseDraft);

  releaseDraft.bundleDir = bundleDir;

  if (options.provider === 'gitea') {
    await publishGitea({
      assetEntries,
      clobber: options.clobber,
      execute: options.execute,
      releaseDraft,
      remoteInfo,
      target: options.target,
    });
    return;
  }

  const repoSpec = remoteInfo.host === 'github.com'
    ? `${remoteInfo.owner}/${remoteInfo.repo}`
    : `${remoteInfo.host}/${remoteInfo.owner}/${remoteInfo.repo}`;

  await publishGithub({
    assetEntries,
    clobber: options.clobber,
    execute: options.execute,
    releaseDraft,
    repoSpec,
    target: options.target,
  });
}

await main();
