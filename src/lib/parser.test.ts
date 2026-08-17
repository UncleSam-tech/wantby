import { describe, expect, it } from 'vitest'
import { parseSmartInput, parserInternals } from './parser'

describe('smart capture parser', () => {
  const monday = new Date(2026, 7, 17, 10)

  it('splits a sentence into concrete items and shares the due date', () => {
    const items = parseSmartInput('Buy a charger, toothpaste and 2 packs of batteries by Wednesday', monday)
    expect(items).toHaveLength(3)
    expect(items.map(item => item.title)).toEqual(['Charger', 'Toothpaste', 'Batteries'])
    expect(items[2].quantity).toBe('2 packs')
    expect(items.every(item => item.dueDate === '2026-08-19')).toBe(true)
    expect(items[1].categoryHint).toBe('groceries')
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

  it('removes speech filler and extracts concrete items from a natural voice note', () => {
    const items = parseSmartInput("So I need to get some things for Wednesday. I need to get gifts for my girlfriend. I also need to get some food stuffs and some provisions for the house that's all", monday)
    expect(items.map(item => item.title)).toEqual(['Gifts for girlfriend', 'Foodstuffs', 'Provisions for the house'])
    expect(items.every(item => item.dueDate === '2026-08-19')).toBe(true)
    expect(items.map(item => item.categoryHint)).toEqual(['general', 'groceries', 'groceries'])
  })

  it('distinguishes the nearest Thursday from next Thursday', () => {
    expect(parserInternals.parseDatePhrase('Thursday', monday)).toBe('2026-08-20')
    expect(parserInternals.parseDatePhrase('this Thursday', monday)).toBe('2026-08-20')
    expect(parserInternals.parseDatePhrase('next Thursday', monday)).toBe('2026-08-27')
  })

  it('extracts a simple spoken shopping list without keeping the request language', () => {
    const items = parseSmartInput('I need to buy eggs, pancake mix, and toiletries on Thursday', monday)
    expect(items.map(item => item.title)).toEqual(['Eggs', 'Pancake mix', 'Toiletries'])
    expect(items.every(item => item.dueDate === '2026-08-20')).toBe(true)
    expect(items.every(item => item.categoryHint === 'groceries')).toBe(true)
  })

  it('keeps changed dates attached to the relevant spoken clauses', () => {
    const items = parseSmartInput('I need eggs and bread on Wednesday. Then I need a birthday card and wrapping paper on Thursday', monday)
    expect(items.map(item => [item.title, item.dueDate])).toEqual([
      ['Eggs', '2026-08-19'],
      ['Bread', '2026-08-19'],
      ['Birthday card', '2026-08-20'],
      ['Wrapping paper', '2026-08-20']
    ])
  })

  it('recognises common produce as groceries', () => {
    expect(parseSmartInput('oranges', monday)[0].categoryHint).toBe('groceries')
  })

  it('parses 24-hour and 12-hour clocks', () => {
    expect(parserInternals.parseClock('09:30')).toBe('09:30')
    expect(parserInternals.parseClock('12am')).toBe('00:00')
    expect(parserInternals.parseClock('7pm')).toBe('19:00')
  })
})
