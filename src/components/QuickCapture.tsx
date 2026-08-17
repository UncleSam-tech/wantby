import { useEffect, useRef, useState } from 'react'
import { Check, Mic, Plus, Sparkles, Square, Trash2 } from 'lucide-react'
import type { ParsedWant, WantItem, WantList } from '../types'
import { parseSmartInput } from '../lib/parser'
import { formatShortDate } from '../lib/dates'
import { DEFAULT_LIST_ID } from '../lib/db'

interface SpeechResultLike {
  isFinal: boolean
  0: { transcript: string }
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number
  results: { length: number; [index: number]: SpeechResultLike }
}

interface SpeechRecognitionErrorLike extends Event {
  error: string
}

interface RecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null
}

type RecognitionConstructor = new () => RecognitionLike

function recognitionConstructor(): RecognitionConstructor | undefined {
  const speechWindow = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
}

function suggestedListId(hint: ParsedWant['categoryHint'], lists: WantList[]): string {
  const match = lists.find(list => list.id === hint || list.name.toLowerCase().includes(hint))
  return match?.id ?? lists.find(list => list.id === DEFAULT_LIST_ID)?.id ?? lists[0]?.id ?? DEFAULT_LIST_ID
}

function speechErrorMessage(error: string): string {
  if (error === 'not-allowed' || error === 'service-not-allowed') return 'Microphone blocked. Allow microphone access for WantBy in Chrome, then try again.'
  if (error === 'no-speech') return 'I didn’t hear anything. Tap the microphone and speak a little closer.'
  if (error === 'network') return 'Voice recognition could not connect. Check your connection and try again.'
  if (error === 'language-not-supported') return 'This speech language is unavailable on your phone.'
  return 'Voice capture stopped before it caught your words. Please try again.'
}

export function QuickCapture({ lists, defaultListId = DEFAULT_LIST_ID, onAdd, autoFocus = false }: {
  lists: WantList[]
  defaultListId?: string
  onAdd: (items: WantItem[]) => void
  autoFocus?: boolean
}) {
  const [input, setInput] = useState('')
  const [drafts, setDrafts] = useState<ParsedWant[]>([])
  const [draftListIds, setDraftListIds] = useState<Record<string, string>>({})
  const [listMode, setListMode] = useState(defaultListId === DEFAULT_LIST_ID ? 'auto' : defaultListId)
  const [listening, setListening] = useState(false)
  const [speechMessage, setSpeechMessage] = useState('')
  const [interimSpeech, setInterimSpeech] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<RecognitionLike | null>(null)
  const speechBaseRef = useRef('')
  const speechFinalRef = useRef('')
  const speechTextRef = useRef('')
  const speechFailedRef = useRef(false)
  const SpeechRecognition = recognitionConstructor()

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  useEffect(() => () => recognitionRef.current?.abort(), [])

  const prepareDrafts = (text: string) => {
    const parsed = parseSmartInput(text)
    setDrafts(parsed)
    setDraftListIds(Object.fromEntries(parsed.map(draft => [
      draft.id,
      listMode === 'auto' ? suggestedListId(draft.categoryHint, lists) : listMode
    ])))
    return parsed
  }

  const review = () => prepareDrafts(input)

  const save = () => {
    const now = new Date().toISOString()
    onAdd(drafts.map(draft => ({
      id: draft.id,
      title: draft.title,
      quantity: draft.quantity,
      dueDate: draft.dueDate,
      reminderTime: draft.reminderTime,
      notes: '',
      listId: draftListIds[draft.id] ?? suggestedListId(draft.categoryHint, lists),
      priority: 'normal',
      repeat: 'none',
      completed: false,
      createdAt: now,
      completedAt: null
    })))
    setInput('')
    setDrafts([])
    setDraftListIds({})
    setSpeechMessage('')
    textareaRef.current?.focus()
  }

  const toggleSpeech = () => {
    if (listening) {
      recognitionRef.current?.stop()
      setSpeechMessage('Finishing your voice note…')
      return
    }
    if (!SpeechRecognition) {
      setSpeechMessage('Built-in voice capture needs Chrome on Android. Update Chrome, then reopen WantBy.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = navigator.language?.toLowerCase().startsWith('en') ? navigator.language : 'en-NG'
    speechBaseRef.current = input.trim()
    speechFinalRef.current = ''
    speechTextRef.current = input.trim()
    speechFailedRef.current = false

    recognition.onstart = () => {
      setListening(true)
      setSpeechMessage('Listening… speak naturally. Tap stop when you’re finished.')
    }
    recognition.onresult = event => {
      let interim = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (result.isFinal) speechFinalRef.current += `${result[0].transcript} `
        else interim += result[0].transcript
      }
      const nextText = [speechBaseRef.current, speechFinalRef.current.trim(), interim.trim()].filter(Boolean).join(' ')
      speechTextRef.current = nextText
      setInput(nextText)
      setInterimSpeech(interim.trim())
      setDrafts([])
      setSpeechMessage(interim ? `Hearing: “${interim.trim()}”` : 'Got it—keep speaking, or tap stop to review.')
    }
    recognition.onerror = event => {
      speechFailedRef.current = true
      setSpeechMessage(speechErrorMessage(event.error))
      setListening(false)
      setInterimSpeech('')
    }
    recognition.onend = () => {
      setListening(false)
      setInterimSpeech('')
      recognitionRef.current = null
      if (speechFailedRef.current) return
      const captured = speechTextRef.current.trim()
      if (captured && captured !== speechBaseRef.current) {
        const parsed = prepareDrafts(captured)
        setSpeechMessage(parsed.length ? `${parsed.length} ${parsed.length === 1 ? 'item' : 'items'} found from your voice note.` : 'I heard you, but couldn’t find a specific item. Edit the text and review it.')
      } else {
        setSpeechMessage('I didn’t hear anything. Tap the microphone and try again.')
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      setSpeechMessage('The microphone is already busy. Wait a moment and try again.')
    }
  }

  return (
    <section className="capture-card" aria-labelledby="capture-heading">
      <div className="capture-heading-row">
        <div>
          <span className="eyebrow"><Sparkles size={13} /> Quick capture</span>
          <h2 id="capture-heading">What do you want to get?</h2>
        </div>
        <select className="list-select" value={listMode} onChange={event => { setListMode(event.target.value); setDrafts([]) }} aria-label="Choose how to organise items">
          <option value="auto">Auto organise</option>
          {lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
        </select>
      </div>
      <div className={`capture-input-wrap${listening ? ' is-listening' : ''}`}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={event => { setInput(event.target.value); setDrafts([]); setSpeechMessage('') }}
          onKeyDown={event => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') review()
          }}
          placeholder="Say or type what you need and when you need it"
          rows={3}
          aria-label="Items to add"
        />
        <button className={`icon-button mic-button${listening ? ' active' : ''}`} onClick={toggleSpeech} aria-label={listening ? 'Stop and review voice capture' : 'Start voice capture'} title={listening ? 'Stop and review' : 'Speak your list'}>
          {listening ? <Square size={17} fill="currentColor" /> : <Mic size={20} />}
        </button>
      </div>
      {speechMessage ? <div className={`speech-status${listening ? ' active' : ''}`} role="status">
        {listening ? <span className="voice-bars" aria-hidden="true"><i /><i /><i /><i /></span> : <Mic size={15} />}
        <span>{speechMessage}</span>
        {interimSpeech ? <span className="sr-only">{interimSpeech}</span> : null}
      </div> : null}
      {drafts.length === 0 ? (
        <div className="capture-footer">
          <p>WantBy extracts the items, exact date, and best list before saving.</p>
          <button className="primary-button" onClick={review} disabled={!input.trim() || listening}><Plus size={18} /> Review items</button>
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
                  <div className="draft-meta-row">
                    <span className={`date-chip${draft.dueDate ? '' : ' muted'}`}>{formatShortDate(draft.dueDate)}{draft.reminderTime ? ` · ${draft.reminderTime}` : ''}</span>
                    <select value={draftListIds[draft.id] ?? suggestedListId(draft.categoryHint, lists)} onChange={event => setDraftListIds(current => ({ ...current, [draft.id]: event.target.value }))} aria-label={`List for ${draft.title}`}>
                      {lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
                    </select>
                  </div>
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
