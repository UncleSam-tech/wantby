import { useEffect, useRef, useState } from 'react'
import { Check, Mic, MicOff, Plus, Sparkles, Trash2 } from 'lucide-react'
import type { ParsedWant, WantItem, WantList } from '../types'
import { parseSmartInput } from '../lib/parser'
import { formatShortDate } from '../lib/dates'
import { DEFAULT_LIST_ID } from '../lib/db'

interface SpeechRecognitionEventLike extends Event {
  results: { [index: number]: { [index: number]: { transcript: string } } }
}

interface RecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

type RecognitionConstructor = new () => RecognitionLike

function recognitionConstructor(): RecognitionConstructor | undefined {
  const speechWindow = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
}

export function QuickCapture({ lists, defaultListId = DEFAULT_LIST_ID, onAdd, autoFocus = false }: {
  lists: WantList[]
  defaultListId?: string
  onAdd: (items: WantItem[]) => void
  autoFocus?: boolean
}) {
  const [input, setInput] = useState('')
  const [drafts, setDrafts] = useState<ParsedWant[]>([])
  const [listId, setListId] = useState(defaultListId)
  const [listening, setListening] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<RecognitionLike | null>(null)
  const SpeechRecognition = recognitionConstructor()

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  const review = () => {
    const parsed = parseSmartInput(input)
    if (parsed.length) setDrafts(parsed)
  }

  const save = () => {
    const now = new Date().toISOString()
    onAdd(drafts.map(draft => ({
      id: draft.id,
      title: draft.title,
      quantity: draft.quantity,
      dueDate: draft.dueDate,
      reminderTime: draft.reminderTime,
      notes: '',
      listId,
      priority: 'normal',
      repeat: 'none',
      completed: false,
      createdAt: now,
      completedAt: null
    })))
    setInput('')
    setDrafts([])
    textareaRef.current?.focus()
  }

  const toggleSpeech = () => {
    if (!SpeechRecognition) return
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-NG'
    recognition.onresult = event => setInput(current => `${current}${current ? ' ' : ''}${event.results[0][0].transcript}`)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  return (
    <section className="capture-card" aria-labelledby="capture-heading">
      <div className="capture-heading-row">
        <div>
          <span className="eyebrow"><Sparkles size={13} /> Quick capture</span>
          <h2 id="capture-heading">What do you want to get?</h2>
        </div>
        <select className="list-select" value={listId} onChange={event => setListId(event.target.value)} aria-label="Choose list">
          {lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
        </select>
      </div>
      <div className="capture-input-wrap">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={event => { setInput(event.target.value); setDrafts([]) }}
          onKeyDown={event => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') review()
          }}
          placeholder="Try “charger, toothpaste and new shoes by Wednesday”"
          rows={3}
          aria-label="Items to add"
        />
        <button className={`icon-button mic-button${listening ? ' active' : ''}`} onClick={toggleSpeech} disabled={!SpeechRecognition} aria-label={SpeechRecognition ? (listening ? 'Stop listening' : 'Add by voice') : 'Voice input is unavailable in this browser'} title={SpeechRecognition ? 'Add by voice' : 'Use your keyboard microphone'}>
          {listening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
      </div>
      {drafts.length === 0 ? (
        <div className="capture-footer">
          <p>Dates and separate items are detected on your phone.</p>
          <button className="primary-button" onClick={review} disabled={!input.trim()}><Plus size={18} /> Review items</button>
        </div>
      ) : (
        <div className="review-panel">
          <div className="review-title"><span>{drafts.length} {drafts.length === 1 ? 'item' : 'items'} found</span><button className="text-button" onClick={() => setDrafts([])}>Edit sentence</button></div>
          <div className="draft-list">
            {drafts.map((draft, index) => (
              <div className="draft-row" key={draft.id}>
                <span className="draft-number">{index + 1}</span>
                <div className="draft-fields">
                  <input value={draft.title} onChange={event => setDrafts(current => current.map(value => value.id === draft.id ? { ...value, title: event.target.value } : value))} aria-label={`Item ${index + 1} name`} />
                  <span className={`date-chip${draft.dueDate ? '' : ' muted'}`}>{formatShortDate(draft.dueDate)}{draft.reminderTime ? ` · ${draft.reminderTime}` : ''}</span>
                </div>
                <button className="icon-button small" onClick={() => setDrafts(current => current.filter(value => value.id !== draft.id))} aria-label={`Remove ${draft.title}`}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          <button className="primary-button wide" onClick={save} disabled={!drafts.length || drafts.some(draft => !draft.title.trim())}><Check size={18} /> Add to WantBy</button>
        </div>
      )}
    </section>
  )
}
