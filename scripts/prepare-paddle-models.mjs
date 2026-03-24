import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const targetDir = path.join(rootDir, 'vendor', 'ocr-models');

const files = [
    {
        name: 'ch_PP-OCRv5_server_det.onnx',
        url: 'https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.7.0/onnx/PP-OCRv5/det/ch_PP-OCRv5_server_det.onnx',
    },
    {
        name: 'ch_PP-OCRv5_rec_server_infer.onnx',
        url: 'https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.7.0/onnx/PP-OCRv5/rec/ch_PP-OCRv5_rec_server_infer.onnx',
    },
    {
        name: 'ppocrv5_dict.txt',
        url: 'https://raw.githubusercontent.com/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr-models/main/recognition/ppocrv5_dict.txt',
    },
    {
        name: 'en_PP-OCRv5_rec_mobile_infer.onnx',
        url: 'https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.7.0/onnx/PP-OCRv5/rec/en_PP-OCRv5_rec_mobile_infer.onnx',
    },
    {
        name: 'ppocrv5_en_dict.txt',
        url: 'https://raw.githubusercontent.com/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr-models/main/recognition/multi/en/v5/ppocrv5_en_dict.txt',
    },
];

async function downloadFile(file) {
    const destination = path.join(targetDir, file.name);

    if (fs.existsSync(destination) && fs.statSync(destination).size > 0) {
        console.log(`[prepare-paddle-models] reuse ${file.name}`);
        return;
    }

    console.log(`[prepare-paddle-models] download ${file.name}`);
    const response = await fetch(file.url);

    if (!response.ok) {
        throw new Error(`Failed to download ${file.url}: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(destination, Buffer.from(arrayBuffer));
}

async function main() {
    fs.mkdirSync(targetDir, {recursive: true});

    for (const file of files) {
        await downloadFile(file);
    }

    console.log('[prepare-paddle-models] offline PP-OCRv5 assets are ready');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
