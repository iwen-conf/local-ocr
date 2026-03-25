const { contextBridge } = require('electron');

const ocrItems = [
  {
    box: { x: 172, y: 174, width: 540, height: 82 },
    confidence: 0.996,
    source: 'zh-server',
    text: '离线 OCR 工作台',
  },
  {
    box: { x: 170, y: 268, width: 648, height: 84 },
    confidence: 0.992,
    source: 'en-mobile',
    text: 'Hello Windows Native',
  },
  {
    box: { x: 176, y: 372, width: 624, height: 56 },
    confidence: 0.984,
    source: 'zh-server',
    text: 'PP-OCRv5 强力离线引擎',
  },
  {
    box: { x: 176, y: 430, width: 784, height: 56 },
    confidence: 0.981,
    source: 'en-mobile',
    text: 'Setup / Portable / Offline Ready',
  },
  {
    box: { x: 176, y: 490, width: 852, height: 54 },
    confidence: 0.972,
    source: 'en-mobile',
    text: 'Drag image files here and export TXT / JSON',
  },
];

const mockText = [
  '离线 OCR 工作台',
  'Hello Windows Native',
  'PP-OCRv5 强力离线引擎',
  'Setup / Portable / Offline Ready',
  'Drag image files here and export TXT / JSON',
].join('\n');

contextBridge.exposeInMainWorld('desktopApi', {
  copyText: async () => true,
  getClipboardImage: async () => null,
  recognizeImage: async () => {
    await new Promise((resolve) => setTimeout(resolve, 480));
    return {
      confidence: 0.986,
      engine: 'PP-OCRv5 Server + EN Refine',
      items: ocrItems,
      text: mockText,
    };
  },
  getUserDictionary: async () => ['Local OCR Desk', 'PP-OCRv5', 'Windows Native'],
  saveUserDictionary: async (words) => words,
  saveExportFile: async (payload) => ({
    canceled: false,
    filePath: `/mock-export/${payload.defaultFileName}`,
  }),
  openPath: async () => true,
  notifyDesktop: async () => true,
  getAppInfo: async () => ({
    arch: 'x64',
    name: 'Local OCR Desk',
    packaged: true,
    paths: {
      documentsDir: '/Users/demo/Documents',
      resourcesDir: '/Applications/Local OCR Desk.app/Contents/Resources',
      userDataDir: '/Users/demo/Library/Application Support/Local OCR Desk',
    },
    platform: 'darwin',
    runtime: {
      chrome: process.versions.chrome,
      electron: process.versions.electron,
      node: process.versions.node,
    },
    version: '0.2.0',
  }),
  getOcrHealth: async () => ({
    checkedAt: '2026-03-24T06:20:00.000Z',
    engine: {
      ready: true,
      message: '环境检查通过，可直接开始识别。',
    },
    modelDir: '/Applications/Local OCR Desk.app/Contents/Resources/ocr-models',
    requiredFiles: [
      {
        exists: true,
        name: 'ch_PP-OCRv5_server_det.onnx',
        path: '/Applications/Local OCR Desk.app/Contents/Resources/ocr-models/ch_PP-OCRv5_server_det.onnx',
        sizeBytes: 32100000,
      },
      {
        exists: true,
        name: 'ch_PP-OCRv5_rec_server_infer.onnx',
        path: '/Applications/Local OCR Desk.app/Contents/Resources/ocr-models/ch_PP-OCRv5_rec_server_infer.onnx',
        sizeBytes: 84100000,
      },
      {
        exists: true,
        name: 'en_PP-OCRv5_rec_mobile_infer.onnx',
        path: '/Applications/Local OCR Desk.app/Contents/Resources/ocr-models/en_PP-OCRv5_rec_mobile_infer.onnx',
        sizeBytes: 18200000,
      },
    ],
    recommendations: [],
    storage: {
      exists: true,
      message: '用户词库目录可写。',
      path: '/Users/demo/Library/Application Support/Local OCR Desk',
      writable: true,
    },
    userDictionary: {
      exists: true,
      message: '已载入 3 个自定义词。',
      path: '/Users/demo/Library/Application Support/Local OCR Desk/dictionary.txt',
      sizeBytes: 87,
      valid: true,
      wordCount: 3,
    },
  }),
  shutdownOcr: async () => true,
  isElectron: true,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node,
  },
});
