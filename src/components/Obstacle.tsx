import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import type { ObstacleType } from '../levels'

interface ObstacleProps {
  position: [number, number, number]
  size: [number, number, number]
  type: ObstacleType
  onMeshReady?: (mesh: THREE.Mesh) => void
  onMeshRemoved?: (mesh: THREE.Mesh) => void
}

// Color palette per obstacle type — each type has a unique visual language
const OBSTACLE_CONFIG: Record<ObstacleType, { color: string; emissiveIntensity: number; rotationX?: number }> = {
  wall:     { color: '#ff2020', emissiveIntensity: 0.7 },
  pillar:   { color: '#ff2020', emissiveIntensity: 0.7 },
  gate:     { color: '#ff6600', emissiveIntensity: 0.6 },
  low_wall: { color: '#ffcc00', emissiveIntensity: 0.9 },
  ramp:     { color: '#39ff14', emissiveIntensity: 0.8, rotationX: 0.45 },  // +0.45 = low at approach, high at exit
  barrier:  { color: '#c000ff', emissiveIntensity: 0.7 },
}

export function Obstacle({ position, size, type, onMeshReady, onMeshRemoved }: ObstacleProps) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useEffect(() => {
    const mesh = meshRef.current
    if (mesh) onMeshReady?.(mesh)
    return () => {
      if (mesh) onMeshRemoved?.(mesh)
    }
  }, [onMeshReady, onMeshRemoved])

  const cfg = OBSTACLE_CONFIG[type]
  const color = cfg.color
  const rotX = cfg.rotationX ?? 0

  // low_wall gets an extra "SALTA" indicator strip on top
  const isLowWall = type === 'low_wall'
  // ramp is rotated to look like an actual ramp
  const isRamp = type === 'ramp'

  return (
    <group position={position} rotation={[rotX, 0, 0]}>
      {/* Main obstacle mesh — registered for collision */}
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={color}
          emissive={new THREE.Color(color)}
          emissiveIntensity={cfg.emissiveIntensity}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Outer glow shell */}
      <mesh scale={[1.15, 1.15, 1.15]}>
        <boxGeometry args={size} />
        <meshBasicMaterial color={color} transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>

      {/* low_wall: pulsing yellow stripe on top to scream "JUMP!" */}
      {isLowWall && (
        <mesh position={[0, size[1] / 2 + 0.08, 0]}>
          <boxGeometry args={[size[0], 0.12, size[2] * 0.9]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
        </mesh>
      )}

      {/* ramp: arrow chevron on surface to indicate direction */}
      {isRamp && (
        <>
          <mesh position={[0, size[1] / 2 + 0.05, -size[2] * 0.25]}>
            <boxGeometry args={[size[0] * 0.5, 0.08, 0.3]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
          </mesh>
          <mesh position={[0, size[1] / 2 + 0.05, size[2] * 0.1]}>
            <boxGeometry args={[size[0] * 0.3, 0.08, 0.3]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
          </mesh>
        </>
      )}
    </group>
  )
}
