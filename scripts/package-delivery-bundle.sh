#!/bin/zsh

set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"

version="$(node -p "require('./package.json').version")"
timestamp="$(date '+%Y%m%d-%H%M%S')"
bundle_root="output/delivery"
bundle_name="Local-OCR-Desk-${version}-triple-platform-${timestamp}"
bundle_dir="${bundle_root}/${bundle_name}"
mac_dir="${bundle_dir}/macos-apple-silicon"
win_dir="${bundle_dir}/windows-x64"
linux_dir="${bundle_dir}/linux-x64"
usage_doc="${bundle_dir}/USAGE.md"
release_notes_doc="${bundle_dir}/RELEASE_NOTES.md"
checksums_file="${bundle_dir}/SHA256SUMS.txt"
manifest_file="${bundle_dir}/DELIVERY_MANIFEST.json"
release_draft_md="${bundle_dir}/RELEASE_DRAFT.md"
release_draft_json="${bundle_dir}/RELEASE_DRAFT.json"
master_tar="${bundle_root}/${bundle_name}.tar"

mac_app_path="release/mac-arm64/Local OCR Desk.app"
mac_dmg_path="release/Local OCR Desk-${version}-macOS-arm64.dmg"

win_setup_path="release/Local OCR Desk-${version}-x64-setup.exe"
win_portable_path="release/Local OCR Desk-${version}-x64-portable.exe"
win_unpacked_path="release/win-unpacked"
win_unpacked_zip_path="${win_dir}/Local OCR Desk-${version}-x64-unpacked.zip"

linux_appimage_path="release/Local OCR Desk-${version}.AppImage"
linux_unpacked_path="release/linux-unpacked"
linux_unpacked_tar_path="${linux_dir}/Local OCR Desk-${version}-linux-x64-unpacked.tar.gz"

ensure_file() {
  local target="$1"

  if [[ ! -f "$target" ]]; then
    echo "[delivery] missing file: $target" >&2
    exit 1
  fi
}

ensure_dir() {
  local target="$1"

  if [[ ! -d "$target" ]]; then
    echo "[delivery] missing directory: $target" >&2
    exit 1
  fi
}

echo "[delivery] building macOS arm64 bundle"
npm run dist:mac

echo "[delivery] building Windows x64 installers"
npm run dist:win

echo "[delivery] building Linux x64 AppImage"
npm run dist:linux

ensure_dir "$mac_app_path"
ensure_file "$mac_dmg_path"
npm run verify:runtime:mac

ensure_file "$win_setup_path"
ensure_file "$win_portable_path"
ensure_dir "$win_unpacked_path"
npm run verify:runtime:win

ensure_file "$linux_appimage_path"
ensure_dir "$linux_unpacked_path"
npm run verify:runtime:linux

mkdir -p "$mac_dir" "$win_dir" "$linux_dir"

cp "$mac_dmg_path" "$mac_dir/"

echo "[delivery] zipping Windows unpacked directory"
rm -f "$win_unpacked_zip_path"
(cd release && zip -qry "$project_root/$win_unpacked_zip_path" "win-unpacked")

echo "[delivery] archiving Linux unpacked directory"
rm -f "$linux_unpacked_tar_path"
(cd release && tar -czf "$project_root/$linux_unpacked_tar_path" "linux-unpacked")

cp "$win_setup_path" "$win_dir/"
cp "$win_portable_path" "$win_dir/"
cp "$linux_appimage_path" "$linux_dir/"

cat > "$usage_doc" <<EOF
# Local OCR Desk ${version} Usage Guide

This bundle contains signed-off packaging outputs for macOS Apple Silicon, Windows x64, and Linux x64.

## Included Packages

| Platform | File | Notes |
| --- | --- | --- |
| macOS Apple Silicon | \`macos-apple-silicon/Local OCR Desk-${version}-macOS-arm64.dmg\` | Mount and drag \`Local OCR Desk.app\` into \`Applications\`. |
| Windows x64 | \`windows-x64/Local OCR Desk-${version}-x64-setup.exe\` | Standard installer. |
| Windows x64 | \`windows-x64/Local OCR Desk-${version}-x64-portable.exe\` | Portable build, no installation required. |
| Windows x64 | \`windows-x64/Local OCR Desk-${version}-x64-unpacked.zip\` | Raw unpacked directory for internal verification. |
| Linux x64 | \`linux-x64/Local OCR Desk-${version}.AppImage\` | Primary Linux desktop package. |
| Linux x64 | \`linux-x64/Local OCR Desk-${version}-linux-x64-unpacked.tar.gz\` | Raw unpacked directory for internal verification. |

## Common Notes

- All three packages already include the Electron runtime, PP-OCRv5 models, dictionaries, and ONNX runtime bindings.
- No extra installation of Tesseract, Node.js, or system OCR components is required.
- The first launch performs OCR warm-up. Cold start is slower than later launches.
- Current builds are unsigned. macOS Gatekeeper and Windows SmartScreen may show warning dialogs on first launch.

## macOS Apple Silicon

1. Open \`Local OCR Desk-${version}-macOS-arm64.dmg\`.
2. Drag \`Local OCR Desk.app\` into \`Applications\`.
3. Open the app from \`Applications\`. If Gatekeeper blocks it, right-click the app, choose **Open**, then confirm.
4. Drag an image into the window or use the file picker to start OCR.

## Windows x64

### Installer

1. Run \`Local OCR Desk-${version}-x64-setup.exe\`.
2. Choose the install directory and complete the wizard.
3. Launch **Local OCR Desk** from the Start Menu or desktop shortcut.

### Portable

1. Run \`Local OCR Desk-${version}-x64-portable.exe\`.
2. Pick an extraction directory when prompted.
3. Start \`Local OCR Desk.exe\` from the extracted folder.

If SmartScreen appears, choose **More info** and then **Run anyway**.

## Linux x64

1. Open a terminal in the bundle directory.
2. Make the AppImage executable:

\`\`\`bash
chmod +x "Local OCR Desk-${version}.AppImage"
\`\`\`

3. Launch it:

\`\`\`bash
./Local\\ OCR\\ Desk-${version}.AppImage
\`\`\`

If the desktop environment blocks execution, allow the file to run as a program in the file manager or start it from the terminal. The unpacked \`linux-unpacked\` archive is included for internal troubleshooting only.
EOF

cat > "$release_notes_doc" <<EOF
# Local OCR Desk ${version} Release Notes

Generated at: ${timestamp}

## Release Scope

- macOS Apple Silicon delivery moved to a formal \`dmg\` package.
- Windows x64 delivery includes installer, portable build, and unpacked verification archive.
- Linux x64 delivery includes AppImage and unpacked verification archive.
- All packaged outputs were verified against the bundled OCR models, ONNX runtime bindings, and platform-specific \`@napi-rs/canvas\` native bindings.

## Platform Artifacts

- macOS Apple Silicon: \`Local OCR Desk-${version}-macOS-arm64.dmg\`
- Windows x64 installer: \`Local OCR Desk-${version}-x64-setup.exe\`
- Windows x64 portable: \`Local OCR Desk-${version}-x64-portable.exe\`
- Linux x64 AppImage: \`Local OCR Desk-${version}.AppImage\`

## Operational Notes

- All builds are currently unsigned.
- macOS Gatekeeper and Windows SmartScreen warnings are expected on first launch.
- The first launch performs OCR warm-up before normal recognition speed is reached.
- No extra OCR runtime installation is required on target machines.
EOF

echo "[delivery] computing checksums"
{
  (cd "$bundle_dir" && shasum -a 256 "USAGE.md")
  (cd "$bundle_dir" && shasum -a 256 "RELEASE_NOTES.md")
  (cd "$bundle_dir" && shasum -a 256 "macos-apple-silicon/$(basename "$mac_dmg_path")")
  (cd "$bundle_dir" && shasum -a 256 "windows-x64/$(basename "$win_setup_path")")
  (cd "$bundle_dir" && shasum -a 256 "windows-x64/$(basename "$win_portable_path")")
  (cd "$bundle_dir" && shasum -a 256 "windows-x64/$(basename "$win_unpacked_zip_path")")
  (cd "$bundle_dir" && shasum -a 256 "linux-x64/$(basename "$linux_appimage_path")")
  (cd "$bundle_dir" && shasum -a 256 "linux-x64/$(basename "$linux_unpacked_tar_path")")
} > "$checksums_file"

echo "[delivery] writing delivery manifest"
node ./scripts/write-delivery-manifest.mjs "$bundle_dir" "$version" "$timestamp"

echo "[delivery] writing release draft"
node ./scripts/write-release-draft.mjs "$bundle_dir"

echo "[delivery] creating master tar"
rm -f "$master_tar"
(cd "$bundle_root" && tar -cf "$(basename "$master_tar")" "$bundle_name")

echo "[delivery] done"
echo "$master_tar"
