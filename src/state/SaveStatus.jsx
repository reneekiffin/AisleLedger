import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const SaveStatusContext = createContext(null)

/**
 * Tracks in-flight writes so the header can show "Saving…" → "Saved ✓".
 * Every mutation in the app goes through `track()`.
 */
export function SaveStatusProvider({ children }) {
  const [status, setStatus] = useState('idle') // idle | saving | saved | error
  const pending = useRef(0)
  const timer = useRef(null)

  const track = useCallback(async (work) => {
    pending.current += 1
    setStatus('saving')
    clearTimeout(timer.current)
    try {
      const result = await (typeof work === 'function' ? work() : work)
      pending.current -= 1
      if (pending.current === 0) {
        setStatus('saved')
        // Fade the badge back out once the user has had time to see it.
        timer.current = setTimeout(() => setStatus('idle'), 2200)
      }
      return result
    } catch (error) {
      pending.current = Math.max(0, pending.current - 1)
      setStatus('error')
      console.error('[aisle-ledger] save failed', error)
      throw error
    }
  }, [])

  const value = useMemo(() => ({ status, track }), [status, track])
  return <SaveStatusContext.Provider value={value}>{children}</SaveStatusContext.Provider>
}

export function useSaveStatus() {
  const ctx = useContext(SaveStatusContext)
  if (!ctx) throw new Error('useSaveStatus must be used inside <SaveStatusProvider>')
  return ctx
}
