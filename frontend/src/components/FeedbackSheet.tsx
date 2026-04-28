import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, Send, Loader2 } from 'lucide-react'
import BottomSheet from './BottomSheet'
import { chat as geminiChat } from '@/lib/gemini'
import { saveFeedback } from '@/lib/supabase'

interface Props {
  open: boolean
  onClose: () => void
  userId?: string
  onSuccess: () => void
}

type State = 'idle' | 'recording' | 'analyzing' | 'done' | 'error'

const ANALYSIS_PROMPT = `Analyse this user feedback for a Telegram Mini App (visa deadline tracker for digital nomads).

Return ONLY valid JSON, no markdown:
{
  "content": "<cleaned up version of the feedback, fix grammar, keep meaning>",
  "sentiment": "<positive|neutral|negative>",
  "category": "<bug|feature|praise|general>"
}

Feedback: `

export default function FeedbackSheet({ open, onClose, userId, onSuccess }: Props) {
  const [state, setState] = useState<State>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const recognitionRef = useRef<any>(null)
  const interimRef = useRef('')

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  useEffect(() => {
    if (!open) {
      stopRecording()
      setState('idle')
      setTranscript('')
      setError('')
    }
  }, [open, stopRecording])

  const startRecording = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setError('Голосовой ввод не поддерживается в этом браузере')
      return
    }
    const rec = new SR()
    rec.lang = 'ru-RU'
    rec.continuous = true
    rec.interimResults = true
    recognitionRef.current = rec

    rec.onresult = (e: any) => {
      let interim = ''
      let final = transcript
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript + ' '
        } else {
          interim = e.results[i][0].transcript
        }
      }
      interimRef.current = interim
      setTranscript(final)
    }
    rec.onerror = (e: any) => {
      if (e.error !== 'aborted') setError('Ошибка микрофона: ' + e.error)
      setState('idle')
    }
    rec.onend = () => {
      if (state === 'recording') setState('idle')
    }

    rec.start()
    setState('recording')
    setError('')
  }, [transcript, state])

  const handleSend = useCallback(async () => {
    const text = transcript.trim()
    if (!text) return
    setState('analyzing')
    setError('')
    try {
      const raw = await geminiChat(
        [{ role: 'user', parts: [{ text: ANALYSIS_PROMPT + text }] }],
        undefined
      )
      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      await saveFeedback({
        userId,
        content: parsed.content ?? text,
        rawTranscript: text,
        sentiment: parsed.sentiment ?? 'neutral',
        category: parsed.category ?? 'general',
      })
      setState('done')
      setTimeout(() => { onSuccess(); onClose() }, 1200)
    } catch (e: any) {
      setError(e?.message || 'Не удалось отправить')
      setState('error')
    }
  }, [transcript, userId, onSuccess, onClose])

  const displayText = state === 'recording'
    ? transcript + interimRef.current
    : transcript

  return (
    <BottomSheet open={open} onClose={onClose}>
      <h2 className="text-[17px] font-semibold mb-1" style={{ color: 'var(--text1)' }}>
        Обратная связь
      </h2>
      <p className="font-mono text-[10px] mb-4" style={{ color: 'var(--text3)' }}>
        Нажми на микрофон и говори — или напиши вручную
      </p>

      {/* Transcript area */}
      <textarea
        value={displayText}
        onChange={e => setTranscript(e.target.value)}
        placeholder="Что думаешь о приложении?"
        rows={4}
        className="w-full border rounded-[10px] px-3 py-2.5 text-[13px] resize-none outline-none mb-3"
        style={{
          background: 'var(--bg3)',
          borderColor: state === 'recording' ? 'var(--alert-dot)' : 'var(--border)',
          color: 'var(--text1)',
          transition: 'border-color 0.2s',
        }}
      />

      {error && (
        <div
          className="mb-3 px-3 py-2 rounded border font-mono text-[10px]"
          style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}
        >
          {error}
        </div>
      )}

      {state === 'done' && (
        <div
          className="mb-3 px-3 py-2 rounded border font-mono text-[10px] text-center"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
        >
          Спасибо! Фидбек отправлен ✓
        </div>
      )}

      <div className="flex gap-2">
        {/* Mic button */}
        <button
          onPointerDown={startRecording}
          onPointerUp={stopRecording}
          onPointerLeave={stopRecording}
          disabled={state === 'analyzing' || state === 'done'}
          className="w-12 h-12 rounded-[12px] flex items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-40"
          style={{
            background: state === 'recording' ? 'var(--alert-dot)' : 'var(--bg3)',
            color: state === 'recording' ? 'var(--bg)' : 'var(--text2)',
            border: `1px solid ${state === 'recording' ? 'var(--alert-dot)' : 'var(--border)'}`,
          }}
        >
          {state === 'recording' ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!transcript.trim() || state === 'recording' || state === 'analyzing' || state === 'done'}
          className="flex-1 h-12 rounded-[12px] flex items-center justify-center gap-2 font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-30"
          style={{ background: 'var(--text1)', color: 'var(--bg)' }}
        >
          {state === 'analyzing' ? (
            <><Loader2 size={15} className="animate-spin" /> Анализирую…</>
          ) : (
            <><Send size={15} /> Отправить</>
          )}
        </button>
      </div>
    </BottomSheet>
  )
}
