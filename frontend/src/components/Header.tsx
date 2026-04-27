import { useState, useRef, useEffect } from 'react'
import { MessageCircle, RefreshCw } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { COUNTRY_FLAGS, type PassportCountry } from '@/types'

const PASSPORT_OPTIONS: PassportCountry[] = ['RU', 'UA', 'KZ']

interface Props {
  title: string
  passport: PassportCountry
  onPassportChange: (p: PassportCountry) => void
  onChatOpen: () => void
  onRefresh: () => void
}

export default function Header({ title, passport, onPassportChange, onChatOpen, onRefresh }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  return (
    <div className="flex items-center justify-between px-[22px] pt-3.5 pb-0 shrink-0">
      <div className="flex flex-col">
        <span
          className="font-light text-[11px] uppercase"
          style={{ letterSpacing: '0.35em', color: 'var(--text3)' }}
        >
          {title}
        </span>
        {/* Tiny build marker so we can confirm at a glance that Vercel
            actually shipped the latest commit. Remove once we wire CI. */}
        <span
          className="font-mono text-[8px] mt-0.5 leading-none"
          style={{ color: 'var(--text3)', opacity: 0.5 }}
        >
          {__BUILD_TAG__}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg transition-colors active:scale-90"
          style={{ color: 'var(--text3)' }}
          title="Обновить"
        >
          <RefreshCw size={16} strokeWidth={1.5} />
        </button>
        <button
          onClick={onChatOpen}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text3)' }}
        >
          <MessageCircle size={18} strokeWidth={1.5} />
        </button>
        <div ref={ref} className="relative">
          <div
            onClick={() => setDropdownOpen(prev => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[20px] border cursor-pointer transition-colors"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
          >
            <span className="text-[13px]">{COUNTRY_FLAGS[passport]}</span>
            <span className="font-mono text-[10px]" style={{ color: 'var(--text2)', letterSpacing: '0.1em' }}>
              {passport} · Pass
            </span>
          </div>
          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-1 border rounded-lg overflow-hidden z-50 min-w-[120px]"
              style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
            >
              {PASSPORT_OPTIONS.map(p => (
                <button
                  key={p}
                  onClick={() => { onPassportChange(p); setDropdownOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                  style={{
                    color: p === passport ? 'var(--text1)' : 'var(--text3)',
                    background: p === passport ? 'var(--bg3)' : 'transparent',
                  }}
                >
                  <span className="text-[13px]">{COUNTRY_FLAGS[p]}</span>
                  <span className="font-mono text-[11px]" style={{ letterSpacing: '0.08em' }}>{p}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <ThemeToggle />
      </div>
    </div>
  )
}
