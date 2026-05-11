import { useRef, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { Ball } from './Ball'
import { Track } from './Track'
import { CameraController } from './CameraController'
import { Starfield } from './Starfield'
import { useGame } from '../store/gameStore'

export function Game() {
  const { gameState, currentLevel } = useGame()
  const ballPosition = useRef(new THREE.Vector3(0, 3, 2))

  // Shared mesh registries: Track fills them, Ball reads them.
  // Track is always mounted so it registers meshes once on mount and they
  // persist across runs. Obstacle meshes self-manage via onMeshReady/onMeshRemoved.
  const trackMeshes = useRef<THREE.Mesh[]>([])
  const obstacleMeshes = useRef<THREE.Mesh[]>([])

  return (
    <Canvas
      shadows
      camera={{ fov: 72, near: 0.1, far: 600, position: [0, 8, 14] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 1.25]}
      style={{ background: '#050510' }}
    >
      <color attach="background" args={['#050510']} />
      <fog attach="fog" args={['#050510', 80, 260]} />

      <ambientLight intensity={0.25} color="#2a3a6a" />
      <directionalLight
        position={[8, 20, 8]}
        intensity={1.4}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[0, 8, 0]} intensity={1.0} color="#00f5ff" distance={40} />
      <pointLight position={[-5, 3, -20]} intensity={0.5} color="#ff00ff" distance={30} />

      <CameraController ballPosition={ballPosition} />
      <Starfield ballPosition={ballPosition} />

      <Suspense fallback={null}>
        {/* Track is always mounted so meshes register before the ball spawns */}
        <Track
          level={currentLevel}
          ballPosition={ballPosition}
          trackMeshes={trackMeshes}
          obstacleMeshes={obstacleMeshes}
        />

        {gameState === 'playing' && (
          <Ball
            level={currentLevel}
            onPositionUpdate={(pos) => {
              ballPosition.current.copy(pos)
            }}
            trackMeshes={trackMeshes}
            obstacleMeshes={obstacleMeshes}
          />
        )}
      </Suspense>
    </Canvas>
  )
}
