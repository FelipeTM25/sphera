import { useRef, useEffect } from 'react'
import * as THREE from 'three'

interface ObstacleProps {
  position: [number, number, number]
  size: [number, number, number]
  type: 'wall' | 'pillar' | 'gate'
  onMeshReady?: (mesh: THREE.Mesh) => void
  onMeshRemoved?: (mesh: THREE.Mesh) => void
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

  const color = type === 'gate' ? '#ff6600' : '#ff2020'

  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={color}
          emissive={new THREE.Color(color)}
          emissiveIntensity={0.7}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      {/* Warning glow */}
      <mesh scale={[1.2, 1.2, 1.2]}>
        <boxGeometry args={size} />
        <meshBasicMaterial color={color} transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
    </group>
  )
}
