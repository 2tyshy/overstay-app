import { MessageCircle } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { COUNTRY_FLAGS, type PassportCountry } from '@/types'

interface Props {
  title: string
  passport: PassportCountry
  onChatOpen: () => void
}

export default function Header({ title, passport, onChatOpen }: Props) {
  return (
    <div className="flex items-center justify-between px-[22px] pt-3.5 pb-0 shrink-0">
      <span
        className="font-light text-[11px] uppercase"
        style={{ letterSpacing: '0.35em', color: 'var(--text3)' }}
      >
        {title}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onChatOpen}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text3)' }}
        >
          <MessageCircle size={18} strokeWidth={1.5} />
        </button>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[20px] border cursor-pointer transition-colors"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
        >
          <span className="text-[13px]">{COUNTRY_FLAGS[passport]}</span>
          <span className="font-mono text-[10px]" style={{ color: 'var(--text2)', letterSpacing: '0.1em' }}>
            {passport} · Pass
          </span>
        </div>
        <ThemeToggle />
      </div>
    </div>
  )
}
