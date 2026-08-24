import { useCallback, useEffect, useState } from 'react'

export function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export function isIos() {
  const ua = window.navigator.userAgent
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as a Mac; the touch points give it away.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function isIosSafari() {
  if (!isIos()) return false
  const ua = window.navigator.userAgent
  // Chrome (CriOS), Firefox (FxiOS) and Edge (EdgiOS) on iOS can't add to the
  // home screen at all — only Safari's share sheet has the option.
  return !/CriOS|FxiOS|EdgiOS|OPiOS|mercury/.test(ua)
}

/**
 * Android/Chrome fires `beforeinstallprompt`, which we stash so the Install
 * screen can offer a real one-tap install. iOS fires nothing, so the same
 * screen falls back to the Share → Add to Home Screen walkthrough.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(() => isStandalone())

  useEffect(() => {
    const onBeforeInstall = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }
    const onInstalled = () => {
      setDeferredPrompt(null)
      setInstalled(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    const media = window.matchMedia?.('(display-mode: standalone)')
    const onDisplayChange = (e) => setInstalled(e.matches)
    media?.addEventListener?.('change', onDisplayChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      media?.removeEventListener?.('change', onDisplayChange)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable'
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
    return outcome
  }, [deferredPrompt])

  return {
    canPrompt: !!deferredPrompt,
    promptInstall,
    installed,
    ios: isIos(),
    iosSafari: isIosSafari(),
  }
}
