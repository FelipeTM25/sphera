import { useGame } from '../store/gameStore'

export function HUD() {
  const { score, speed, gameState } = useGame()
  if (gameState !== 'playing') return null

  const maxSpeed = 50
  const speedPct = Math.min(100, (speed / maxSpeed) * 100)

  return (
    <div id="hud">
      <div className="hud-top">
        <div className="hud-card">
          <div className="label">Score</div>
          <div className="value">{score}</div>
        </div>
        <div className="hud-card">
          <div className="label">Speed</div>
          <div className="value speed-value">×{(speed / 14).toFixed(1)}</div>
        </div>
      </div>

      <div className="speed-bar-wrapper">
        <div className="speed-bar-label">VELOCITY</div>
        <div className="speed-bar-track">
          <div
            className="speed-bar-fill"
            style={{ width: `${speedPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
