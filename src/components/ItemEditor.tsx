import { CalendarPlus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Priority, RepeatRule, WantItem, WantList } from '../types'
import { downloadCalendar } from '../lib/calendar'

export function ItemEditor({ item, lists, onSave, onDelete, onClose }: {
  item: WantItem | null
  lists: WantList[]
  onSave: (item: WantItem) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<WantItem | null>(item)
  useEffect(() => setDraft(item), [item])
  if (!draft) return null

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="editor-sheet" role="dialog" aria-modal="true" aria-labelledby="editor-heading">
        <header className="sheet-header"><div><span className="eyebrow">Item details</span><h2 id="editor-heading">Plan the purchase</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></header>
        <div className="form-stack">
          <label><span>Name</span><input value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} autoFocus /></label>
          <div className="form-grid two">
            <label><span>Need by</span><input type="date" value={draft.dueDate ?? ''} onChange={event => setDraft({ ...draft, dueDate: event.target.value || null })} /></label>
            <label><span>Reminder time</span><input type="time" value={draft.reminderTime ?? ''} onChange={event => setDraft({ ...draft, reminderTime: event.target.value || null })} disabled={!draft.dueDate} /></label>
          </div>
          <div className="form-grid two">
            <label><span>List</span><select value={draft.listId} onChange={event => setDraft({ ...draft, listId: event.target.value })}>{lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}</select></label>
            <label><span>Quantity</span><input value={draft.quantity} onChange={event => setDraft({ ...draft, quantity: event.target.value })} placeholder="e.g. 2 packs" /></label>
          </div>
          <div className="form-grid two">
            <label><span>Repeat</span><select value={draft.repeat} onChange={event => setDraft({ ...draft, repeat: event.target.value as RepeatRule })}><option value="none">Does not repeat</option><option value="weekly">Every week</option><option value="monthly">Every month</option></select></label>
            <label><span>Priority</span><select value={draft.priority} onChange={event => setDraft({ ...draft, priority: event.target.value as Priority })}><option value="normal">Normal</option><option value="important">Important</option></select></label>
          </div>
          <label><span>Notes</span><textarea value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} rows={3} placeholder="Brand, colour, size, store…" /></label>
        </div>
        {draft.dueDate ? <button className="secondary-button wide" onClick={() => downloadCalendar([draft], `wantby-${draft.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)}><CalendarPlus size={18} /> Add reminder to calendar</button> : null}
        <div className="sheet-actions">
          <button className="danger-button" onClick={() => { onDelete(draft.id); onClose() }}><Trash2 size={17} /> Delete</button>
          <button className="primary-button" disabled={!draft.title.trim()} onClick={() => { onSave({ ...draft, title: draft.title.trim() }); onClose() }}>Save changes</button>
        </div>
      </section>
    </div>
  )
}
