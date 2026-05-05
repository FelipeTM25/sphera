import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface StarfieldProps {
  ballPosition: React.MutableRefObject<THREE.Vector3>
}

export function Starfield({ ballPosition }: StarfieldProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const count = 600

  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 300
    positions[i * 3 + 1] = Math.random() * 60
    positions[i * 3 + 2] = Math.random() * -400
    const c = Math.random()
    colors[i * 3] = c * 0.4
    colors[i * 3 + 1] = c * 0.8
    colors[i * 3 + 2] = 1
  }

  useFrame(() => {
    if (groupRef.current && ballPosition.current) {
      groupRef.current.position.z = ballPosition.current.z
    }
  })

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.5} vertexColors transparent opacity={0.8} />
      </points>
    </group>
  )
}
