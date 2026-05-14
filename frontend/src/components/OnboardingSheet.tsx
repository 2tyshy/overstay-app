import BottomSheet from './BottomSheet'

interface Props {
  open: boolean
  onAddEntry: () => void
  onDismiss: () => void
}

export default function OnboardingSheet({ open, onAddEntry, onDismiss }: Props) {
  return (
    <BottomSheet open={open} onClose={onDismiss} height="auto">
      <div className="px-6 pt-3 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        {/* drag handle */}
        <div className="w-8 h-[3px] rounded-full mx-auto mb-6" style={{ background: 'var(--border)' }} />

        <div className="text-[20px] font-bold mb-3" style={{ color: 'var(--text1)' }}>
          Не пропусти дедлайн 🚨
        </div>

        <p className="text-[13px] leading-relaxed mb-1" style={{ color: 'var(--text2)' }}>
          Бот напишет в <span style={{ color: 'var(--text1)', fontWeight: 600 }}>10:00 по твоему времени</span> когда пора выезжать.
        </p>
        <p className="text-[13px] leading-relaxed mb-8" style={{ color: 'var(--text3)' }}>
          Сфоткай штамп въезда — заполним за тебя.
        </p>

        <button
          onClick={onAddEntry}
          className="w-full py-3.5 rounded-xl font-semibold text-[15px] transition-all active:scale-[0.98] mb-3"
          style={{ background: 'var(--text1)', color: 'var(--bg)' }}
        >
          Добавить штамп
        </button>

        <button
          onClick={onDismiss}
          className="w-full py-2 text-[12px] font-mono transition-opacity active:opacity-50"
          style={{ color: 'var(--text4)' }}
        >
          позже
        </button>
      </div>
    </BottomSheet>
  )
}
