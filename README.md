# 离线 OCR 工作台

一个基于 Electron、React 和 PP-OCRv5 的桌面 OCR 程序。

## 目标

- 离线可用，不依赖云端 OCR
- 桌面 GUI，直接构建为本地应用
- 支持中文、英文和中英混合识别
- 打包时把前端和 OCR 运行资源一起带进应用
- 默认按“目标用户电脑上没有额外依赖”来设计分发方案

## 技术选型

- GUI 框架：Electron
- 前端：React + TypeScript + Vite
- OCR 引擎：PP-OCRv5 Server
- 离线资源：中文检测模型、中文识别模型、英文专精识别模型、双字典、`word-list` 英文词典纠错和 `onnxruntime-node`

## 本地开发

项目根目录执行：

```bash
npm install
npm run dev
```

开发和构建前会自动执行 `scripts/prepare-paddle-models.mjs`，把本地 OCR 所需的 `PP-OCRv5` 模型与字典下载到 `vendor/ocr-models`。`npm run dev` 会同时启动 Vite 和 Electron。

## 生产构建

项目根目录执行：

```bash
npm run build
```

这个命令会先构建前端，再用 Electron Builder 生成当前平台的未打包目录产物。

如果要输出 Windows 安装包和便携版：

```bash
npm run dist:win
```

构建产物默认输出到 `release/`：

- `release/Local OCR Desk-<version>-x64-setup.exe`
- `release/Local OCR Desk-<version>-x64-portable.exe`
- `release/win-unpacked/`

如果要快速做本地 OCR 冒烟测试：

```bash
node ./scripts/smoke-ocr.mjs /absolute/path/to/image.png
```

## 分发前提

- 当前项目已内置 Chromium、Electron 运行时、PP-OCRv5 模型和 `onnxruntime-node`
- 当前项目已内置中文主模型和英文增强模型，安装包可直接运行
- 目标用户无需额外安装 Tesseract、Node.js 或 WebView2
- Windows 分发优先走 `NSIS` 安装包和 `portable` 便携版
- 未签名安装包在部分 Windows 环境可能触发 SmartScreen 提示，这是签名问题，不是运行时缺失

## 当前能力

- 图片拖拽与手动选择
- PNG、JPG、WebP、BMP、GIF、TIFF 图片识别
- 本地强力模型识别
- 识别进度显示
- 多图任务队列与批量识别
- 首启环境自检，直接检查模型文件、词库路径和引擎预热状态
- 自检失败后的恢复动作，支持打开本地目录、复制诊断、导出诊断和重建空词库
- 首次使用引导，空任务状态下直接给出上手步骤和首张图片入口
- 内置示例图，可直接载入中英混排样图并一键试跑 OCR
- 示例图自动验收，可直接看到通过线、匹配项和缺失项
- Windows 安装提示，覆盖 setup、portable、SmartScreen 和文件被隔离的常见场景
- 结果编辑与复制
- 预览图上的 OCR 框覆盖层与明细联动高亮
- TXT / JSON 导出
- 全部 TXT / JSON 汇总导出
- 文本块来源、置信度和位置明细
- 用户词库编辑与本地持久化
- 预览框点击驱动明细滚动定位
- JSON 导出附带应用信息、用户词库快照和预览缩放信息
- 块级文本编辑，并同步回写整体文本和导出结果

## 当前限制

- 当前主力模型是 `PP-OCRv5 server` 的中文通用识别模型，中文和中英混排场景明显强于旧版 `Tesseract.js`
- 当前已增加英文专精识别分支，并叠加英文词典纠错，会对纯拉丁文本块做二次修正
- 英文误字已经明显减少，样例已从 `Hello Tindows Matiy` 提升到 `Hello Windows Native`
- 复杂英文和专业术语仍可能有遗漏，当前纠错更适合常见英文词和界面文案
- 结果整理做了较强过滤，能压掉大部分噪声框，但复杂版式下仍有继续调参空间
- 当前预览框点击可驱动右侧明细定位，高亮联动已完成；JSON 导出已包含图像信息、预览缩放信息、文本块数据和用户词库快照
- 首次启动会执行 OCR 预热检查，强模型在冷启动时仍会有几秒初始化时间
- 用户词库损坏和目录权限异常已经能被自检识别，但模型文件缺失仍需要重新安装或重新解压产物修复

## 目录说明

- `electron/main.cjs`：Electron 主进程与窗口创建
- `electron/ocr-service.cjs`：本地 PP-OCRv5 服务与结果整理
- `electron/preload.cjs`：预加载脚本，向渲染层暴露桌面 API
- `frontend/src/App.tsx`：OCR 工作台界面
- `frontend/src/lib/ocr.ts`：桌面 OCR 调用封装
- `scripts/prepare-paddle-models.mjs`：PP-OCRv5 模型准备脚本
- `scripts/smoke-ocr.mjs`：本地 OCR 冒烟脚本
- `tasks/todo.md`：实现与验证清单
