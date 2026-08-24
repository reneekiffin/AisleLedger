import { useCallback, useEffect, useRef, useState } from 'react'
import { useSaveStatus } from '../state/SaveStatus'

export const AUTOSAVE_DELAY = 500

/**
 * Local-first field editing: the input updates instantly, the write lands
 * ~500ms after typing stops.
 *
 * @param {any} initial          value from the database
 * @param {(value:any)=>Promise} commit  persists the value
 * @returns {[any, (value:any)=>void, ()=>Promise<void>]} value, setter, flush
 */
export function useAutosaveField(initial, commit, delay = AUTOSAVE_DELAY) {
  const { track } = useSaveStatus()
  const [value, setValue] = useState(initial)
  const timer = useRef(null)
  const dirty = useRef(false)
  const latest = useRef(initial)
  const commitRef = useRef(commit)
  commitRef.current = commit

  // Adopt changes made elsewhere (another screen, an import) unless the user
  // is mid-edit on this field.
  useEffect(() => {
    if (!dirty.current) {
      setValue(initial)
      latest.current = initial
    }
  }, [initial])

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    if (!dirty.current) return
    dirty.current = false
    await track(() => commitRef.current(latest.current))
  }, [track])

  const update = useCallback(
    (next) => {
      setValue(next)
      latest.current = next
      dirty.current = true
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        dirty.current = false
        track(() => commitRef.current(latest.current))
      }, delay)
    },
    [delay, track],
  )

  // Never lose a pending edit to a navigation or a backgrounded tab.
  useEffect(() => {
    const onHide = () => {
      if (dirty.current) {
        dirty.current = false
        clearTimeout(timer.current)
        track(() => commitRef.current(latest.current))
      }
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
      onHide()
    }
  }, [track])

  return [value, update, flush]
}

/** Immediate (non-debounced) mutation that still drives the Saved ✓ badge. */
export function useTrackedAction() {
  const { track } = useSaveStatus()
  return useCallback((work) => track(work), [track])
}
