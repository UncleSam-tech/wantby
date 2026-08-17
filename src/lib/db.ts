import type { AppState } from '../types'

const DB_NAME = 'wantby-db'
const STORE_NAME = 'app-state'
const STATE_KEY = 'current'

export const DEFAULT_LIST_ID = 'general'

export function defaultState(): AppState {
  const now = new Date().toISOString()
  return {
    version: 1,
    items: [],
    lists: [
      { id: DEFAULT_LIST_ID, name: 'General', color: '#1d6b52', createdAt: now },
      { id: 'home', name: 'Home', color: '#d28a2f', createdAt: now },
      { id: 'groceries', name: 'Groceries', color: '#7c64a6', createdAt: now }
    ],
    preferences: { theme: 'system', notificationsEnabled: false }
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadState(): Promise<AppState> {
  if (!('indexedDB' in window)) return defaultState()
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(STATE_KEY)
    request.onsuccess = () => resolve((request.result as AppState | undefined) ?? defaultState())
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => db.close()
  })
}

export async function saveState(state: AppState): Promise<void> {
  if (!('indexedDB' in window)) return
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(state, STATE_KEY)
    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  return navigator.storage.persist()
}

export async function storageIsPersistent(): Promise<boolean> {
  if (!navigator.storage?.persisted) return false
  return navigator.storage.persisted()
}
