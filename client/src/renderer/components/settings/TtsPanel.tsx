/**
 * TtsPanel.tsx — TTS (Text-to-Speech) and STT (Speech-to-Text) settings panel
 */
import { useState, useEffect, useCallback } from 'react'
import { Card, Row, ToggleDot } from '../ui'
import { useTTS, TTSProvider } from '../../hooks/useTTS'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'

export function TtsPanel() {
  const {
    isAvailable: ttsAvailable,
    providers,
    currentProvider,
    speed,
    volume,
    setSpeed,
    setVolume,
    enableProvider,
    disableProvider,
  } = useTTS()

  const { isSupported: sttSupported } = useSpeechRecognition()

  const [autoPlay, setAutoPlay] = useState(false)
  const [autoPlaySTT, setAutoPlaySTT] = useState(false)

  // Load saved preferences
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const autoPlayRes = await window.electronAPI?.settings.get()
        if (autoPlayRes?.success && autoPlayRes.data) {
          const data = autoPlayRes.data as unknown as Record<string, unknown>
          const ttsData = data.tts as Record<string, unknown> | undefined
          const sttData = data.stt as Record<string, unknown> | undefined
          setAutoPlay((ttsData?.autoPlay as boolean) ?? (data.ttsAutoPlay as boolean) ?? false)
          setAutoPlaySTT((sttData?.autoPlay as boolean) ?? (data.sttAutoPlay as boolean) ?? false)
        }
      } catch {
        // Ignore
      }
    }
    loadPrefs()
  }, [])

  const handleAutoPlayChange = useCallback(async (enabled: boolean) => {
    setAutoPlay(enabled)
    await window.electronAPI?.settings.set('tts.autoPlay', enabled)
  }, [])

  const handleAutoPlaySTTChange = useCallback(async (enabled: boolean) => {
    setAutoPlaySTT(enabled)
    await window.electronAPI?.settings.set('stt.autoPlay', enabled)
  }, [])

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSpeed(parseFloat(e.target.value))
  }, [setSpeed])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value))
  }, [setVolume])

  return (
    <div className="pb-10">
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--text)' }}>
        语音设置
      </h1>

      {/* TTS Section */}
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
        语音合成 (TTS)
      </p>
      <Card className="mb-6">
        {/* TTS Availability */}
        <Row label="语音合成" desc="将 AI 回复转换为语音朗读">
          <ToggleDot
            on={ttsAvailable}
            onChange={(enabled) => {
              if (enabled) {
                enableProvider(currentProvider || 'default')
              } else {
                disableProvider()
              }
            }}
          />
        </Row>

        {/* Provider Selection */}
        {providers.length > 0 && ttsAvailable && (
          <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              语音引擎
            </p>
            <div className="flex flex-wrap gap-2">
              {providers.map((provider: TTSProvider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => enableProvider(provider.id)}
                  className="px-3 py-1.5 rounded-full text-sm border transition-colors"
                  style={{
                    background: currentProvider === provider.id
                      ? 'rgba(252, 93, 30, 0.12)'
                      : 'transparent',
                    borderColor: currentProvider === provider.id
                      ? 'var(--accent1)'
                      : 'var(--border)',
                    color: currentProvider === provider.id
                      ? 'var(--accent1)'
                      : 'var(--text-sec)',
                  }}
                >
                  {provider.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Speed Control */}
        <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              语速
            </p>
            <span className="text-sm tabular-nums" style={{ color: 'var(--text-sec)' }}>
              {speed.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={speed}
            onChange={handleSpeedChange}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{ background: 'var(--border)' }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: 'var(--text-ter)' }}>0.5x</span>
            <span className="text-xs" style={{ color: 'var(--text-ter)' }}>1x</span>
            <span className="text-xs" style={{ color: 'var(--text-ter)' }}>2x</span>
          </div>
        </div>

        {/* Volume Control */}
        <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              音量
            </p>
            <span className="text-sm tabular-nums" style={{ color: 'var(--text-sec)' }}>
              {Math.round(volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={volume}
            onChange={handleVolumeChange}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{ background: 'var(--border)' }}
          />
        </div>

        {/* Auto-play TTS */}
        <Row
          label="自动播放"
          desc="AI 回复完成后自动朗读"
          border={false}
        >
          <ToggleDot
            on={autoPlay}
            onChange={handleAutoPlayChange}
          />
        </Row>
      </Card>

      {/* STT Section */}
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
        语音识别 (STT)
      </p>
      <Card>
        {/* STT Availability */}
        <Row
          label="语音输入"
          desc={sttSupported ? '支持语音输入' : '当前浏览器不支持语音识别'}
          border={false}
        >
          <ToggleDot
            on={sttSupported}
            onChange={() => {}}
          />
        </Row>

        {/* Auto-start STT */}
        {sttSupported && (
          <div className="px-5 py-3.5 border-t" style={{ borderColor: 'var(--border-secondary)' }}>
            <Row
              label="自动开启麦克风"
              desc="对话时自动开始语音识别"
              border={false}
            >
              <ToggleDot
                on={autoPlaySTT}
                onChange={handleAutoPlaySTTChange}
              />
            </Row>
          </div>
        )}
      </Card>

      {/* Usage Tips */}
      <div className="mt-6 p-4 rounded-xl border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
          使用提示
        </p>
        <ul className="text-xs space-y-1" style={{ color: 'var(--text-sec)' }}>
          <li>• 在聊天界面点击麦克风按钮开始语音输入</li>
          <li>• 按住空格键也可以开始/停止语音识别</li>
          <li>• 语音设置快捷键：对话界面左下角齿轮图标</li>
          <li>• 所有语音处理均在本地完成，不会上传录音</li>
        </ul>
      </div>
    </div>
  )
}
