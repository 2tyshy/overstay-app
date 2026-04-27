import { useState } from 'react'
import { ChevronDown, Loader2, HelpCircle } from 'lucide-react'
import { chat, type GeminiMessage } from '@/lib/gemini'

const FAQ_SYSTEM = `Ты — ассистент приложения Overstay для digital nomads в ЮВА (Юго-Восточная Азия).
Отвечай на русском, кратко и по делу (2-5 предложений).
Не давай юридических советов — направляй уточнять в консульстве.
Если вопрос не про визы или поездки — вежливо верни к теме.`

const QUESTIONS: string[] = [
  'Как сделать визаран из Таиланда?',
  'Что такое DTV в Таиланде и как его получить?',
  'Сколько дней дают по e-visa во Вьетнам и можно ли продлить?',
  'Можно ли жить в ЮВА годами без оформления долгосрочной визы?',
  'Что делать, если виза истекает через 3 дня?',
  'Какая страна ЮВА самая дешёвая для жизни?',
  'Как рассчитать, сколько дней я провёл в Таиланде за год?',
  'Нужна ли RU паспорту виза в Корею?',
]


export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<number, string>>({})

  const handleToggle = async (i: number) => {
    if (open === i) { setOpen(null); return }
    setOpen(i)
    if (answers[i] !== undefined) return
    setLoading(i)
    setErrors(prev => { const n = { ...prev }; delete n[i]; return n })
    try {
      const msg: GeminiMessage = { role: 'user', parts: [{ text: QUESTIONS[i] }] }
      const text = await chat([msg], FAQ_SYSTEM)
      setAnswers(prev => ({ ...prev, [i]: text }))
    } catch {
      setErrors(prev => ({ ...prev, [i]: 'Ошибка соединения. Проверь интернет и попробуй ещё раз.' }))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="h-full overflow-y-auto px-[18px] pb-4" style={{ scrollbarWidth: 'none' }}>
      {/* Header */}
      <div
        className="flex items-center gap-2 mt-4 mb-4"
        style={{ animation: 'cardIn 0.4s cubic-bezier(0.16,1,0.3,1) both' }}
      >
        <HelpCircle size={16} strokeWidth={1.5} style={{ color: 'var(--text3)' }} />
        <div>
          <div className="text-[15px] font-semibold" style={{ color: 'var(--text1)' }}>
            FAQ
          </div>
          <div className="font-mono text-[9px]" style={{ color: 'var(--text4)', letterSpacing: '0.08em' }}>
            Частые вопросы · AI отвечает
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-2">
        {QUESTIONS.map((q, i) => {
          const isOpen = open === i
          const isLoading = loading === i
          const answer = answers[i]
          const error = errors[i]

          return (
            <div
              key={i}
              className="border rounded-[12px] overflow-hidden"
              style={{
                background: 'var(--bg2)',
                borderColor: isOpen ? 'var(--text4)' : 'var(--border)',
                animation: `cardIn 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.04}s both`,
                transition: 'border-color 0.15s',
              }}
            >
              <button
                onClick={() => handleToggle(i)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left gap-3 active:opacity-70 transition-opacity"
              >
                <span className="text-[13px] font-medium leading-snug" style={{ color: 'var(--text1)' }}>
                  {q}
                </span>
                <ChevronDown
                  size={15}
                  strokeWidth={1.5}
                  style={{
                    color: 'var(--text3)',
                    flexShrink: 0,
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>

              {isOpen && (
                <div
                  className="px-4 pb-4 border-t"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {isLoading && (
                    <div className="flex items-center gap-2 pt-3">
                      <Loader2 size={13} strokeWidth={1.5} className="animate-spin" style={{ color: 'var(--text3)' }} />
                      <span className="font-mono text-[10px]" style={{ color: 'var(--text3)' }}>
                        Думаю...
                      </span>
                    </div>
                  )}
                  {error && !isLoading && (
                    <div
                      className="mt-3 px-3 py-2 rounded-[8px] font-mono text-[10px]"
                      style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)' }}
                    >
                      {error}
                    </div>
                  )}
                  {answer && !isLoading && (
                    <div
                      className="mt-3 text-[13px] leading-relaxed"
                      style={{ color: 'var(--text2)' }}
                    >
                      {answer}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
