import { GameProvider } from './store/gameStore'
import { Game } from './components/Game'
import { HUD } from './components/HUD'
import { Menu } from './components/Menu'
import './index.css'

export default function App() {
  return (
    <GameProvider>
      {/* 3D World */}
      <div style={{ position: 'fixed', inset: 0 }}>
        <Game />
      </div>

      {/* HTML overlays */}
      <HUD />
      <Menu />
    </GameProvider>
  )
}
