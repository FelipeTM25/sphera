import { useEffect } from 'react'
import { useGame, formatTime } from '../store/gameStore'
import { LEVELS, type LevelId } from '../levels'

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 11.5 12 4l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function PlayIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
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

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 16v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 8A9 9 0 0 0 3.6 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 16a9 9 0 0 0 17.4-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function RibbonIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="5" stroke="currentColor" strokeWidth="2" />
      <path d="M9 12.5L7 22l5-3 5 3-2-9.5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  )
}

// Inline star icon so no external deps needed
function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="22" height="22" viewBox="0 0 24 24"
      fill={filled ? '#ffd700' : 'none'}
      stroke={filled ? '#f5a623' : 'rgba(255,255,255,0.25)'}
      strokeWidth="1.5"
      aria-hidden
      style={{ filter: filled ? 'drop-shadow(0 0 4px #ffd70088)' : undefined }}
    >
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  )
}

function StarSlots({ value }: { value: number }) {
  return (
    <div className="star-slots">
      {Array.from({ length: 3 }).map((_, i) => (
        <StarIcon key={i} filled={i < value} />
      ))}
    </div>
  )
}

function StarSlotsLarge({ value }: { value: number }) {
  return (
    <div className="star-slots-large">
      {Array.from({ length: 3 }).map((_, i) => (
        <svg
          key={i}
          width="38" height="38" viewBox="0 0 24 24"
          fill={i < value ? '#ffd700' : 'none'}
          stroke={i < value ? '#f5a623' : 'rgba(255,255,255,0.2)'}
          strokeWidth="1.5"
          aria-hidden
          style={{ filter: i < value ? 'drop-shadow(0 0 8px #ffd70099)' : undefined, transition: 'all 0.3s' }}
        >
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </div>
  )
}

function BallDecoration() {
  return (
    <div className="home-ball-wrap">
      <div className="home-ball">
        <div className="home-ball-inner" />
        <div className="home-ball-glow" />
      </div>
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
    openCredits,
    selectLevel,
    startRun,
    retryLevel,
    runStats,
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
        <div className="mobile-panel home-panel">

          <div className="home-hero">
            <div className="home-hero-inner">
              <div className="game-title">SPHERA</div>
              <div className="game-subtitle">¡Rueda y sobrevive!</div>
            </div>
          </div>

          <BallDecoration />

          <div className="home-actions">
            <button id="btn-play" className="btn-mobile btn-mobile-primary" onClick={openLevels}>
              <PlayIcon size={20} />
              <span>JUGAR</span>
            </button>

            <button id="btn-records" className="btn-mobile btn-mobile-secondary" onClick={openRecords}>
              <TrophyIcon />
              <span>Récords</span>
            </button>

            <button id="btn-credits" className="btn-mobile btn-mobile-ghost" onClick={openCredits}>
              <InfoIcon />
              <span>Créditos</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (gameState === 'credits') {
    return (
      <div className="overlay">
        <div className="grid-bg" />
        <div className="mobile-panel">
          <div className="panel-topbar">
            <button className="icon-btn" onClick={goHome} aria-label="Inicio">
              <HomeIcon />
            </button>
            <div>
              <div className="panel-h1">Créditos</div>
              <div className="panel-h2">El equipo detrás de Sphera</div>
            </div>
          </div>

          <div className="divider" />

          <div className="credits-section">
            <div className="credits-role">Diseño y Desarrollo</div>
            <div className="credits-name">Camilo Marín Muriel</div>
            <div className="credits-name">Felipe Torres Montoya</div>
          </div>

          <div className="divider" />

          <div className="credits-section">
            <div className="credits-role">Tecnologías</div>
            <div className="credits-tech">React 19 · Three.js · TypeScript</div>
            <div className="credits-tech">Web Audio API · Vite · R3F</div>
          </div>

          <div className="divider" />

          <div className="credits-section">
            <div className="credits-role">Motor de Física</div>
            <div className="credits-tech">Implementación manual con raycasting,</div>
            <div className="credits-tech">AABB y sub-steps de simulación</div>
          </div>

          <div className="divider" />

          <div className="credits-footer">
            <div className="credits-year">© 2025 · Sphera</div>
            <div className="credits-tagline">¡Rueda y Sobrevive!</div>
          </div>

          <div className="action-stack" style={{ marginTop: '16px' }}>
            <button className="btn-mobile btn-mobile-secondary" onClick={goHome}>
              <HomeIcon />
              <span>Volver al Inicio</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (gameState === 'records') {
    return (
      <div className="overlay">
        <div className="grid-bg" />
        <div className="mobile-panel">
          <div className="panel-topbar">
            <button className="icon-btn" onClick={goHome} aria-label="Inicio">
              <HomeIcon />
            </button>
            <div>
              <div className="panel-h1">Récords</div>
              <div className="panel-h2">Estrellas máximas por nivel</div>
            </div>
          </div>

          <div className="divider" />

          <div className="level-list">
            {LEVELS.map((lvl) => (
              <div key={lvl.id} className="level-card">
                <div className="level-num">{lvl.id}</div>
                <div className="level-info">
                  <div className="level-name">{lvl.title}</div>
                  <div className="level-diff">{lvl.difficultyLabel}</div>
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
        <div className="mobile-panel">
          <div className="panel-topbar">
            <button className="icon-btn" onClick={goHome} aria-label="Inicio">
              <HomeIcon />
            </button>
            <div>
              <div className="panel-h1">Selecciona Nivel</div>
              <div className="panel-h2">Elige tu desafío</div>
            </div>
          </div>

          <div className="divider" />

          <div className="level-list">
            {LEVELS.map((lvl) => {
              const locked = lvl.id > unlockedMaxLevelId
              const selected = lvl.id === currentLevelId

              return (
                <button
                  key={lvl.id}
                  id={`level-btn-${lvl.id}`}
                  className={`level-card level-btn${selected ? ' selected' : ''}${locked ? ' locked' : ''}`}
                  onClick={() => {
                    if (locked) return
                    selectLevel(lvl.id as LevelId)
                    startRun()
                  }}
                  disabled={locked}
                >
                  <div className="level-num">{lvl.id}</div>
                  <div className="level-info">
                    <div className="level-name">{lvl.title}</div>
                    <div className="level-diff">{lvl.difficultyLabel}</div>
                    <div className="level-stars-bottom">
                      <StarSlots value={bestStarsByLevel[lvl.id]} />
                    </div>
                  </div>
                  <div className="level-right">
                    <div className="level-play-btn">
                      {locked ? <LockIcon /> : <PlayIcon />}
                    </div>
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
        <div className="mobile-panel mobile-panel-compact">
          <div className="icon-circle-large">
            <RibbonIcon />
          </div>
          <div className="panel-h1" style={{ textAlign: 'center' }}>¡NIVEL COMPLETADO!</div>
          <div className="panel-h2" style={{ textAlign: 'center' }}>Nivel {currentLevelId} superado</div>

          <div className="star-slots-large">
            <StarSlotsLarge value={stars} />
          </div>

          <div className="stats-grid stats-grid-3">
            <div className="stat-box-large">
              <div className="label">PUNTUACIÓN</div>
              <div className="value">{runStats.score.toLocaleString()}</div>
            </div>
            <div className="stat-box">
              <div className="label">Distancia</div>
              <div className="value">{Math.round(runStats.distanceMeters)}m</div>
            </div>
            <div className="stat-box">
              <div className="label">Tiempo</div>
              <div className="value">{formatTime(runStats.elapsedSeconds)}</div>
            </div>
            <div className="stat-box">
              <div className="label">Estrellas</div>
              <div className="value">{runStats.stars} / 3</div>
            </div>
          </div>

          <div className="action-stack">
            {hasNext && (
              <button
                id="btn-next-level"
                className="btn-mobile btn-mobile-primary"
                onClick={() => {
                  selectLevel(nextId)
                  startRun()
                }}
              >
                <PlayIcon size={20} />
                <span>SIGUIENTE NIVEL</span>
              </button>
            )}
            <button className="btn-mobile btn-mobile-secondary" onClick={openLevels}>
              <HomeIcon />
              <span>Seleccionar Nivel</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Game Over
  return (
    <div className="overlay">
      <div className="grid-bg" />
      <div className="mobile-panel mobile-panel-compact">
        <div className="game-over-title" style={{ marginTop: '0', fontSize: '36px' }}>GAME OVER</div>
        <div className="panel-h2" style={{ textAlign: 'center' }}>Nivel {currentLevelId}</div>

        <div className="star-slots-large" style={{ margin: '8px 0' }}>
          <StarSlotsLarge value={runCollectedStars.filter(Boolean).length} />
        </div>

        <div className="stats-grid">
          <div className="stat-box-large">
            <div className="label">PUNTUACIÓN FINAL</div>
            <div className="value">{runStats.score.toLocaleString()}</div>
          </div>
          <div className="stat-box">
            <div className="label">Distancia</div>
            <div className="value">{Math.round(runStats.distanceMeters)}m</div>
          </div>
          <div className="stat-box">
            <div className="label">Tiempo</div>
            <div className="value">{formatTime(runStats.elapsedSeconds)}</div>
          </div>
        </div>

        <div className="action-stack">
          <button id="btn-retry" className="btn-mobile btn-mobile-primary" onClick={retryLevel}>
            <RefreshIcon />
            <span>REINTENTAR</span>
          </button>
          <button className="btn-mobile btn-mobile-secondary" onClick={openLevels}>
            <HomeIcon />
            <span>Seleccionar Nivel</span>
          </button>
        </div>
      </div>
    </div>
  )
}
