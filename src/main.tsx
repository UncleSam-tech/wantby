import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/dm-sans/wght.css'
import '@fontsource-variable/manrope/wght.css'
import App from './App'

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh: () => void updateServiceWorker(true)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
