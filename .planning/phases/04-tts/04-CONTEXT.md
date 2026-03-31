# Phase 4: TTS — TTS / Talk Mode UI — Context

**Gathered:** 2026-03-31
**Status:** Complete

---

## Phase Boundary

在 ChatView 中实现语音输入输出：TTS 播放 AI 回复 + 语音识别用户输入。

---

## Implementation Status

### 已实现

- **`VoiceModePanel.tsx`** — 完整语音面板：
  - 麦克风录制（Web Speech API）
  - 波形动画（recharts）
  - TTS 播放控制（播放/暂停/停止）
  - 语速（0.5x-2x）和音量滑块
  - 语音识别状态显示

- **`useTTS.ts`** — TTS hook：
  - 封装 `window.openclaw.tts.*` API
  - `tts.status` / `tts.providers` / `tts.convert` / `tts.enable` / `tts.disable`
  - Web Audio API 播放 TTS 流

- **`useSpeechRecognition.ts`** — STT hook：
  - Web Speech API `SpeechRecognition`
  - 实时转写用户语音

- **`client/src/renderer/components/settings/TtsPanel.tsx`** — 设置面板：
  - TTS provider 选择
  - 语速（0.5-2x）和音量滑块
  - auto-play 开关
  - STT 配置区域

### 关键文件

```
client/src/renderer/components/VoiceModePanel.tsx   ← 语音面板
client/src/renderer/hooks/useTTS.ts                ← TTS hook
client/src/renderer/hooks/useSpeechRecognition.ts   ← STT hook
client/src/renderer/components/settings/TtsPanel.tsx ← 设置面板
```

---

## Canonical References

- `client/src/renderer/components/VoiceModePanel.tsx` — 语音面板
- `client/src/renderer/hooks/useTTS.ts` — TTS hook
- `client/src/renderer/hooks/useSpeechRecognition.ts` — STT hook
- `client/src/renderer/components/settings/TtsPanel.tsx` — TTS 设置
- `client/src/renderer/stores/uiStore.ts` — TTS 状态

---

## Notes

- Web Speech API 在 macOS Safari/Chrome 支持，但 Electron BrowserView 可能需要特殊配置
- TTS 依赖 OpenClaw Gateway `tts.*` API
- STT 走 Web Speech API，不依赖 Gateway

---

*Context gathered: 2026-03-31*
