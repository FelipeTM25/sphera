import { useBox } from '@react-three/cannon'
import * as THREE from 'three'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

interface ObstacleProps {
  position: [number, number, number]
  size: [number, number, number]
  type: 'wall' | 'pillar' | 'gate'
}

export function Obstacle({ position, size, type }: ObstacleProps) {
  useBox(() => ({
    type: 'Static',
    position,
    args: size,
    isTrigger: false,
  }))

  const matRef = useRef<THREE.MeshStandardMaterial>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (matRef.current) {
      matRef.current.emissiveIntensity = 0.5 + Math.sin(t * 3) * 0.3
    }
  })

  const color = type === 'gate' ? '#ff6600' : '#ff2020'

  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial
          ref={matRef as any}
          color={color}
          emissive={new THREE.Color(color)}
          emissiveIntensity={0.6}
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
