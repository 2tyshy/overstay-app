import { useState } from 'react'
import BottomSheet from './BottomSheet'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: { country: string; visa_type: string; entry_date: string }) => void
}

export default function AddEntrySheet({ open, onClose, onSave }: Props) {
  const [country, setCountry] = useState('')
  const [visaType, setVisaType] = useState('')
  const [entryDate, setEntryDate] = useState('')

  const handleSave = () => {
    if (!country || !visaType || !entryDate) return
    onSave({ country, visa_type: visaType, entry_date: entryDate })
    setCountry(''); setVisaType(''); setEntryDate('')
    onClose()
  }

  const inputStyle = {
    background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text1)',
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <h2 className="text-[17px] font-semibold mb-5" style={{ color: 'var(--text1)' }}>Добавить въезд</h2>

      <div className="flex items-center gap-2.5 font-mono text-[9px] uppercase my-3" style={{ color: 'var(--text3)', letterSpacing: '0.26em' }}>
        <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        заполни вручную
        <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="font-mono text-[9px] uppercase mb-1 block" style={{ color: 'var(--text3)', letterSpacing: '0.2em' }}>Страна</label>
          <input value={country} onChange={e => setCountry(e.target.value)} placeholder="VN" className="w-full border rounded py-2.5 px-3 font-mono text-[13px] outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="font-mono text-[9px] uppercase mb-1 block" style={{ color: 'var(--text3)', letterSpacing: '0.2em' }}>Тип визы</label>
          <input value={visaType} onChange={e => setVisaType(e.target.value)} placeholder="E-Visa 90d" className="w-full border rounded py-2.5 px-3 font-mono text-[13px] outline-none" style={inputStyle} />
        </div>
      </div>
      <div className="mb-2">
        <label className="font-mono text-[9px] uppercase mb-1 block" style={{ color: 'var(--text3)', letterSpacing: '0.2em' }}>Дата въезда</label>
        <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full border rounded py-2.5 px-3 font-mono text-[13px] outline-none" style={inputStyle} />
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3.5 rounded font-semibold text-sm tracking-wide mt-3 transition-all duration-150 active:scale-[0.98]"
        style={{ background: 'var(--text1)', color: 'var(--bg)' }}
      >
        Сохранить
      </button>
    </BottomSheet>
  )
}
