import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { type LevelId, LEVELS, getLevelById } from '../levels'

export type GameState = 'home' | 'levels' | 'records' | 'credits' | 'playing' | 'gameOver' | 'levelComplete'

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
    // ignore write errors (private browsing, storage full, etc.)
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export interface RunStats {
  elapsedSeconds: number
  distanceMeters: number
  stars: number
  score: number
}

interface GameStore {
  gameState: GameState
  currentLevelId: LevelId
  unlockedMaxLevelId: LevelId
  runCollectedStars: boolean[]
  bestStarsByLevel: Record<LevelId, number>
  currentSpeed: number
  runStats: RunStats

  currentLevel: ReturnType<typeof getLevelById>

  goHome: () => void
  openLevels: () => void
  openRecords: () => void
  openCredits: () => void
  selectLevel: (id: LevelId) => void
  startRun: () => void
  retryLevel: () => void
  endGame: () => void
  completeLevel: () => void
  collectStar: (index: number) => void
  updateSpeed: (speed: number) => void
  tickRun: (dt: number, forwardSpeed: number) => void
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
  const [runStats, setRunStats] = useState<RunStats>({ elapsedSeconds: 0, distanceMeters: 0, stars: 0, score: 0 })

  // Mutable accumulator — updated every frame without triggering re-renders
  const runAccRef = useRef({ elapsed: 0, distance: 0 })

  const currentLevel = useMemo(() => getLevelById(currentLevelId), [currentLevelId])

  const goHome = useCallback(() => setGameState('home'), [])
  const openLevels = useCallback(() => setGameState('levels'), [])
  const openRecords = useCallback(() => setGameState('records'), [])
  const openCredits = useCallback(() => setGameState('credits'), [])
  const selectLevel = useCallback((id: LevelId) => setCurrentLevelId(id), [])

  // Persist progress whenever relevant state changes
  useEffect(() => {
    safeSave({ unlockedMaxLevelId, bestStarsByLevel, lastLevelId: currentLevelId })
  }, [unlockedMaxLevelId, bestStarsByLevel, currentLevelId])

  const resetRunAcc = useCallback(() => {
    runAccRef.current = { elapsed: 0, distance: 0 }
    setRunStats({ elapsedSeconds: 0, distanceMeters: 0, stars: 0, score: 0 })
  }, [])

  const startRun = useCallback(() => {
    setRunCollectedStars([false, false, false])
    resetRunAcc()
    setGameState('playing')
  }, [resetRunAcc])

  const retryLevel = useCallback(() => {
    setRunCollectedStars([false, false, false])
    resetRunAcc()
    setGameState('playing')
  }, [resetRunAcc])

  // Called every frame from Ball.tsx to accumulate run stats without re-renders
  const tickRun = useCallback((dt: number, forwardSpeed: number) => {
    runAccRef.current.elapsed += dt
    runAccRef.current.distance += forwardSpeed * dt
  }, [])

  const endGame = useCallback(() => {
    setCurrentSpeed(0)
    const { elapsed, distance } = runAccRef.current
    const stars = runCollectedStars.filter(Boolean).length
    const score = Math.round(distance * 2 + stars * 500)
    setRunStats({ elapsedSeconds: elapsed, distanceMeters: distance, stars, score })
    setGameState('gameOver')
  }, [runCollectedStars])

  const updateSpeed = useCallback((speed: number) => {
    setCurrentSpeed(Math.round(speed))
  }, [])

  const completeLevel = useCallback(() => {
    const stars = runCollectedStars.filter(Boolean).length
    setBestStarsByLevel((prev) => ({ ...prev, [currentLevelId]: Math.max(prev[currentLevelId], stars) }))

    const next = (currentLevelId + 1) as LevelId
    const hasNext = LEVELS.some((l) => l.id === next)
    if (hasNext) {
      setUnlockedMaxLevelId((prev) => (prev < next ? next : prev))
    }

    const { elapsed, distance } = runAccRef.current
    const score = Math.round(distance * 2 + stars * 500)
    setRunStats({ elapsedSeconds: elapsed, distanceMeters: distance, stars, score })
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
      runStats,
      currentLevel,
      goHome,
      openLevels,
      openRecords,
      openCredits,
      selectLevel,
      startRun,
      retryLevel,
      endGame,
      completeLevel,
      collectStar,
      updateSpeed,
      tickRun,
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

export { formatTime }
