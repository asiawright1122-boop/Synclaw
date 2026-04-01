---
phase: "07"
plan: "07-TTS-ENH"
subsystem: "tts-ui"
tags: ["tts", "ui", "voice", "highlight"]
requires: []
provides: ["R-TTS-04"]
affects: ["client/src/renderer/hooks/useTTS.ts", "client/src/renderer/components/VoiceModePanel.tsx"]
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - client/src/renderer/hooks/useTTS.ts
    - client/src/renderer/components/VoiceModePanel.tsx
key-decisions:
  - "Gateway tts.convert is request-response (no streaming word timing) — simulated via estimated per-word duration: audio.duration / wordCount"
  - "audio.onloadedmetadata sets estimatedWordDurationRef (reliable — metadata loads before playback)"
  - "audio.ontimeupdate fires ~4x/sec, updates currentWordIndex for smooth highlight"
  - "currentWordIndex=-1 (idle/stopped) gracefully degrades to all dim text"
requirements-completed: ["R-TTS-04"]
duration: "1 min"
completed: "2026-04-01T01:35:00.000Z"
---

# Phase 7 Plan 1: TTS-ENH — TTS 流式同步增强 Summary

**Phase:** 7 | **Plan:** 07-TTS-ENH | **Completed:** 2026-04-01

## What Was Built

### Gap Closure: R-TTS-04 流式 TTS 同步高亮

**`useTTS.ts` (71a83a0):**
- Added `currentWordIndex: number` to `TTSState` (-1 when idle)
- Added `startHighlightTracking` / `stopHighlightTracking` to `TTSControls`
- Added `wordsRef` and `estimatedWordDurationRef` refs for word timing
- `onloadedmetadata` callback sets `estimatedWordDurationRef = audio.duration / wordCount`
- `ontimeupdate` listener fires ~4x/sec, computes `currentWordIndex = Math.floor(currentTime / perWord)`
- `onended` and `stop()` both reset `currentWordIndex` to -1
- File header documents that Gateway `tts.convert` is request-response (no native word timing)

**`VoiceModePanel.tsx` (8e1532f):**
- Added `currentWordIndex` from `useTTS` to destructuring
- Replaced flat `{currentText.slice(0, 50)}...` preview with word-by-word rendering
- **Current word**: orange accent background highlight (`rgba(252, 93, 30, 0.25)`, `accent1` text)
- **Read words** (i < currentWordIndex): normal text, 70% opacity
- **Unread words** (i >= currentWordIndex): dim, 45% opacity
- Graceful degradation: when `currentWordIndex === -1`, all words display dim (idle state)
- Text container has `maxHeight: 3.5rem` to prevent layout overflow

## Task Summary

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Confirm Gateway API has no word-level timing | — (doc comment) |
| 2 | Add currentWordIndex to TTSState/TTSControls interfaces | 71a83a0 |
| 3 | Implement word index tracking via ontimeupdate | 71a83a0 |
| 4 | Render word-by-word highlight in VoiceModePanel | 8e1532f |
| 5 | tsc --noEmit + acceptance criteria verification | — |

## Deviations from Plan

None — plan executed exactly as written. Minor refinement: moved duration capture from `onplay` to `onloadedmetadata` for reliability (metadata available before play starts).

## Verification Results

| Criteria | Result |
|----------|--------|
| `tsc --noEmit` zero errors | ✅ Passed |
| `TTSState.currentWordIndex` exists | ✅ useTTS.ts:33 |
| `ontimeupdate` listener | ✅ useTTS.ts:223 |
| `currentText.split(/\s+/).map(...)` in VoiceModePanel | ✅ VoiceModePanel.tsx:304 |
| `startHighlightTracking` / `stopHighlightTracking` in TTSControls | ✅ useTTS.ts:38-41 |

## Self-Check

✅ PASSED

---

*Phase 7 TTS-ENH complete — ready for phase verification*
