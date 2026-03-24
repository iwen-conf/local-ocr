# Lessons

## 2026-03-22

- 默认假设目标用户电脑上没有额外依赖。设计桌面程序时，必须显式检查运行时前提，区分“应用已内置 OCR 引擎”与“系统仍需 WebView 或图形库”这两层依赖。
- 讨论“可分发二进制 GUI”时，必须提前说明不同平台的真实落地条件。macOS、Windows、Linux 的运行时前提不能混写成统一结论。
- 目标覆盖全新 Windows 机器时，Electron 比依赖系统 WebView 的壳更稳。面向主流 Windows 机器出包时，要显式锁定 `x64`，不能沿用 Apple Silicon 主机的默认 `arm64`。
- Vite 前端嵌入 Electron 后，必须显式处理 `file://` 场景。构建产物里的资源路径要改为相对路径，Worker、WASM 和语言包路径也要基于 `document.baseURI` 计算。
- 评估“更强 OCR”时，不能只看 release 页面有没有现成二进制。`RapidOcrOnnx` 旧 release 自带的 `onnxruntime` 太旧，无法直接加载 `PP-OCRv5` 模型，必须先做模型兼容性测试。
- 当前 Electron 项目更适合把 OCR 放到主进程，用 `onnxruntime-node` 直接跑本地模型。这样跨平台分发比维护过时的外部 sidecar 更稳。
