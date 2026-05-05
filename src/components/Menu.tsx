import { useEffect } from 'react'
import { useGame } from '../store/gameStore'

export function Menu() {
  const { gameState, score, bestScore, startGame, resetGame } = useGame()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (gameState === 'menu') startGame()
        if (gameState === 'gameOver') resetGame()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [gameState, startGame, resetGame])

  if (gameState === 'playing') return null

  if (gameState === 'menu') {
    return (
      <div className="overlay">
        <div className="grid-bg" />
        <div className="overlay-panel">
          <div className="game-title">SLOPE</div>
          <div className="game-subtitle">Survive the infinite descent</div>

          <div className="divider" />

          <div className="controls-hint">
            <div className="key">←</div>
            <div className="key">→</div>
            <span>or</span>
            <div className="key">A</div>
            <div className="key">D</div>
            <span>to steer</span>
          </div>

          <button className="btn-primary" onClick={startGame} id="start-btn">
            PLAY
          </button>

          <div style={{ fontSize: '9px', letterSpacing: '3px', color: 'rgba(255,255,255,0.25)', fontFamily: 'Rajdhani, sans-serif' }}>
            PRESS SPACE TO START
          </div>
        </div>
      </div>
    )
  }

  // gameState === 'gameOver'
  return (
    <div className="overlay">
      <div className="grid-bg" />
      <div className="overlay-panel">
        <div className="game-over-title">GAME OVER</div>

        <div className="divider" />

        <div className="score-display">
          <div className="score-label">FINAL SCORE</div>
          <div className="score-number">{score}</div>
          {bestScore > 0 && (
            <div className="best-score">
              BEST <span>{bestScore}</span>
            </div>
          )}
        </div>

        <div className="divider" />

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" onClick={startGame} id="retry-btn">
            TRY AGAIN
          </button>
          <button
            className="btn-primary"
            onClick={resetGame}
            id="menu-btn"
            style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.5)' }}
          >
            MENU
          </button>
        </div>

        <div style={{ fontSize: '9px', letterSpacing: '3px', color: 'rgba(255,255,255,0.25)', fontFamily: 'Rajdhani, sans-serif' }}>
          PRESS SPACE TO RETRY
        </div>
      </div>
    </div>
  )
}
