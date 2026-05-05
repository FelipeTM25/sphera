import { useGame } from '../store/gameStore'

export function HUD() {
  const { gameState, currentLevel, runCollectedStars, currentSpeed } = useGame()
  if (gameState !== 'playing') return null

  const speedRatio = Math.min(1, (currentSpeed - currentLevel.baseSpeed) / (currentLevel.maxSpeed - currentLevel.baseSpeed))
  const speedPct = Math.max(0, Math.min(100, speedRatio * 100))

  return (
    <div id="hud">
      <div className="hud-top">
        <div className="hud-card">
          <div className="label">Nivel</div>
          <div className="value" style={{ fontSize: '18px', letterSpacing: '1px' }}>{currentLevel.title}</div>
          <div className="subvalue">{currentLevel.difficultyLabel}</div>
        </div>

        <div className="hud-card">
          <div className="label">Estrellas</div>
          <div className="stars-row">
            {runCollectedStars.map((on, idx) => (
              <div key={idx} className={on ? 'star-slot star-on' : 'star-slot'} />
            ))}
          </div>
          <div className="subvalue">{runCollectedStars.filter(Boolean).length}/3</div>
        </div>
      </div>

      {/* Speed bar */}
      <div className="speed-bar-wrapper">
        <div className="speed-bar-label">VELOCIDAD</div>
        <div className="speed-bar-track">
          <div className="speed-bar-fill" style={{ width: `${speedPct}%` }} />
        </div>
        <div className="speed-bar-value">{currentSpeed} <span>u/s</span></div>
      </div>
    </div>
  )
}
