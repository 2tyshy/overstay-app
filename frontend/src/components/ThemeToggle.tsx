import { useTheme } from '@/context/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'light' ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'}
      className="w-11 h-11 rounded-lg border flex items-center justify-center transition-all duration-300"
      style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
    >
      <div
        className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[12px] transition-transform duration-300"
        style={{
          background: 'var(--text1)',
          color: 'var(--bg)',
          transform: theme === 'dark' ? 'translateX(5px)' : 'translateX(-5px)',
        }}
      >
        {theme === 'light' ? '☀' : '☽'}
      </div>
    </button>
  )
}
