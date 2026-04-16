import { useTheme } from '@/context/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      className="w-[44px] h-[24px] rounded-full border flex items-center p-0.5 transition-all duration-300"
      style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
    >
      <div
        className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] transition-transform duration-300"
        style={{
          background: 'var(--text1)',
          color: 'var(--bg)',
          transform: theme === 'dark' ? 'translateX(20px)' : 'translateX(0)',
        }}
      >
        {theme === 'light' ? '☀' : '☽'}
      </div>
    </button>
  )
}
