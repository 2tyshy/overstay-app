import { useState } from 'react'
import { ThemeProvider } from '@/context/ThemeContext'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import StatusPage from '@/pages/StatusPage'
import SchemesPage from '@/pages/SchemesPage'
import NextPage from '@/pages/NextPage'
import AddEntrySheet from '@/components/AddEntrySheet'
import type { Screen } from '@/types'

const SCREEN_TITLES: Record<Screen, string> = {
  status: 'Overstay',
  schemes: 'Схемы',
  next: 'Дальше',
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('status')
  const [entrySheetOpen, setEntrySheetOpen] = useState(false)

  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
        <Header title={SCREEN_TITLES[screen]} passport="RU" onChatOpen={() => {}} />

        <div className="flex-1 overflow-hidden">
          {screen === 'status' && <StatusPage onNavigate={setScreen} onStamp={() => setEntrySheetOpen(true)} />}
          {screen === 'schemes' && <SchemesPage />}
          {screen === 'next' && <NextPage onNavigate={setScreen} />}
        </div>

        <BottomNav active={screen} onChange={setScreen} />

        <AddEntrySheet
          open={entrySheetOpen}
          onClose={() => setEntrySheetOpen(false)}
          onSave={data => { console.log('New entry:', data) }}
        />
      </div>
    </ThemeProvider>
  )
}
