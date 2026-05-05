import { useGame } from '../store/gameStore'

export function HUD() {
  const { gameState, currentLevel, runCollectedStars } = useGame()
  if (gameState !== 'playing') return null

  return (
    <div id="hud">
      <div className="hud-top">
        <div className="hud-card">
          <div className="label">Nivel</div>
          <div className="value" style={{ fontSize: '20px', letterSpacing: '1px' }}>{currentLevel.title}</div>
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
    </div>
  )
}
