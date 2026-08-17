import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppState, WantItem, WantList } from '../types'
import { defaultState, loadState, saveState } from '../lib/db'
import { addDays, addMonths } from '../lib/dates'

export function useWantByData() {
  const [state, setState] = useState<AppState>(() => defaultState())
  const [ready, setReady] = useState(false)
  const saveTimer = useRef<number | null>(null)

  useEffect(() => {
    loadState().then(value => {
      setState(value)
      setReady(true)
    }).catch(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!ready) return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => void saveState(state), 120)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [ready, state])

  const addItems = useCallback((items: WantItem[]) => {
    setState(current => ({ ...current, items: [...items, ...current.items] }))
  }, [])

  const updateItem = useCallback((item: WantItem) => {
    setState(current => ({ ...current, items: current.items.map(value => value.id === item.id ? item : value) }))
  }, [])

  const deleteItem = useCallback((id: string) => {
    setState(current => ({ ...current, items: current.items.filter(value => value.id !== id) }))
  }, [])

  const setCompleted = useCallback((id: string, completed: boolean) => {
    setState(current => {
      const item = current.items.find(value => value.id === id)
      if (!item) return current
      const now = new Date().toISOString()
      const updated = current.items.map(value => value.id === id ? { ...value, completed, completedAt: completed ? now : null } : value)
      if (!completed || item.repeat === 'none' || !item.dueDate) return { ...current, items: updated }
      const nextDueDate = item.repeat === 'weekly' ? addDays(item.dueDate, 7) : addMonths(item.dueDate, 1)
      const nextItem: WantItem = { ...item, id: crypto.randomUUID(), dueDate: nextDueDate, completed: false, completedAt: null, createdAt: now }
      return { ...current, items: [nextItem, ...updated] }
    })
  }, [])

  const addList = useCallback((list: WantList) => {
    setState(current => ({ ...current, lists: [...current.lists, list] }))
  }, [])

  const replaceState = useCallback((next: AppState) => setState(next), [])

  return { state, ready, setState, addItems, updateItem, deleteItem, setCompleted, addList, replaceState }
}
