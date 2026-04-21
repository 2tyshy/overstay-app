import { useState, useRef, useCallback } from 'react'
import { Camera, Image as ImageIcon, Loader2, AlertCircle, Check, X } from 'lucide-react'
import BottomSheet from './BottomSheet'
import { extractFromImage, type OcrResult, type OcrProgress } from '@/lib/ocr'
import { getGeminiKey } from '@/lib/gemini'
import { COUNTRY_FLAGS, COUNTRY_NAMES } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onApply: (r: OcrResult) => void
  onNeedApiKey: () => void
}

type Stage = 'idle' | 'processing' | 'result' | 'error'

export default function CameraSheet({ open, onClose, onApply, onNeedApiKey }: Props) {
  const [stage, setStage] = useState<Stage>('idle')
  const [progress, setProgress] = useState<OcrProgress | null>(null)
  const [result, setResult] = useState<OcrResult | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setStage('idle')
    setProgress(null)
    setResult(null)
    setPreviewUrl(null)
    setErrorMsg('')
  }, [previewUrl])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  const handleFile = useCallback(async (file: File) => {
    if (!getGeminiKey()) {
      onNeedApiKey()
      return
    }
    // Accept common image types only — reject obvious HEIC / videos
    if (!file.type.startsWith('image/')) {
      setStage('error')
      setErrorMsg('Нужно изображение (JPG, PNG)')
      return
    }
    // Guard against very large images (>8MB) — Gemini has size limits
    if (file.size > 8 * 1024 * 1024) {
      setStage('error')
      setErrorMsg('Файл больше 8 МБ — сожми его и попробуй снова')
      return
    }

    setPreviewUrl(URL.createObjectURL(file))
    setStage('processing')
    setProgress({ stage: 'reading', message: 'Читаю файл...' })

    try {
      const r = await extractFromImage(file, p => setProgress(p))
      setResult(r)
      setStage('result')
    } catch (e: any) {
      setStage('error')
      if (e?.code === 'NO_KEY') {
        onNeedApiKey()
        return
      }
      if (e?.code === 'BAD_KEY') setErrorMsg('API ключ неверный. Проверь в настройках.')
      else if (e?.code === 'RATE_LIMIT') setErrorMsg('Слишком много запросов. Подожди минуту.')
      else setErrorMsg(e?.message || 'Не получилось распознать')
    }
  }, [onNeedApiKey])

  const triggerCamera = () => cameraInputRef.current?.click()
  const triggerGallery = () => galleryInputRef.current?.click()

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // reset input so the same file can be re-selected after retry
    e.target.value = ''
    if (file) handleFile(file)
  }

  const apply = () => {
    if (result) onApply(result)
    handleClose()
  }

  return (
    <BottomSheet open={open} onClose={handleClose} height="75vh">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onFileChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onFileChange}
      />

      <div className="mb-5">
        <div className="text-[17px] font-semibold" style={{ color: 'var(--text1)', letterSpacing: '-0.01em' }}>
          Сканировать штамп
        </div>
        <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text3)', letterSpacing: '0.04em' }}>
          Gemini Vision · автоматически извлечёт страну и дату
        </div>
      </div>

      {stage === 'idle' && (
        <div className="space-y-2.5">
          <button
            onClick={triggerCamera}
            className="w-full flex items-center gap-3 px-4 py-4 border rounded-[12px] transition-all active:scale-[0.98]"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--bg3)', color: 'var(--text1)' }}
            >
              <Camera size={18} strokeWidth={1.5} />
            </div>
            <div className="flex-1 text-left">
              <div className="text-[14px] font-medium" style={{ color: 'var(--text1)' }}>Сделать фото</div>
              <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>Откроется камера</div>
            </div>
          </button>

          <button
            onClick={triggerGallery}
            className="w-full flex items-center gap-3 px-4 py-4 border rounded-[12px] transition-all active:scale-[0.98]"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--bg3)', color: 'var(--text1)' }}
            >
              <ImageIcon size={18} strokeWidth={1.5} />
            </div>
            <div className="flex-1 text-left">
              <div className="text-[14px] font-medium" style={{ color: 'var(--text1)' }}>Выбрать из галереи</div>
              <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>JPG, PNG до 8 МБ</div>
            </div>
          </button>

          <div
            className="mt-4 p-3 rounded-[10px] border flex gap-2.5 items-start"
            style={{ background: 'var(--alert-bg)', borderColor: 'var(--alert-border)' }}
          >
            <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" style={{ color: 'var(--alert-text)' }} />
            <div className="font-mono text-[10px] leading-relaxed" style={{ color: 'var(--alert-text)' }}>
              Работает лучше всего на чётких фото штампа. После распознавания ты сможешь проверить и скорректировать данные перед сохранением.
            </div>
          </div>
        </div>
      )}

      {stage === 'processing' && (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          {previewUrl && (
            <div className="w-24 h-24 rounded-[10px] overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
            </div>
          )}
          <Loader2 size={28} strokeWidth={1.5} className="animate-spin" style={{ color: 'var(--alert-dot)' }} />
          <div className="text-center">
            <div className="text-[13px] font-medium" style={{ color: 'var(--text1)' }}>
              {progress?.message || 'Обрабатываю...'}
            </div>
            <div className="font-mono text-[9px] mt-1 uppercase" style={{ color: 'var(--text4)', letterSpacing: '0.1em' }}>
              Stage: {progress?.stage || '—'}
            </div>
          </div>
        </div>
      )}

      {stage === 'result' && result && (
        <div className="space-y-3">
          {previewUrl && (
            <div className="w-full h-32 rounded-[10px] overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
            </div>
          )}

          <div
            className="p-3 rounded-[10px] border space-y-2"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="font-mono text-[9px] uppercase" style={{ color: 'var(--text4)', letterSpacing: '0.12em' }}>
                Результат
              </span>
              <ConfidenceBadge conf={result.confidence} />
            </div>
            <Row label="Страна" value={result.country ? `${COUNTRY_FLAGS[result.country] ?? '🏳️'} ${COUNTRY_NAMES[result.country] ?? result.country}` : '—'} />
            <Row label="Дата въезда" value={result.entry_date || '—'} />
            <Row label="Тип визы" value={result.visa_type || '—'} />
            {result.max_days !== undefined && <Row label="Макс. дней" value={String(result.max_days)} />}
            {result.notes && (
              <div
                className="font-mono text-[10px] mt-2 pt-2 border-t"
                style={{ color: 'var(--alert-text)', borderColor: 'var(--border)' }}
              >
                ⚠ {result.notes}
              </div>
            )}
          </div>

          {!result.country && !result.entry_date && !result.visa_type && result.raw && (
            <details
              className="p-3 rounded-[10px] border"
              style={{ background: 'var(--alert-bg)', borderColor: 'var(--alert-border)' }}
            >
              <summary className="font-mono text-[10px] cursor-pointer" style={{ color: 'var(--alert-text)' }}>
                Ничего не распозналось · показать ответ Gemini
              </summary>
              <pre
                className="font-mono text-[9px] mt-2 overflow-auto max-h-40 whitespace-pre-wrap"
                style={{ color: 'var(--text2)' }}
              >
                {result.raw}
              </pre>
              <div className="font-mono text-[9px] mt-2" style={{ color: 'var(--text3)' }}>
                Попробуй чётче фото: только один штамп в кадре, без бликов, прямо сверху.
              </div>
            </details>
          )}

          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              onClick={reset}
              className="py-3 rounded-lg font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
            >
              <X size={14} strokeWidth={1.5} />
              Ещё раз
            </button>
            <button
              onClick={apply}
              disabled={!result.country && !result.entry_date && !result.visa_type}
              className="py-3 rounded-lg font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
              style={{ background: 'var(--text1)', color: 'var(--bg)' }}
            >
              <Check size={14} strokeWidth={2} />
              Заполнить форму
            </button>
          </div>
        </div>
      )}

      {stage === 'error' && (
        <div className="space-y-3">
          <div
            className="p-4 rounded-[10px] border flex gap-3 items-start"
            style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)' }}
          >
            <AlertCircle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" style={{ color: 'var(--danger-text)' }} />
            <div>
              <div className="text-[13px] font-semibold" style={{ color: 'var(--danger-text)' }}>Ошибка</div>
              <div className="font-mono text-[10px] mt-1" style={{ color: 'var(--danger-text)', opacity: 0.8 }}>
                {errorMsg}
              </div>
            </div>
          </div>
          <button
            onClick={reset}
            className="w-full py-3 rounded-lg font-semibold text-sm transition-all active:scale-[0.98]"
            style={{ background: 'var(--bg3)', color: 'var(--text1)', border: '1px solid var(--border)' }}
          >
            Попробовать снова
          </button>
        </div>
      )}
    </BottomSheet>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline gap-3">
      <span className="font-mono text-[9px] uppercase shrink-0" style={{ color: 'var(--text4)', letterSpacing: '0.12em' }}>
        {label}
      </span>
      <span className="text-[13px] font-medium text-right" style={{ color: 'var(--text1)' }}>
        {value}
      </span>
    </div>
  )
}

function ConfidenceBadge({ conf }: { conf?: 'low' | 'medium' | 'high' }) {
  if (!conf) return null
  const label = { low: 'НИЗКАЯ', medium: 'СРЕДНЯЯ', high: 'ВЫСОКАЯ' }[conf]
  const color = conf === 'high' ? 'var(--text3)' : 'var(--alert-text)'
  const bg = conf === 'high' ? 'var(--bg3)' : 'var(--alert-bg)'
  const border = conf === 'high' ? 'var(--border)' : 'var(--alert-border)'
  return (
    <span
      className="font-mono text-[8px] uppercase px-1.5 py-0.5 rounded border"
      style={{ color, background: bg, borderColor: border, letterSpacing: '0.1em' }}
    >
      {label}
    </span>
  )
}
