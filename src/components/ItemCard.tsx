import { Bell, CalendarDays, Circle, CircleCheck, MoreHorizontal, Repeat2, Star } from 'lucide-react'
import type { WantItem, WantList } from '../types'
import { formatShortDate, relativeDayLabel } from '../lib/dates'

export function ItemCard({ item, list, onToggle, onOpen }: {
  item: WantItem
  list?: WantList
  onToggle: (item: WantItem) => void
  onOpen: (item: WantItem) => void
}) {
  const timing = relativeDayLabel(item.dueDate)
  return (
    <article className={`item-card${item.completed ? ' completed' : ''}`}>
      <button className="check-button" onClick={() => onToggle(item)} aria-label={item.completed ? `Restore ${item.title}` : `Mark ${item.title} as obtained`}>
        {item.completed ? <CircleCheck size={24} /> : <Circle size={24} />}
      </button>
      <button className="item-main" onClick={() => onOpen(item)}>
        <span className="item-title-row">
          <strong>{item.title}</strong>
          {item.priority === 'important' ? <Star size={15} fill="currentColor" aria-label="Important" /> : null}
        </span>
        <span className="item-meta">
          <span className={`date-label ${timing}`}><CalendarDays size={13} /> {formatShortDate(item.dueDate)}</span>
          {item.reminderTime ? <span><Bell size={13} /> {item.reminderTime}</span> : null}
          {item.repeat !== 'none' ? <span><Repeat2 size={13} /> {item.repeat}</span> : null}
          {item.quantity ? <span>{item.quantity}</span> : null}
          {list ? <span className="list-dot-label"><i style={{ backgroundColor: list.color }} />{list.name}</span> : null}
        </span>
      </button>
      <button className="icon-button small item-more" onClick={() => onOpen(item)} aria-label={`Edit ${item.title}`}><MoreHorizontal size={19} /></button>
    </article>
  )
}
