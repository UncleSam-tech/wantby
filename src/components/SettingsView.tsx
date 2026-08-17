import { Bell, CalendarPlus, Check, Database, Download, HardDrive, Moon, Smartphone, Sun, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { AppState } from '../types'
import { exportBackup, readBackup } from '../lib/backup'
import { downloadCalendar } from '../lib/calendar'
import { requestPersistentStorage, storageIsPersistent } from '../lib/db'
import { requestNotificationPermission } from '../lib/notifications'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function SettingsView({ state, onReplace, onPreferences, installPrompt }: {
  state: AppState
  onReplace: (state: AppState) => void
  onPreferences: (patch: Partial<AppState['preferences']>) => void
  installPrompt: BeforeInstallPromptEvent | null
}) {
  const [persistent, setPersistent] = useState(false)
  const [message, setMessage] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => { void storageIsPersistent().then(setPersistent) }, [])

  const enableStorage = async () => {
    const granted = await requestPersistentStorage()
    setPersistent(granted)
    setMessage(granted ? 'Persistent storage is enabled.' : 'Your browser kept storage in standard mode. Backups are still available.')
  }

  const enableNotifications = async () => {
    const granted = await requestNotificationPermission()
    onPreferences({ notificationsEnabled: granted })
    setMessage(granted ? 'Active-app reminders are enabled.' : 'Notification permission was not granted.')
  }

  const importFile = async (file?: File) => {
    if (!file) return
    try {
      onReplace(await readBackup(file))
      setMessage('Backup restored successfully.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not restore this backup.')
    }
  }

  return (
    <div className="settings-stack">
      <section className="settings-card install-card">
        <span className="settings-icon"><Smartphone size={20} /></span>
        <div><h2>Install WantBy</h2><p>Add it to your Android home screen for a standalone, offline experience.</p></div>
        <button className="primary-button" onClick={() => installPrompt ? void installPrompt.prompt() : setMessage('In Chrome, open the menu and choose “Install app” or “Add to Home screen”.')}>{installPrompt ? 'Install app' : 'Show instructions'}</button>
      </section>

      <section className="settings-card">
        <div className="settings-heading"><span className="settings-icon"><Database size={20} /></span><div><h2>Device storage</h2><p>Your lists stay in this browser on this device.</p></div></div>
        <div className="settings-row"><div><strong>Persistent storage</strong><span>Helps protect your data during storage cleanup.</span></div><button className="secondary-button compact" onClick={enableStorage} disabled={persistent}>{persistent ? <><Check size={16} /> Enabled</> : <><HardDrive size={16} /> Enable</>}</button></div>
        <div className="settings-row"><div><strong>Backup</strong><span>Export before changing phones or clearing browser data.</span></div><div className="button-pair"><button className="secondary-button compact" onClick={() => exportBackup(state)}><Download size={16} /> Export</button><button className="secondary-button compact" onClick={() => importRef.current?.click()}><Upload size={16} /> Import</button><input ref={importRef} hidden type="file" accept="application/json" onChange={event => void importFile(event.target.files?.[0])} /></div></div>
      </section>

      <section className="settings-card">
        <div className="settings-heading"><span className="settings-icon"><Bell size={20} /></span><div><h2>Reminders</h2><p>Closed-app alerts are handed to your device calendar.</p></div></div>
        <div className="settings-row"><div><strong>Active-app notifications</strong><span>Shown when WantBy is open or active.</span></div><button className="secondary-button compact" onClick={enableNotifications} disabled={state.preferences.notificationsEnabled}>{state.preferences.notificationsEnabled ? <><Check size={16} /> Enabled</> : 'Enable'}</button></div>
        <div className="settings-row"><div><strong>Calendar reminders</strong><span>Export every active dated item with a 30-minute alert.</span></div><button className="secondary-button compact" onClick={() => setMessage(downloadCalendar(state.items, 'wantby-all-reminders') ? 'Calendar file downloaded. Open it to add the reminders.' : 'Add a due date to an item first.')}><CalendarPlus size={16} /> Export</button></div>
      </section>

      <section className="settings-card">
        <div className="settings-heading"><span className="settings-icon">{state.preferences.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}</span><div><h2>Appearance</h2><p>Keep the interface comfortable in any light.</p></div></div>
        <div className="segmented-control" role="group" aria-label="Theme">
          {(['light', 'dark', 'system'] as const).map(theme => <button key={theme} className={state.preferences.theme === theme ? 'active' : ''} onClick={() => onPreferences({ theme })}>{theme}</button>)}
        </div>
      </section>
      {message ? <div className="settings-message" role="status">{message}</div> : null}
      <p className="settings-footnote">WantBy 1.0 · Private by design · No account, no cloud, no tracking.</p>
    </div>
  )
}
