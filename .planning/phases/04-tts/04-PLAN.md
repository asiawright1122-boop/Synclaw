# Phase 4: TTS — TTS / Talk Mode UI — 执行计划

**Phase:** 4
**Created:** 2026-03-31
**Status:** Complete

---

## Context

Phase 4 实现 TTS 播放和语音识别，在 ChatView 中集成语音对话界面。

---

## Plans

### Plan 01: TTS / Talk Mode UI 验证

**Objective:** 验证 TTS 和 STT 功能完整实现。

```yaml
---
objective: 验证 TTS/Talk Mode UI 完整实现
depends_on: []
wave: 1
autonomous: false
files_modified: []
requirements:
  - TTS-01 ~ TTS-08
---
```

**Tasks:**

1. **验证 VoiceModePanel UI**
   - 麦克风录制按钮
   - 波形动画
   - TTS 播放控制（播放/暂停/停止）
   - 语速和音量滑块

2. **验证 useTTS hook**
   - `window.openclaw.tts.*` API 调用
   - Web Audio API 播放逻辑

3. **验证 useSpeechRecognition hook**
   - Web Speech API 集成
   - 实时转写

4. **验证 TtsPanel 设置**
   - Provider 选择
   - auto-play 开关
   - 偏好持久化

**Acceptance Criteria:**
- AI 回复触发 TTS 朗读
- 播放/暂停/停止正常工作
- 语音识别准确转写用户说话内容
- 语速/音量配置重启后保持

**Verify:**
```bash
cd client && pnpm exec tsc --noEmit
```

---

## Verification

| 检查项 | 结果 |
|--------|------|
| `tsc --noEmit` | ✅ 零错误（2026-03-31） |
| VoiceModePanel 组件 | ✅ 完整 |
| useTTS hook | ✅ 封装 tts API |
| useSpeechRecognition hook | ✅ Web Speech API |
| TtsPanel 设置 | ✅ provider/速度/auto-play |

---

## must_haves

| Criterion | Source |
|-----------|--------|
| AI 回复触发 TTS 朗读 | TTS-03 |
| 播放/暂停/停止正常 | TTS-04 |
| 语音识别转写 | TTS-05 |
| 语速/音量配置持久化 | TTS-07 |

---

*Plans: 1 | Waves: 1 | Created: 2026-03-31*
