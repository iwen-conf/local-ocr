const fs = require('node:fs');
const path = require('node:path');
const {app} = require('electron');
const ort = require('onnxruntime-node');

const MIN_CONFIDENCE = 0.5;
const MIN_AREA = 80;
const ENGLISH_OVERRIDE_MIN_HEIGHT = 40;
const ENGLISH_OVERRIDE_CONFIDENCE_DELTA = 0.08;
const ENGLISH_OVERRIDE_ZH_CONFIDENCE_CEILING = 0.9;
const ENGLISH_CORRECTION_MARGIN = 0.03;
const ENGLISH_ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const ENGLISH_HINT_WORDS = [
  'ocr',
  'hello',
  'offline',
  'online',
  'desk',
  'desktop',
  'windows',
  'native',
  'portable',
  'setup',
  'install',
  'installer',
  'document',
  'documents',
  'image',
  'images',
  'text',
  'copy',
  'paste',
  'preview',
  'result',
  'results',
  'model',
  'models',
];

const DETECTION_OPTIONS = {
  autoDeskew: true,
  maxSideLength: 1600,
  minimumAreaThreshold: 80,
  paddingVertical: 0.12,
  paddingHorizontal: 0.22,
};

const SESSION_OPTIONS = {
  executionProviders: ['cpu'],
  graphOptimizationLevel: 'all',
  enableCpuMemArena: true,
  enableMemPattern: true,
  executionMode: 'sequential',
  interOpNumThreads: 0,
  intraOpNumThreads: 0,
};

const REQUIRED_MODEL_FILES = [
  'ch_PP-OCRv5_server_det.onnx',
  'ch_PP-OCRv5_rec_server_infer.onnx',
  'ppocrv5_dict.txt',
  'en_PP-OCRv5_rec_mobile_infer.onnx',
  'ppocrv5_en_dict.txt',
];

let modulePromise = null;
let enginePromise = null;
let englishLexiconPromise = null;

function getUserDictionaryPath() {
  return path.join(app.getPath('userData'), 'ocr-user-dictionary.json');
}

function sanitizeUserWords(words) {
  const input = Array.isArray(words) ? words : [];
  const seen = new Set();
  const result = [];

  for (const raw of input) {
    const word = typeof raw === 'string' ? raw.trim() : '';

    if (!word) {
      continue;
    }

    const key = word.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(word);
  }

  return result.sort((left, right) => left.localeCompare(right));
}

function readUserDictionaryState() {
  const filePath = getUserDictionaryPath();
  let sizeBytes = null;

  try {
    sizeBytes = fs.statSync(filePath).size;
  } catch (_error) {
    sizeBytes = null;
  }

  if (!fs.existsSync(filePath)) {
    return {
      exists: false,
      message: '词库文件尚未创建',
      path: filePath,
      sizeBytes,
      valid: true,
      words: [],
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const words = sanitizeUserWords(parsed.words);
    return {
      exists: true,
      message: words.length > 0 ? `已加载 ${words.length} 个自定义词` : '词库文件为空',
      path: filePath,
      sizeBytes,
      valid: true,
      words,
    };
  } catch (error) {
    return {
      exists: true,
      message: error instanceof Error ? error.message : '词库文件解析失败',
      path: filePath,
      sizeBytes,
      valid: false,
      words: [],
    };
  }
}

function readUserDictionaryWords() {
  return readUserDictionaryState().words;
}

function inspectWritableDirectory(dirPath) {
  try {
    fs.mkdirSync(dirPath, {recursive: true});
    fs.accessSync(dirPath, fs.constants.R_OK | fs.constants.W_OK);
    return {
      exists: true,
      message: '目录可读写',
      path: dirPath,
      writable: true,
    };
  } catch (error) {
    return {
      exists: fs.existsSync(dirPath),
      message: error instanceof Error ? error.message : '目录不可写',
      path: dirPath,
      writable: false,
    };
  }
}

function getModelDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'ocr-models');
  }

  return path.join(app.getAppPath(), 'vendor', 'ocr-models');
}

function getModelFileStatus(modelDir, name) {
  const filePath = path.join(modelDir, name);

  try {
    const stats = fs.statSync(filePath);
    return {
      exists: true,
      name,
      path: filePath,
      sizeBytes: stats.size,
    };
  } catch (_error) {
    return {
      exists: false,
      name,
      path: filePath,
      sizeBytes: null,
    };
  }
}

function getRequiredModelFilesStatus(modelDir = getModelDir()) {
  return REQUIRED_MODEL_FILES.map((name) => getModelFileStatus(modelDir, name));
}

function ensureModelFiles(modelDir) {
  const fileStatuses = getRequiredModelFilesStatus(modelDir);

  for (const file of fileStatuses) {
    if (!file.exists) {
      throw new Error(`OCR model missing: ${file.path}`);
    }
  }
}

function readDictionary(filePath) {
  return fs.readFileSync(filePath, 'utf8').split('\n');
}

function loadEnglishLexicon() {
  if (!englishLexiconPromise) {
    englishLexiconPromise = (async () => {
      const wordListPath = path.join(path.dirname(require.resolve('word-list')), 'words.txt');
      const words = fs.readFileSync(wordListPath, 'utf8')
        .split('\n')
        .map((word) => word.trim().toLowerCase())
        .filter(Boolean);
      const set = new Set(words);

      for (const word of ENGLISH_HINT_WORDS) {
        set.add(word);
      }

      for (const word of readUserDictionaryWords()) {
        set.add(word.toLowerCase());
      }

      return set;
    })();
  }

  return englishLexiconPromise;
}

function boxKey(box) {
  return `${box.x}:${box.y}:${box.width}:${box.height}`;
}

function toArrayBuffer(value) {
  if (value instanceof ArrayBuffer) {
    return value;
  }

  if (ArrayBuffer.isView(value)) {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
  }

  throw new Error('Unsupported OCR payload');
}

function normalizeCandidate(item) {
  return {
    ...item,
    area: Math.max(0, item.box.width) * Math.max(0, item.box.height),
    centerY: item.box.y + item.box.height / 2,
    text: typeof item.text === 'string' ? item.text.trim() : '',
  };
}

function containsCjk(text) {
  return /[\u3400-\u9fff]/u.test(text);
}

function isLatinLikeText(text) {
  if (!text) {
    return false;
  }

  return /^[A-Za-z0-9 .,'()&:/+\-]+$/.test(text);
}

function isAllUppercaseWord(word) {
  return /^[A-Z0-9]+$/.test(word);
}

function commonPrefixLength(left, right) {
  let index = 0;

  while (index < left.length && index < right.length && left[index] === right[index]) {
    index += 1;
  }

  return index;
}

function commonSuffixLength(left, right) {
  let index = 0;

  while (
    index < left.length &&
    index < right.length &&
    left[left.length - 1 - index] === right[right.length - 1 - index]
  ) {
    index += 1;
  }

  return index;
}

function applyWordCase(candidate, original) {
  if (isAllUppercaseWord(original)) {
    return candidate.toUpperCase();
  }

  if (/^[A-Z][a-z]+$/.test(original)) {
    return candidate[0].toUpperCase() + candidate.slice(1);
  }

  return candidate;
}

function knownEnglishWord(word, lexicon) {
  const lower = word.toLowerCase();
  return lexicon.has(lower) || (isAllUppercaseWord(word) && word.length <= 5);
}

function scoreEnglishCandidate(source, candidate) {
  const lowerSource = source.toLowerCase();
  const lowerCandidate = candidate.toLowerCase();

  return (
    commonPrefixLength(lowerSource, lowerCandidate) * 3 +
    commonSuffixLength(lowerSource, lowerCandidate) * 4 +
    (lowerSource[0] === lowerCandidate[0] ? 2 : 0) +
    (lowerSource.at(-1) === lowerCandidate.at(-1) ? 2 : 0) -
    Math.abs(lowerCandidate.length - lowerSource.length)
  );
}

function generateEnglishEdits(word) {
  const candidates = new Set();

  for (let index = 0; index <= word.length; index += 1) {
    const left = word.slice(0, index);
    const right = word.slice(index);

    if (right) {
      candidates.add(left + right.slice(1));
    }

    if (right.length > 1) {
      candidates.add(left + right[1] + right[0] + right.slice(2));
    }

    for (const letter of ENGLISH_ALPHABET) {
      if (right) {
        candidates.add(left + letter + right.slice(1));
      }

      candidates.add(left + letter + right);
    }
  }

  candidates.delete(word);
  return candidates;
}

function correctEnglishWord(word, lexicon) {
  const lower = word.toLowerCase();

  if (knownEnglishWord(word, lexicon) || lower.length < 3 || lower.length > 16) {
    return word;
  }

  const matches = [];

  for (const candidate of generateEnglishEdits(lower)) {
    if (!lexicon.has(candidate)) {
      continue;
    }

    matches.push(candidate);
  }

  if (matches.length === 0) {
    return word;
  }

  matches.sort((left, right) => scoreEnglishCandidate(word, right) - scoreEnglishCandidate(word, left));

  return applyWordCase(matches[0], word);
}

function correctEnglishText(text, lexicon) {
  if (!isLatinLikeText(text)) {
    return {
      corrected: text,
      correctedAny: false,
      known: false,
    };
  }

  let correctedAny = false;
  let known = true;
  const corrected = text.replace(/[A-Za-z][A-Za-z'-]{2,}/g, (token) => {
    if (!knownEnglishWord(token, lexicon)) {
      known = false;
    }

    const next = correctEnglishWord(token, lexicon);
    correctedAny ||= next !== token;
    return next;
  });

  return {
    corrected,
    correctedAny,
    known,
  };
}

function shouldUseEnglishResult(zhItem, enItem, mode) {
  if (!enItem || mode === 'chi_sim') {
    return false;
  }

  const zhText = zhItem.text;
  const enText = enItem.text;

  if (!enText || !isLatinLikeText(enText)) {
    return false;
  }

  if (zhItem.box.height < ENGLISH_OVERRIDE_MIN_HEIGHT) {
    return false;
  }

  if (mode === 'eng') {
    return enItem.confidence >= MIN_CONFIDENCE;
  }

  if (containsCjk(zhText)) {
    return false;
  }

  if (!isLatinLikeText(zhText)) {
    return enItem.confidence >= 0.8;
  }

  if (
    zhItem.confidence < ENGLISH_OVERRIDE_ZH_CONFIDENCE_CEILING &&
    enItem.confidence > zhItem.confidence + ENGLISH_OVERRIDE_CONFIDENCE_DELTA
  ) {
    return true;
  }

  if (
    zhText.length <= 2 &&
    enText.length >= 4 &&
    enItem.confidence >= 0.85
  ) {
    return true;
  }

  if (
    enItem.correctedAny &&
    isLatinLikeText(zhText) &&
    !zhItem.knownEnglish &&
    enItem.confidence >= zhItem.confidence - ENGLISH_CORRECTION_MARGIN
  ) {
    return true;
  }

  return false;
}

function refineRecognitionResult(item, lexicon, source) {
  const correction = correctEnglishText(item.text, lexicon);

  return {
    ...item,
    correctedAny: correction.correctedAny,
    knownEnglish: correction.known,
    source,
    text: correction.corrected.trim(),
  };
}

function mergeRecognitionResults(zhResults, enResults, mode, lexicon) {
  const enMap = new Map(
    enResults
      .map((item) => refineRecognitionResult(item, lexicon, 'en-mobile'))
      .map((item) => [boxKey(item.box), item]),
  );

  return zhResults.map((zhItem) => {
    const refinedZhItem = refineRecognitionResult(zhItem, lexicon, 'zh-server');
    const enItem = enMap.get(boxKey(zhItem.box));

    if (shouldUseEnglishResult(refinedZhItem, enItem, mode)) {
      return enItem;
    }

    return refinedZhItem;
  });
}

function joinLineText(items) {
  let text = '';

  for (const item of items) {
    const value = item.text.trim();

    if (!value) {
      continue;
    }

    if (!text) {
      text = value;
      continue;
    }

    const shouldSpace = /[A-Za-z0-9]$/.test(text) && /^[A-Za-z0-9]/.test(value);
    text += shouldSpace ? ` ${value}` : value;
  }

  return text;
}

function normalizeResults(results) {
  const filtered = results
    .map(normalizeCandidate)
    .filter((item) => item.text)
    .filter((item) => item.area >= MIN_AREA)
    .filter((item) => item.confidence >= MIN_CONFIDENCE)
    .sort((a, b) => a.centerY - b.centerY || a.box.x - b.box.x);

  if (filtered.length === 0) {
    return {
      confidence: 0,
      engine: 'PP-OCRv5 Server + EN Refine',
      items: [],
      text: '',
    };
  }

  const lines = [];
  let currentLine = [];
  let currentCenter = filtered[0].centerY;

  for (const item of filtered) {
    const tolerance = Math.max(18, Math.min(40, item.box.height * 0.5));

    if (currentLine.length === 0 || Math.abs(item.centerY - currentCenter) <= tolerance) {
      currentLine.push(item);
      currentCenter = currentLine.length === 1 ? item.centerY : (currentCenter + item.centerY) / 2;
      continue;
    }

    lines.push(currentLine);
    currentLine = [item];
    currentCenter = item.centerY;
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  const text = lines
    .map((line) => line.sort((a, b) => a.box.x - b.box.x))
    .map(joinLineText)
    .filter(Boolean)
    .join('\n');

  const confidence = filtered.reduce((sum, item) => sum + item.confidence, 0) / filtered.length;

  return {
    confidence,
    engine: 'PP-OCRv5 Server + EN Refine',
    items: filtered.map(({text: itemText, confidence: itemConfidence, box, source}) => ({
      box,
      confidence: itemConfidence,
      source,
      text: itemText,
    })),
    text,
  };
}

async function loadModules() {
  if (!modulePromise) {
    modulePromise = Promise.all([
      import('ppu-paddle-ocr'),
      import('ppu-ocv'),
    ]);
  }

  return modulePromise;
}

async function ensureEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const modelDir = getModelDir();
      ensureModelFiles(modelDir);

      const [{DetectionService, RecognitionService}, {ImageProcessor}] = await loadModules();

      const detectorSession = await ort.InferenceSession.create(
        path.join(modelDir, 'ch_PP-OCRv5_server_det.onnx'),
        SESSION_OPTIONS,
      );
      const zhRecognitionSession = await ort.InferenceSession.create(
        path.join(modelDir, 'ch_PP-OCRv5_rec_server_infer.onnx'),
        SESSION_OPTIONS,
      );
      const enRecognitionSession = await ort.InferenceSession.create(
        path.join(modelDir, 'en_PP-OCRv5_rec_mobile_infer.onnx'),
        SESSION_OPTIONS,
      );

      const zhDictionary = readDictionary(path.join(modelDir, 'ppocrv5_dict.txt'));
      const enDictionary = readDictionary(path.join(modelDir, 'ppocrv5_en_dict.txt'));
      const englishLexicon = await loadEnglishLexicon();

      return {
        ImageProcessor,
        detector: new DetectionService(detectorSession, DETECTION_OPTIONS),
        detectorSession,
        enDictionary,
        englishLexicon,
        enRecognizer: new RecognitionService(enRecognitionSession, {
          charactersDictionary: enDictionary,
          imageHeight: 48,
        }),
        enRecognitionSession,
        zhDictionary,
        zhRecognizer: new RecognitionService(zhRecognitionSession, {
          charactersDictionary: zhDictionary,
          imageHeight: 48,
        }),
        zhRecognitionSession,
      };
    })();
  }

  return enginePromise;
}

async function warmupEngine() {
  const engine = await ensureEngine();
  await engine.ImageProcessor.initRuntime();
  return engine;
}

async function recognizeImage(bytes, mode = 'eng+chi_sim') {
  const engine = await warmupEngine();
  const arrayBuffer = toArrayBuffer(bytes);
  const canvas = await engine.ImageProcessor.prepareCanvas(arrayBuffer);
  const boxes = await engine.detector.run(canvas);

  if (boxes.length === 0) {
    return {
      confidence: 0,
      engine: 'PP-OCRv5 Server + EN Refine',
      items: [],
      text: '',
    };
  }

  const zhResults = await engine.zhRecognizer.run(canvas, boxes, engine.zhDictionary);
  const enResults = mode === 'chi_sim'
    ? []
    : await engine.enRecognizer.run(canvas, boxes, engine.enDictionary);

  return normalizeResults(mergeRecognitionResults(zhResults, enResults, mode, engine.englishLexicon));
}

async function shutdownOcr() {
  if (!enginePromise) {
    return;
  }

  const engine = await enginePromise;

  await engine.detectorSession.release();
  await engine.zhRecognitionSession.release();
  await engine.enRecognitionSession.release();
  enginePromise = null;
}

async function getOcrHealth() {
  const modelDir = getModelDir();
  const requiredFiles = getRequiredModelFilesStatus(modelDir);
  const missingFiles = requiredFiles.filter((file) => !file.exists);
  const userDictionary = readUserDictionaryState();
  const storage = inspectWritableDirectory(path.dirname(userDictionary.path));
  const recommendations = [];

  let engine = {
    ready: false,
    message: missingFiles.length > 0
      ? `缺少 ${missingFiles.length} 个模型或字典文件`
      : 'OCR 引擎尚未初始化',
  };

  if (missingFiles.length === 0) {
    try {
      await warmupEngine();
      engine = {
        ready: true,
        message: '模型、词典和 ONNX 运行时已通过预热',
      };
    } catch (error) {
      engine = {
        ready: false,
        message: error instanceof Error ? error.message : 'OCR 引擎预热失败',
      };
    }
  }

  if (missingFiles.length > 0) {
    recommendations.push('模型目录内容不完整，请重新运行安装包，或重新解压 portable 版后再执行自检。');
    recommendations.push('可以先打开模型目录，确认 5 个模型和字典文件是否全部存在。');
  }

  if (!userDictionary.valid) {
    recommendations.push('用户词库文件已损坏，可在界面点击“重建词库”生成新的空词库。');
  } else if (!userDictionary.exists) {
    recommendations.push('用户词库文件还未创建，这不会阻止识别；保存一次词库后会自动生成。');
  }

  if (!storage.writable) {
    recommendations.push('当前用户数据目录不可写，词库保存和部分诊断信息可能失败。请检查目录权限。');
  }

  if (missingFiles.length === 0 && userDictionary.valid && storage.writable && engine.ready) {
    recommendations.push('自检通过，可以直接拖入图片开始离线识别。');
  }

  return {
    checkedAt: new Date().toISOString(),
    engine,
    modelDir,
    requiredFiles,
    recommendations,
    storage,
    userDictionary: {
      exists: userDictionary.exists,
      message: userDictionary.message,
      path: userDictionary.path,
      sizeBytes: userDictionary.sizeBytes,
      valid: userDictionary.valid,
      wordCount: userDictionary.words.length,
    },
  };
}

module.exports = {
  getUserDictionary: async () => readUserDictionaryWords(),
  getOcrHealth,
  recognizeImage,
  saveUserDictionary: async (words) => {
    const normalized = sanitizeUserWords(words);
    const filePath = getUserDictionaryPath();

    fs.mkdirSync(path.dirname(filePath), {recursive: true});
    fs.writeFileSync(filePath, JSON.stringify({words: normalized}, null, 2));

    englishLexiconPromise = null;

    if (enginePromise) {
      const engine = await enginePromise;
      engine.englishLexicon = await loadEnglishLexicon();
    }

    return normalized;
  },
  shutdownOcr,
};
