import { describe, expect, it } from 'vitest'
import { parseSmartInput, parserInternals } from './parser'

describe('smart capture parser', () => {
  it('splits a sentence into concrete items and shares the due date', () => {
    const items = parseSmartInput('Buy a charger, toothpaste and 2 packs of batteries by Wednesday')
    expect(items).toHaveLength(3)
    expect(items.map(item => item.title)).toEqual(['A charger', 'Toothpaste', 'Batteries'])
    expect(items[2].quantity).toBe('2 packs')
    expect(items.every(item => item.dueDate)).toBe(true)
  })

  it('understands tomorrow with a reminder time', () => {
    const items = parseSmartInput('Get printer ink by tomorrow at 6pm')
    expect(items[0].title).toBe('Printer ink')
    expect(items[0].reminderTime).toBe('18:00')
  })

  it('keeps a single unscheduled item', () => {
    const items = parseSmartInput('new running shoes')
    expect(items).toHaveLength(1)
    expect(items[0].dueDate).toBeNull()
  })

  it('accepts one item per line', () => {
    const items = parseSmartInput('Power bank\nUSB-C cable\nTravel adapter by Friday')
    expect(items.map(item => item.title)).toEqual(['Power bank', 'USB-C cable', 'Travel adapter'])
    expect(items.every(item => item.dueDate)).toBe(true)
  })

  it('parses 24-hour and 12-hour clocks', () => {
    expect(parserInternals.parseClock('09:30')).toBe('09:30')
    expect(parserInternals.parseClock('12am')).toBe('00:00')
    expect(parserInternals.parseClock('7pm')).toBe('19:00')
  })
})
