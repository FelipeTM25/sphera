import { useEffect } from 'react'
import { useGame } from '../store/gameStore'
import { LEVELS, type LevelId } from '../levels'

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 11.5 12 4l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 7v10l10-5-10-5Z" fill="currentColor" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M6 4H4v3a4 4 0 0 0 4 4" stroke="currentColor" strokeWidth="2" />
      <path d="M18 4h2v3a4 4 0 0 1-4 4" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11v3" stroke="currentColor" strokeWidth="2" />
      <path d="M9 20h6" stroke="currentColor" strokeWidth="2" />
      <path d="M10 14h4l1 6H9l1-6Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function StarSlots({ value }: { value: number }) {
  return (
    <div className="level-stars neon">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={i < value ? 'level-star filled' : 'level-star'} />
      ))}
    </div>
  )
}

export function Menu() {
  const {
    gameState,
    currentLevelId,
    unlockedMaxLevelId,
    bestStarsByLevel,
    runCollectedStars,
    goHome,
    openLevels,
    openRecords,
    selectLevel,
    startRun,
    retryLevel,
  } = useGame()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      if (gameState === 'home') openLevels()
      if (gameState === 'levels') startRun()
      if (gameState === 'gameOver') retryLevel()
      if (gameState === 'levelComplete') openLevels()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [gameState, openLevels, startRun, retryLevel])

  if (gameState === 'playing') return null

  if (gameState === 'home') {
    return (
      <div className="overlay">
        <div className="grid-bg" />
        <div className="overlay-panel overlay-panel-compact">
          <div className="game-title">SPHERA</div>
          <div className="game-subtitle">¡Rueda y sobrevive!</div>

          <div className="divider" />

          <button className="btn-primary" onClick={openLevels}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              {PlayIcon()} <span>JUGAR</span>
            </span>
          </button>

          <button className="btn-primary btn-secondary" onClick={openRecords}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              {TrophyIcon()} <span>RÉCORDS</span>
            </span>
          </button>

          <div className="hint">PRESIONA ESPACIO PARA CONTINUAR</div>
        </div>
      </div>
    )
  }

  if (gameState === 'records') {
    return (
      <div className="overlay">
        <div className="grid-bg" />
        <div className="overlay-panel overlay-panel-wide">
          <div className="overlay-topbar">
            <button className="icon-btn" onClick={goHome} aria-label="Inicio">
              {HomeIcon()}
            </button>
            <div>
              <div className="panel-h1">RÉCORDS</div>
              <div className="panel-h2">Estrellas máximas por nivel</div>
            </div>
          </div>

          <div className="divider" />

          <div className="level-list-neon">
            {LEVELS.map((lvl) => (
              <div key={lvl.id} className="level-card-neon">
                <div className="level-left-neon">
                  <div className="level-number-neon">{lvl.id}</div>
                  <div>
                    <div className="level-name-neon">{lvl.title}</div>
                    <div className="level-diff-neon">{lvl.difficultyLabel}</div>
                  </div>
                </div>
                <StarSlots value={bestStarsByLevel[lvl.id]} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (gameState === 'levels') {
    return (
      <div className="overlay">
        <div className="grid-bg" />
        <div className="overlay-panel overlay-panel-wide">
          <div className="overlay-topbar">
            <button className="icon-btn" onClick={goHome} aria-label="Inicio">
              {HomeIcon()}
            </button>
            <div>
              <div className="panel-h1">SELECCIONA NIVEL</div>
              <div className="panel-h2">Elige tu desafío</div>
            </div>
          </div>

          <div className="divider" />

          <div className="level-list-neon">
            {LEVELS.map((lvl) => {
              const locked = lvl.id > unlockedMaxLevelId
              const selected = lvl.id === currentLevelId

              const onPick = () => {
                if (locked) return
                selectLevel(lvl.id as LevelId)
                startRun()
              }

              return (
                <button
                  key={lvl.id}
                  className={
                    locked
                      ? 'level-card-neon level-btn-neon locked'
                      : selected
                        ? 'level-card-neon level-btn-neon selected'
                        : 'level-card-neon level-btn-neon'
                  }
                  onClick={onPick}
                >
                  <div className="level-left-neon">
                    <div className="level-number-neon">{lvl.id}</div>
                    <div>
                      <div className="level-name-neon">{lvl.title}</div>
                      <div className="level-diff-neon">{lvl.difficultyLabel}</div>
                    </div>
                  </div>
                  <div className="level-right-neon">
                    <span className="level-play-neon">{PlayIcon()}</span>
                    <StarSlots value={bestStarsByLevel[lvl.id]} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  if (gameState === 'levelComplete') {
    const stars = runCollectedStars.filter(Boolean).length
    const nextId = (currentLevelId + 1) as LevelId
    const hasNext = LEVELS.some((l) => l.id === nextId)

    return (
      <div className="overlay">
        <div className="grid-bg" />
        <div className="overlay-panel overlay-panel-compact">
          <div className="panel-h1">NIVEL COMPLETADO</div>
          <div className="panel-h2">Estrellas obtenidas</div>
          <div className="divider" />
          <StarSlots value={stars} />

          <div className="divider" />

          <div className="overlay-actions">
            {hasNext && (
              <button
                className="btn-primary"
                onClick={() => {
                  selectLevel(nextId)
                  startRun()
                }}
              >
                SIGUIENTE NIVEL
              </button>
            )}
            <button className="btn-primary btn-secondary" onClick={openLevels}>SELECCIONAR NIVEL</button>
            <button className="btn-primary btn-secondary" onClick={goHome}>MENÚ PRINCIPAL</button>
          </div>

          <div className="hint">PRESIONA ESPACIO PARA CONTINUAR</div>
        </div>
      </div>
    )
  }

  // gameState === 'gameOver'
  return (
    <div className="overlay">
      <div className="grid-bg" />
      <div className="overlay-panel overlay-panel-compact">
        <div className="game-over-title">GAME OVER</div>
        <div className="panel-h2">Intenta de nuevo</div>

        <div className="divider" />
        <StarSlots value={runCollectedStars.filter(Boolean).length} />
        <div className="divider" />

        <div className="overlay-actions row">
          <button className="btn-primary" onClick={retryLevel}>
            JUGAR DE NUEVO
          </button>
          <button className="btn-primary btn-secondary" onClick={goHome}>
            MENÚ PRINCIPAL
          </button>
        </div>

        <div className="hint">PRESIONA ESPACIO PARA REINTENTAR</div>
      </div>
    </div>
  )
}
