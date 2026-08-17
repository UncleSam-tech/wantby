import type { WantItem } from '../types'
import { addDays, fromDateKey } from './dates'

function escapeICS(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function stamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function eventForItem(item: WantItem): string {
  const due = fromDateKey(item.dueDate!)
  const lines = ['BEGIN:VEVENT', `UID:${item.id}@wantby.app`, `DTSTAMP:${stamp(new Date())}`, `SUMMARY:${escapeICS(item.title)}`]
  if (item.notes) lines.push(`DESCRIPTION:${escapeICS(item.notes)}`)
  if (item.reminderTime) {
    const [hours, minutes] = item.reminderTime.split(':').map(Number)
    due.setHours(hours, minutes, 0, 0)
    const end = new Date(due.getTime() + 30 * 60 * 1000)
    lines.push(`DTSTART:${stamp(due)}`, `DTEND:${stamp(end)}`)
  } else {
    lines.push(`DTSTART;VALUE=DATE:${item.dueDate!.replaceAll('-', '')}`, `DTEND;VALUE=DATE:${addDays(item.dueDate!, 1).replaceAll('-', '')}`)
  }
  lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:WantBy reminder', 'TRIGGER:-PT30M', 'END:VALARM', 'END:VEVENT')
  return lines.join('\r\n')
}

export function downloadCalendar(items: WantItem[], fileName = 'wantby-reminders'): boolean {
  const scheduled = items.filter(item => item.dueDate && !item.completed)
  if (!scheduled.length) return false
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WantBy//Local reminders//EN', 'CALSCALE:GREGORIAN', ...scheduled.map(eventForItem), 'END:VCALENDAR'].join('\r\n')
  const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${fileName}.ics`
  anchor.click()
  URL.revokeObjectURL(url)
  return true
}
