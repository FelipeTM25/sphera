import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { type LevelId, LEVELS, getLevelById } from '../levels'

export type GameState = 'home' | 'levels' | 'records' | 'playing' | 'gameOver' | 'levelComplete'

const STORAGE_KEY = 'sphera.progress.v1'

type Persisted = {
  unlockedMaxLevelId: LevelId
  bestStarsByLevel: Record<LevelId, number>
  lastLevelId: LevelId
}

function clampLevelId(n: number): LevelId {
  if (n <= 1) return 1
  if (n >= 3) return 3
  return n as LevelId
}

function safeLoad(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Persisted>
    if (!parsed) return null

    const unlocked = clampLevelId(Number(parsed.unlockedMaxLevelId ?? 1))
    const last = clampLevelId(Number(parsed.lastLevelId ?? 1))
    const best = parsed.bestStarsByLevel ?? ({ 1: 0, 2: 0, 3: 0 } as Record<LevelId, number>)

    return {
      unlockedMaxLevelId: unlocked,
      lastLevelId: last,
      bestStarsByLevel: {
        1: Math.max(0, Math.min(3, Number(best[1] ?? 0))),
        2: Math.max(0, Math.min(3, Number(best[2] ?? 0))),
        3: Math.max(0, Math.min(3, Number(best[3] ?? 0))),
      },
    }
  } catch {
    return null
  }
}

function safeSave(data: Persisted) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

interface GameStore {
  gameState: GameState
  currentLevelId: LevelId
  unlockedMaxLevelId: LevelId
  runCollectedStars: boolean[] // length 3
  bestStarsByLevel: Record<LevelId, number>
  currentSpeed: number

  currentLevel: ReturnType<typeof getLevelById>

  goHome: () => void
  openLevels: () => void
  openRecords: () => void
  selectLevel: (id: LevelId) => void
  startRun: () => void
  retryLevel: () => void
  endGame: () => void
  completeLevel: () => void
  collectStar: (index: number) => void
  updateSpeed: (speed: number) => void
}

const GameContext = createContext<GameStore | null>(null)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const persisted = useMemo(() => safeLoad(), [])
  const [gameState, setGameState] = useState<GameState>('home')
  const [currentLevelId, setCurrentLevelId] = useState<LevelId>(persisted?.lastLevelId ?? 1)
  const [unlockedMaxLevelId, setUnlockedMaxLevelId] = useState<LevelId>(persisted?.unlockedMaxLevelId ?? 1)
  const [runCollectedStars, setRunCollectedStars] = useState<boolean[]>([false, false, false])
  const [bestStarsByLevel, setBestStarsByLevel] = useState<Record<LevelId, number>>(persisted?.bestStarsByLevel ?? ({ 1: 0, 2: 0, 3: 0 } as Record<LevelId, number>))
  const [currentSpeed, setCurrentSpeed] = useState(0)

  const currentLevel = useMemo(() => getLevelById(currentLevelId), [currentLevelId])

  const goHome = useCallback(() => {
    setGameState('home')
  }, [])

  const openLevels = useCallback(() => {
    setGameState('levels')
  }, [])

  const openRecords = useCallback(() => {
    setGameState('records')
  }, [])

  const selectLevel = useCallback((id: LevelId) => {
    setCurrentLevelId(id)
  }, [])

  useEffect(() => {
    safeSave({
      unlockedMaxLevelId,
      bestStarsByLevel,
      lastLevelId: currentLevelId,
    })
  }, [unlockedMaxLevelId, bestStarsByLevel, currentLevelId])

  const startRun = useCallback(() => {
    setRunCollectedStars([false, false, false])
    setGameState('playing')
  }, [])

  const retryLevel = useCallback(() => {
    setRunCollectedStars([false, false, false])
    setGameState('playing')
  }, [])

  const endGame = useCallback(() => {
    setCurrentSpeed(0)
    setGameState('gameOver')
  }, [])

  const updateSpeed = useCallback((speed: number) => {
    setCurrentSpeed(Math.round(speed))
  }, [])

  const completeLevel = useCallback(() => {
    const stars = runCollectedStars.filter(Boolean).length
    setBestStarsByLevel((prev) => ({ ...prev, [currentLevelId]: Math.max(prev[currentLevelId], stars) }))

    // Unlock next level if exists
    const next = (currentLevelId + 1) as LevelId
    const hasNext = LEVELS.some((l) => l.id === next)
    if (hasNext) {
      setUnlockedMaxLevelId((prev) => (prev < next ? next : prev))
    }

    setGameState('levelComplete')
  }, [currentLevelId, runCollectedStars])

  const collectStar = useCallback((index: number) => {
    setRunCollectedStars((prev) => {
      if (index < 0 || index >= prev.length) return prev
      if (prev[index]) return prev
      const next = [...prev]
      next[index] = true
      return next
    })
  }, [])

  return (
    <GameContext.Provider value={{
      gameState,
      currentLevelId,
      unlockedMaxLevelId,
      runCollectedStars,
      bestStarsByLevel,
      currentSpeed,
      currentLevel,
      goHome,
      openLevels,
      openRecords,
      selectLevel,
      startRun,
      retryLevel,
      endGame,
      completeLevel,
      collectStar,
      updateSpeed,
    }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be inside GameProvider')
  return ctx
}
