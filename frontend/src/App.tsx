import { ChangeEvent, DragEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode, startTransition, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { OCRItem, OCRLanguage, recognizeImage, shutdownOCRWorker } from './lib/ocr';
import brandMarkSrc from './assets/branding/local-ocr-mark.svg';

const IconImage = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>;
const IconUpload = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;
const IconFileText = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>;
const IconTrash = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconPlay = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>;
const IconCopy = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>;
const IconClipboard = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="18" x="5" y="4" rx="2"/><path d="M9 4.5h6"/><path d="M9 2h6a1 1 0 0 1 1 1v3H8V3a1 1 0 0 1 1-1Z"/></svg>;
const IconPin = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5"/><path d="m15 3 6 6"/><path d="M9.4 8.6 4 14v2h2l5.4-5.4"/><path d="m14 4 6 6-3.5 3.5-6-6Z"/></svg>;
const IconCompare = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/><path d="M10 8h4"/><path d="M10 16h4"/></svg>;
const IconSearch = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
const IconChevronUp = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>;
const IconChevronDown = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
const IconAlert = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>;
const IconRefresh = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const IconLayers = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>;
const IconBook = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
const IconSave = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>;
const IconDownload = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;
const IconSun = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>;
const IconMoon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>;
const IconShield = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>;
const IconFolder = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>;
const IconSpark = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M5 19l.8 2 .8-2 2-.8-2-.8L5 15l-.8 2-.8.8 2 .8z"/><path d="M19 19l.8 2 .8-2 2-.8-2-.8L19 15l-.8 2-.8.8 2 .8z"/></svg>;

type ImageInfo = {
    width: number;
    height: number;
    sizeLabel: string;
};

type PreviewMetrics = {
    left: number;
    top: number;
    width: number;
    height: number;
};

type OcrTask = {
    confidence: number | null;
    engineName: string;
    errorMessage: string;
    file: File;
    id: string;
    imageInfo: ImageInfo | null;
    ocrItems: OCRItem[];
    originalResultText: string;
    pinned: boolean;
    previewUrl: string;
    progress: number;
    sampleCheck: SampleCheckResult | null;
    resultText: string;
    sampleDefinition: SampleDefinition | null;
    statusText: string;
};

type DisplayBlock = {
    index: number;
    item: OCRItem;
};

type TaskFilter = 'all' | 'pending' | 'processing' | 'success' | 'failed';
type HealthState = 'idle' | 'checking' | 'ready' | 'error';

type DesktopAppInfo = {
    arch: string;
    name: string;
    packaged: boolean;
    paths: {
        documentsDir: string;
        resourcesDir: string;
        userDataDir: string;
    };
    platform: string;
    runtime: {
        chrome: string;
        electron: string;
        node: string;
    };
    version: string;
};

type OcrHealthReport = {
    checkedAt: string;
    engine: {
        ready: boolean;
        message: string;
    };
    modelDir: string;
    requiredFiles: Array<{
        exists: boolean;
        name: string;
        path: string;
        sizeBytes: number | null;
    }>;
    recommendations: string[];
    storage: {
        exists: boolean;
        message: string;
        path: string;
        writable: boolean;
    };
    userDictionary: {
        exists: boolean;
        message: string;
        path: string;
        sizeBytes: number | null;
        valid: boolean;
        wordCount: number;
    };
};

type SampleVariant = 'load' | 'run';

type SamplePhrase = {
    id: string;
    label: string;
    required: boolean;
};

type SampleDefinition = {
    name: string;
    phrases: SamplePhrase[];
};

type SamplePhraseCheck = SamplePhrase & {
    matched: boolean;
};

type SampleCheckResult = {
    matchedCount: number;
    passed: boolean;
    phraseChecks: SamplePhraseCheck[];
    totalCount: number;
};

type QueueRunScope = 'all' | 'failed';

type QueueRunState = {
    completed: number;
    failedCount: number;
    scope: QueueRunScope;
    stopRequested: boolean;
    stopped: boolean;
    successCount: number;
    total: number;
};

type TextMatchRange = {
    end: number;
    start: number;
};

type ResultDiffEntry = {
    currentLineNumber: number | null;
    currentText: string;
    kind: 'equal' | 'modified' | 'added' | 'removed';
    originalLineNumber: number | null;
    originalText: string;
};

type PersistedTaskRecord = {
    confidence: number | null;
    engineName: string;
    errorMessage: string;
    fileLastModified: number;
    fileName: string;
    fileType: string;
    id: string;
    imageInfo: ImageInfo | null;
    ocrItems: OCRItem[];
    originalResultText?: string;
    pinned: boolean;
    previewDataUrl: string;
    progress: number;
    resultText: string;
    sampleCheck: SampleCheckResult | null;
    sampleDefinition: SampleDefinition | null;
    statusText: string;
};

type PersistedTaskPayload = {
    activeTaskId: string | null;
    savedAt: string;
    tasks: PersistedTaskRecord[];
    version: 1;
};

type ExportHistoryRecord = {
    directoryPath: string;
    exportedAt: string;
    fileName: string;
    filePath: string;
    kind: 'txt' | 'json' | 'diagnostic';
    scope: 'current' | 'all' | 'diagnostic';
};

type ExportTemplateContext = {
    baseName: string;
    extension: string;
    kind: 'txt' | 'json' | 'diagnostic';
    scope: 'current' | 'all' | 'diagnostic';
};

const languageOptions: Array<{ value: OCRLanguage; label: string }> = [
    { value: 'eng+chi_sim', label: 'PP-OCRv5 中英 Server 强力模型' },
];

const taskFilters: Array<{ key: TaskFilter; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待处理' },
    { key: 'processing', label: '处理中' },
    { key: 'success', label: '成功' },
    { key: 'failed', label: '失败' },
];

const BUILT_IN_SAMPLE_DEFINITION: SampleDefinition = {
    name: '内置示例图',
    phrases: [
        { id: 'zh-title', label: '离线 OCR 工作台', required: true },
        { id: 'en-title', label: 'Hello Windows Native', required: true },
        { id: 'engine-line', label: 'PP-OCRv5 强力离线引擎', required: false },
        { id: 'offline-line', label: 'Setup / Portable / Offline Ready', required: false },
    ],
};

const OCR_RECENT_HISTORY_STORAGE_KEY = 'ocr-recent-history';
const OCR_RECENT_HISTORY_VERSION = 1;
const OCR_LAST_EXPORT_DIRECTORY_STORAGE_KEY = 'ocr-last-export-directory';
const OCR_EXPORT_HISTORY_STORAGE_KEY = 'ocr-export-history';
const OCR_EXPORT_TEMPLATE_STORAGE_KEY = 'ocr-export-template';
const OCR_PREFERRED_EXPORT_DIRECTORY_STORAGE_KEY = 'ocr-preferred-export-directory';
const MAX_EXPORT_HISTORY_RECORDS = 8;
const MAX_PERSISTED_HISTORY_TASKS = 6;
const MAX_PERSISTED_PREVIEW_SIDE = 1400;
const PERSISTED_PREVIEW_QUALITY = 0.82;
const DEFAULT_EXPORT_NAME_TEMPLATE = '{name}-{scope}-{kind}-{date}-{time}';

function formatFileSize(size: number): string {
    if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
    if (size >= 1024) return `${Math.round(size / 1024)} KB`;
    return `${size} B`;
}

function formatByteSize(sizeBytes: number | null): string {
    if (sizeBytes === null) return '缺失';
    if (sizeBytes >= 1024 * 1024 * 1024) return `${(sizeBytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    if (sizeBytes >= 1024 * 1024) return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
    if (sizeBytes >= 1024) return `${Math.round(sizeBytes / 1024)} KB`;
    return `${sizeBytes} B`;
}

function isImageFile(file: File): boolean {
    if (file.type.startsWith('image/')) return true;
    return /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(file.name);
}

function platformLabel(platform: string, arch: string): string {
    const platformMap: Record<string, string> = {
        darwin: 'macOS',
        linux: 'Linux',
        win32: 'Windows',
    };

    return `${platformMap[platform] ?? platform} ${arch}`;
}

function healthStateLabel(state: HealthState): string {
    if (state === 'ready') return '已通过自检';
    if (state === 'checking') return '自检中';
    if (state === 'error') return '自检失败';
    return '等待自检';
}

function parentDirectory(filePath: string): string {
    const trimmed = filePath.replace(/[\\/]+$/, '');
    const slashIndex = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));

    if (slashIndex <= 0) {
        return trimmed;
    }

    return trimmed.slice(0, slashIndex);
}

function fileBaseName(filePath: string): string {
    const trimmed = filePath.replace(/[\\/]+$/, '');
    const slashIndex = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));

    if (slashIndex < 0) {
        return trimmed;
    }

    return trimmed.slice(slashIndex + 1);
}

function toCompactDateStamp(value = new Date()): string {
    const year = `${value.getFullYear()}`;
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}${month}${day}`;
}

function toCompactTimeStamp(value = new Date()): string {
    const hours = `${value.getHours()}`.padStart(2, '0');
    const minutes = `${value.getMinutes()}`.padStart(2, '0');
    const seconds = `${value.getSeconds()}`.padStart(2, '0');
    return `${hours}${minutes}${seconds}`;
}

function sanitizeFileNameSegment(value: string): string {
    const sanitized = value
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[.\-_\s]+|[.\-_\s]+$/g, '');

    return sanitized || 'ocr-export';
}

function buildExportFileName(template: string, context: ExportTemplateContext): string {
    const now = new Date();
    const normalizedTemplate = template.trim() || DEFAULT_EXPORT_NAME_TEMPLATE;
    const replaced = normalizedTemplate
        .replace(/\{name\}/g, context.baseName)
        .replace(/\{scope\}/g, context.scope)
        .replace(/\{kind\}/g, context.kind)
        .replace(/\{date\}/g, toCompactDateStamp(now))
        .replace(/\{time\}/g, toCompactTimeStamp(now));

    return `${sanitizeFileNameSegment(replaced)}.${context.extension}`;
}

function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    if (target.isContentEditable) {
        return true;
    }

    return Boolean(target.closest('input, textarea, select, [contenteditable]'));
}

function normalizeSearchQuery(value: string): string {
    return value.trim().toLowerCase();
}

function findTextMatches(text: string, normalizedQuery: string): TextMatchRange[] {
    if (!normalizedQuery) {
        return [];
    }

    const haystack = text.toLowerCase();
    const matches: TextMatchRange[] = [];
    let startIndex = 0;

    while (startIndex < haystack.length) {
        const matchIndex = haystack.indexOf(normalizedQuery, startIndex);

        if (matchIndex === -1) {
            break;
        }

        matches.push({
            end: matchIndex + normalizedQuery.length,
            start: matchIndex,
        });
        startIndex = matchIndex + normalizedQuery.length;
    }

    return matches;
}

function renderHighlightedText(text: string, normalizedQuery: string): ReactNode {
    const matches = findTextMatches(text, normalizedQuery);

    if (matches.length === 0) {
        return text;
    }

    const parts: ReactNode[] = [];
    let cursor = 0;

    for (let index = 0; index < matches.length; index += 1) {
        const match = matches[index];

        if (cursor < match.start) {
            parts.push(text.slice(cursor, match.start));
        }

        parts.push(
            <mark className="search-mark" key={`${index}-${match.start}-${match.end}`}>
                {text.slice(match.start, match.end)}
            </mark>,
        );
        cursor = match.end;
    }

    if (cursor < text.length) {
        parts.push(text.slice(cursor));
    }

    return parts;
}

function splitTextLines(text: string): string[] {
    if (!text) {
        return [];
    }

    return text.split('\n');
}

function buildResultDiffEntries(originalText: string, currentText: string): ResultDiffEntry[] {
    const originalLines = splitTextLines(originalText);
    const currentLines = splitTextLines(currentText);
    const originalCount = originalLines.length;
    const currentCount = currentLines.length;
    const lcs: number[][] = Array.from({ length: originalCount + 1 }, () => Array(currentCount + 1).fill(0));

    for (let originalIndex = 1; originalIndex <= originalCount; originalIndex += 1) {
        for (let currentIndex = 1; currentIndex <= currentCount; currentIndex += 1) {
            if (originalLines[originalIndex - 1] === currentLines[currentIndex - 1]) {
                lcs[originalIndex][currentIndex] = lcs[originalIndex - 1][currentIndex - 1] + 1;
            } else {
                lcs[originalIndex][currentIndex] = Math.max(lcs[originalIndex - 1][currentIndex], lcs[originalIndex][currentIndex - 1]);
            }
        }
    }

    const rawEntries: Array<{
        currentLineNumber: number | null;
        currentText: string;
        kind: 'equal' | 'added' | 'removed';
        originalLineNumber: number | null;
        originalText: string;
    }> = [];
    let originalIndex = originalCount;
    let currentIndex = currentCount;

    while (originalIndex > 0 && currentIndex > 0) {
        if (originalLines[originalIndex - 1] === currentLines[currentIndex - 1]) {
            rawEntries.push({
                currentLineNumber: currentIndex,
                currentText: currentLines[currentIndex - 1],
                kind: 'equal',
                originalLineNumber: originalIndex,
                originalText: originalLines[originalIndex - 1],
            });
            originalIndex -= 1;
            currentIndex -= 1;
        } else if (lcs[originalIndex - 1][currentIndex] >= lcs[originalIndex][currentIndex - 1]) {
            rawEntries.push({
                currentLineNumber: null,
                currentText: '',
                kind: 'removed',
                originalLineNumber: originalIndex,
                originalText: originalLines[originalIndex - 1],
            });
            originalIndex -= 1;
        } else {
            rawEntries.push({
                currentLineNumber: currentIndex,
                currentText: currentLines[currentIndex - 1],
                kind: 'added',
                originalLineNumber: null,
                originalText: '',
            });
            currentIndex -= 1;
        }
    }

    while (originalIndex > 0) {
        rawEntries.push({
            currentLineNumber: null,
            currentText: '',
            kind: 'removed',
            originalLineNumber: originalIndex,
            originalText: originalLines[originalIndex - 1],
        });
        originalIndex -= 1;
    }

    while (currentIndex > 0) {
        rawEntries.push({
            currentLineNumber: currentIndex,
            currentText: currentLines[currentIndex - 1],
            kind: 'added',
            originalLineNumber: null,
            originalText: '',
        });
        currentIndex -= 1;
    }

    rawEntries.reverse();

    const entries: ResultDiffEntry[] = [];
    let rawIndex = 0;

    while (rawIndex < rawEntries.length) {
        const currentEntry = rawEntries[rawIndex];

        if (currentEntry.kind === 'equal') {
            entries.push({
                currentLineNumber: currentEntry.currentLineNumber,
                currentText: currentEntry.currentText,
                kind: 'equal',
                originalLineNumber: currentEntry.originalLineNumber,
                originalText: currentEntry.originalText,
            });
            rawIndex += 1;
            continue;
        }

        const removedEntries: typeof rawEntries = [];
        const addedEntries: typeof rawEntries = [];

        while (rawIndex < rawEntries.length && rawEntries[rawIndex].kind !== 'equal') {
            if (rawEntries[rawIndex].kind === 'removed') {
                removedEntries.push(rawEntries[rawIndex]);
            } else {
                addedEntries.push(rawEntries[rawIndex]);
            }
            rawIndex += 1;
        }

        const pairCount = Math.max(removedEntries.length, addedEntries.length);

        for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
            const removedEntry = removedEntries[pairIndex] ?? null;
            const addedEntry = addedEntries[pairIndex] ?? null;

            if (removedEntry && addedEntry) {
                entries.push({
                    currentLineNumber: addedEntry.currentLineNumber,
                    currentText: addedEntry.currentText,
                    kind: 'modified',
                    originalLineNumber: removedEntry.originalLineNumber,
                    originalText: removedEntry.originalText,
                });
                continue;
            }

            if (removedEntry) {
                entries.push({
                    currentLineNumber: null,
                    currentText: '',
                    kind: 'removed',
                    originalLineNumber: removedEntry.originalLineNumber,
                    originalText: removedEntry.originalText,
                });
                continue;
            }

            if (addedEntry) {
                entries.push({
                    currentLineNumber: addedEntry.currentLineNumber,
                    currentText: addedEntry.currentText,
                    kind: 'added',
                    originalLineNumber: null,
                    originalText: '',
                });
            }
        }
    }

    return entries;
}

function normalizeForSampleCheck(value: string): string {
    return value
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[^0-9a-z\u3400-\u9fff]+/gu, '');
}

function evaluateSampleCheck(definition: SampleDefinition, text: string): SampleCheckResult {
    const normalizedText = normalizeForSampleCheck(text);
    const phraseChecks = definition.phrases.map((phrase) => ({
        ...phrase,
        matched: normalizedText.includes(normalizeForSampleCheck(phrase.label)),
    }));
    const requiredPassed = phraseChecks.filter((phrase) => phrase.required).every((phrase) => phrase.matched);
    const matchedCount = phraseChecks.filter((phrase) => phrase.matched).length;

    return {
        matchedCount,
        passed: requiredPassed && matchedCount >= 3,
        phraseChecks,
        totalCount: phraseChecks.length,
    };
}

function drawSampleCard(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
    context.fillStyle = 'rgba(255, 255, 255, 0.94)';
    context.fillRect(x, y, width, height);
    context.strokeStyle = 'rgba(15, 23, 42, 0.08)';
    context.lineWidth = 2;
    context.strokeRect(x, y, width, height);
}

async function createBuiltInSampleFile(): Promise<File> {
    if (document.fonts?.ready) {
        await document.fonts.ready;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1680;
    canvas.height = 1080;
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('无法创建示例图画布');
    }

    const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    background.addColorStop(0, '#eef4ff');
    background.addColorStop(1, '#d8e6ff');
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawSampleCard(context, 96, 88, 1488, 904);
    drawSampleCard(context, 132, 128, 880, 772);
    drawSampleCard(context, 1050, 128, 498, 356);
    drawSampleCard(context, 1050, 522, 498, 378);

    context.fillStyle = '#0f172a';
    context.font = '700 68px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "Segoe UI", sans-serif';
    context.fillText('离线 OCR 工作台', 180, 250);

    context.fillStyle = '#1d4ed8';
    context.font = '700 58px "Segoe UI", "Microsoft YaHei", sans-serif';
    context.fillText('Hello Windows Native', 180, 338);

    context.fillStyle = '#334155';
    context.font = '600 34px "Segoe UI", "Microsoft YaHei", sans-serif';
    context.fillText('PP-OCRv5 强力离线引擎', 180, 420);
    context.fillText('Setup / Portable / Offline Ready', 180, 478);
    context.fillText('Drag image files here and export TXT / JSON', 180, 536);

    context.fillStyle = '#475569';
    context.font = '500 26px "Segoe UI", "Microsoft YaHei", sans-serif';
    context.fillText('1. 首次打开先看自检', 180, 640);
    context.fillText('2. 先识别一张，再批量识别整组图片', 180, 688);
    context.fillText('3. 结果可编辑，可导出文本与结构化 JSON', 180, 736);

    context.fillStyle = '#0f172a';
    context.font = '700 30px "Segoe UI", "Microsoft YaHei", sans-serif';
    context.fillText('Expected OCR', 1092, 196);
    context.fillStyle = '#334155';
    context.font = '600 25px "Segoe UI", "Microsoft YaHei", sans-serif';
    context.fillText('离线 OCR 工作台', 1092, 258);
    context.fillText('Hello Windows Native', 1092, 306);
    context.fillText('PP-OCRv5 强力离线引擎', 1092, 354);
    context.fillText('Setup / Portable / Offline Ready', 1092, 402);

    context.fillStyle = '#0f172a';
    context.font = '700 30px "Segoe UI", "Microsoft YaHei", sans-serif';
    context.fillText('Sample Checklist', 1092, 590);
    context.fillStyle = '#334155';
    context.font = '600 24px "Segoe UI", "Microsoft YaHei", sans-serif';
    context.fillText('Self-check passed', 1092, 650);
    context.fillText('Dictionary can be saved', 1092, 700);
    context.fillText('Batch export works', 1092, 750);
    context.fillText('No cloud OCR dependency', 1092, 800);

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('生成示例图失败'));
                return;
            }

            resolve(new File([blob], 'local-ocr-sample.png', {
                lastModified: Date.now(),
                type: 'image/png',
            }));
        }, 'image/png');
    });
}

function sourceLabel(source?: string): string {
    if (source === 'en-mobile') return '英文增强';
    if (source === 'zh-server') return '中文主模型';
    return '默认';
}

function isBlobPreviewUrl(previewUrl: string): boolean {
    return previewUrl.startsWith('blob:');
}

function releasePreviewUrl(previewUrl: string) {
    if (isBlobPreviewUrl(previewUrl)) {
        URL.revokeObjectURL(previewUrl);
    }
}

function shouldPersistTask(task: OcrTask): boolean {
    return task.pinned || Boolean(task.resultText.trim() || task.errorMessage.trim());
}

function isClearableHistoryTask(task: OcrTask): boolean {
    return shouldPersistTask(task) && !task.pinned;
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
                return;
            }

            reject(new Error('无法读取图片数据'));
        };
        reader.onerror = () => reject(reader.error ?? new Error('读取图片数据失败'));
        reader.readAsDataURL(blob);
    });
}

async function previewUrlToDataUrl(previewUrl: string): Promise<string> {
    if (previewUrl.startsWith('data:')) {
        return previewUrl;
    }

    const response = await fetch(previewUrl);
    const blob = await response.blob();
    return blobToDataUrl(blob);
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('加载预览图片失败'));
        image.src = src;
    });
}

async function createPersistedPreviewDataUrl(task: OcrTask): Promise<string> {
    if (task.previewUrl.startsWith('data:')) {
        return task.previewUrl;
    }

    try {
        const image = await loadImageElement(task.previewUrl);
        const sourceWidth = image.naturalWidth || task.imageInfo?.width || 0;
        const sourceHeight = image.naturalHeight || task.imageInfo?.height || 0;

        if (sourceWidth <= 0 || sourceHeight <= 0) {
            return previewUrlToDataUrl(task.previewUrl);
        }

        const scale = Math.min(1, MAX_PERSISTED_PREVIEW_SIDE / Math.max(sourceWidth, sourceHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(sourceWidth * scale));
        canvas.height = Math.max(1, Math.round(sourceHeight * scale));
        const context = canvas.getContext('2d');

        if (!context) {
            return previewUrlToDataUrl(task.previewUrl);
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', PERSISTED_PREVIEW_QUALITY);
    } catch (_error) {
        return previewUrlToDataUrl(task.previewUrl);
    }
}

async function dataUrlToFile(dataUrl: string, fileName: string, fileType: string, lastModified: number): Promise<File> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    return new File([blob], fileName, {
        lastModified,
        type: fileType || blob.type || 'image/jpeg',
    });
}

function buildPersistedTaskPayload(records: PersistedTaskRecord[], activeId: string | null): PersistedTaskPayload {
    const availableIds = new Set(records.map((task) => task.id));
    const latestTaskId = records.length > 0 ? records[records.length - 1].id : null;
    const nextActiveTaskId = activeId && availableIds.has(activeId)
        ? activeId
        : latestTaskId;

    return {
        activeTaskId: nextActiveTaskId,
        savedAt: new Date().toISOString(),
        tasks: records,
        version: OCR_RECENT_HISTORY_VERSION,
    };
}

function taskStatus(task: OcrTask): TaskFilter {
    if (task.errorMessage) return 'failed';
    if (task.resultText.trim()) return 'success';
    if (task.progress > 0 && task.progress < 1) return 'processing';
    return 'pending';
}

function taskStatusLabel(task: OcrTask): string {
    const status = taskStatus(task);

    if (status === 'failed') return '失败';
    if (status === 'success') return '已识别';
    if (status === 'processing') return '处理中';
    return '待处理';
}

function joinLineText(items: OCRItem[]): string {
    let text = '';

    for (const item of items) {
        const value = item.text.trim();

        if (!value) continue;

        if (!text) {
            text = value;
            continue;
        }

        const shouldSpace = /[A-Za-z0-9]$/.test(text) && /^[A-Za-z0-9]/.test(value);
        text += shouldSpace ? ` ${value}` : value;
    }

    return text;
}

function composeResultText(items: OCRItem[]): string {
    const filtered = items
        .map((item) => ({
            ...item,
            centerY: item.box.y + item.box.height / 2,
            text: item.text.trim(),
        }))
        .filter((item) => item.text)
        .sort((left, right) => left.centerY - right.centerY || left.box.x - right.box.x);

    if (filtered.length === 0) {
        return '';
    }

    const lines: OCRItem[][] = [];
    let currentLine: typeof filtered = [];
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
        .map((line) => line.sort((left, right) => left.box.x - right.box.x))
        .map((line) => joinLineText(line))
        .filter(Boolean)
        .join('\n');
}

function createTask(file: File, previewUrl: string): OcrTask {
    return {
        confidence: null,
        engineName: 'PP-OCRv5 Server + EN Refine',
        errorMessage: '',
        file,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        imageInfo: null,
        ocrItems: [],
        originalResultText: '',
        pinned: false,
        previewUrl,
        progress: 0,
        sampleCheck: null,
        resultText: '',
        sampleDefinition: null,
        statusText: '等待识别',
    };
}

async function loadImageInfo(file: File, previewUrl: string): Promise<ImageInfo> {
    const image = new Image();

    return new Promise((resolve) => {
        image.onload = () => {
            resolve({
                width: image.naturalWidth,
                height: image.naturalHeight,
                sizeLabel: formatFileSize(file.size),
            });
        };
        image.onerror = () => {
            resolve({
                width: 0,
                height: 0,
                sizeLabel: formatFileSize(file.size),
            });
        };
        image.src = previewUrl;
    });
}

function App() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewStageRef = useRef<HTMLDivElement>(null);
    const previewImageRef = useRef<HTMLImageElement>(null);
    const resultTextareaRef = useRef<HTMLTextAreaElement>(null);
    const blockCardRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const persistedPreviewCacheRef = useRef<Record<string, string>>({});
    const tasksRef = useRef<OcrTask[]>([]);
    const queueStopRequestedRef = useRef(false);

    const [autoRecognizeClipboard, setAutoRecognizeClipboard] = useState<boolean>(() => {
        if (typeof window === 'undefined') {
            return true;
        }

        const savedPreference = window.localStorage.getItem('ocr-auto-recognize-clipboard');
        return savedPreference === null ? true : savedPreference === 'true';
    });
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [tasks, setTasks] = useState<OcrTask[]>([]);
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
    const [previewMetrics, setPreviewMetrics] = useState<PreviewMetrics | null>(null);
    const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
    const [hoveredBlockIndex, setHoveredBlockIndex] = useState<number | null>(null);
    const [dragging, setDragging] = useState(false);
    const [language, setLanguage] = useState<OCRLanguage>('eng+chi_sim');
    const [copyLabel, setCopyLabel] = useState('复制文本');
    const [dictionaryText, setDictionaryText] = useState('');
    const [dictionaryStatus, setDictionaryStatus] = useState('每行一个词，可用于品牌名、产品名和术语纠错。');
    const [exportNameTemplate, setExportNameTemplate] = useState<string>(() => {
        if (typeof window === 'undefined') {
            return DEFAULT_EXPORT_NAME_TEMPLATE;
        }

        return window.localStorage.getItem(OCR_EXPORT_TEMPLATE_STORAGE_KEY) ?? DEFAULT_EXPORT_NAME_TEMPLATE;
    });
    const [preferredExportDirectoryPath, setPreferredExportDirectoryPath] = useState<string>(() => {
        if (typeof window === 'undefined') {
            return '';
        }

        return window.localStorage.getItem(OCR_PREFERRED_EXPORT_DIRECTORY_STORAGE_KEY) ?? '';
    });
    const [isSavingDictionary, setIsSavingDictionary] = useState(false);
    const [isResultDiffMode, setIsResultDiffMode] = useState(false);
    const [resultSearchQuery, setResultSearchQuery] = useState('');
    const [resultSearchCursor, setResultSearchCursor] = useState(0);
    const [appInfo, setAppInfo] = useState<DesktopAppInfo | null>(null);
    const [healthReport, setHealthReport] = useState<OcrHealthReport | null>(null);
    const [historyHydrated, setHistoryHydrated] = useState(false);
    const [historyRestoreLabel, setHistoryRestoreLabel] = useState('');
    const [lastExportDirectoryPath, setLastExportDirectoryPath] = useState<string>(() => {
        if (typeof window === 'undefined') {
            return '';
        }

        return window.localStorage.getItem(OCR_LAST_EXPORT_DIRECTORY_STORAGE_KEY) ?? '';
    });
    const [exportHistory, setExportHistory] = useState<ExportHistoryRecord[]>(() => {
        if (typeof window === 'undefined') {
            return [];
        }

        const raw = window.localStorage.getItem(OCR_EXPORT_HISTORY_STORAGE_KEY);

        if (!raw) {
            return [];
        }

        try {
            const parsed = JSON.parse(raw) as ExportHistoryRecord[];
            return Array.isArray(parsed) ? parsed : [];
        } catch (_error) {
            return [];
        }
    });
    const [healthState, setHealthState] = useState<HealthState>('idle');
    const [healthMessage, setHealthMessage] = useState('等待首启自检。');
    const [supportMessage, setSupportMessage] = useState('如自检失败，可直接打开目录、复制诊断或重建词库。');
    const [diagnosticCopyLabel, setDiagnosticCopyLabel] = useState('复制诊断');
    const [isRepairingDictionary, setIsRepairingDictionary] = useState(false);
    const [isPastingClipboard, setIsPastingClipboard] = useState(false);
    const [isPreparingSample, setIsPreparingSample] = useState(false);
    const [queueRunState, setQueueRunState] = useState<QueueRunState | null>(null);
    const [runningMode, setRunningMode] = useState<'idle' | 'single' | 'batch'>('idle');

    useEffect(() => {
        const savedTheme = localStorage.getItem('ocr-theme') as 'dark' | 'light' | null;
        if (savedTheme) {
            setTheme(savedTheme);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            setTheme('light');
        }
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('ocr-theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem(OCR_EXPORT_TEMPLATE_STORAGE_KEY, exportNameTemplate.trim() || DEFAULT_EXPORT_NAME_TEMPLATE);
    }, [exportNameTemplate]);

    useEffect(() => {
        localStorage.setItem('ocr-auto-recognize-clipboard', String(autoRecognizeClipboard));
    }, [autoRecognizeClipboard]);

    useEffect(() => {
        if (preferredExportDirectoryPath) {
            localStorage.setItem(OCR_PREFERRED_EXPORT_DIRECTORY_STORAGE_KEY, preferredExportDirectoryPath);
            return;
        }

        localStorage.removeItem(OCR_PREFERRED_EXPORT_DIRECTORY_STORAGE_KEY);
    }, [preferredExportDirectoryPath]);

    useEffect(() => {
        if (lastExportDirectoryPath) {
            localStorage.setItem(OCR_LAST_EXPORT_DIRECTORY_STORAGE_KEY, lastExportDirectoryPath);
            return;
        }

        localStorage.removeItem(OCR_LAST_EXPORT_DIRECTORY_STORAGE_KEY);
    }, [lastExportDirectoryPath]);

    useEffect(() => {
        if (exportHistory.length > 0) {
            localStorage.setItem(OCR_EXPORT_HISTORY_STORAGE_KEY, JSON.stringify(exportHistory));
            return;
        }

        localStorage.removeItem(OCR_EXPORT_HISTORY_STORAGE_KEY);
    }, [exportHistory]);

    useEffect(() => {
        tasksRef.current = tasks;
    }, [tasks]);

    useEffect(() => {
        return () => {
            void shutdownOCRWorker();
            for (const task of tasksRef.current) {
                releasePreviewUrl(task.previewUrl);
            }
        };
    }, []);

    useEffect(() => {
        let mounted = true;

        async function restorePersistedTasks() {
            const raw = localStorage.getItem(OCR_RECENT_HISTORY_STORAGE_KEY);

            if (!raw) {
                if (mounted) {
                    setHistoryHydrated(true);
                }
                return;
            }

            try {
                const parsed = JSON.parse(raw) as PersistedTaskPayload;

                if (parsed.version !== OCR_RECENT_HISTORY_VERSION || !Array.isArray(parsed.tasks)) {
                    localStorage.removeItem(OCR_RECENT_HISTORY_STORAGE_KEY);
                    if (mounted) {
                        setHistoryHydrated(true);
                    }
                    return;
                }

                const restoredTasks = await Promise.all(parsed.tasks.map(async (task): Promise<OcrTask> => {
                    const file = await dataUrlToFile(task.previewDataUrl, task.fileName, task.fileType, task.fileLastModified);
                    persistedPreviewCacheRef.current[task.id] = task.previewDataUrl;

                    return {
                        confidence: task.confidence,
                        engineName: task.engineName,
                        errorMessage: task.errorMessage,
                        file,
                        id: task.id,
                        imageInfo: task.imageInfo,
                        ocrItems: task.ocrItems,
                        originalResultText: task.originalResultText ?? task.resultText,
                        pinned: task.pinned,
                        previewUrl: task.previewDataUrl,
                        progress: task.progress,
                        sampleCheck: task.sampleCheck,
                        resultText: task.resultText,
                        sampleDefinition: task.sampleDefinition,
                        statusText: task.statusText,
                    };
                }));

                if (!mounted) {
                    return;
                }

                if (restoredTasks.length > 0) {
                    tasksRef.current = restoredTasks;
                    setTasks(restoredTasks);
                    setActiveTaskId(parsed.activeTaskId ?? restoredTasks[0]?.id ?? null);
                    setHistoryRestoreLabel(`已恢复最近 ${restoredTasks.length} 条识别结果。`);
                }
            } catch (_error) {
                localStorage.removeItem(OCR_RECENT_HISTORY_STORAGE_KEY);
            } finally {
                if (mounted) {
                    setHistoryHydrated(true);
                }
            }
        }

        void restorePersistedTasks();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (!historyHydrated) {
            return;
        }

        let cancelled = false;

        async function persistRecentTasks() {
            const persistableTasks = tasks.filter(shouldPersistTask);
            const recentUnpinnedIds = new Set(
                persistableTasks
                    .filter((task) => !task.pinned)
                    .slice(-MAX_PERSISTED_HISTORY_TASKS)
                    .map((task) => task.id),
            );
            const recentTasks = persistableTasks.filter((task) => task.pinned || recentUnpinnedIds.has(task.id));

            if (recentTasks.length === 0) {
                localStorage.removeItem(OCR_RECENT_HISTORY_STORAGE_KEY);
                if (!cancelled) {
                    setHistoryRestoreLabel('');
                }
                return;
            }

            const records: PersistedTaskRecord[] = [];

            for (const task of recentTasks) {
                let previewDataUrl = persistedPreviewCacheRef.current[task.id];

                if (!previewDataUrl) {
                    previewDataUrl = await createPersistedPreviewDataUrl(task);
                    persistedPreviewCacheRef.current[task.id] = previewDataUrl;
                }

                if (cancelled) {
                    return;
                }

                records.push({
                    confidence: task.confidence,
                    engineName: task.engineName,
                    errorMessage: task.errorMessage,
                    fileLastModified: task.file.lastModified,
                    fileName: task.file.name,
                    fileType: task.file.type,
                    id: task.id,
                    imageInfo: task.imageInfo,
                    ocrItems: task.ocrItems,
                    originalResultText: task.originalResultText,
                    pinned: task.pinned,
                    previewDataUrl,
                    progress: task.progress,
                    resultText: task.resultText,
                    sampleCheck: task.sampleCheck,
                    sampleDefinition: task.sampleDefinition,
                    statusText: task.statusText,
                });
            }

            for (let keepCount = records.length; keepCount >= 1; keepCount -= 1) {
                const subset = records.slice(records.length - keepCount);

                try {
                    localStorage.setItem(
                        OCR_RECENT_HISTORY_STORAGE_KEY,
                        JSON.stringify(buildPersistedTaskPayload(subset, activeTaskId)),
                    );
                    return;
                } catch (_error) {
                    continue;
                }
            }

            localStorage.removeItem(OCR_RECENT_HISTORY_STORAGE_KEY);
        }

        void persistRecentTasks();

        return () => {
            cancelled = true;
        };
    }, [activeTaskId, historyHydrated, tasks]);

    const activeTask = useMemo(
        () => tasks.find((task) => task.id === activeTaskId) ?? null,
        [tasks, activeTaskId],
    );

    const visibleTasks = useMemo(
        () => tasks.filter((task) => taskFilter === 'all' || taskStatus(task) === taskFilter),
        [taskFilter, tasks],
    );

    const normalizedResultSearchQuery = useMemo(
        () => normalizeSearchQuery(resultSearchQuery),
        [resultSearchQuery],
    );

    const taskSummary = useMemo(() => {
        const summary = {
            all: tasks.length,
            failed: 0,
            pending: 0,
            processing: 0,
            success: 0,
        };

        for (const task of tasks) {
            summary[taskStatus(task)] += 1;
        }

        return summary;
    }, [tasks]);

    useEffect(() => {
        setSelectedBlockIndex(null);
        setHoveredBlockIndex(null);
    }, [activeTaskId]);

    useEffect(() => {
        setResultSearchCursor(0);
    }, [activeTaskId, normalizedResultSearchQuery]);

    useEffect(() => {
        if (!activeTask?.previewUrl) {
            setPreviewMetrics(null);
            return;
        }

        const stage = previewStageRef.current;
        const image = previewImageRef.current;

        if (!stage || !image) {
            return;
        }

        function updateMetrics() {
            if (!previewStageRef.current || !previewImageRef.current) {
                return;
            }

            const stageRect = previewStageRef.current.getBoundingClientRect();
            const imageRect = previewImageRef.current.getBoundingClientRect();

            if (imageRect.width <= 0 || imageRect.height <= 0) {
                return;
            }

            setPreviewMetrics({
                left: imageRect.left - stageRect.left,
                top: imageRect.top - stageRect.top,
                width: imageRect.width,
                height: imageRect.height,
            });
        }

        const observer = new ResizeObserver(() => updateMetrics());
        observer.observe(stage);
        observer.observe(image);
        window.addEventListener('resize', updateMetrics);
        window.requestAnimationFrame(updateMetrics);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateMetrics);
        };
    }, [activeTask?.previewUrl, activeTask?.imageInfo]);

    useEffect(() => {
        let mounted = true;

        async function loadDesktopInfo() {
            if (!window.desktopApi?.getUserDictionary) return;

            try {
                const [words, info] = await Promise.all([
                    window.desktopApi.getUserDictionary(),
                    window.desktopApi.getAppInfo?.() ?? Promise.resolve(null),
                ]);

                if (!mounted) return;

                setDictionaryText(words.join('\n'));
                setDictionaryStatus(words.length > 0 ? `已加载 ${words.length} 个自定义词。` : '每行一个词，可用于品牌名、产品名和术语纠错。');
                if (info) {
                    setAppInfo(info);
                }
                void runHealthCheck();
            } catch (_error) {
                if (mounted) {
                    setDictionaryStatus('读取用户词库失败。');
                    setHealthState('error');
                    setHealthMessage('初始化桌面环境信息失败。');
                }
            }
        }

        void loadDesktopInfo();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (selectedBlockIndex === null) {
            return;
        }

        const target = blockCardRefs.current[selectedBlockIndex];

        if (!target) {
            return;
        }

        target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [selectedBlockIndex, activeTaskId]);

    function toggleTheme() {
        setTheme((previous) => previous === 'dark' ? 'light' : 'dark');
    }

    function handleNavigateResultSearch(direction: -1 | 1) {
        if (resultSearchNavigableCount === 0) {
            return;
        }

        setResultSearchCursor((previous) => (previous + direction + resultSearchNavigableCount) % resultSearchNavigableCount);
    }

    function handleResultSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleNavigateResultSearch(event.shiftKey ? -1 : 1);
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            setResultSearchQuery('');
        }
    }

    async function prepareTasks(files: File[]) {
        const validFiles = files.filter(isImageFile);

        if (validFiles.length === 0) {
            return [];
        }

        return Promise.all(validFiles.map(async (file) => {
            const previewUrl = URL.createObjectURL(file);
            const task = createTask(file, previewUrl);
            const imageInfo = await loadImageInfo(file, previewUrl);
            return {
                ...task,
                imageInfo,
            };
        }));
    }

    function replaceTasks(updater: (previous: OcrTask[]) => OcrTask[]) {
        setTasks((previous) => {
            const next = updater(previous);
            tasksRef.current = next;
            return next;
        });
    }

    function appendPreparedTasks(prepared: OcrTask[]) {
        if (prepared.length === 0) {
            return null;
        }

        const nextTasks = [...tasksRef.current, ...prepared];
        tasksRef.current = nextTasks;
        setTasks(nextTasks);
        setActiveTaskId((previous) => previous ?? prepared[0]?.id ?? null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        return prepared[0]?.id ?? null;
    }

    async function runHealthCheck() {
        if (!window.desktopApi?.getOcrHealth) {
            setHealthState('error');
            setHealthMessage('当前环境缺少桌面自检接口。');
            setSupportMessage('当前窗口无法执行恢复操作，请检查 Electron 预加载接口。');
            return;
        }

        setHealthState('checking');
        setHealthMessage('正在检查模型文件、词库路径与 OCR 引擎...');

        try {
            const report = await window.desktopApi.getOcrHealth();
            setHealthReport(report);
            setHealthState(report.engine.ready ? 'ready' : 'error');
            setHealthMessage(report.engine.message);
            setSupportMessage(report.engine.ready ? '环境检查通过，可直接开始识别。' : '检测到问题时，可使用下面的恢复操作。');
        } catch (error) {
            const message = error instanceof Error ? error.message : '执行自检失败';
            setHealthState('error');
            setHealthMessage(message);
            setSupportMessage('自检执行失败，可先打开用户数据目录并导出诊断。');
        }
    }

    async function handleOpenPath(targetPath: string, successMessage: string) {
        if (!window.desktopApi?.openPath || !targetPath) {
            setSupportMessage('当前环境不支持打开本地目录。');
            return;
        }

        try {
            await window.desktopApi.openPath(targetPath);
            setSupportMessage(successMessage);
        } catch (error) {
            const message = error instanceof Error ? error.message : '打开目录失败';
            setSupportMessage(message);
        }
    }

    async function sendDesktopNotification(title: string, body: string) {
        if (!window.desktopApi?.notifyDesktop) {
            return;
        }

        try {
            await window.desktopApi.notifyDesktop({ title, body });
        } catch (_error) {
            return;
        }
    }

    function pushExportHistoryRecord(record: ExportHistoryRecord) {
        setExportHistory((previous) => [
            record,
            ...previous.filter((item) => item.filePath !== record.filePath),
        ].slice(0, MAX_EXPORT_HISTORY_RECORDS));
    }

    function handleClearExportHistory() {
        setExportHistory([]);
        setSupportMessage('导出记录已清空。');
    }

    function handleSetPreferredExportDirectory() {
        if (!lastExportDirectoryPath) {
            setSupportMessage('当前还没有可复用的导出目录。');
            return;
        }

        setPreferredExportDirectoryPath(lastExportDirectoryPath);
        setSupportMessage('已将上次导出目录设为默认导出目录。');
    }

    function handleClearPreferredExportDirectory() {
        setPreferredExportDirectoryPath('');
        setSupportMessage('已清除默认导出目录设置。');
    }

    async function handleCopyDiagnostics(diagnosticText: string) {
        if (!diagnosticText.trim()) {
            setSupportMessage('当前没有可复制的诊断信息。');
            return;
        }

        try {
            if (window.desktopApi?.copyText) {
                await window.desktopApi.copyText(diagnosticText);
            } else {
                await navigator.clipboard.writeText(diagnosticText);
            }

            setDiagnosticCopyLabel('已复制');
            setSupportMessage('诊断摘要已复制，可直接发给维护者。');
            window.setTimeout(() => setDiagnosticCopyLabel('复制诊断'), 1600);
        } catch (error) {
            const message = error instanceof Error ? error.message : '复制诊断失败';
            setDiagnosticCopyLabel('复制失败');
            setSupportMessage(message);
            window.setTimeout(() => setDiagnosticCopyLabel('复制诊断'), 1600);
        }
    }

    async function handleExportDiagnostics(diagnosticText: string) {
        if (!window.desktopApi?.saveExportFile || !diagnosticText.trim()) {
            setSupportMessage('当前没有可导出的诊断信息。');
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        try {
            const result = await window.desktopApi.saveExportFile({
                content: diagnosticText,
                defaultDirectoryPath: preferredExportDirectoryPath || lastExportDirectoryPath || undefined,
                defaultFileName: buildExportFileName(exportNameTemplate, {
                    baseName: `ocr-diagnostics-${timestamp}`,
                    extension: 'json',
                    kind: 'diagnostic',
                    scope: 'diagnostic',
                }),
                filters: [{ name: 'JSON', extensions: ['json'] }],
            });

            if (result.canceled) {
                setSupportMessage('已取消导出诊断文件。');
                return;
            }

            if (result.filePath) {
                const directoryPath = parentDirectory(result.filePath);
                setLastExportDirectoryPath(directoryPath);
                pushExportHistoryRecord({
                    directoryPath,
                    exportedAt: new Date().toISOString(),
                    fileName: fileBaseName(result.filePath),
                    filePath: result.filePath,
                    kind: 'diagnostic',
                    scope: 'diagnostic',
                });
            }
            setSupportMessage(`诊断文件已导出到 ${result.filePath ?? '所选目录'}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : '导出诊断失败';
            setSupportMessage(message);
        }
    }

    async function handleRepairDictionary() {
        if (!window.desktopApi?.saveUserDictionary || isSavingDictionary || isRepairingDictionary || runningMode !== 'idle') {
            return;
        }

        setIsRepairingDictionary(true);
        setSupportMessage('正在重建空词库...');

        try {
            const saved = await window.desktopApi.saveUserDictionary([]);
            setDictionaryText(saved.join('\n'));
            setDictionaryStatus('词库已重建为空文件。');
            setSupportMessage('词库已重建，建议重新执行一次自检。');
            await runHealthCheck();
        } catch (error) {
            const message = error instanceof Error ? error.message : '重建词库失败';
            setSupportMessage(message);
        } finally {
            setIsRepairingDictionary(false);
        }
    }

    async function handleBuiltInSample(variant: SampleVariant) {
        if (isPreparingSample || isPastingClipboard || runningMode !== 'idle') {
            return;
        }

        setIsPreparingSample(true);
        setSupportMessage(variant === 'run' ? '正在生成示例图并执行试跑...' : '正在生成内置示例图...');

        try {
            const sampleFile = await createBuiltInSampleFile();
            const prepared = (await prepareTasks([sampleFile])).map((task) => ({
                ...task,
                sampleDefinition: BUILT_IN_SAMPLE_DEFINITION,
            }));
            const taskId = appendPreparedTasks(prepared);

            if (!taskId) {
                setSupportMessage('示例图生成完成，但未能加入任务列表。');
                return;
            }

            setSupportMessage(variant === 'run' ? '内置示例图已加入任务，准备开始试跑。' : '内置示例图已加入任务列表。');

            if (variant === 'run') {
                if (!canRunRecognition) {
                    setSupportMessage('示例图已载入。当前自检未通过，暂不执行识别。');
                    return;
                }

                setRunningMode('single');

                try {
                    const runResult = await recognizeTask(taskId);

                    if (runResult.success && runResult.sampleCheck) {
                        setSupportMessage(
                            runResult.sampleCheck.passed
                                ? `示例图试跑完成，校验通过，匹配 ${runResult.sampleCheck.matchedCount}/${runResult.sampleCheck.totalCount}。`
                                : `示例图试跑完成，校验未通过，匹配 ${runResult.sampleCheck.matchedCount}/${runResult.sampleCheck.totalCount}。请查看右侧缺失项。`,
                        );
                    } else if (runResult.success) {
                        setSupportMessage('示例图试跑完成，可直接查看右侧识别结果。');
                    } else {
                        setSupportMessage(runResult.errorMessage ?? '示例图试跑失败。');
                    }
                } finally {
                    setRunningMode('idle');
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : '生成内置示例图失败';
            setSupportMessage(message);
        } finally {
            setIsPreparingSample(false);
        }
    }

    async function appendFiles(files: File[]) {
        const prepared = await prepareTasks(files);
        appendPreparedTasks(prepared);
    }

    async function appendClipboardImage(source: 'button' | 'shortcut' = 'button') {
        if (!window.desktopApi?.getClipboardImage) {
            setSupportMessage('当前环境不支持读取系统剪贴板图片。');
            return false;
        }

        if (isPastingClipboard) {
            return false;
        }

        if (runningMode !== 'idle') {
            setSupportMessage('当前仍在执行识别，请等待结束后再粘贴图片。');
            return false;
        }

        setIsPastingClipboard(true);
        setSupportMessage(source === 'shortcut' ? '正在读取剪贴板截图...' : '正在导入剪贴板图片...');

        try {
            const clipboardImage = await window.desktopApi.getClipboardImage();

            if (!clipboardImage) {
                setSupportMessage('剪贴板里没有可用图片。请先截图，或先复制一张图片。');
                return false;
            }

            const file = new File([clipboardImage.bytes], clipboardImage.fileName, {
                lastModified: Date.now(),
                type: clipboardImage.mimeType,
            });
            const prepared = await prepareTasks([file]);
            const taskId = appendPreparedTasks(prepared);

            if (taskId) {
                setActiveTaskId(taskId);
            }

            if (!taskId) {
                setSupportMessage('剪贴板图片已读取，但未能加入任务列表。');
                return false;
            }

            if (!autoRecognizeClipboard) {
                setSupportMessage(
                    source === 'shortcut'
                        ? '已从剪贴板粘贴截图，可直接开始识别。'
                        : '已从剪贴板导入图片，可直接开始识别。',
                );
                return true;
            }

            if (healthState === 'checking') {
                setSupportMessage('已从剪贴板导入图片。当前仍在自检，暂不自动识别。');
                return true;
            }

            if (healthState === 'error') {
                setSupportMessage('已从剪贴板导入图片。当前自检未通过，暂不自动识别。');
                return true;
            }

            setSupportMessage(source === 'shortcut' ? '截图已粘贴，正在自动识别...' : '剪贴板图片已导入，正在自动识别...');
            setRunningMode('single');

            try {
                const runResult = await recognizeTask(taskId);

                if (runResult.success) {
                    setSupportMessage(source === 'shortcut' ? '截图自动识别完成。' : '剪贴板图片自动识别完成。');
                } else {
                    setSupportMessage(runResult.errorMessage ?? '剪贴板图片自动识别失败。');
                }
            } finally {
                setRunningMode('idle');
            }

            return Boolean(taskId);
        } catch (error) {
            const message = error instanceof Error ? error.message : '导入剪贴板图片失败';
            setSupportMessage(message);
            return false;
        } finally {
            setIsPastingClipboard(false);
        }
    }

    function updateTask(taskId: string, updater: (task: OcrTask) => OcrTask) {
        replaceTasks((previous) => previous.map((task) => (task.id === taskId ? updater(task) : task)));
    }

    function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
        if (isTaskMutationLocked) {
            setSupportMessage('当前仍有导入或识别任务进行中，请稍后再添加图片。');
            return;
        }

        void appendFiles(Array.from(event.target.files ?? []));
    }

    function handleDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setDragging(false);

        if (isTaskMutationLocked) {
            setSupportMessage('当前仍有导入或识别任务进行中，请稍后再拖入图片。');
            return;
        }

        void appendFiles(Array.from(event.dataTransfer.files ?? []));
    }

    function handleChooseFile() {
        if (isTaskMutationLocked) {
            setSupportMessage('当前仍有导入或识别任务进行中，请稍后再添加图片。');
            return;
        }

        fileInputRef.current?.click();
    }

    useEffect(() => {
        function handleWindowKeyDown(event: KeyboardEvent) {
            const pressedPasteShortcut = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'v';

            if (!pressedPasteShortcut || event.repeat || isEditableTarget(event.target)) {
                return;
            }

            event.preventDefault();
            void appendClipboardImage('shortcut');
        }

        window.addEventListener('keydown', handleWindowKeyDown);
        return () => {
            window.removeEventListener('keydown', handleWindowKeyDown);
        };
    }, [isPastingClipboard, runningMode]);

    function resetSelection() {
        setSelectedBlockIndex(null);
        setHoveredBlockIndex(null);
        setPreviewMetrics(null);
    }

    function handleClearAll() {
        if (isTaskMutationLocked) {
            return;
        }

        for (const task of tasksRef.current) {
            releasePreviewUrl(task.previewUrl);
        }
        persistedPreviewCacheRef.current = {};
        replaceTasks(() => []);
        setQueueRunState(null);
        setActiveTaskId(null);
        resetSelection();
    }

    function handleRemoveTask(taskId: string) {
        if (isTaskMutationLocked) {
            return;
        }

        const task = tasksRef.current.find((item) => item.id === taskId);
        const remaining = tasksRef.current.filter((item) => item.id !== taskId);

        if (task) {
            releasePreviewUrl(task.previewUrl);
            delete persistedPreviewCacheRef.current[task.id];
        }

        replaceTasks(() => remaining);
        if (remaining.length === 0) {
            setQueueRunState(null);
        }
        setActiveTaskId((previous) => {
            if (previous !== taskId) {
                return previous;
            }

            return remaining[0]?.id ?? null;
        });
        resetSelection();
    }

    function handleTogglePinnedTask(taskId: string) {
        if (isTaskMutationLocked) {
            return;
        }

        let nextPinned = false;
        replaceTasks((previous) => previous.map((task) => {
            if (task.id !== taskId) {
                return task;
            }

            nextPinned = !task.pinned;
            return {
                ...task,
                pinned: nextPinned,
            };
        }));
        setSupportMessage(nextPinned ? '任务已固定保留，不会被清空最近历史移除。' : '任务已取消固定保留，会按最近历史规则管理。');
    }

    function handleClearRecentHistory() {
        if (isTaskMutationLocked) {
            return;
        }

        const removableTasks = tasksRef.current.filter(isClearableHistoryTask);

        if (removableTasks.length === 0) {
            setSupportMessage('当前没有可清理的最近历史。固定保留任务不会被清理。');
            return;
        }

        const removableTaskIds = new Set(removableTasks.map((task) => task.id));
        const remaining = tasksRef.current.filter((task) => !removableTaskIds.has(task.id));

        for (const task of removableTasks) {
            releasePreviewUrl(task.previewUrl);
            delete persistedPreviewCacheRef.current[task.id];
        }

        replaceTasks(() => remaining);
        setQueueRunState(null);
        setActiveTaskId((previous) => previous && removableTaskIds.has(previous)
            ? (remaining[0]?.id ?? null)
            : previous);

        if (remaining.length === 0 || (activeTaskId && removableTaskIds.has(activeTaskId))) {
            resetSelection();
        }

        setHistoryRestoreLabel(
            remaining.some((task) => task.pinned)
                ? '最近历史已清空，固定保留任务已保留。'
                : '最近历史已清空。',
        );
        setSupportMessage(
            remaining.some((task) => task.pinned)
                ? `已清空 ${removableTasks.length} 条最近历史，固定保留任务未受影响。`
                : `已清空 ${removableTasks.length} 条最近历史。`,
        );
    }

    function getQueuedTaskIds(scope: QueueRunScope): string[] {
        return tasksRef.current
            .filter((task) => {
                const status = taskStatus(task);
                return scope === 'failed'
                    ? status === 'failed'
                    : status === 'pending' || status === 'failed';
            })
            .map((task) => task.id);
    }

    function markTasksAsQueueStopped(taskIds: string[]) {
        if (taskIds.length === 0) {
            return;
        }

        const stoppedTaskIds = new Set(taskIds);

        replaceTasks((previous) => previous.map((task) => (
            stoppedTaskIds.has(task.id)
                ? {
                    ...task,
                    statusText: '队列已停止，等待下一次执行',
                }
                : task
        )));
    }

    async function recognizeTask(taskId: string): Promise<{
        errorMessage?: string;
        sampleCheck: SampleCheckResult | null;
        success: boolean;
    }> {
        const task = tasksRef.current.find((item) => item.id === taskId);

        if (!task) {
            return {
                errorMessage: '任务不存在',
                sampleCheck: null,
                success: false,
            };
        }

        setActiveTaskId(taskId);
        setSelectedBlockIndex(null);
        setHoveredBlockIndex(null);

        updateTask(taskId, (current) => ({
            ...current,
            errorMessage: '',
            progress: 0.05,
            sampleCheck: null,
            statusText: '正在初始化引擎...',
        }));

        const startedAt = performance.now();

        try {
            const result = await recognizeImage(task.file, language, (message) => {
                updateTask(taskId, (current) => ({
                    ...current,
                    progress: message.progress,
                    statusText: message.status,
                }));
            });
            const duration = ((performance.now() - startedAt) / 1000).toFixed(1);
            const sampleCheck = task.sampleDefinition ? evaluateSampleCheck(task.sampleDefinition, result.text) : null;

            startTransition(() => {
                updateTask(taskId, (current) => ({
                    ...current,
                    confidence: result.confidence,
                    engineName: result.engine,
                    errorMessage: '',
                    ocrItems: result.items,
                    originalResultText: result.text,
                    progress: 1,
                    resultText: result.text,
                    sampleCheck,
                    statusText: sampleCheck
                        ? `${sampleCheck.passed ? '示例图校验通过' : '示例图校验未通过'}，用时 ${duration}s`
                        : `识别成功，用时 ${duration}s`,
                }));
            });

            return {
                sampleCheck,
                success: true,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : '识别过程中发生未知错误';
            updateTask(taskId, (current) => ({
                ...current,
                errorMessage: message,
                progress: 0,
                sampleCheck: null,
                statusText: '识别失败',
            }));

            return {
                errorMessage: message,
                sampleCheck: null,
                success: false,
            };
        }
    }

    async function handleRecognizeCurrent() {
        if (!activeTask || runningMode !== 'idle') {
            return;
        }

        setRunningMode('single');

        try {
            await recognizeTask(activeTask.id);
        } finally {
            setRunningMode('idle');
        }
    }

    async function runTaskQueue(scope: QueueRunScope) {
        if (runningMode !== 'idle') {
            return;
        }

        const taskIds = getQueuedTaskIds(scope);

        if (taskIds.length === 0) {
            return;
        }

        queueStopRequestedRef.current = false;
        setQueueRunState({
            completed: 0,
            failedCount: 0,
            scope,
            stopRequested: false,
            stopped: false,
            successCount: 0,
            total: taskIds.length,
        });
        setRunningMode('batch');
        setSupportMessage(scope === 'failed' ? '正在重试失败任务...' : '正在执行批量识别队列...');

        let completed = 0;
        let failedCount = 0;
        let successCount = 0;
        const startedAt = performance.now();

        try {
            for (const taskId of taskIds) {
                if (queueStopRequestedRef.current) {
                    break;
                }

                const runResult = await recognizeTask(taskId);
                completed += 1;
                failedCount += runResult.success ? 0 : 1;
                successCount += runResult.success ? 1 : 0;

                setQueueRunState((previous) => previous ? {
                    ...previous,
                    completed,
                    failedCount,
                    stopRequested: queueStopRequestedRef.current,
                    successCount,
                } : previous);
            }
        } finally {
            const remainingTaskIds = taskIds.slice(completed);
            const stopped = queueStopRequestedRef.current && remainingTaskIds.length > 0;
            const duration = ((performance.now() - startedAt) / 1000).toFixed(1);

            if (stopped) {
                markTasksAsQueueStopped(remainingTaskIds);
            }

            setQueueRunState((previous) => previous ? {
                ...previous,
                completed,
                failedCount,
                stopRequested: false,
                stopped,
                successCount,
            } : previous);

            setSupportMessage(
                stopped
                    ? `队列已停止，本轮完成 ${completed}/${taskIds.length} 项，剩余 ${remainingTaskIds.length} 项待下次继续。`
                    : scope === 'failed'
                        ? `失败任务重试完成，用时 ${duration}s。`
                        : `批量识别完成，用时 ${duration}s。`,
            );
            void sendDesktopNotification(
                stopped ? '识别队列已停止' : '批量识别已完成',
                stopped
                    ? `本轮完成 ${completed}/${taskIds.length} 项，剩余 ${remainingTaskIds.length} 项待继续。`
                    : `成功 ${successCount} 项，失败 ${failedCount} 项，用时 ${duration}s。`,
            );
            queueStopRequestedRef.current = false;
            setRunningMode('idle');
        }
    }

    function handleStopQueue() {
        if (runningMode !== 'batch' || queueStopRequestedRef.current) {
            return;
        }

        queueStopRequestedRef.current = true;
        setQueueRunState((previous) => previous ? {
            ...previous,
            stopRequested: true,
        } : previous);
        setSupportMessage('已记录停止请求，当前图片完成后会结束队列。');
    }

    async function handleRecognizeAll() {
        await runTaskQueue('all');
    }

    async function handleRetryFailed() {
        await runTaskQueue('failed');
    }

    async function handleCopy() {
        if (!activeTask?.resultText.trim()) return;

        try {
            if (window.desktopApi?.copyText) {
                await window.desktopApi.copyText(activeTask.resultText);
            } else {
                await navigator.clipboard.writeText(activeTask.resultText);
            }
            setCopyLabel('已复制');
            window.setTimeout(() => setCopyLabel('复制文本'), 1600);
        } catch (_error) {
            setCopyLabel('复制失败');
            window.setTimeout(() => setCopyLabel('复制文本'), 1600);
        }
    }

    async function handleSaveDictionary() {
        if (!window.desktopApi?.saveUserDictionary || isSavingDictionary || runningMode !== 'idle') return;

        setIsSavingDictionary(true);
        setDictionaryStatus('正在保存用户词库...');

        try {
            const saved = await window.desktopApi.saveUserDictionary(
                dictionaryText
                    .split(/\r?\n/)
                    .map((word) => word.trim())
                    .filter(Boolean),
            );
            setDictionaryText(saved.join('\n'));
            setDictionaryStatus(saved.length > 0 ? `已保存 ${saved.length} 个自定义词。重新识别即可生效。` : '词库已清空。');
            setSupportMessage('用户词库已写入本地目录。');
            void runHealthCheck();
        } catch (_error) {
            setDictionaryStatus('保存用户词库失败。');
            setSupportMessage('写入用户词库失败，请检查用户数据目录权限。');
        } finally {
            setIsSavingDictionary(false);
        }
    }

    function handleBlockTextChange(index: number, nextText: string) {
        if (!activeTask) {
            return;
        }

        updateTask(activeTask.id, (task) => {
            const nextItems = [...task.ocrItems];
            const current = nextItems[index];

            if (!current) {
                return task;
            }

            nextItems[index] = {
                ...current,
                text: nextText,
            };

            return {
                ...task,
                ocrItems: nextItems,
                resultText: composeResultText(nextItems),
            };
        });
    }

    async function handleExport(kind: 'txt' | 'json', scope: 'current' | 'all') {
        if (!window.desktopApi?.saveExportFile) {
            return;
        }

        const tasksForExport = scope === 'current'
            ? (activeTask ? [activeTask] : [])
            : tasksRef.current;
        const tasksWithText = tasksForExport.filter((task) => task.resultText.trim());

        if (tasksWithText.length === 0) {
            return;
        }

        const baseName = tasksWithText.length === 1
            ? tasksWithText[0].file.name.replace(/\.[^.]+$/, '')
            : 'ocr-batch';
        const userDictionaryWords = dictionaryText
            .split(/\r?\n/)
            .map((word) => word.trim())
            .filter(Boolean);

        try {
            let payload;

            if (kind === 'txt') {
                const content = scope === 'current'
                    ? tasksWithText[0].resultText
                    : tasksWithText
                        .map((task) => `# ${task.file.name}\n${task.resultText}`)
                        .join('\n\n');

                payload = {
                    content,
                    defaultDirectoryPath: preferredExportDirectoryPath || lastExportDirectoryPath || undefined,
                    defaultFileName: buildExportFileName(exportNameTemplate, {
                        baseName,
                        extension: 'txt',
                        kind,
                        scope,
                    }),
                    filters: [{ name: 'Text', extensions: ['txt'] }],
                };
            } else {
                const currentPreview = activeTask && previewMetrics && activeTask.imageInfo
                    ? {
                        displayHeight: previewMetrics.height,
                        displayLeft: previewMetrics.left,
                        displayTop: previewMetrics.top,
                        displayWidth: previewMetrics.width,
                        scaleX: previewMetrics.width / activeTask.imageInfo.width,
                        scaleY: previewMetrics.height / activeTask.imageInfo.height,
                    }
                    : null;

                payload = {
                    content: JSON.stringify({
                        app: appInfo,
                        dictionary: {
                            userWords: userDictionaryWords,
                        },
                        exportedAt: new Date().toISOString(),
                        scope,
                        tasks: tasksWithText.map((task, taskIndex) => ({
                            confidence: task.confidence,
                            counts: {
                                blocks: task.ocrItems.filter((item) => item.text.trim()).length,
                                characters: task.resultText.trim().length,
                                lines: task.resultText.trim() ? task.resultText.trim().split(/\n+/).length : 0,
                            },
                            engine: task.engineName,
                            errorMessage: task.errorMessage,
                            id: task.id,
                            image: {
                                height: task.imageInfo?.height ?? null,
                                name: task.file.name,
                                sizeLabel: task.imageInfo?.sizeLabel ?? formatFileSize(task.file.size),
                                width: task.imageInfo?.width ?? null,
                            },
                            index: taskIndex,
                            items: task.ocrItems
                                .map((item, index) => ({ ...item, index }))
                                .filter((item) => item.text.trim()),
                            preview: task.id === activeTaskId ? currentPreview : null,
                            statusText: task.statusText,
                            status: taskStatus(task),
                            text: task.resultText,
                        })),
                    }, null, 2),
                    defaultDirectoryPath: preferredExportDirectoryPath || lastExportDirectoryPath || undefined,
                    defaultFileName: buildExportFileName(exportNameTemplate, {
                        baseName,
                        extension: 'json',
                        kind,
                        scope,
                    }),
                    filters: [{ name: 'JSON', extensions: ['json'] }],
                };
            }

            const result = await window.desktopApi.saveExportFile(payload);

            if (!result.canceled && result.filePath) {
                const exportDirectoryPath = parentDirectory(result.filePath);
                setLastExportDirectoryPath(exportDirectoryPath);
                pushExportHistoryRecord({
                    directoryPath: exportDirectoryPath,
                    exportedAt: new Date().toISOString(),
                    fileName: fileBaseName(result.filePath),
                    filePath: result.filePath,
                    kind,
                    scope,
                });

                if (activeTask) {
                    updateTask(activeTask.id, (task) => ({
                        ...task,
                        statusText: `${scope === 'all' ? '批量' : ''}${kind.toUpperCase()} 已导出`,
                    }));
                }

                setSupportMessage(`${kind.toUpperCase()} 已导出到 ${result.filePath}`);
            }
        } catch (_error) {
            if (activeTask) {
                updateTask(activeTask.id, (task) => ({
                    ...task,
                    errorMessage: `导出 ${kind.toUpperCase()} 失败`,
                }));
            }
        }
    }

    const recognizedCharacters = activeTask?.resultText.trim().length ?? 0;
    const recognizedLines = activeTask?.resultText.trim()
        ? activeTask.resultText.trim().split(/\n+/).length
        : 0;
    const currentImageInfo = activeTask?.imageInfo ?? null;
    const currentConfidence = activeTask?.confidence ?? null;
    const recognizedBlocks: DisplayBlock[] = activeTask
        ? activeTask.ocrItems
            .map((item, index) => ({ item, index }))
            .filter(({ item, index }) => item.text.trim() || index === selectedBlockIndex)
        : [];
    const resultSearchTextMatches = useMemo(
        () => findTextMatches(activeTask?.resultText ?? '', normalizedResultSearchQuery),
        [activeTask?.resultText, normalizedResultSearchQuery],
    );
    const resultSearchBlockMatches = useMemo(
        () => recognizedBlocks.filter(({ item }) => findTextMatches(item.text, normalizedResultSearchQuery).length > 0),
        [recognizedBlocks, normalizedResultSearchQuery],
    );
    const resultSearchBlockMatchIndexes = useMemo(
        () => new Set(resultSearchBlockMatches.map(({ index }) => index)),
        [resultSearchBlockMatches],
    );
    const resultSearchNavigationMode = resultSearchBlockMatches.length > 0
        ? 'blocks'
        : resultSearchTextMatches.length > 0
            ? 'text'
            : 'none';
    const resultSearchNavigableCount = resultSearchNavigationMode === 'blocks'
        ? resultSearchBlockMatches.length
        : resultSearchTextMatches.length;
    const resultSearchCursorIndex = resultSearchNavigableCount > 0
        ? resultSearchCursor % resultSearchNavigableCount
        : 0;
    const activeSearchBlockMatch = resultSearchNavigationMode === 'blocks'
        ? resultSearchBlockMatches[resultSearchCursorIndex] ?? null
        : null;
    const activeSearchTextMatch = resultSearchNavigationMode === 'text'
        ? resultSearchTextMatches[resultSearchCursorIndex] ?? null
        : null;
    const activeBlockIndex = hoveredBlockIndex ?? activeSearchBlockMatch?.index ?? selectedBlockIndex;
    const selectedBlock = selectedBlockIndex === null || !activeTask ? null : activeTask.ocrItems[selectedBlockIndex] ?? null;
    const resultSearchCountLabel = resultSearchNavigableCount > 0
        ? `${resultSearchCursorIndex + 1}/${resultSearchNavigableCount}`
        : '0/0';
    const resultSearchSummaryText = normalizedResultSearchQuery
        ? resultSearchNavigableCount > 0
            ? `全文匹配 ${resultSearchTextMatches.length} 处，文本块命中 ${resultSearchBlockMatches.length} 个。`
            : '未找到匹配项。'
        : '输入关键字后，可在全文、文本块和预览框中联动高亮。';
    const resultDiffEntries = useMemo(
        () => buildResultDiffEntries(activeTask?.originalResultText ?? '', activeTask?.resultText ?? ''),
        [activeTask?.originalResultText, activeTask?.resultText],
    );
    const resultDiffStats = useMemo(() => {
        let addedCount = 0;
        let modifiedCount = 0;
        let removedCount = 0;

        for (const entry of resultDiffEntries) {
            if (entry.kind === 'added') {
                addedCount += 1;
            } else if (entry.kind === 'modified') {
                modifiedCount += 1;
            } else if (entry.kind === 'removed') {
                removedCount += 1;
            }
        }

        return {
            addedCount,
            changedCount: addedCount + modifiedCount + removedCount,
            modifiedCount,
            removedCount,
        };
    }, [resultDiffEntries]);
    const resultDiffCharDelta = (activeTask?.resultText.length ?? 0) - (activeTask?.originalResultText.length ?? 0);
    const hasResultDiffBaseline = Boolean((activeTask?.originalResultText ?? '').trim() || (activeTask?.resultText ?? '').trim());
    const resultDiffSummaryText = !hasResultDiffBaseline
        ? '完成一次 OCR 后，这里会展示原始结果与当前文本的差异。'
        : resultDiffStats.changedCount === 0
            ? '当前文本与 OCR 原始结果一致。'
            : `共检测到 ${resultDiffStats.changedCount} 处改动，其中修改 ${resultDiffStats.modifiedCount} 处，新增 ${resultDiffStats.addedCount} 处，删除 ${resultDiffStats.removedCount} 处。`;
    const activeSampleCheck = activeTask?.sampleCheck ?? null;
    const availableModelFiles = healthReport?.requiredFiles.filter((file) => file.exists).length ?? 0;
    const totalModelFiles = healthReport?.requiredFiles.length ?? 0;
    const runtimeVersions = appInfo?.runtime ?? window.desktopApi?.versions ?? null;
    const canRunRecognition = runningMode === 'idle' && healthState !== 'checking' && healthState !== 'error';
    const isTaskQueueRunning = runningMode === 'batch';
    const isTaskListBusy = runningMode !== 'idle';
    const isTaskMutationLocked = isTaskListBusy || isPastingClipboard;
    const pinnedTaskCount = tasks.filter((task) => task.pinned).length;
    const clearableHistoryCount = tasks.filter(isClearableHistoryTask).length;
    const queuedTaskCount = tasks.filter((task) => {
        const status = taskStatus(task);
        return status === 'pending' || status === 'failed';
    }).length;
    const queueRemainingCount = queueRunState ? Math.max(queueRunState.total - queueRunState.completed, 0) : 0;
    const queueRunSummaryLabel = queueRunState
        ? isTaskQueueRunning
            ? (queueRunState.stopRequested ? '停止请求已记录' : '队列执行中')
            : queueRunState.stopped
                ? '上次队列已停止'
                : '上次队列已完成'
        : '';
    const queueRunSummaryMessage = queueRunState
        ? isTaskQueueRunning
            ? (queueRunState.stopRequested
                ? '当前图片完成后会结束队列，未执行任务会保留在列表中。'
                : `正在执行${queueRunState.scope === 'failed' ? '失败重试' : '批量识别'}，已识别结果不会被批量覆盖。`)
            : queueRunState.stopped
                ? `上次队列完成 ${queueRunState.completed}/${queueRunState.total} 项，剩余 ${queueRemainingCount} 项待继续。`
                : `上次${queueRunState.scope === 'failed' ? '失败重试' : '批量识别'}已完成。`
        : '';
    const queueRunSummaryChipClass = queueRunState
        ? isTaskQueueRunning || queueRunState.stopped
            ? 'is-checking'
            : 'is-ready'
        : 'is-checking';
    const taskSectionHelperText = historyRestoreLabel
        ? `${historyRestoreLabel} 固定保留 ${pinnedTaskCount} 条。`
        : `批量只处理待处理和失败任务，已识别结果会保留，重启后会恢复最近结果。当前固定保留 ${pinnedTaskCount} 条。`;
    const clipboardAutoRunLabel = autoRecognizeClipboard ? '已开启' : '已关闭';
    const clipboardAutoRunDescription = autoRecognizeClipboard
        ? '粘贴截图或点击“粘贴截图”后会立即开始 OCR。'
        : '粘贴截图后只加入任务列表，由你手动决定何时识别。';
    const healthBadgeClass = healthState === 'ready' ? 'is-ready' : healthState === 'error' ? 'is-error' : 'is-checking';
    const latestCheckLabel = healthReport ? new Date(healthReport.checkedAt).toLocaleString() : '尚未执行';
    const healthRecommendations = healthReport?.recommendations ?? [];
    const modelDirectoryPath = healthReport?.modelDir ?? '';
    const userDataDirectoryPath = healthReport?.storage.path ?? appInfo?.paths.userDataDir ?? '';
    const documentsDirectoryPath = appInfo?.paths.documentsDir ?? '';
    const userDictionaryDirectoryPath = healthReport?.userDictionary.path ? parentDirectory(healthReport.userDictionary.path) : userDataDirectoryPath;
    const exportDirectoryLabel = lastExportDirectoryPath ? lastExportDirectoryPath : '尚未导出';
    const preferredExportDirectoryLabel = preferredExportDirectoryPath || '未设置，当前会沿用上次导出目录或文档目录';
    const exportTemplatePreviewFileName = buildExportFileName(exportNameTemplate, {
        baseName: activeTask?.file.name.replace(/\.[^.]+$/, '') || 'ocr-batch',
        extension: 'txt',
        kind: 'txt',
        scope: activeTask ? 'current' : 'all',
    });
    const isWindowsRuntime = appInfo?.platform === 'win32';
    const shouldShowFirstRunGuide = tasks.length === 0;
    const exportHistorySummaryText = exportHistory.length > 0
        ? `最近保留 ${exportHistory.length} 条导出记录，可直接打开文件或目录。`
        : '完成导出后，这里会保留最近几次导出记录。';
    const diagnosticText = JSON.stringify({
        app: appInfo,
        health: healthReport,
        supportMessage,
    }, null, 2);

    useEffect(() => {
        if (!activeSearchBlockMatch || selectedBlockIndex === activeSearchBlockMatch.index) {
            return;
        }

        setSelectedBlockIndex(activeSearchBlockMatch.index);
    }, [activeSearchBlockMatch, selectedBlockIndex]);

    useEffect(() => {
        if (!activeSearchTextMatch || resultSearchNavigationMode !== 'text' || !resultTextareaRef.current || !activeTask?.resultText) {
            return;
        }

        const textarea = resultTextareaRef.current;
        textarea.setSelectionRange(activeSearchTextMatch.start, activeSearchTextMatch.end);

        const textBeforeMatch = activeTask.resultText.slice(0, activeSearchTextMatch.start);
        const lineIndex = Math.max(0, textBeforeMatch.split('\n').length - 1);
        const totalLines = Math.max(1, activeTask.resultText.split('\n').length - 1);
        const maxScrollTop = Math.max(0, textarea.scrollHeight - textarea.clientHeight);
        textarea.scrollTop = totalLines === 0 ? 0 : maxScrollTop * (lineIndex / totalLines);
    }, [activeSearchTextMatch, activeTask?.resultText, resultSearchNavigationMode]);

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="header-left">
                    <div className="logo-icon">
                        <img alt="Local OCR Desk logo" src={brandMarkSrc} />
                    </div>
                    <div className="header-title">
                        <h1>Local OCR Desk</h1>
                        <p>本地离线文字识别，OCR 更快，文本不出机。</p>
                    </div>
                </div>
                <div className="header-right">
                    <button className="icon-btn" onClick={toggleTheme} title={theme === 'dark' ? '切换为亮色模式' : '切换为暗色模式'} style={{ marginRight: '8px' }}>
                        {theme === 'dark' ? <IconSun /> : <IconMoon />}
                    </button>
                    <div className={`header-badge ${healthBadgeClass}`}>
                        <span className="badge-dot"></span>
                        {healthStateLabel(healthState)}
                    </div>
                </div>
            </header>

            <main className="app-main">
                <section className="panel">
                    <div className="panel-header">
                        <h2>
                            <IconImage /> 输入图片
                        </h2>
                        <div className="panel-actions">
                            <button className="icon-btn" disabled={tasks.length === 0 || isTaskMutationLocked} onClick={handleClearAll} title="清空所有">
                                <IconTrash />
                            </button>
                        </div>
                    </div>

                    <div className="panel-content">
                        <input
                            accept="image/*"
                            className="hidden-input"
                            disabled={isTaskMutationLocked}
                            multiple
                            onChange={handleFileInput}
                            ref={fileInputRef}
                            type="file"
                        />

                        <div
                            className={`dropzone ${dragging ? 'is-dragging' : ''} ${activeTask?.previewUrl ? 'has-preview' : ''} ${isTaskMutationLocked ? 'is-disabled' : ''}`}
                            onClick={() => {
                                if (!activeTask?.previewUrl && !isTaskMutationLocked) {
                                    handleChooseFile();
                                }
                            }}
                            onDragEnter={() => {
                                if (!isTaskMutationLocked) {
                                    setDragging(true);
                                }
                            }}
                            onDragLeave={() => setDragging(false)}
                            onDragOver={(event) => {
                                event.preventDefault();
                                if (!isTaskMutationLocked) {
                                    setDragging(true);
                                }
                            }}
                            onDrop={handleDrop}
                        >
                            {activeTask?.previewUrl ? (
                                <div className="preview-stage" ref={previewStageRef}>
                                    <img
                                        alt="待识别图片"
                                        className="preview-image"
                                        ref={previewImageRef}
                                        src={activeTask.previewUrl}
                                    />
                                    {previewMetrics && currentImageInfo && currentImageInfo.width > 0 && currentImageInfo.height > 0 ? (
                                        <div
                                            className="preview-overlay"
                                            style={{
                                                height: `${previewMetrics.height}px`,
                                                left: `${previewMetrics.left}px`,
                                                top: `${previewMetrics.top}px`,
                                                width: `${previewMetrics.width}px`,
                                            }}
                                        >
                                            {recognizedBlocks.map(({ item, index }) => (
                                                <button
                                                    className={`preview-box ${item.source ?? 'default'} ${activeBlockIndex === index ? 'is-active' : ''} ${resultSearchBlockMatchIndexes.has(index) ? 'is-search-match' : ''}`}
                                                    key={`preview-${index}-${item.box.x}-${item.box.y}`}
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                        setSelectedBlockIndex(index);
                                                    }}
                                                    onMouseEnter={() => setHoveredBlockIndex(index)}
                                                    onMouseLeave={() => setHoveredBlockIndex(null)}
                                                    style={{
                                                        height: `${(item.box.height / currentImageInfo.height) * 100}%`,
                                                        left: `${(item.box.x / currentImageInfo.width) * 100}%`,
                                                        top: `${(item.box.y / currentImageInfo.height) * 100}%`,
                                                        width: `${(item.box.width / currentImageInfo.width) * 100}%`,
                                                    }}
                                                    type="button"
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <>
                                    <div className="drop-icon">
                                        <IconUpload />
                                    </div>
                                    <h3>点击选择或拖拽图片至此</h3>
                                    <p>支持一次拖入多张图片，也支持 Ctrl/Cmd + V 粘贴截图</p>
                                </>
                            )}
                        </div>

                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">当前文件</span>
                                <span className="info-value" title={activeTask?.file.name ?? '-'}>
                                    {activeTask?.file.name ?? '-'}
                                </span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">尺寸</span>
                                <span className="info-value">
                                    {currentImageInfo ? `${currentImageInfo.width} × ${currentImageInfo.height}` : '-'}
                                </span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">大小</span>
                                <span className="info-value">
                                    {currentImageInfo?.sizeLabel ?? '-'}
                                </span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">任务数</span>
                                <span className="info-value">{tasks.length}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">当前状态</span>
                                <span className="info-value">{activeTask?.statusText ?? '等待识别'}</span>
                            </div>
                        </div>

                        {shouldShowFirstRunGuide ? (
                            <div className="controls-section">
                                <div className="section-heading">
                                    <span className="control-label"><IconSpark /> 首次使用引导</span>
                                    <span className="helper-text">全新机器建议先看完这 4 步，再开始拖图。</span>
                                </div>

                                <div className="first-run-guide">
                                    <div className="guide-step-card">
                                        <div className="guide-step-index">1</div>
                                        <div className="guide-step-body">
                                            <div className="guide-step-title">先确认自检通过</div>
                                            <div className="helper-text">头部显示“已通过自检”后，再开始识别。若失败，直接使用下方恢复动作。</div>
                                        </div>
                                    </div>
                                    <div className="guide-step-card">
                                        <div className="guide-step-index">2</div>
                                        <div className="guide-step-body">
                                            <div className="guide-step-title">选择一张清晰图片</div>
                                            <div className="helper-text">优先使用截图、扫描件或对比度高的照片。支持一次导入多张图片排队处理。</div>
                                        </div>
                                    </div>
                                    <div className="guide-step-card">
                                        <div className="guide-step-index">3</div>
                                        <div className="guide-step-body">
                                            <div className="guide-step-title">先识别当前，再批量识别</div>
                                            <div className="helper-text">先用一张样图确认效果，再批量处理整组文档，能更快发现排版或清晰度问题。</div>
                                        </div>
                                    </div>
                                    <div className="guide-step-card">
                                        <div className="guide-step-index">4</div>
                                        <div className="guide-step-body">
                                            <div className="guide-step-title">结果可编辑并可导出</div>
                                            <div className="helper-text">右侧文本可直接改，块级明细也可改。完成后导出 TXT 或 JSON。</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="guide-cta-row">
                                    <button
                                        className="btn btn-primary"
                                        disabled={!canRunRecognition || isPreparingSample || isTaskMutationLocked}
                                        onClick={() => void handleBuiltInSample('run')}
                                        type="button"
                                    >
                                        <IconSpark /> {isPreparingSample ? '准备示例中...' : '一键试跑示例图'}
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        disabled={isPreparingSample || isTaskMutationLocked}
                                        onClick={() => void handleBuiltInSample('load')}
                                        type="button"
                                    >
                                        <IconImage /> 只载入示例图
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        disabled={isTaskMutationLocked}
                                        onClick={() => void appendClipboardImage('button')}
                                        type="button"
                                    >
                                        <IconClipboard /> {isPastingClipboard ? '导入中...' : '粘贴截图'}
                                    </button>
                                    <button className="btn btn-primary" disabled={isTaskMutationLocked} onClick={handleChooseFile} type="button">
                                        <IconUpload /> 选择首张图片
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        disabled={!documentsDirectoryPath}
                                        onClick={() => void handleOpenPath(documentsDirectoryPath, '已尝试打开文档目录。')}
                                        type="button"
                                    >
                                        <IconFolder /> 打开文档目录
                                    </button>
                                </div>

                                <div className="sample-result-hint">
                                    示例图会包含 `离线 OCR 工作台`、`Hello Windows Native`、`Setup / Portable / Offline Ready` 等中英混排文本。
                                </div>

                                <div className="windows-hint-card">
                                    <div className="section-heading">
                                        <span className="control-label">Windows 安装提示</span>
                                        <span className="helper-text">{isWindowsRuntime ? '当前运行环境：Windows' : '为 Windows 安装包准备的说明'}</span>
                                    </div>
                                    <div className="windows-hint-list">
                                        <div className="windows-hint-item">安装版优先使用 `setup.exe`。便携版请完整解压到本地目录后再运行。</div>
                                        <div className="windows-hint-item">若首次启动出现 SmartScreen，请点“更多信息”，再点“仍要运行”。这是签名提示，不是依赖缺失。</div>
                                        <div className="windows-hint-item">程序已经内置 Electron、Chromium、PP-OCRv5 模型和 ONNX Runtime，无需额外安装 Node.js、Tesseract 或 WebView2。</div>
                                        <div className="windows-hint-item">若杀毒软件拦截或文件被隔离，先恢复安装目录文件，再回到本页执行自检。</div>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <div className="controls-section">
                            <div className="section-heading">
                                <span className="control-label"><IconShield /> 首启自检</span>
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                    disabled={healthState === 'checking'}
                                    onClick={() => void runHealthCheck()}
                                    type="button"
                                >
                                    <IconRefresh /> {healthState === 'checking' ? '检查中...' : '重新检查'}
                                </button>
                            </div>

                            <div className="task-stats-grid">
                                <div className="info-item">
                                    <span className="info-label">安装形态</span>
                                    <span className="info-value">{appInfo ? (appInfo.packaged ? '打包版' : '开发态') : '-'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">平台</span>
                                    <span className="info-value">{appInfo ? platformLabel(appInfo.platform, appInfo.arch) : '-'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">运行时</span>
                                    <span className="info-value" title={runtimeVersions ? `Electron ${runtimeVersions.electron} / Node ${runtimeVersions.node} / Chrome ${runtimeVersions.chrome}` : '-'}>
                                        {runtimeVersions ? `Electron ${runtimeVersions.electron}` : '-'}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">模型文件</span>
                                    <span className="info-value">{totalModelFiles === 0 ? '-' : `${availableModelFiles}/${totalModelFiles}`}</span>
                                </div>
                            </div>

                            <div className={`health-status-card ${healthBadgeClass}`}>
                                <div className="health-status-header">
                                    <span className={`status-chip ${healthBadgeClass}`}>{healthStateLabel(healthState)}</span>
                                    <span className="helper-text">最近检查：{latestCheckLabel}</span>
                                </div>
                                <div className="helper-text">{healthMessage}</div>
                                <div className="helper-text">{supportMessage}</div>

                                <div className="support-action-grid">
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                        disabled={!modelDirectoryPath}
                                        onClick={() => void handleOpenPath(modelDirectoryPath, '已尝试打开模型目录。')}
                                        type="button"
                                    >
                                        <IconFolder /> 打开模型目录
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                        disabled={!userDataDirectoryPath}
                                        onClick={() => void handleOpenPath(userDataDirectoryPath, '已尝试打开用户数据目录。')}
                                        type="button"
                                    >
                                        <IconFolder /> 打开用户数据
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                        disabled={!documentsDirectoryPath}
                                        onClick={() => void handleOpenPath(documentsDirectoryPath, '已尝试打开文档目录。')}
                                        type="button"
                                    >
                                        <IconFolder /> 打开文档目录
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                        onClick={() => void handleCopyDiagnostics(diagnosticText)}
                                        type="button"
                                    >
                                        <IconCopy /> {diagnosticCopyLabel}
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                        onClick={() => void handleExportDiagnostics(diagnosticText)}
                                        type="button"
                                    >
                                        <IconDownload /> 导出诊断
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                        disabled={isRepairingDictionary || isTaskMutationLocked}
                                        onClick={() => void handleRepairDictionary()}
                                        type="button"
                                    >
                                        <IconRefresh /> {isRepairingDictionary ? '重建中...' : '重建词库'}
                                    </button>
                                </div>

                                {appInfo ? (
                                    <div className="path-list">
                                        <div className="path-item">
                                            <span className="path-label">资源目录</span>
                                            <span className="path-value" title={appInfo.paths.resourcesDir}>{appInfo.paths.resourcesDir}</span>
                                        </div>
                                        <div className="path-item">
                                            <span className="path-label">用户数据</span>
                                            <span className="path-value" title={appInfo.paths.userDataDir}>{appInfo.paths.userDataDir}</span>
                                        </div>
                                        <div className="path-item">
                                            <span className="path-label">模型目录</span>
                                            <span className="path-value" title={healthReport?.modelDir ?? '-'}>{healthReport?.modelDir ?? '-'}</span>
                                        </div>
                                        <div className="path-item">
                                            <span className="path-label">用户词库</span>
                                            <span className="path-value" title={healthReport?.userDictionary.path ?? '-'}>{healthReport?.userDictionary.path ?? '-'}</span>
                                        </div>
                                        <div className="path-item">
                                            <span className="path-label">词库目录</span>
                                            <span className="path-value" title={userDictionaryDirectoryPath || '-'}>{userDictionaryDirectoryPath || '-'}</span>
                                        </div>
                                    </div>
                                ) : null}

                                {healthReport ? (
                                    <>
                                        <div className="health-inline-meta">
                                            <span>词库条目 {healthReport.userDictionary.wordCount}</span>
                                            <span>{healthReport.userDictionary.exists ? '词库文件已存在' : '词库文件尚未创建'}</span>
                                            <span>{healthReport.userDictionary.valid ? '词库结构正常' : '词库文件已损坏'}</span>
                                            <span>{healthReport.storage.writable ? '用户数据目录可写' : '用户数据目录不可写'}</span>
                                            <span>{runtimeVersions ? `Node ${runtimeVersions.node} / Chrome ${runtimeVersions.chrome}` : ''}</span>
                                        </div>

                                        {healthRecommendations.length > 0 ? (
                                            <div className="guidance-list">
                                                {healthRecommendations.map((recommendation, index) => (
                                                    <div className="guidance-item" key={`${index}-${recommendation}`}>
                                                        {recommendation}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}

                                        <div className="file-check-list">
                                            {healthReport.requiredFiles.map((file) => (
                                                <div className={`file-check-item ${file.exists ? 'is-ready' : 'is-error'}`} key={file.name}>
                                                    <div className="file-check-top">
                                                        <span className="file-check-name">{file.name}</span>
                                                        <span className={`status-chip ${file.exists ? 'is-ready' : 'is-error'}`}>{file.exists ? '已找到' : '缺失'}</span>
                                                    </div>
                                                    <div className="file-check-meta">
                                                        <span>{formatByteSize(file.sizeBytes)}</span>
                                                        <span className="path-value" title={file.path}>{file.path}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className={`file-check-item ${healthReport.userDictionary.valid ? 'is-ready' : 'is-error'}`}>
                                                <div className="file-check-top">
                                                    <span className="file-check-name">ocr-user-dictionary.json</span>
                                                    <span className={`status-chip ${healthReport.userDictionary.valid ? 'is-ready' : 'is-error'}`}>
                                                        {healthReport.userDictionary.valid ? (healthReport.userDictionary.exists ? '可用' : '未创建') : '损坏'}
                                                    </span>
                                                </div>
                                                <div className="file-check-meta">
                                                    <span>{formatByteSize(healthReport.userDictionary.sizeBytes)}</span>
                                                    <span>{healthReport.userDictionary.message}</span>
                                                    <span className="path-value" title={healthReport.userDictionary.path}>{healthReport.userDictionary.path}</span>
                                                </div>
                                            </div>
                                            <div className={`file-check-item ${healthReport.storage.writable ? 'is-ready' : 'is-error'}`}>
                                                <div className="file-check-top">
                                                    <span className="file-check-name">用户数据目录权限</span>
                                                    <span className={`status-chip ${healthReport.storage.writable ? 'is-ready' : 'is-error'}`}>
                                                        {healthReport.storage.writable ? '可读写' : '不可写'}
                                                    </span>
                                                </div>
                                                <div className="file-check-meta">
                                                    <span>{healthReport.storage.message}</span>
                                                    <span className="path-value" title={healthReport.storage.path}>{healthReport.storage.path}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        </div>

                        <div className="controls-section">
                            <span className="control-label">识别模式</span>
                            <div className="select-wrapper">
                                <select
                                    className="select-box"
                                    disabled={isTaskMutationLocked}
                                    value={language}
                                    onChange={(event) => setLanguage(event.target.value as OCRLanguage)}
                                >
                                    {languageOptions.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                                <div className="select-icon">
                                    <IconChevronDown />
                                </div>
                            </div>
                        </div>

                        <div className="action-row">
                            <button className="btn btn-secondary" disabled={isTaskMutationLocked} onClick={handleChooseFile} type="button">
                                <IconRefresh /> 添加图片
                            </button>
                            <button
                                className="btn btn-secondary"
                                disabled={isTaskMutationLocked}
                                onClick={() => void appendClipboardImage('button')}
                                type="button"
                            >
                                <IconClipboard /> {isPastingClipboard ? '导入中...' : '粘贴截图'}
                            </button>
                            <button
                                className="btn btn-secondary"
                                disabled={!activeTask || !canRunRecognition || isTaskMutationLocked}
                                onClick={handleRecognizeCurrent}
                                type="button"
                            >
                                <IconPlay /> 识别当前
                            </button>
                            <button
                                className="btn btn-primary"
                                disabled={queuedTaskCount === 0 || !canRunRecognition || isTaskMutationLocked}
                                onClick={handleRecognizeAll}
                                type="button"
                            >
                                {isTaskQueueRunning ? (queueRunState?.stopRequested ? '停止中...' : '队列执行中...') : '识别待处理'}
                            </button>
                            {isTaskQueueRunning ? (
                                <button
                                    className="btn btn-secondary"
                                    disabled={queueRunState?.stopRequested}
                                    onClick={handleStopQueue}
                                    type="button"
                                >
                                    <IconAlert /> {queueRunState?.stopRequested ? '停止中...' : '停止队列'}
                                </button>
                            ) : null}
                        </div>

                        <div className="clipboard-auto-card">
                            <div className="clipboard-auto-copy">
                                <span className="control-label">粘贴截图后自动识别</span>
                                <span className="helper-text">{clipboardAutoRunDescription}</span>
                            </div>
                            <button
                                className={`task-filter-button ${autoRecognizeClipboard ? 'is-active' : ''}`}
                                disabled={isTaskMutationLocked}
                                onClick={() => setAutoRecognizeClipboard((previous) => !previous)}
                                type="button"
                            >
                                {clipboardAutoRunLabel}
                            </button>
                        </div>

                        <div className="controls-section">
                            <div className="section-heading">
                                <span className="control-label"><IconLayers /> 任务列表</span>
                                <span className="helper-text">{taskSectionHelperText}</span>
                            </div>
                            <div className="task-filter-bar">
                                {taskFilters.map((filter) => (
                                    <button
                                        className={`task-filter-button ${taskFilter === filter.key ? 'is-active' : ''}`}
                                        key={filter.key}
                                        onClick={() => setTaskFilter(filter.key)}
                                        type="button"
                                    >
                                        {filter.label}
                                        <span className="task-filter-count">{taskSummary[filter.key]}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="task-stats-grid">
                                <div className="info-item">
                                    <span className="info-label">成功</span>
                                    <span className="info-value">{taskSummary.success}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">失败</span>
                                    <span className="info-value">{taskSummary.failed}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">处理中</span>
                                    <span className="info-value">{taskSummary.processing}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">待处理</span>
                                    <span className="info-value">{taskSummary.pending}</span>
                                </div>
                            </div>
                            <div className="task-actions-row">
                                <button
                                    className="btn btn-secondary"
                                    disabled={clearableHistoryCount === 0 || isTaskMutationLocked}
                                    onClick={handleClearRecentHistory}
                                    type="button"
                                >
                                    <IconTrash /> 清空最近历史
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    disabled={taskSummary.failed === 0 || !canRunRecognition || isTaskMutationLocked}
                                    onClick={handleRetryFailed}
                                    type="button"
                                >
                                    <IconRefresh /> 重试失败
                                </button>
                            </div>
                            {queueRunState ? (
                                <div className="task-run-summary">
                                    <div className="task-run-copy">
                                        <div className="control-label">{queueRunSummaryLabel}</div>
                                        <div className="helper-text">{queueRunSummaryMessage}</div>
                                        <div className="helper-text">
                                            成功 {queueRunState.successCount}，失败 {queueRunState.failedCount}，剩余 {queueRemainingCount}
                                        </div>
                                    </div>
                                    <span className={`status-chip ${queueRunSummaryChipClass}`}>
                                        {queueRunState.completed}/{queueRunState.total}
                                    </span>
                                </div>
                            ) : null}
                            <div className="task-list">
                                {visibleTasks.length === 0 ? (
                                    <div className="empty-state">当前筛选下暂无任务。</div>
                                ) : visibleTasks.map((task) => (
                                    <div
                                        className={`task-card ${task.id === activeTaskId ? 'is-active' : ''} ${task.pinned ? 'is-pinned' : ''}`}
                                        key={task.id}
                                        onClick={() => setActiveTaskId(task.id)}
                                    >
                                        <div className="task-card-header">
                                            <div className="task-title" title={task.file.name}>{task.file.name}</div>
                                            <div className="panel-actions">
                                                <button
                                                    className={`icon-btn ${task.pinned ? 'is-active' : ''}`}
                                                    disabled={isTaskMutationLocked}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleTogglePinnedTask(task.id);
                                                    }}
                                                    title={task.pinned ? '取消固定保留' : '固定保留此任务'}
                                                >
                                                    <IconPin />
                                                </button>
                                                {taskStatus(task) === 'failed' ? (
                                                    <button
                                                        className="icon-btn"
                                                        disabled={!canRunRecognition || isTaskMutationLocked}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            void recognizeTask(task.id);
                                                        }}
                                                        title="重试此任务"
                                                    >
                                                        <IconRefresh />
                                                    </button>
                                                ) : null}
                                                <button
                                                    className="icon-btn"
                                                    disabled={isTaskMutationLocked}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleRemoveTask(task.id);
                                                    }}
                                                    title="移除此任务"
                                                >
                                                    <IconTrash />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="task-meta">
                                            <span>{taskStatusLabel(task)}</span>
                                            {task.pinned ? <span className="task-pin-chip">固定保留</span> : null}
                                            <span>{task.imageInfo?.sizeLabel ?? formatFileSize(task.file.size)}</span>
                                        </div>
                                        <div className="progress-container task-progress-shell">
                                            <div className="progress-bar" style={{ width: `${Math.max(task.progress * 100, 0)}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="controls-section">
                            <div className="section-heading">
                                <span className="control-label"><IconBook /> 用户词库</span>
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                    disabled={isSavingDictionary || isTaskMutationLocked}
                                    onClick={handleSaveDictionary}
                                    type="button"
                                >
                                    <IconSave /> {isSavingDictionary ? '保存中...' : '保存词库'}
                                </button>
                            </div>
                            <textarea
                                className="dictionary-textarea"
                                onChange={(event) => setDictionaryText(event.target.value)}
                                placeholder={'每行一个词，例如：\nOpenAI\nCodex\nLazycat'}
                                value={dictionaryText}
                            />
                            <div className="helper-text">{dictionaryStatus}</div>
                        </div>
                    </div>
                </section>

                <section className="panel">
                    <div className="panel-header">
                        <h2>
                            <IconFileText /> 识别结果
                        </h2>
                        <div className="panel-actions">
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: '8px' }}>
                                {activeTask?.statusText ?? '等待识别'}
                            </span>
                            <button
                                className={`btn btn-secondary ${activeTask?.pinned ? 'is-active' : ''}`}
                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                disabled={!activeTask || isTaskMutationLocked}
                                onClick={() => {
                                    if (activeTask) {
                                        handleTogglePinnedTask(activeTask.id);
                                    }
                                }}
                                type="button"
                            >
                                <IconPin /> {activeTask?.pinned ? '已固定保留' : '固定保留'}
                            </button>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                disabled={!activeTask?.resultText.trim()}
                                onClick={handleCopy}
                                type="button"
                            >
                                <IconCopy /> {copyLabel}
                            </button>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                disabled={!activeTask?.resultText.trim()}
                                onClick={() => handleExport('txt', 'current')}
                                type="button"
                            >
                                <IconDownload /> 当前 TXT
                            </button>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                disabled={!activeTask?.resultText.trim()}
                                onClick={() => handleExport('json', 'current')}
                                type="button"
                            >
                                <IconDownload /> 当前 JSON
                            </button>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                disabled={tasks.filter((task) => task.resultText.trim()).length === 0}
                                onClick={() => handleExport('txt', 'all')}
                                type="button"
                            >
                                <IconDownload /> 全部 TXT
                            </button>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                disabled={tasks.filter((task) => task.resultText.trim()).length === 0}
                                onClick={() => handleExport('json', 'all')}
                                type="button"
                            >
                                <IconDownload /> 全部 JSON
                            </button>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                disabled={!lastExportDirectoryPath}
                                onClick={() => void handleOpenPath(lastExportDirectoryPath, '已尝试打开上次导出目录。')}
                                type="button"
                            >
                                <IconFolder /> 打开上次导出目录
                            </button>
                        </div>
                    </div>

                    <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${Math.max((activeTask?.progress ?? 0) * 100, 0)}%` }} />
                    </div>

                    <div className="panel-content" style={{ paddingTop: 0, gap: '16px' }}>
                        {activeTask?.errorMessage ? (
                            <div className="notice error">
                                <IconAlert /> {activeTask.errorMessage}
                            </div>
                        ) : null}

                        <textarea
                            className="result-textarea"
                            ref={resultTextareaRef}
                            onChange={(event) => {
                                if (!activeTask) return;
                                updateTask(activeTask.id, (task) => ({
                                    ...task,
                                    resultText: event.target.value,
                                }));
                            }}
                            placeholder="识别结果将显示在此处，您也可以手动编辑内容..."
                            value={activeTask?.resultText ?? ''}
                        />

                        <div className="result-search-card">
                            <div className="result-search-bar">
                                <div className="result-search-input-shell">
                                    <IconSearch />
                                    <input
                                        className="result-search-input"
                                        disabled={!activeTask?.resultText.trim()}
                                        onChange={(event) => setResultSearchQuery(event.target.value)}
                                        onKeyDown={handleResultSearchKeyDown}
                                        placeholder="搜索结果关键字，回车跳到下一处"
                                        type="text"
                                        value={resultSearchQuery}
                                    />
                                </div>
                                <div className="result-search-actions">
                                    <span className={`status-chip ${normalizedResultSearchQuery ? (resultSearchNavigableCount > 0 ? 'is-ready' : 'is-error') : 'is-checking'}`}>
                                        {resultSearchCountLabel}
                                    </span>
                                    <button
                                        className="btn btn-secondary"
                                        disabled={resultSearchNavigableCount === 0}
                                        onClick={() => handleNavigateResultSearch(-1)}
                                        type="button"
                                    >
                                        <IconChevronUp /> 上一处
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        disabled={resultSearchNavigableCount === 0}
                                        onClick={() => handleNavigateResultSearch(1)}
                                        type="button"
                                    >
                                        <IconChevronDown /> 下一处
                                    </button>
                                </div>
                            </div>
                            <div className="helper-text">{resultSearchSummaryText}</div>
                        </div>

                        <div className="result-diff-card">
                            <div className="section-heading">
                                <span className="control-label"><IconCompare /> 结果对比</span>
                                <button
                                    className={`btn btn-secondary ${isResultDiffMode ? 'is-active' : ''}`}
                                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                    disabled={!hasResultDiffBaseline}
                                    onClick={() => setIsResultDiffMode((previous) => !previous)}
                                    type="button"
                                >
                                    {isResultDiffMode ? '收起对比' : '展开对比'}
                                </button>
                            </div>
                            <div className="helper-text">{resultDiffSummaryText}</div>
                            <div className="result-diff-summary-row">
                                <span className={`status-chip ${resultDiffStats.changedCount > 0 ? 'is-error' : 'is-ready'}`}>
                                    改动 {resultDiffStats.changedCount}
                                </span>
                                <span className="status-chip is-checking">修改 {resultDiffStats.modifiedCount}</span>
                                <span className="status-chip is-ready">新增 {resultDiffStats.addedCount}</span>
                                <span className="status-chip is-error">删除 {resultDiffStats.removedCount}</span>
                                <span className={`status-chip ${resultDiffCharDelta === 0 ? 'is-checking' : resultDiffCharDelta > 0 ? 'is-ready' : 'is-error'}`}>
                                    字符差 {resultDiffCharDelta >= 0 ? `+${resultDiffCharDelta}` : `${resultDiffCharDelta}`}
                                </span>
                            </div>
                            {isResultDiffMode ? (
                                <div className="result-diff-grid">
                                    <div className="result-diff-column">
                                        <div className="result-diff-column-title">OCR 原始结果</div>
                                        <div className="result-diff-list">
                                            {resultDiffEntries.length === 0 ? (
                                                <div className="empty-state">暂无可对比内容。</div>
                                            ) : resultDiffEntries.map((entry, index) => (
                                                <div className={`result-diff-line is-${entry.kind}`} key={`original-${index}-${entry.originalLineNumber ?? 'na'}`}>
                                                    <span className="result-diff-line-number">{entry.originalLineNumber ?? ''}</span>
                                                    <span className="result-diff-line-text">{entry.originalText || ' '}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="result-diff-column">
                                        <div className="result-diff-column-title">当前文本</div>
                                        <div className="result-diff-list">
                                            {resultDiffEntries.length === 0 ? (
                                                <div className="empty-state">暂无可对比内容。</div>
                                            ) : resultDiffEntries.map((entry, index) => (
                                                <div className={`result-diff-line is-${entry.kind}`} key={`current-${index}-${entry.currentLineNumber ?? 'na'}`}>
                                                    <span className="result-diff-line-number">{entry.currentLineNumber ?? ''}</span>
                                                    <span className="result-diff-line-text">{entry.currentText || ' '}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">字符数</span>
                                <span className="info-value">{recognizedCharacters}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">行数</span>
                                <span className="info-value">{recognizedLines}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">平均置信度</span>
                                <span className="info-value">
                                    {currentConfidence === null ? '-' : `${currentConfidence.toFixed(1)}%`}
                                </span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">文本块</span>
                                <span className="info-value">{recognizedBlocks.filter(({ item }) => item.text.trim()).length}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">识别引擎</span>
                                <span className="info-value" title={activeTask?.engineName ?? '-'}>
                                    {activeTask?.engineName ?? '-'}
                                </span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">上次导出目录</span>
                                <span className="info-value" title={exportDirectoryLabel}>
                                    {exportDirectoryLabel}
                                </span>
                            </div>
                        </div>

                        <div className="export-history-card">
                            <div className="section-heading">
                                <span className="control-label"><IconSave /> 导出模板</span>
                                <div className="panel-actions">
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                        disabled={!lastExportDirectoryPath}
                                        onClick={handleSetPreferredExportDirectory}
                                        type="button"
                                    >
                                        <IconFolder /> 设为默认目录
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                        disabled={!preferredExportDirectoryPath}
                                        onClick={handleClearPreferredExportDirectory}
                                        type="button"
                                    >
                                        <IconTrash /> 清除默认目录
                                    </button>
                                </div>
                            </div>
                            <div className="helper-text">支持占位符：`{`name`}`、`{`scope`}`、`{`kind`}`、`{`date`}`、`{`time`}`。扩展名会自动补齐。</div>
                            <div className="helper-text">示例文件名：{exportTemplatePreviewFileName}</div>
                            <div className="helper-text">默认导出目录：{preferredExportDirectoryLabel}</div>
                            <input
                                className="export-template-input"
                                onChange={(event) => setExportNameTemplate(event.target.value)}
                                placeholder={DEFAULT_EXPORT_NAME_TEMPLATE}
                                type="text"
                                value={exportNameTemplate}
                            />
                        </div>

                        <div className="export-history-card">
                            <div className="section-heading">
                                <span className="control-label"><IconDownload /> 导出记录</span>
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                    disabled={exportHistory.length === 0}
                                    onClick={handleClearExportHistory}
                                    type="button"
                                >
                                    <IconTrash /> 清空记录
                                </button>
                            </div>
                            <div className="helper-text">{exportHistorySummaryText}</div>
                            {exportHistory.length === 0 ? (
                                <div className="empty-state">暂无导出记录。</div>
                            ) : (
                                <div className="export-history-list">
                                    {exportHistory.map((record) => (
                                        <div className="export-history-item" key={`${record.filePath}-${record.exportedAt}`}>
                                            <div className="export-history-copy">
                                                <div className="export-history-top">
                                                    <span className="export-history-name" title={record.fileName}>{record.fileName}</span>
                                                    <span className="status-chip is-ready">{record.kind.toUpperCase()}</span>
                                                    <span className="status-chip is-checking">{record.scope === 'diagnostic' ? '诊断' : record.scope === 'all' ? '全部' : '当前'}</span>
                                                </div>
                                                <div className="helper-text">{new Date(record.exportedAt).toLocaleString()}</div>
                                                <div className="helper-text" title={record.filePath}>{record.filePath}</div>
                                            </div>
                                            <div className="export-history-actions">
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                                    onClick={() => void handleOpenPath(record.filePath, '已尝试打开导出文件。')}
                                                    type="button"
                                                >
                                                    <IconFileText /> 打开文件
                                                </button>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                                    onClick={() => void handleOpenPath(record.directoryPath, '已尝试打开导出目录。')}
                                                    type="button"
                                                >
                                                    <IconFolder /> 打开目录
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {activeTask?.sampleDefinition ? (
                            <div className={`sample-check-card ${activeSampleCheck?.passed ? 'is-pass' : 'is-warn'}`}>
                                <div className="sample-check-header">
                                    <div className="sample-check-copy">
                                        <div className="sample-check-title">示例图验收</div>
                                        <div className="helper-text">
                                            {activeSampleCheck
                                                ? (activeSampleCheck.passed
                                                    ? '本次示例图试跑已达到通过线，可继续验证真实图片。'
                                                    : '本次示例图试跑未达到通过线，可先查看缺失项和自检面板。')
                                                : '执行“一键试跑示例图”后，会在这里显示自动验收结果。'}
                                        </div>
                                        <div className="helper-text">验收结果基于最近一次 OCR 输出，不会跟随手工编辑自动刷新。</div>
                                    </div>
                                    <span className={`status-chip ${activeSampleCheck ? (activeSampleCheck.passed ? 'is-ready' : 'is-error') : 'is-checking'}`}>
                                        {activeSampleCheck ? `${activeSampleCheck.matchedCount}/${activeSampleCheck.totalCount}` : '待试跑'}
                                    </span>
                                </div>

                                <div className="sample-check-list">
                                    {activeTask.sampleDefinition.phrases.map((phrase) => {
                                        const phraseCheck = activeSampleCheck?.phraseChecks.find((item) => item.id === phrase.id) ?? null;
                                        const matched = phraseCheck?.matched ?? false;

                                        return (
                                            <div className={`sample-check-item ${matched ? 'is-pass' : 'is-miss'}`} key={phrase.id}>
                                                <div className="sample-check-line">
                                                    <span className="sample-check-label">{phrase.label}</span>
                                                    <span className={`status-chip ${matched ? 'is-ready' : activeSampleCheck ? 'is-error' : 'is-checking'}`}>
                                                        {matched ? '已匹配' : activeSampleCheck ? '缺失' : '待检查'}
                                                    </span>
                                                </div>
                                                <div className="helper-text">
                                                    {phrase.required ? '必过项' : '建议项'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : null}

                        <div className="blocks-section">
                            <div className="section-heading">
                                <span className="control-label"><IconLayers /> 结果明细</span>
                                <span className="helper-text">展示每个文本块的来源、置信度与位置。</span>
                            </div>
                            {selectedBlock ? (
                                <div className="block-card is-active">
                                    <div className="block-card-header">
                                        <span className={`source-badge ${selectedBlock.source ?? 'default'}`}>{sourceLabel(selectedBlock.source)}</span>
                                        <span className="block-confidence">{(selectedBlock.confidence * 100).toFixed(1)}%</span>
                                    </div>
                                    <textarea
                                        className="dictionary-textarea"
                                        onChange={(event) => handleBlockTextChange(selectedBlockIndex ?? 0, event.target.value)}
                                        placeholder="编辑当前文本块..."
                                        value={selectedBlock.text}
                                    />
                                    <div className="block-meta">
                                        <span>x {selectedBlock.box.x}</span>
                                        <span>y {selectedBlock.box.y}</span>
                                        <span>w {selectedBlock.box.width}</span>
                                        <span>h {selectedBlock.box.height}</span>
                                    </div>
                                    <div className="section-heading">
                                        <span className="helper-text">块级编辑会同步回写整体文本和导出结果。</span>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                            onClick={() => setSelectedBlockIndex(null)}
                                            type="button"
                                        >
                                            取消选中
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                            <div className="block-list">
                                {recognizedBlocks.length === 0 ? (
                                    <div className="empty-state">暂无文本块。完成识别后会显示在这里。</div>
                                ) : recognizedBlocks.map(({ item, index }) => (
                                    <div
                                        className={`block-card ${activeBlockIndex === index ? 'is-active' : ''} ${resultSearchBlockMatchIndexes.has(index) ? 'is-search-match' : ''}`}
                                        key={`${item.source ?? 'default'}-${index}-${item.box.x}-${item.box.y}`}
                                        onClick={() => setSelectedBlockIndex(index)}
                                        onMouseEnter={() => setHoveredBlockIndex(index)}
                                        onMouseLeave={() => setHoveredBlockIndex(null)}
                                        ref={(element) => {
                                            blockCardRefs.current[index] = element;
                                        }}
                                    >
                                        <div className="block-card-header">
                                            <span className={`source-badge ${item.source ?? 'default'}`}>{sourceLabel(item.source)}</span>
                                            <span className="block-confidence">{(item.confidence * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="block-text">{renderHighlightedText(item.text, normalizedResultSearchQuery)}</div>
                                        <div className="block-meta">
                                            <span>x {item.box.x}</span>
                                            <span>y {item.box.y}</span>
                                            <span>w {item.box.width}</span>
                                            <span>h {item.box.height}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default App;
