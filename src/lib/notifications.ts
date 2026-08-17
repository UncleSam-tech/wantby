import type { WantItem } from '../types'
import { todayKey } from './dates'

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export function checkActiveReminders(items: WantItem[]): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  for (const item of items) {
    if (item.completed || item.dueDate !== todayKey() || !item.reminderTime) continue
    const [hour, minute] = item.reminderTime.split(':').map(Number)
    if (Math.abs(currentMinutes - (hour * 60 + minute)) > 1) continue
    const key = `wantby-notified:${item.id}:${item.dueDate}:${item.reminderTime}`
    if (localStorage.getItem(key)) continue
    localStorage.setItem(key, '1')
    navigator.serviceWorker?.ready
      .then(registration => registration.showNotification(`Time to get ${item.title}`, {
        body: 'This reminder works while WantBy is active. Add it to your calendar for closed-app alerts.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: key
      }))
      .catch(() => new Notification(`Time to get ${item.title}`))
  }
}
