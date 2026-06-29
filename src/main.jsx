import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Register service worker (enables install as an app + offline use).
// Auto-reload once when a new version takes control, so deploys land without
// the user having to clear cache or hard-refresh.
if ('serviceWorker' in navigator) {
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    // Only reload if a controller already existed (i.e. this is an update, not first install)
    if (navigator.serviceWorker.controller) {
      refreshing = true
      window.location.reload()
    }
  })
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Check for updates each load
      reg.update?.()
    }).catch((err) => {
      console.warn('SW registration failed:', err)
    })
  })
}
