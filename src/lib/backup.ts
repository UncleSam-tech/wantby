import type { AppState } from '../types'

export function exportBackup(state: AppState): void {
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), app: 'WantBy', data: state }, null, 2)
  const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `wantby-backup-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function readBackup(file: File): Promise<AppState> {
  const parsed = JSON.parse(await file.text()) as { data?: AppState } | AppState
  const state = 'data' in parsed && parsed.data ? parsed.data : parsed as AppState
  if (state.version !== 1 || !Array.isArray(state.items) || !Array.isArray(state.lists) || !state.preferences) {
    throw new Error('This does not look like a WantBy backup.')
  }
  return state
}
