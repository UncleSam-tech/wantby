import type { ParsedWant } from '../types'
import { addDays, nextWeekday, toDateKey, todayKey } from './dates'

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `want-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function parseClock(value: string | undefined): string | null {
  if (!value) return null
  const match = value.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/)
  if (!match) return null
  let hour = Number(match[1])
  const minute = Number(match[2] ?? 0)
  const period = match[3]
  if (period === 'pm' && hour < 12) hour += 12
  if (period === 'am' && hour === 12) hour = 0
  if (hour > 23 || minute > 59) return null
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function parseDatePhrase(phrase: string): string | null {
  const normalized = phrase.trim().toLowerCase().replace(/^next\s+/, '')
  if (normalized === 'today') return todayKey()
  if (normalized === 'tomorrow') return addDays(todayKey(), 1)
  if (normalized === 'weekend' || normalized === 'this weekend') return nextWeekday(6, true)
  if (WEEKDAYS[normalized] !== undefined) return nextWeekday(WEEKDAYS[normalized])

  const iso = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    if (!Number.isNaN(date.getTime())) return toDateKey(date)
  }

  const slash = normalized.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/)
  if (slash) {
    const yearRaw = slash[3] ? Number(slash[3]) : new Date().getFullYear()
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw
    const date = new Date(year, Number(slash[2]) - 1, Number(slash[1]))
    if (!Number.isNaN(date.getTime())) return toDateKey(date)
  }

  const parsed = new Date(`${phrase} ${new Date().getFullYear()}`)
  if (!Number.isNaN(parsed.getTime())) {
    if (toDateKey(parsed) < todayKey()) parsed.setFullYear(parsed.getFullYear() + 1)
    return toDateKey(parsed)
  }
  return null
}

function extractSchedule(input: string): { text: string; dueDate: string | null; reminderTime: string | null } {
  const schedulePattern = /\s+(?:by|before|on)\s+((?:next\s+)?(?:today|tomorrow|this\s+weekend|weekend|sun(?:day)?|mon(?:day)?|tue(?:sday|s)?|wed(?:nesday)?|thu(?:rsday|rs)?|fri(?:day)?|sat(?:urday)?|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{4}-\d{1,2}-\d{1,2}|[a-z]+\s+\d{1,2}))(?:\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?\s*$/i
  const match = input.match(schedulePattern)
  if (!match) return { text: input.trim(), dueDate: null, reminderTime: null }
  return {
    text: input.slice(0, match.index).trim(),
    dueDate: parseDatePhrase(match[1]),
    reminderTime: parseClock(match[2])
  }
}

function extractQuantity(text: string): { title: string; quantity: string } {
  const match = text.trim().match(/^(?:(\d+(?:\.\d+)?\s*(?:kg|g|l|ml|packs?|boxes?|bottles?|pieces?|pcs?)?)\s+(?:of\s+)?)(.+)$/i)
  if (!match) return { title: text.trim(), quantity: '' }
  return { title: match[2].trim(), quantity: match[1].trim() }
}

export function parseSmartInput(input: string): ParsedWant[] {
  const schedule = extractSchedule(input.replace(/[ \t]+/g, ' ').trim())
  const source = schedule.text.replace(/(?:\.|!)\s*$/, '')
  const chunks = source
    .split(/\s*(?:\n|;|,|\s+and\s+)\s*/i)
    .map(value => value.replace(/^(?:buy|get|pick up|remember to buy)\s+/i, '').trim())
    .filter(Boolean)

  return chunks.map(chunk => {
    const quantity = extractQuantity(chunk)
    return {
      id: createId(),
      title: quantity.title.charAt(0).toUpperCase() + quantity.title.slice(1),
      quantity: quantity.quantity,
      dueDate: schedule.dueDate,
      reminderTime: schedule.reminderTime
    }
  })
}

export const parserInternals = { parseDatePhrase, parseClock, extractSchedule, extractQuantity }
