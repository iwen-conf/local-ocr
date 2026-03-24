export {};

declare global {
    interface Window {
        desktopApi?: {
            copyText(text: string): Promise<boolean>;
            getClipboardImage(): Promise<{
                bytes: ArrayBuffer;
                fileName: string;
                height: number;
                mimeType: string;
                width: number;
            } | null>;
            recognizeImage(
                bytes: ArrayBuffer,
                mode?: string,
            ): Promise<{
                confidence: number;
                engine: string;
                items: Array<{
                    box: { x: number; y: number; width: number; height: number };
                    confidence: number;
                    source?: string;
                    text: string;
                }>;
                text: string;
            }>;
            getUserDictionary(): Promise<string[]>;
            saveUserDictionary(words: string[]): Promise<string[]>;
            saveExportFile(payload: {
                content: string;
                defaultDirectoryPath?: string;
                defaultFileName: string;
                filters: Array<{ name: string; extensions: string[] }>;
            }): Promise<{ canceled: boolean; filePath?: string }>;
            openPath(path: string): Promise<boolean>;
            notifyDesktop(payload: {
                body?: string;
                title: string;
            }): Promise<boolean>;
            getAppInfo(): Promise<{
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
            }>;
            getOcrHealth(): Promise<{
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
            }>;
            shutdownOcr(): Promise<boolean>;
            isElectron: boolean;
            versions: {
                chrome: string;
                electron: string;
                node: string;
            };
        };
    }
}
