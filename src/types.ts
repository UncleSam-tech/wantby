export type ViewName = 'today' | 'lists' | 'calendar' | 'settings'

export type RepeatRule = 'none' | 'weekly' | 'monthly'

export type Priority = 'normal' | 'important'

export interface WantItem {
  id: string
  title: string
  notes: string
  quantity: string
  dueDate: string | null
  reminderTime: string | null
  listId: string
  priority: Priority
  repeat: RepeatRule
  completed: boolean
  createdAt: string
  completedAt: string | null
}

export interface WantList {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface Preferences {
  theme: 'light' | 'dark' | 'system'
  notificationsEnabled: boolean
}

export interface AppState {
  version: 1
  items: WantItem[]
  lists: WantList[]
  preferences: Preferences
}

export interface ParsedWant {
  id: string
  title: string
  quantity: string
  dueDate: string | null
  reminderTime: string | null
}
