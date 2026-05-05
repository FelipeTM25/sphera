import { createContext, useContext, useState, useRef, useCallback } from 'react'

type GameState = 'menu' | 'playing' | 'gameOver'

interface GameStore {
  gameState: GameState
  score: number
  bestScore: number
  speed: number
  setScore: (s: number) => void
  setSpeed: (s: number) => void
  startGame: () => void
  endGame: () => void
  resetGame: () => void
}

const GameContext = createContext<GameStore | null>(null)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState>('menu')
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [speed, setSpeed] = useState(0)

  const startGame = useCallback(() => {
    setScore(0)
    setSpeed(0)
    setGameState('playing')
  }, [])

  const endGame = useCallback(() => {
    setGameState('gameOver')
    setBestScore(prev => Math.max(prev, score))
  }, [score])

  const resetGame = useCallback(() => {
    setGameState('menu')
  }, [])

  return (
    <GameContext.Provider value={{
      gameState, score, bestScore, speed,
      setScore, setSpeed, startGame, endGame, resetGame
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
