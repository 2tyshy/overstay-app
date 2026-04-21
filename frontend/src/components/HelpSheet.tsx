import BottomSheet from './BottomSheet'
import { Info, MapPin, Globe, HelpCircle } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export default function HelpSheet({ open, onClose }: Props) {
  const items = [
    {
      icon: MapPin,
      title: 'Трекер виз',
      body: 'Следим за днями до дедлайна. Алерт за 14 дней — не забудь сделать ран.',
    },
    {
      icon: Globe,
      title: 'База схем',
      body: 'Маршруты визаранов от реальных номадов. Фильтруй по стране, голосуй, делись.',
    },
    {
      icon: HelpCircle,
      title: 'FAQ',
      body: 'Экран «Дальше» — куда лететь с твоим паспортом. Сортировка по количеству схем в базе.',
    },
  ]

  return (
    <BottomSheet open={open} onClose={onClose} height="64vh">
      <div className="flex items-center gap-2 mb-5">
        <Info size={18} strokeWidth={1.5} style={{ color: 'var(--text1)' }} />
        <h2 className="text-[17px] font-semibold" style={{ color: 'var(--text1)' }}>
          Как это работает
        </h2>
      </div>

      <div className="space-y-3">
        {items.map(it => {
          const Icon = it.icon
          return (
            <div
              key={it.title}
              className="flex gap-3 p-3.5 border rounded-[10px]"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--bg2)', color: 'var(--text2)' }}
              >
                <Icon size={15} strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-[13px] font-semibold mb-0.5" style={{ color: 'var(--text1)' }}>
                  {it.title}
                </div>
                <div className="font-mono text-[10px] leading-[1.6]" style={{ color: 'var(--text3)' }}>
                  {it.body}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div
        className="mt-5 p-3 border rounded font-mono text-[10px] leading-[1.6]"
        style={{ background: 'var(--alert-bg)', borderColor: 'var(--alert-border)', color: 'var(--alert-text)' }}
      >
        MVP: данные хранятся локально на устройстве. Синхронизация с облаком появится в следующих версиях.
      </div>
    </BottomSheet>
  )
}
