const fs = require('node:fs/promises');
const path = require('node:path');
const {Notification, app, BrowserWindow, dialog, ipcMain, shell} = require('electron');
const {
  getOcrHealth,
  getUserDictionary,
  recognizeImage,
  saveUserDictionary,
  shutdownOcr
} = require('./ocr-service.cjs');

async function saveExportFile(payload) {
  const {
    content,
    defaultDirectoryPath,
    defaultFileName,
    filters,
  } = payload;
  const baseDirectory = typeof defaultDirectoryPath === 'string' && defaultDirectoryPath.trim().length > 0
    ? defaultDirectoryPath
    : app.getPath('documents');

  const result = await dialog.showSaveDialog({
    defaultPath: path.join(baseDirectory, defaultFileName),
    filters,
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  await fs.writeFile(result.filePath, content, 'utf8');
  return { canceled: false, filePath: result.filePath };
}

async function openPathTarget(targetPath) {
  if (typeof targetPath !== 'string' || targetPath.trim().length === 0) {
    throw new Error('目标路径不能为空');
  }

  const openError = await shell.openPath(targetPath);

  if (openError) {
    throw new Error(openError);
  }

  return true;
}

function showDesktopNotification(payload) {
  const title = typeof payload?.title === 'string' ? payload.title.trim() : '';
  const body = typeof payload?.body === 'string' ? payload.body.trim() : '';

  if (!title || !Notification.isSupported()) {
    return false;
  }

  const notification = new Notification({
    body,
    title,
  });

  notification.show();
  return true;
}

function getRendererEntry() {
  if (!app.isPackaged) {
    return process.env.ELECTRON_RENDERER_URL || 'http://127.0.0.1:5173';
  }

  return path.join(process.resourcesPath, 'renderer', 'index.html');
}

function createMainWindow() {
  const window = new BrowserWindow({
    title: '离线 OCR 工作台',
    width: 1280,
    height: 860,
    minWidth: 1080,
    minHeight: 760,
    autoHideMenuBar: true,
    backgroundColor: '#0f1412',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.once('ready-to-show', () => {
    window.show();
  });

  window.webContents.setWindowOpenHandler(({url}) => {
    void shell.openExternal(url);
    return {action: 'deny'};
  });

  if (!app.isPackaged) {
    void window.loadURL(getRendererEntry());
    return window;
  }

  void window.loadFile(getRendererEntry());
  return window;
}

app.whenReady().then(() => {
  ipcMain.handle('ocr:recognize', async (_event, payload) => {
    return recognizeImage(payload.bytes, payload.mode);
  });

  ipcMain.handle('ocr:shutdown', async () => {
    await shutdownOcr();
    return true;
  });

  ipcMain.handle('ocr:user-dictionary:get', async () => {
    return getUserDictionary();
  });

  ipcMain.handle('ocr:user-dictionary:save', async (_event, payload) => {
    return saveUserDictionary(payload.words);
  });

  ipcMain.handle('ocr:export:save', async (_event, payload) => {
    return saveExportFile(payload);
  });

  ipcMain.handle('shell:open-path', async (_event, payload) => {
    return openPathTarget(payload.path);
  });

  ipcMain.handle('app:info', async () => {
    return {
      arch: process.arch,
      name: app.getName(),
      packaged: app.isPackaged,
      paths: {
        documentsDir: app.getPath('documents'),
        resourcesDir: process.resourcesPath,
        userDataDir: app.getPath('userData'),
      },
      platform: process.platform,
      runtime: {
        chrome: process.versions.chrome,
        electron: process.versions.electron,
        node: process.versions.node,
      },
      version: app.getVersion(),
    };
  });

  ipcMain.handle('ocr:health', async () => {
    return getOcrHealth();
  });

  ipcMain.handle('app:notify', async (_event, payload) => {
    return showDesktopNotification(payload);
  });

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  void shutdownOcr();
});
