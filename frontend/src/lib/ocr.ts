export type OCRLanguage = 'eng' | 'chi_sim' | 'eng+chi_sim';

export type OCRProgress = {
    progress: number;
    status: string;
};

export type OCRItem = {
    box: { x: number; y: number; width: number; height: number };
    confidence: number;
    source?: string;
    text: string;
};

export async function recognizeImage(
    file: File,
    languages: OCRLanguage,
    onProgress?: (message: OCRProgress) => void,
): Promise<{ text: string; confidence: number; engine: string; items: OCRItem[] }> {
    if (!window.desktopApi?.recognizeImage) {
        throw new Error('桌面 OCR 引擎不可用');
    }

    onProgress?.({progress: 0.08, status: '加载 PP-OCRv5 模型'});
    const bytes = await file.arrayBuffer();
    onProgress?.({progress: 0.24, status: '分析图片'});

    const result = await window.desktopApi.recognizeImage(bytes, languages);

    onProgress?.({progress: 0.9, status: `整理结果 · ${result.engine}`});

    return {
        engine: result.engine,
        items: result.items,
        text: result.text.trim(),
        confidence: result.confidence * 100,
    };
}

export async function shutdownOCRWorker(): Promise<void> {
    await window.desktopApi?.shutdownOcr?.();
}
