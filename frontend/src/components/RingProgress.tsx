import { getRingOffset } from '@/lib/dates'

interface Props {
  daysLeft: number
  maxDays: number
}

export default function RingProgress({ daysLeft, maxDays }: Props) {
  const circumference = 2 * Math.PI * 50
  const target = getRingOffset(daysLeft, maxDays)

  return (
    <div className="relative w-[110px] h-[110px] shrink-0">
      <svg className="w-[110px] h-[110px] -rotate-90" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r="50" fill="none" stroke="var(--ring-track)" strokeWidth={5} />
        <circle
          cx="55" cy="55" r="50" fill="none"
          stroke="var(--ring-color)" strokeWidth={5} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{ '--ring-target': target, animation: 'ringDraw 1.2s cubic-bezier(0.16,1,0.3,1) 0.3s forwards' } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[32px] font-bold leading-none"
          style={{ color: 'var(--text1)', letterSpacing: '-0.03em', animation: 'numIn 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both' }}
        >
          {daysLeft}
        </span>
        <span
          className="font-mono text-[9px] uppercase mt-0.5"
          style={{ color: 'var(--text3)', letterSpacing: '0.12em' }}
        >
          дней
        </span>
      </div>
    </div>
  )
}
