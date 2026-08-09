import { useState, useEffect, useRef } from 'react'
import { IoChevronBack, IoChevronForward } from 'react-icons/io5'

export const presetBtnStyle = (isActive) => ({
  padding: '6px 12px', borderRadius: 'var(--radius-sm)',
  border: '1px solid',
  borderColor: isActive ? 'var(--accent)' : 'var(--border)',
  backgroundColor: isActive ? 'var(--accent-mid)' : 'var(--bg-tertiary)',
  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  transition: 'all 0.2s',
})

export function CalendarDatePicker({ value, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewDate, setViewDate] = useState(new Date(value || new Date()))
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (value) {
      setViewDate(new Date(value))
      setSelectedDate(new Date(value))
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay()

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const handlePrevMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() - 1)
      return d
    })
  }

  const handleNextMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + 1)
      return d
    })
  }

  const handleDayClick = (day) => {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    setSelectedDate(d)
    onChange(d.toISOString().split('T')[0])
    setIsOpen(false)
  }

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const totalDays = daysInMonth(year, month)
  const startDay = firstDayOfMonth(year, month)

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
  }

  const isToday = (d) => {
    const t = new Date()
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
  }

  const weeks = []
  let week = []
  for (let i = 0; i < startDay; i++) {
    week.push(null)
  }
  for (let day = 1; day <= totalDays; day++) {
    week.push(day)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <input
        type="text"
        value={value || ''}
        readOnly
        placeholder={placeholder || 'Select date'}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '6px 10px', color: '#fff',
          fontSize: 12, outline: 'none', fontFamily: 'var(--font-body)',
          cursor: 'pointer', width: 140,
        }}
      />
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 100,
          backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: 12, marginTop: 4,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          minWidth: 220,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button onClick={handlePrevMonth} style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
            }}>
              <IoChevronBack size={16} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {monthNames[month]} {year}
            </span>
            <button onClick={handleNextMonth} style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
            }}>
              <IoChevronForward size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
            {dayNames.map(d => (
              <div key={d} style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, padding: '4px 0' }}>
                {d}
              </div>
            ))}
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'contents' }}>
                {week.map((day, di) => {
                  const dateObj = day ? new Date(year, month, day) : null
                  const isSelected = selectedDate && dateObj && isSameDay(selectedDate, dateObj)
                  const isTodayDate = dateObj && isToday(dateObj)
                  return (
                    <button
                      key={`${wi}-${di}`}
                      onClick={() => day && handleDayClick(day)}
                      disabled={!day}
                      style={{
                        width: 30, height: 30, borderRadius: '50%', border: 'none',
                        backgroundColor: isSelected ? 'var(--accent)' : isTodayDate ? 'var(--accent-mid)' : 'transparent',
                        color: isSelected ? '#fff' : day ? 'var(--text-primary)' : 'transparent',
                        fontSize: 12, fontWeight: isSelected ? 700 : 400,
                        cursor: day ? 'pointer' : 'default',
                        transition: 'all 0.15s',
                      }}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Shared "Period" filter bar (preset buttons + start/end date pickers + clear),
// used by the Chat Logs, Sessions and Member Reports pages.
export function DateRangeFilterBar({ startDate, endDate, onStartChange, onEndChange, onPreset, onClear, showClear }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
      flexWrap: 'wrap',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          Period:
        </span>
        <button onClick={() => onPreset(1)} style={presetBtnStyle(startDate === new Date().toISOString().split('T')[0] && endDate === new Date().toISOString().split('T')[0])}>Today</button>
        <button onClick={() => onPreset(7)} style={presetBtnStyle(false)}>Last 7d</button>
        <button onClick={() => onPreset(30)} style={presetBtnStyle(false)}>Last 30d</button>
        <button onClick={() => onPreset(90)} style={presetBtnStyle(false)}>Last 90d</button>
        <button onClick={() => onPreset('all')} style={presetBtnStyle(!startDate && !endDate)}>All Time</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <CalendarDatePicker
          value={startDate}
          onChange={onStartChange}
          placeholder="Start date"
        />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>to</span>
        <CalendarDatePicker
          value={endDate}
          onChange={onEndChange}
          placeholder="End date"
        />
      </div>
      {showClear && (
        <button
          onClick={onClear}
          style={{
            padding: '6px 12px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)', backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-muted)', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          Clear Filters
        </button>
      )}
    </div>
  )
}
