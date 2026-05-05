import { useEffect, useRef } from 'react'

export function useKeys() {
  const keys = useRef<Set<string>>(new Set())

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current.add(e.code)
      // prevent page scroll
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)) {
        e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.code)

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  return keys
}
