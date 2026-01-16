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
  const el = document.getElementById('boot-splash')
  if (!el) return

  if (bootSplashHideScheduled) return
  bootSplashHideScheduled = true

  // Ensure a minimum dwell so the animation reads as intentional.
  const minMs = 3000
  const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - bootStart
  const remaining = Math.max(0, minMs - elapsed)

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
  }, remaining)
}

// Hide when the app signals it's ready (auth init complete).
window.addEventListener('lifesync:app:ready', hideBootSplash, { once: true })

// Fallback: never block longer than a few seconds.
window.setTimeout(hideBootSplash, 6500)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
