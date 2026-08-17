import { useMemo, useState } from 'react'
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import type { WantItem, WantList } from '../types'
import { formatFullDate, monthGrid, monthTitle, toDateKey, todayKey } from '../lib/dates'
import { downloadCalendar } from '../lib/calendar'
import { ItemCard } from './ItemCard'

export function CalendarView({ items, lists, onToggle, onOpen }: {
  items: WantItem[]
  lists: WantList[]
  onToggle: (item: WantItem) => void
  onOpen: (item: WantItem) => void
}) {
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selected, setSelected] = useState(todayKey())
  const days = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor])
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) if (item.dueDate && !item.completed) map.set(item.dueDate, (map.get(item.dueDate) ?? 0) + 1)
    return map
  }, [items])
  const agenda = items.filter(item => item.dueDate === selected && !item.completed)

  const shiftMonth = (delta: number) => setCursor(current => {
    const date = new Date(current.year, current.month + delta, 1)
    return { year: date.getFullYear(), month: date.getMonth() }
  })

  return (
    <div className="view-stack">
      <section className="calendar-card">
        <div className="calendar-header"><button className="icon-button" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft size={20} /></button><h2>{monthTitle(cursor.year, cursor.month)}</h2><button className="icon-button" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight size={20} /></button></div>
        <div className="weekday-row" aria-hidden="true">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
        <div className="month-grid">
          {days.map(date => {
            const key = toDateKey(date)
            const count = counts.get(key) ?? 0
            const outside = date.getMonth() !== cursor.month
            return <button key={key} className={`calendar-day${selected === key ? ' selected' : ''}${key === todayKey() ? ' today' : ''}${outside ? ' outside' : ''}`} onClick={() => setSelected(key)} aria-label={`${formatFullDate(key)}${count ? `, ${count} items` : ''}`}><span>{date.getDate()}</span>{count ? <i>{count}</i> : null}</button>
          })}
        </div>
      </section>
      <section className="agenda-section">
        <div className="section-heading"><div><span className="eyebrow">Agenda</span><h2>{formatFullDate(selected)}</h2></div>{agenda.length ? <button className="secondary-button compact" onClick={() => downloadCalendar(agenda, `wantby-${selected}`)}><CalendarPlus size={16} /> Add day</button> : null}</div>
        {agenda.length ? <div className="item-list">{agenda.map(item => <ItemCard key={item.id} item={item} list={lists.find(list => list.id === item.listId)} onToggle={onToggle} onOpen={onOpen} />)}</div> : <div className="empty-mini"><span>Nothing due this day.</span><p>Choose another date or add something new.</p></div>}
      </section>
    </div>
  )
}
