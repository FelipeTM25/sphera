import { useEffect, useRef } from 'react'

/**
 * Unified input: keyboard + touch.
 * Returns a ref to a Set of active "action codes" (same as KeyboardEvent.code)
 * so Ball.tsx can stay keyboard-code-based while touch works too.
 */
export function useInput() {
  const keys = useRef<Set<string>>(new Set())

  useEffect(() => {
    // ── Keyboard ──────────────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current.add(e.code)
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
        e.preventDefault()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // ── Touch ─────────────────────────────────────────────────────────────────
    // Split screen: top 55% = Space (Jump), bottom left = ArrowLeft, bottom right = ArrowRight
    const getDirection = (touch: Touch): string => {
      if (touch.clientY < window.innerHeight * 0.55) return 'Space'
      return touch.clientX < window.innerWidth / 2 ? 'ArrowLeft' : 'ArrowRight'
    }

    const activeTouches = new Map<number, string>()

    const onTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]
        const dir = getDirection(t)
        activeTouches.set(t.identifier, dir)
        keys.current.add(dir)
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]
        const oldDir = activeTouches.get(t.identifier)
        const newDir = getDirection(t)
        if (oldDir && oldDir !== newDir) {
          keys.current.delete(oldDir)
          activeTouches.set(t.identifier, newDir)
          keys.current.add(newDir)
        }
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]
        const dir = activeTouches.get(t.identifier)
        if (dir) {
          activeTouches.delete(t.identifier)
          // Only remove if no other touch still holds same direction
          const stillHeld = [...activeTouches.values()].includes(dir)
          if (!stillHeld) keys.current.delete(dir)
        }
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  return keys
}
