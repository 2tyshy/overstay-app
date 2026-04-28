import { MessageSquarePlus } from 'lucide-react'

interface Props {
  onClick: () => void
}

export default function FeedbackButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-[76px] right-4 w-11 h-11 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform z-40"
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        color: 'var(--text3)',
      }}
      aria-label="Оставить отзыв"
    >
      <MessageSquarePlus size={18} strokeWidth={1.5} />
    </button>
  )
}
