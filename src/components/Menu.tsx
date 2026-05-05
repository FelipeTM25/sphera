import { useEffect } from 'react'
import { useGame } from '../store/gameStore'
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

function StarSlots({ value }: { value: number }) {
  return (
    <div className="star-slots">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={i < value ? 'star-slot-sq filled' : 'star-slot-sq'} />
      ))}
    </div>
  )
}

// Animated ball decoration for home screen
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

  // ── HOME SCREEN ────────────────────────────────────────────────────────────
  if (gameState === 'home') {
    return (
      <div className="overlay">
        <div className="grid-bg" />
        <div className="mobile-panel home-panel">

          {/* Hero area */}
          <div className="home-hero">
            <div className="home-hero-inner">
              <div className="game-title">SPHERA</div>
              <div className="game-subtitle">¡Rueda y sobrevive!</div>
            </div>
          </div>

          {/* Ball decoration */}
          <BallDecoration />

          {/* Actions */}
          <div className="home-actions">
            <button id="btn-play" className="btn-mobile btn-mobile-primary" onClick={openLevels}>
              <PlayIcon size={20} />
              <span>JUGAR</span>
            </button>

            <button id="btn-records" className="btn-mobile btn-mobile-secondary" onClick={openRecords}>
              <TrophyIcon />
              <span>Récords</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── RECORDS ────────────────────────────────────────────────────────────────
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

  // ── SELECT LEVEL ───────────────────────────────────────────────────────────
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

  // ── LEVEL COMPLETE ─────────────────────────────────────────────────────────
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
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={i < stars ? 'star-slot-sq filled' : 'star-slot-sq'} />
            ))}
          </div>

          <div className="stats-grid stats-grid-3">
            <div className="stat-box-large">
              <div className="label">PUNTUACIÓN</div>
              <div className="value">2840</div>
            </div>
            <div className="stat-box">
              <div className="label">Distancia</div>
              <div className="value">450m</div>
            </div>
            <div className="stat-box">
              <div className="label">Tiempo</div>
              <div className="value">2:15</div>
            </div>
            <div className="stat-box">
              <div className="label">Bonus</div>
              <div className="value">+500</div>
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

  // ── GAME OVER ──────────────────────────────────────────────────────────────
  return (
    <div className="overlay">
      <div className="grid-bg" />
      <div className="mobile-panel mobile-panel-compact">
        <div className="game-over-title" style={{ marginTop: '0', fontSize: '36px' }}>GAME OVER</div>
        <div className="panel-h2" style={{ textAlign: 'center' }}>Nivel {currentLevelId}</div>

        <div className="star-slots-large" style={{ margin: '8px 0' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={i < runCollectedStars.filter(Boolean).length ? 'star-slot-sq filled' : 'star-slot-sq'} />
          ))}
        </div>

        <div className="stats-grid">
          <div className="stat-box-large">
            <div className="label">PUNTUACIÓN FINAL</div>
            <div className="value">1250</div>
          </div>
          <div className="stat-box">
            <div className="label">Distancia</div>
            <div className="value">127m</div>
          </div>
          <div className="stat-box">
            <div className="label">Tiempo</div>
            <div className="value">0:45</div>
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
