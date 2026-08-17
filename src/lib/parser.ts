import type { ParsedWant } from '../types'
import { addDays, nextWeekday, toDateKey } from './dates'

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6
}

const DATE_WORD = String.raw`(?:today|tomorrow|(?:this|next)\s+(?:weekend|sun(?:day)?|mon(?:day)?|tue(?:sday|s)?|wed(?:nesday)?|thu(?:rsday|rs)?|fri(?:day)?|sat(?:urday)?)|weekend|sun(?:day)?|mon(?:day)?|tue(?:sday|s)?|wed(?:nesday)?|thu(?:rsday|rs)?|fri(?:day)?|sat(?:urday)?|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{4}-\d{1,2}-\d{1,2}|[a-z]+\s+\d{1,2}(?:st|nd|rd|th)?)`
const DATE_MENTION = new RegExp(String.raw`\b(?:by|before|on|for)\s+(${DATE_WORD})(?:\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?\b`, 'gi')

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `want-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function referenceKey(referenceDate: Date): string {
  return toDateKey(referenceDate)
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

function parseDatePhrase(phrase: string, referenceDate = new Date()): string | null {
  const normalized = phrase.trim().toLowerCase().replace(/(\d)(?:st|nd|rd|th)\b/g, '$1')
  const today = referenceKey(referenceDate)
  if (normalized === 'today') return today
  if (normalized === 'tomorrow') return addDays(today, 1)
  if (normalized === 'weekend' || normalized === 'this weekend') return nextWeekday(6, true, referenceDate)
  if (normalized === 'next weekend') return addDays(nextWeekday(6, true, referenceDate), 7)

  const weekdayMatch = normalized.match(/^(this|next)?\s*([a-z]+)$/)
  if (weekdayMatch && WEEKDAYS[weekdayMatch[2]] !== undefined) {
    const nearest = nextWeekday(WEEKDAYS[weekdayMatch[2]], true, referenceDate)
    return weekdayMatch[1] === 'next' ? addDays(nearest, 7) : nearest
  }

  const iso = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    if (!Number.isNaN(date.getTime())) return toDateKey(date)
  }

  const slash = normalized.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/)
  if (slash) {
    const yearRaw = slash[3] ? Number(slash[3]) : referenceDate.getFullYear()
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw
    const date = new Date(year, Number(slash[2]) - 1, Number(slash[1]))
    if (!Number.isNaN(date.getTime())) return toDateKey(date)
  }

  const parsed = new Date(`${normalized} ${referenceDate.getFullYear()}`)
  if (!Number.isNaN(parsed.getTime())) {
    if (toDateKey(parsed) < today) parsed.setFullYear(parsed.getFullYear() + 1)
    return toDateKey(parsed)
  }
  return null
}

interface Schedule {
  dueDate: string | null
  reminderTime: string | null
}

function scheduleMentions(input: string, referenceDate: Date): Schedule[] {
  return [...input.matchAll(DATE_MENTION)].map(match => ({
    dueDate: parseDatePhrase(match[1], referenceDate),
    reminderTime: parseClock(match[2])
  })).filter(schedule => schedule.dueDate)
}

function extractSchedule(input: string, referenceDate = new Date()): { text: string } & Schedule {
  const schedules = scheduleMentions(input, referenceDate)
  const uniqueDates = [...new Set(schedules.map(schedule => schedule.dueDate))]
  const schedule = uniqueDates.length === 1 ? schedules[0] : { dueDate: null, reminderTime: null }
  return {
    text: input.replace(DATE_MENTION, ' ').replace(/[\t ]+/g, ' ').trim(),
    dueDate: schedule.dueDate,
    reminderTime: schedule.reminderTime
  }
}

function extractQuantity(text: string): { title: string; quantity: string } {
  const match = text.trim().match(/^(?:(\d+(?:\.\d+)?\s*(?:kg|g|l|ml|packs?|boxes?|bottles?|pieces?|pcs?)?)\s+(?:of\s+)?)(.+)$/i)
  if (!match) return { title: text.trim(), quantity: '' }
  return { title: match[2].trim(), quantity: match[1].trim() }
}

function splitClauses(input: string): string[] {
  return input
    .replace(/[.!?]+/g, ' | ')
    .replace(/\b(?:and\s+)?(?:then\s+)?(?:i|we)\s+(?:also\s+)?(?:need|want|have)\s+to\s+(?:buy|get|pick\s+up|purchase|grab)\b/gi, ' | ')
    .replace(/\b(?:and\s+)?(?:i|we)\s+(?:also\s+)?(?:need|want)\b/gi, ' | ')
    .replace(/\b(?:and\s+)?also\s+(?:buy|get|pick\s+up|grab)\b/gi, ' | ')
    .split(/\s*(?:\||\n|;|,|\s+and\s+|\s+plus\s+)\s*/i)
}

function cleanItem(value: string): string {
  return value
    .replace(/^\s*(?:(?:so|okay|ok|well)(?:\s+|$)|and\s+)/i, '')
    .replace(/^\s*(?:please\s+)?(?:remember\s+to\s+)?(?:buy|get|pick\s+up|purchase|grab)\s+/i, '')
    .replace(/^\s*(?:i|we)\s+(?:also\s+)?(?:need|want|have)\s+to\s+/i, '')
    .replace(/^\s*(?:a|an|the|some)\s+/i, '')
    .replace(/\bmy\s+(girlfriend|boyfriend|wife|husband|partner|mum|mom|dad|friend)\b/gi, '$1')
    .replace(/\bfood\s+stuffs?\b/gi, 'foodstuffs')
    .replace(/\s*(?:that(?:'s| is)\s+all|and\s+that(?:'s| is)\s+it|please)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isConcreteItem(value: string): boolean {
  if (!value || value.length < 2) return false
  if (/^(?:so|okay|ok|well|and|then)$/i.test(value)) return false
  return !/^(?:some\s+)?(?:things?|items?|stuff|something|anything|everything)(?:\s+(?:to\s+)?(?:buy|get))?$/i.test(value)
}

function categoryHint(title: string): ParsedWant['categoryHint'] {
  const value = title.toLowerCase()
  if (/\b(?:eggs?|milk|bread|rice|beans?|pasta|noodles?|meat|beef|fish|chicken|fruits?|vegetables?|apples?|oranges?|bananas?|tomatoes?|onions?|potatoes?|pepper|food|foodstuffs?|provisions?|grocer(?:y|ies)|snacks?|biscuits?|drinks?|juice|water|toiletr(?:y|ies)|toothpaste|soap|shampoo|conditioner|deodorant|tissues?|toilet\s+paper|pancake|cereal|oats?|flour|sugar|salt|oil)\b/.test(value)) return 'groceries'
  if (/\b(?:cleaning|detergent|bleach|broom|mop|bucket|bulb|lamp|furniture|curtain|bedsheet|towel|kitchen|household|home)\b/.test(value)) return 'home'
  return 'general'
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function parseSmartInput(input: string, referenceDate = new Date()): ParsedWant[] {
  const normalized = input.replace(/[\t ]+/g, ' ').trim()
  if (!normalized) return []

  const mentionedSchedules = scheduleMentions(normalized, referenceDate)
  const uniqueDates = [...new Set(mentionedSchedules.map(schedule => schedule.dueDate))]

  if (uniqueDates.length > 1) {
    let currentSchedule: Schedule = { dueDate: null, reminderTime: null }
    const scheduledChunks = normalized.split(/[.!?]+/).flatMap(sentence => {
      const local = extractSchedule(sentence, referenceDate)
      if (local.dueDate) currentSchedule = { dueDate: local.dueDate, reminderTime: local.reminderTime }
      return splitClauses(local.text).map(value => ({ title: cleanItem(value), schedule: { ...currentSchedule } }))
    })

    return scheduledChunks.filter(chunk => isConcreteItem(chunk.title)).map(chunk => {
      const quantity = extractQuantity(chunk.title)
      return {
        id: createId(),
        title: capitalise(quantity.title),
        quantity: quantity.quantity,
        dueDate: chunk.schedule.dueDate,
        reminderTime: chunk.schedule.reminderTime,
        categoryHint: categoryHint(quantity.title)
      }
    })
  }

  const shared = extractSchedule(normalized, referenceDate)
  const chunks = splitClauses(shared.text)
    .map(cleanItem)
    .filter(isConcreteItem)

  return chunks.map(chunk => {
    const quantity = extractQuantity(chunk)
    return {
      id: createId(),
      title: capitalise(quantity.title),
      quantity: quantity.quantity,
      dueDate: shared.dueDate,
      reminderTime: shared.reminderTime,
      categoryHint: categoryHint(quantity.title)
    }
  })
}

export const parserInternals = { parseDatePhrase, parseClock, extractSchedule, extractQuantity, categoryHint, cleanItem }
