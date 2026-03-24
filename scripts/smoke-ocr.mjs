import fs from 'node:fs/promises';
import path from 'node:path';
import * as ort from 'onnxruntime-node';
import { DetectionService, RecognitionService } from 'ppu-paddle-ocr';
import { ImageProcessor } from 'ppu-ocv';
import wordListPath from 'word-list';

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

const root = process.cwd();
const modelDir = path.join(root, 'vendor', 'ocr-models');
const imagePath = process.argv[2];

if (!imagePath) {
    console.error('usage: node ./scripts/smoke-ocr.mjs <absolute-or-relative-image-path>');
    process.exit(1);
}

function boxKey(box) {
    return `${box.x}:${box.y}:${box.width}:${box.height}`;
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

function normalizeCandidate(item) {
    return {
        ...item,
        area: Math.max(0, item.box.width) * Math.max(0, item.box.height),
        centerY: item.box.y + item.box.height / 2,
        text: typeof item.text === 'string' ? item.text.trim() : '',
    };
}

function shouldUseEnglishResult(zhItem, enItem) {
    if (!enItem) {
        return false;
    }

    if (!enItem.text || !isLatinLikeText(enItem.text)) {
        return false;
    }

    if (zhItem.box.height < ENGLISH_OVERRIDE_MIN_HEIGHT) {
        return false;
    }

    if (containsCjk(zhItem.text)) {
        return false;
    }

    if (!isLatinLikeText(zhItem.text)) {
        return enItem.confidence >= 0.8;
    }

    if (
        zhItem.confidence < ENGLISH_OVERRIDE_ZH_CONFIDENCE_CEILING &&
        enItem.confidence > zhItem.confidence + ENGLISH_OVERRIDE_CONFIDENCE_DELTA
    ) {
        return true;
    }

    if (
        zhItem.text.length <= 2 &&
        enItem.text.length >= 4 &&
        enItem.confidence >= 0.85
    ) {
        return true;
    }

    if (
        enItem.correctedAny &&
        isLatinLikeText(zhItem.text) &&
        !zhItem.knownEnglish &&
        enItem.confidence >= zhItem.confidence - ENGLISH_CORRECTION_MARGIN
    ) {
        return true;
    }

    return false;
}

function refineRecognitionResult(item, lexicon) {
    const correction = correctEnglishText(item.text, lexicon);

    return {
        ...item,
        correctedAny: correction.correctedAny,
        knownEnglish: correction.known,
        text: correction.corrected.trim(),
    };
}

function mergeRecognitionResults(zhResults, enResults, lexicon) {
    const enMap = new Map(
        enResults
            .map((item) => refineRecognitionResult(item, lexicon))
            .map((item) => [boxKey(item.box), item]),
    );

    return zhResults.map((zhItem) => {
        const refinedZhItem = refineRecognitionResult(zhItem, lexicon);
        const enItem = enMap.get(boxKey(zhItem.box));
        return shouldUseEnglishResult(refinedZhItem, enItem) ? enItem : refinedZhItem;
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

function normalize(items) {
    const filtered = items
        .map(normalizeCandidate)
        .filter((item) => item.text)
        .filter((item) => item.area >= MIN_AREA)
        .filter((item) => item.confidence >= MIN_CONFIDENCE)
        .sort((a, b) => a.centerY - b.centerY || a.box.x - b.box.x);

    if (filtered.length === 0) {
        return '';
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

    return lines
        .map((line) => line.sort((a, b) => a.box.x - b.box.x))
        .map(joinLineText)
        .filter(Boolean)
        .join('\n');
}

const zhDictionary = (await fs.readFile(path.join(modelDir, 'ppocrv5_dict.txt'), 'utf8')).split('\n');
const enDictionary = (await fs.readFile(path.join(modelDir, 'ppocrv5_en_dict.txt'), 'utf8')).split('\n');
const englishLexicon = new Set(
    [
        ...(await fs.readFile(wordListPath, 'utf8')).split('\n').map((word) => word.trim().toLowerCase()).filter(Boolean),
        ...ENGLISH_HINT_WORDS,
    ],
);

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

const detector = new DetectionService(detectorSession, DETECTION_OPTIONS);
const zhRecognizer = new RecognitionService(zhRecognitionSession, {
    charactersDictionary: zhDictionary,
    imageHeight: 48,
});
const enRecognizer = new RecognitionService(enRecognitionSession, {
    charactersDictionary: enDictionary,
    imageHeight: 48,
});

const absoluteImagePath = path.resolve(root, imagePath);
const file = await fs.readFile(absoluteImagePath);
const arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);

await ImageProcessor.initRuntime();
const canvas = await ImageProcessor.prepareCanvas(arrayBuffer);
const boxes = await detector.run(canvas);
const zhResults = await zhRecognizer.run(canvas, boxes, zhDictionary);
const enResults = await enRecognizer.run(canvas, boxes, enDictionary);
const merged = mergeRecognitionResults(zhResults, enResults, englishLexicon);

console.log(JSON.stringify({
    filteredText: normalize(merged),
    rawCount: merged.length,
}, null, 2));

await detectorSession.release();
await zhRecognitionSession.release();
await enRecognitionSession.release();
