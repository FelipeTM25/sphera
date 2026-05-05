import { useGame } from '../store/gameStore'

/**
 * Full-screen invisible overlay for mobile: left half steers left, right half steers right.
 * Touch events are handled by useInput.ts via window listeners, so this component
 * only provides the visual hint layer.
 */
export function TouchControls() {
  const { gameState } = useGame()
  if (gameState !== 'playing') return null

  return (
    <div className="touch-controls" aria-hidden="true">
      <div className="touch-jump-zone">
        <div className="touch-jump-text">TOCA PARA SALTAR</div>
      </div>
      <div className="touch-steer-zone">
        <div className="touch-zone touch-zone-left">
          <div className="touch-arrow touch-arrow-left">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <div className="touch-zone touch-zone-right">
          <div className="touch-arrow touch-arrow-right">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
