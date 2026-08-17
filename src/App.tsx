import { useEffect, useMemo, useState } from 'react'
import { Archive, CalendarDays, Check, ChevronRight, ListChecks, Plus, RotateCcw, Settings, SunMedium } from 'lucide-react'
import type { ViewName, WantItem, WantList } from './types'
import { Logo } from './components/Logo'
import { QuickCapture } from './components/QuickCapture'
import { ItemCard } from './components/ItemCard'
import { ItemEditor } from './components/ItemEditor'
import { CalendarView } from './components/CalendarView'
import { SettingsView } from './components/SettingsView'
import { useWantByData } from './hooks/useWantByData'
import { addDays, formatFullDate, relativeDayLabel, todayKey } from './lib/dates'
import { checkActiveReminders } from './lib/notifications'
import './app.css'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const NAV_ITEMS: { id: ViewName; label: string; icon: typeof SunMedium }[] = [
  { id: 'today', label: 'Today', icon: SunMedium },
  { id: 'lists', label: 'Lists', icon: ListChecks },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'settings', label: 'Settings', icon: Settings }
]

function sortItems(items: WantItem[]) {
  return [...items].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === 'important' ? -1 : 1
    return (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99') || b.createdAt.localeCompare(a.createdAt)
  })
}

function Section({ title, count, items, lists, onToggle, onOpen, tone }: {
  title: string
  count: number
  items: WantItem[]
  lists: WantList[]
  onToggle: (item: WantItem) => void
  onOpen: (item: WantItem) => void
  tone?: 'urgent'
}) {
  if (!items.length) return null
  return <section className="items-section"><div className="section-label"><span className={tone === 'urgent' ? 'urgent-text' : ''}>{title}</span><i>{count}</i></div><div className="item-list">{items.map(item => <ItemCard key={item.id} item={item} list={lists.find(list => list.id === item.listId)} onToggle={onToggle} onOpen={onOpen} />)}</div></section>
}

export default function App() {
  const { state, ready, setState, addItems, updateItem, deleteItem, setCompleted, addList, replaceState } = useWantByData()
  const initialView = new URLSearchParams(location.search).get('view') as ViewName | null
  const [view, setView] = useState<ViewName>(NAV_ITEMS.some(item => item.id === initialView) ? initialView! : 'today')
  const [editorItem, setEditorItem] = useState<WantItem | null>(null)
  const [captureOpen, setCaptureOpen] = useState(new URLSearchParams(location.search).get('capture') === '1')
  const [completedOpen, setCompletedOpen] = useState(false)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [undoItem, setUndoItem] = useState<WantItem | null>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const theme = state.preferences.theme
    const resolved = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme
    root.dataset.theme = resolved
  }, [state.preferences.theme])

  useEffect(() => {
    if (!state.preferences.notificationsEnabled) return
    checkActiveReminders(state.items)
    const timer = window.setInterval(() => checkActiveReminders(state.items), 60_000)
    return () => window.clearInterval(timer)
  }, [state.items, state.preferences.notificationsEnabled])

  const active = useMemo(() => sortItems(state.items.filter(item => !item.completed)), [state.items])
  const completed = useMemo(() => state.items.filter(item => item.completed).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')), [state.items])
  const overdue = active.filter(item => relativeDayLabel(item.dueDate) === 'overdue')
  const dueToday = active.filter(item => relativeDayLabel(item.dueDate) === 'today')
  const upcoming = active.filter(item => item.dueDate && item.dueDate > todayKey() && item.dueDate <= addDays(todayKey(), 7))
  const later = active.filter(item => !overdue.includes(item) && !dueToday.includes(item) && !upcoming.includes(item))

  const toggleItem = (item: WantItem) => {
    setCompleted(item.id, !item.completed)
    if (!item.completed) {
      setUndoItem(item)
      window.setTimeout(() => setUndoItem(current => current?.id === item.id ? null : current), 5000)
    }
  }

  const createList = () => {
    const name = window.prompt('Name this list')?.trim()
    if (!name) return
    addList({ id: crypto.randomUUID(), name, color: ['#1d6b52', '#d28a2f', '#7c64a6', '#b85c4c'][state.lists.length % 4], createdAt: new Date().toISOString() })
  }

  if (!ready) return <main className="loading-screen"><Logo /><span>Opening your list…</span></main>

  return (
    <div className="app-frame">
      <header className="topbar">
        <Logo />
        <div className="topbar-meta"><span>{formatFullDate(todayKey())}</span><button className="topbar-avatar" onClick={() => setView('settings')} aria-label="Open settings">W</button></div>
      </header>

      <main className="main-content">
        {view === 'today' ? <>
          <section className="hero-summary">
            <div><span className="eyebrow">Your next seven days</span><h1>{dueToday.length || overdue.length ? `${dueToday.length + overdue.length} ${dueToday.length + overdue.length === 1 ? 'thing needs' : 'things need'} attention` : 'You’re clear for today'}</h1><p>{active.length ? `${active.length} active ${active.length === 1 ? 'item' : 'items'} across ${state.lists.length} lists.` : 'Capture the next thing before it slips away.'}</p></div>
            <div className="progress-orbit"><strong>{dueToday.length + overdue.length}</strong><span>now</span></div>
          </section>
          <QuickCapture lists={state.lists} onAdd={items => { addItems(items); setCaptureOpen(false) }} />
          {active.length ? <div className="sections-stack">
            <Section title="Overdue" count={overdue.length} items={overdue} lists={state.lists} onToggle={toggleItem} onOpen={setEditorItem} tone="urgent" />
            <Section title="Today" count={dueToday.length} items={dueToday} lists={state.lists} onToggle={toggleItem} onOpen={setEditorItem} />
            <Section title="Next 7 days" count={upcoming.length} items={upcoming} lists={state.lists} onToggle={toggleItem} onOpen={setEditorItem} />
            <Section title="Later & someday" count={later.length} items={later} lists={state.lists} onToggle={toggleItem} onOpen={setEditorItem} />
          </div> : <div className="empty-state"><span className="empty-check"><Check size={30} /></span><h2>Nothing waiting on you</h2><p>Type or say what you want, include a date if you have one, and WantBy will organise it.</p></div>}
          {completed.length ? <section className="completed-section"><button className="completed-toggle" onClick={() => setCompletedOpen(value => !value)}><span><Archive size={18} /> Completed</span><span>{completed.length}<ChevronRight className={completedOpen ? 'rotated' : ''} size={18} /></span></button>{completedOpen ? <div className="item-list completed-list">{completed.map(item => <ItemCard key={item.id} item={item} list={state.lists.find(list => list.id === item.listId)} onToggle={toggleItem} onOpen={setEditorItem} />)}</div> : null}</section> : null}
        </> : null}

        {view === 'lists' ? <div className="view-stack">
          <div className="page-heading"><div><span className="eyebrow">Everything, in its place</span><h1>Your lists</h1><p>Keep purchases separate without losing the bigger picture.</p></div><button className="secondary-button compact" onClick={createList}><Plus size={17} /> New list</button></div>
          <div className="list-grid">{state.lists.map(list => {
            const count = active.filter(item => item.listId === list.id).length
            const due = active.filter(item => item.listId === list.id && item.dueDate && item.dueDate <= todayKey()).length
            return <button key={list.id} className={`list-card${selectedListId === list.id ? ' active' : ''}`} onClick={() => setSelectedListId(current => current === list.id ? null : list.id)}><span className="list-color" style={{ backgroundColor: list.color }} /><span><strong>{list.name}</strong><small>{count} active{due ? ` · ${due} due` : ''}</small></span><ChevronRight size={19} /></button>
          })}</div>
          <section className="items-section"><div className="section-label"><span>{selectedListId ? state.lists.find(list => list.id === selectedListId)?.name : 'All active items'}</span><i>{selectedListId ? active.filter(item => item.listId === selectedListId).length : active.length}</i></div><div className="item-list">{active.filter(item => !selectedListId || item.listId === selectedListId).map(item => <ItemCard key={item.id} item={item} list={state.lists.find(list => list.id === item.listId)} onToggle={toggleItem} onOpen={setEditorItem} />)}</div></section>
        </div> : null}

        {view === 'calendar' ? <CalendarView items={state.items} lists={state.lists} onToggle={toggleItem} onOpen={setEditorItem} /> : null}
        {view === 'settings' ? <><div className="page-heading"><div><span className="eyebrow">Local and private</span><h1>Settings</h1><p>Control installation, storage, reminders, and backups.</p></div></div><SettingsView state={state} onReplace={replaceState} onPreferences={patch => setState(current => ({ ...current, preferences: { ...current.preferences, ...patch } }))} installPrompt={installPrompt} /></> : null}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {NAV_ITEMS.map(nav => { const Icon = nav.icon; return <button key={nav.id} className={view === nav.id ? 'active' : ''} onClick={() => setView(nav.id)}><Icon size={21} /><span>{nav.label}</span></button> })}
      </nav>
      <button className="floating-add" onClick={() => setCaptureOpen(true)} aria-label="Add something"><Plus size={26} /></button>

      {captureOpen ? <div className="modal-backdrop capture-modal" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setCaptureOpen(false) }}><div className="capture-sheet"><button className="sheet-close-text" onClick={() => setCaptureOpen(false)}>Close</button><QuickCapture lists={state.lists} onAdd={items => { addItems(items); setCaptureOpen(false) }} autoFocus /></div></div> : null}
      <ItemEditor item={editorItem} lists={state.lists} onSave={updateItem} onDelete={deleteItem} onClose={() => setEditorItem(null)} />
      {undoItem ? <div className="toast" role="status"><span>Marked “{undoItem.title}” as obtained.</span><button onClick={() => { setCompleted(undoItem.id, false); setUndoItem(null) }}><RotateCcw size={15} /> Undo</button></div> : null}
    </div>
  )
}
