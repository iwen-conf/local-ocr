const fs = require('node:fs/promises');
const path = require('node:path');
const { app, BrowserWindow, nativeImage } = require('electron');

const projectRoot = path.resolve(__dirname, '..');
const distIndexPath = path.join(projectRoot, 'frontend', 'dist', 'index.html');
const preloadPath = path.join(__dirname, 'marketing-preload.cjs');
const outputDir = path.join(projectRoot, 'output', 'screenshots');

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function saveImage(filePath, image) {
  await fs.writeFile(filePath, image.toPNG());
}

async function waitFor(webContents, predicateSource, timeoutMs = 15000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const matched = await webContents.executeJavaScript(predicateSource, true);

    if (matched) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error(`Timed out waiting for predicate: ${predicateSource}`);
}

async function captureFlow() {
  await ensureDir(outputDir);

  const window = new BrowserWindow({
    width: 1720,
    height: 1120,
    show: false,
    backgroundColor: '#0d1117',
    title: 'Local OCR Desk Marketing Shots',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      partition: `marketing-shots-${Date.now()}`,
      backgroundThrottling: false,
    },
  });

  await window.loadFile(distIndexPath);
  await waitFor(window.webContents, `document.querySelector('.app-container') !== null`);
  await waitFor(
    window.webContents,
    `document.body.innerText.includes('Local OCR Desk') && document.body.innerText.includes('一键试跑示例图')`,
  );
  await window.webContents.executeJavaScript(
    `document.fonts?.ready ? document.fonts.ready.then(() => true) : Promise.resolve(true);`,
    true,
  );
  await new Promise((resolve) => setTimeout(resolve, 500));
  await window.webContents.executeJavaScript(`document.documentElement.setAttribute('data-theme', 'dark');`, true);
  await saveImage(path.join(outputDir, 'local-ocr-shot-01-home.png'), await window.capturePage());

  const clicked = await window.webContents.executeJavaScript(`
    (() => {
      const target = [...document.querySelectorAll('button')].find((button) => button.textContent && button.textContent.includes('一键试跑示例图'));
      if (!target) return false;
      target.click();
      return true;
    })();
  `, true);

  if (!clicked) {
    throw new Error('Failed to locate sample run button.');
  }

  await waitFor(window.webContents, `document.body.innerText.includes('示例图验收') && document.body.innerText.includes('Hello Windows Native')`, 20000);
  await new Promise((resolve) => setTimeout(resolve, 600));

  await saveImage(path.join(outputDir, 'local-ocr-shot-02-ocr-result.png'), await window.capturePage());

  await window.webContents.executeJavaScript(`
    localStorage.setItem('ocr-theme', 'light');
    document.documentElement.setAttribute('data-theme', 'light');
    true;
  `, true);
  await new Promise((resolve) => setTimeout(resolve, 450));
  await saveImage(path.join(outputDir, 'local-ocr-shot-03-light-theme.png'), await window.capturePage());
  await saveImage(
    path.join(outputDir, 'local-ocr-shot-04-result-detail.png'),
    await window.capturePage({ x: 910, y: 88, width: 760, height: 948 }),
  );

  await window.close();
}

app.whenReady().then(async () => {
  try {
    await captureFlow();
  } finally {
    app.quit();
  }
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
