import { useEffect, useState } from 'react'

/**
 * Real offline status, not a decorative toggle.
 *
 * Reports whether the service worker has actually cached the app, how many
 * files it holds, and whether the browser will let us offer an install. All of
 * it is read from the live Cache Storage and registration — if the worker
 * hasn't cached anything, the screen says so rather than claiming otherwise.
 */
export function useOffline() {
  const [state, setState] = useState({
    ready: false,
    files: 0,
    installed: false,
    canInstall: false,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
  })
  const [prompt, setPrompt] = useState(null)

  useEffect(() => {
    let alive = true

    async function read() {
      let files = 0
      let ready = false
      try {
        if ('caches' in window) {
          const keys = await caches.keys()
          for (const k of keys) {
            files += (await caches.open(k).then((c) => c.keys())).length
          }
          ready = files > 0
        }
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations()
          ready = ready && regs.some((r) => r.active)
        } else {
          ready = false
        }
      } catch {
        /* storage blocked — reported as not ready, which is the truth */
      }
      // display-mode standalone means it was added to the home screen
      const installed =
        window.matchMedia?.('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
      if (alive) setState((s) => ({ ...s, ready, files, installed }))
    }

    read()

    const onPrompt = (e) => {
      e.preventDefault()
      setPrompt(e)
      setState((s) => ({ ...s, canInstall: true }))
    }
    const onInstalled = () => setState((s) => ({ ...s, installed: true, canInstall: false }))
    const onOnline = () => setState((s) => ({ ...s, online: true }))
    const onOffline = () => setState((s) => ({ ...s, online: false }))

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      alive = false
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  async function install() {
    if (!prompt) return
    prompt.prompt()
    await prompt.userChoice
    setPrompt(null)
    setState((s) => ({ ...s, canInstall: false }))
  }

  return { ...state, install }
}
