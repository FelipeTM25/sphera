import { useRef, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/cannon'
import * as THREE from 'three'
import { Ball } from './Ball'
import { Track } from './Track'
import { CameraController } from './CameraController'
import { Starfield } from './Starfield'
import { useGame } from '../store/gameStore'

export function Game() {
  const { gameState } = useGame()
  const ballPosition = useRef(new THREE.Vector3(0, 3, 2))

  return (
    <Canvas
      shadows
      camera={{ fov: 72, near: 0.1, far: 600, position: [0, 8, 14] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
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
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, 8, 0]} intensity={1.0} color="#00f5ff" distance={40} />
      <pointLight position={[-5, 3, -20]} intensity={0.5} color="#ff00ff" distance={30} />

      <CameraController ballPosition={ballPosition} />
      <Starfield ballPosition={ballPosition} />

      <Suspense fallback={null}>
        <Physics
          gravity={[0, -25, 0]}
          defaultContactMaterial={{ friction: 0.6, restitution: 0.05 }}
          broadphase="SAP"
        >
          {/* Track is always mounted so physics bodies exist before ball spawns */}
          <Track ballPosition={ballPosition} />

          {gameState === 'playing' && (
            <Ball onPositionUpdate={(pos) => { ballPosition.current.copy(pos) }} />
          )}
        </Physics>
      </Suspense>
    </Canvas>
  )
}
