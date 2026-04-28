import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Send, Trash2, Key, Info, Loader2 } from 'lucide-react'
import { chat as geminiChat, hasAiAccess, setUserGeminiKey, clearUserGeminiKey, type GeminiMessage } from '@/lib/gemini'
import { COUNTRY_NAMES, type VisaEntry, type PassportCountry } from '@/types'
import { formatDateFull } from '@/lib/dates'

const LS_HISTORY = 'overstay_chat_history'
const MAX_HISTORY = 40

const FAQ_CHIPS = [
  'Куда лучше лететь на следующую визу?',
  'Как работает visa run из Таиланда?',
  'Что такое DTV и кому подходит?',
  'Сколько стоит жизнь в Чиангмае?',
  'E-visa vs VOA — в чём разница?',
  'Когда мне нужно выезжать?',
]

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
}

interface Props {
  passport: PassportCountry
  entries: VisaEntry[]
  prefill?: string
}

function loadHistory(): ChatMsg[] {
  try {
    const raw = localStorage.getItem(LS_HISTORY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.slice(-MAX_HISTORY)
  } catch { return [] }
}

function saveHistory(msgs: ChatMsg[]) {
  try { localStorage.setItem(LS_HISTORY, JSON.stringify(msgs.slice(-MAX_HISTORY))) } catch { }
}

function genId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function buildSystemPrompt(passport: PassportCountry, entries: VisaEntry[]): string {
  const active = entries.find(e => e.days_left > 0)
  const history = entries.slice(0, 5).map(e => {
    const country = COUNTRY_NAMES[e.country] ?? e.country
    return `  - ${country} (${e.visa_type}): въезд ${formatDateFull(e.entry_date)}, дедлайн ${formatDateFull(e.deadline)}, осталось ${e.days_left} дн`
  }).join('\n') || '  (нет записей)'

  return `Ты — ассистент приложения Overstay для digital nomads, следишь за визовыми дедлайнами и помогаешь планировать визаран.

КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ:
- Паспорт: ${passport}
- Активная виза: ${active ? `${COUNTRY_NAMES[active.country] ?? active.country}, ${active.visa_type}, осталось ${active.days_left} дн (дедлайн ${formatDateFull(active.deadline)})` : 'нет активных виз'}
- Последние записи:
${history}

ПРАВИЛА ОТВЕТА:
- Отвечай на русском, кратко (2-5 предложений максимум, если пользователь не просит подробного разбора).
- Используй Markdown умеренно: только **жирный** для акцентов, списки для 3+ пунктов.
- Не ври про визовые правила — если не уверен, скажи "уточни в консульстве" или "проверь актуальные правила".
- Учитывай, что для RU паспорта Корея сейчас с визой, DTV в Таиланде требует оформления, Шенген недоступен без доп. виз.
- Советуя визаран, предлагай конкретные схемы: через Камбоджу/Лаос/Малайзию из Таиланда и т.д.
- Не давай юридических или налоговых консультаций — направи к специалисту.
- Если вопрос не про визы/поездки — вежливо верни к теме приложения.`
}

function renderLightMarkdown(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\n)[-•] (.+)/g, '$1• $2')
    .replace(/`([^`]+)`/g, '<code style="font-family:var(--font-mono);font-size:0.9em;opacity:0.85">$1</code>')
}

function MessageBubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[85%] px-3 py-2 rounded-[12px] border"
        style={{
          background: isUser ? 'var(--text1)' : 'var(--bg2)',
          borderColor: isUser ? 'var(--text1)' : 'var(--border)',
          color: isUser ? 'var(--bg)' : 'var(--text1)',
          animation: 'cardIn 0.25s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        <div
          className="text-[13px] leading-relaxed whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: renderLightMarkdown(msg.content) }}
        />
      </div>
    </div>
  )
}

export default function ChatPage({ passport, entries, prefill }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>(loadHistory)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [keyMode, setKeyMode] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const prefillSentRef = useRef(false)

  const hasKey = useMemo(() => hasAiAccess(), [keyMode])

  useEffect(() => { saveHistory(messages) }, [messages])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages.length, sending])

  const systemPrompt = useMemo(() => buildSystemPrompt(passport, entries), [passport, entries])

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    if (!hasAiAccess()) { setKeyMode(true); return }

    setError('')
    const userMsg: ChatMsg = { id: genId(), role: 'user', content: trimmed, ts: Date.now() }
    const nextMsgs = [...messages, userMsg]
    setMessages(nextMsgs)
    setInput('')
    setSending(true)

    try {
      const history: GeminiMessage[] = nextMsgs.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }))
      const reply = await geminiChat(history, systemPrompt)
      setMessages(prev => [...prev, { id: genId(), role: 'assistant', content: reply, ts: Date.now() }])
    } catch (e: any) {
      if (e?.code === 'NO_KEY' || e?.code === 'BAD_KEY') {
        setKeyMode(true)
        setError(e.code === 'BAD_KEY' ? 'Ключ неверный — обнови' : 'Нужен API ключ')
      } else if (e?.code === 'RATE_LIMIT') {
        setError('Лимит запросов — подожди минуту')
      } else {
        setError(e?.message || 'Ошибка связи')
      }
      setMessages(prev => prev.filter(m => m.id !== userMsg.id))
      setInput(trimmed)
    } finally {
      setSending(false)
    }
  }, [messages, sending, systemPrompt])

  // Auto-send prefill once on mount when history is empty
  useEffect(() => {
    if (prefill && messages.length === 0 && !prefillSentRef.current) {
      prefillSentRef.current = true
      send(prefill)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const clearHistory = () => {
    setMessages([])
    saveHistory([])
  }

  const saveKey = () => {
    if (!keyInput.trim()) return
    setUserGeminiKey(keyInput.trim())
    setKeyMode(false)
    setKeyInput('')
    setError('')
  }

  const forgetKey = () => {
    clearUserGeminiKey()
    setKeyMode(true)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-1 px-4 pt-2 pb-1 shrink-0">
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="p-1.5 rounded transition-colors active:scale-90"
            style={{ color: 'var(--text3)' }}
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        )}
        <button
          onClick={() => setKeyMode(p => !p)}
          className="p-1.5 rounded transition-colors active:scale-90"
          style={{ color: hasKey ? 'var(--text3)' : 'var(--alert-text)' }}
        >
          <Key size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Key-mode editor */}
      {keyMode && (
        <div
          className="mx-4 mt-2 mb-2 p-3 rounded-[10px] border shrink-0"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Info size={12} strokeWidth={1.5} style={{ color: 'var(--text3)' }} />
            <span className="font-mono text-[10px]" style={{ color: 'var(--text2)' }}>Gemini API ключ</span>
          </div>
          <div className="font-mono text-[9px] leading-relaxed mb-2" style={{ color: 'var(--text3)' }}>
            Получи бесплатный ключ на{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--text1)', textDecoration: 'underline' }}>
              aistudio.google.com/apikey
            </a>. Хранится локально.
          </div>
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder="AIza..."
            className="w-full px-2.5 py-2 rounded border font-mono text-[11px]"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text1)' }}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={saveKey}
              disabled={!keyInput.trim()}
              className="flex-1 py-2 rounded text-[12px] font-semibold active:scale-[0.98] disabled:opacity-40"
              style={{ background: 'var(--text1)', color: 'var(--bg)' }}
            >
              Сохранить
            </button>
            {hasKey && (
              <button
                onClick={forgetKey}
                className="py-2 px-3 rounded text-[12px] active:scale-[0.98]"
                style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}
              >
                Забыть
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages / Empty state */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4"
        style={{ scrollbarWidth: 'none' }}
      >
        {messages.length === 0 && !keyMode && (
          <div className="pt-8 pb-4">
            <div className="mb-6">
              <div className="text-[20px] font-semibold mb-1" style={{ color: 'var(--text1)' }}>
                Чем помочь?
              </div>
              <div className="font-mono text-[11px]" style={{ color: 'var(--text3)' }}>
                Спроси про визы, налоги, города — отвечу с учётом твоей визы
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {FAQ_CHIPS.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="w-full text-left border rounded-xl px-4 py-3 font-mono text-[12px] active:opacity-70 transition-opacity"
                  style={{ borderColor: 'var(--border)', color: 'var(--text2)', background: 'var(--bg2)' }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="space-y-3 py-4">
            {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
            {sending && (
              <div className="flex items-center gap-2 px-3 py-2">
                <Loader2 size={14} strokeWidth={1.5} className="animate-spin" style={{ color: 'var(--text3)' }} />
                <span className="font-mono text-[10px]" style={{ color: 'var(--text3)' }}>Думаю...</span>
              </div>
            )}
            {error && !sending && (
              <div
                className="px-3 py-2 rounded-[8px] border font-mono text-[10px]"
                style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}
              >
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className="flex items-end gap-2 px-4 pt-3 pb-6 border-t shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={hasKey ? 'Спроси что-нибудь…' : 'Сначала добавь API ключ →'}
          disabled={!hasKey || sending}
          className="flex-1 resize-none px-3 py-2.5 rounded-[10px] border text-[13px] leading-snug disabled:opacity-50"
          style={{
            background: 'var(--bg2)',
            borderColor: 'var(--border)',
            color: 'var(--text1)',
            maxHeight: '120px',
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || sending || !hasKey}
          className="w-10 h-10 rounded-[10px] flex items-center justify-center transition-all active:scale-[0.92] disabled:opacity-30 shrink-0"
          style={{ background: 'var(--text1)', color: 'var(--bg)' }}
        >
          <Send size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
