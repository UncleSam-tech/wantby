const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function addDays(key: string, days: number): string {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export function addMonths(key: string, months: number): string {
  const date = fromDateKey(key)
  const originalDay = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(originalDay, lastDay))
  return toDateKey(date)
}

export function formatShortDate(key: string | null): string {
  if (!key) return 'Someday'
  const today = todayKey()
  if (key === today) return 'Today'
  if (key === addDays(today, 1)) return 'Tomorrow'
  const date = fromDateKey(key)
  return `${DAY_NAMES[date.getDay()].slice(0, 3)}, ${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getDate()}`
}

export function formatFullDate(key: string): string {
  const date = fromDateKey(key)
  return `${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

export function monthTitle(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`
}

export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

export function relativeDayLabel(key: string | null): 'overdue' | 'today' | 'upcoming' | 'someday' {
  if (!key) return 'someday'
  const today = todayKey()
  if (key < today) return 'overdue'
  if (key === today) return 'today'
  return 'upcoming'
}

export function nextWeekday(targetDay: number, includeToday = false): string {
  const date = new Date()
  let delta = (targetDay - date.getDay() + 7) % 7
  if (delta === 0 && !includeToday) delta = 7
  date.setDate(date.getDate() + delta)
  return toDateKey(date)
}
