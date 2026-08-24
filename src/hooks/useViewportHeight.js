import { useEffect } from 'react'

/**
 * iOS Safari's `100vh` includes the URL bar, and the on-screen keyboard
 * shrinks the *visual* viewport without changing the layout viewport — so a
 * full-height app either overflows or hides its own bottom bar.
 *
 * This mirrors the real visible height into `--app-height`, and the amount of
 * the viewport the keyboard is covering into `--kb-inset`, so the bottom tab
 * bar can lift out of the way while typing.
 */
export function useViewportHeight() {
  useEffect(() => {
    const vv = window.visualViewport

    const apply = () => {
      const height = vv?.height ?? window.innerHeight
      document.documentElement.style.setProperty('--app-height', `${height}px`)

      // How much of the layout viewport the keyboard is eating.
      const inset = Math.max(0, window.innerHeight - height - (vv?.offsetTop ?? 0))
      document.documentElement.style.setProperty('--kb-inset', `${Math.round(inset)}px`)
      document.documentElement.classList.toggle('keyboard-open', inset > 120)
    }

    apply()
    vv?.addEventListener('resize', apply)
    vv?.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)
    window.addEventListener('orientationchange', apply)
    return () => {
      vv?.removeEventListener('resize', apply)
      vv?.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
      window.removeEventListener('orientationchange', apply)
    }
  }, [])
}
