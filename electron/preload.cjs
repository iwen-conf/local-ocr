const {clipboard, contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('desktopApi', {
  copyText: async (text) => {
    clipboard.writeText(text);
    return true;
  },
  getClipboardImage: async () => {
    const image = clipboard.readImage();

    if (image.isEmpty()) {
      return null;
    }

    const bytes = image.toPNG();
    const size = image.getSize();

    return {
      bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      fileName: `clipboard-${new Date().toISOString().replace(/[:.]/g, '-')}.png`,
      height: size.height,
      mimeType: 'image/png',
      width: size.width,
    };
  },
  recognizeImage: async (bytes, mode) => ipcRenderer.invoke('ocr:recognize', {bytes, mode}),
  shutdownOcr: async () => ipcRenderer.invoke('ocr:shutdown'),
  getUserDictionary: async () => ipcRenderer.invoke('ocr:user-dictionary:get'),
  saveUserDictionary: async (words) => ipcRenderer.invoke('ocr:user-dictionary:save', {words}),
  saveExportFile: async (payload) => ipcRenderer.invoke('ocr:export:save', payload),
  openPath: async (targetPath) => ipcRenderer.invoke('shell:open-path', {path: targetPath}),
  notifyDesktop: async (payload) => ipcRenderer.invoke('app:notify', payload),
  getAppInfo: async () => ipcRenderer.invoke('app:info'),
  getOcrHealth: async () => ipcRenderer.invoke('ocr:health'),
  isElectron: true,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node
  }
});
