import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const bootStart = typeof performance !== 'undefined' ? performance.now() : Date.now()

function startBootSplashTextRotation() {
  const el = document.getElementById('boot-splash-sub')
  if (!el) return () => {}

  const phases = [
    'Preparing your space…',
    'Syncing your day…',
    'Almost done…',
  ]

  let idx = 0
  el.textContent = phases[idx]

  const timers = []

  // Move through the next two phases, then keep the last message.
  timers.push(
    window.setTimeout(() => {
      idx = 1
      el.textContent = phases[idx]
    }, 1100)
  )

  timers.push(
    window.setTimeout(() => {
      idx = 2
      el.textContent = phases[idx]
    }, 2300)
  )

  return () => {
    for (const t of timers) window.clearTimeout(t)
  }
}

const stopBootText = startBootSplashTextRotation()

let bootSplashHideScheduled = false

function hideBootSplash() {
  window.__lifesync_ready = true
  if (typeof window.__lifesync_cancel_splash === 'function') {
    window.__lifesync_cancel_splash()
  }

  const el = document.getElementById('boot-splash')
  if (!el) return

  if (bootSplashHideScheduled) return
  bootSplashHideScheduled = true

  // If it's already showing, fade it out. If not, it won't show at all.
  window.setTimeout(() => {
    try {
      stopBootText()
    } catch {
      // ignore
    }

    el.classList.add('hide')
    window.setTimeout(() => {
      try {
        el.remove()
      } catch {
        // ignore
      }
    }, 650)
  }, 0)
}

// Hide when the app signals it's ready (auth init complete).
window.addEventListener('lifesync:app:ready', hideBootSplash, { once: true })

// Fallback: never block longer than a few seconds.
window.setTimeout(hideBootSplash, 5000)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
