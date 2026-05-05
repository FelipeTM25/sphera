import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useSphere } from '@react-three/cannon'
import { useGame } from '../store/gameStore'
import { useKeys } from '../hooks/useKeys'

interface BallProps {
  onPositionUpdate: (pos: THREE.Vector3) => void
}

const BASE_SPEED = 12
const MAX_SPEED = 45
const LATERAL_FORCE = 22

export function Ball({ onPositionUpdate }: BallProps) {
  const { gameState, setScore, setSpeed, endGame } = useGame()
  const keys = useKeys()
  const speedRef = useRef(BASE_SPEED)
  const distanceRef = useRef(0)
  const aliveTimer = useRef(0)
  const meshRef = useRef<THREE.Group>(null!)

  const [, api] = useSphere(() => ({
    mass: 1,
    position: [0, 4, 0],
    args: [0.5],
    linearDamping: 0.05,
    angularDamping: 0.3,
  }))

  const posRef = useRef([0, 4, 0])
  const velRef = useRef([0, 0, 0])

  useEffect(() => {
    const unsubP = api.position.subscribe(p => { posRef.current = [...p] })
    const unsubV = api.velocity.subscribe(v => { velRef.current = [...v] })
    return () => { unsubP(); unsubV() }
  }, [api])

  useEffect(() => {
    if (gameState === 'playing') {
      api.position.set(0, 4, 0)
      api.velocity.set(0, 0, -BASE_SPEED)
      api.angularVelocity.set(0, 0, 0)
      speedRef.current = BASE_SPEED
      distanceRef.current = 0
      aliveTimer.current = 0
    }
  }, [gameState, api])

  useFrame((_, delta) => {
    if (gameState !== 'playing') return

    aliveTimer.current += delta
    const [px, py, pz] = posRef.current

    // Ramp up speed over time
    speedRef.current = Math.min(MAX_SPEED, BASE_SPEED + distanceRef.current * 0.01)

    // Only set forward velocity — let physics handle Y naturally
    api.velocity.set(
      velRef.current[0],
      velRef.current[1],
      -speedRef.current
    )

    // Lateral steering
    if (keys.current.has('ArrowLeft') || keys.current.has('KeyA')) {
      api.applyForce([-LATERAL_FORCE, 0, 0], [0, 0, 0])
    }
    if (keys.current.has('ArrowRight') || keys.current.has('KeyD')) {
      api.applyForce([LATERAL_FORCE, 0, 0], [0, 0, 0])
    }

    // Clamp lateral drift
    if (Math.abs(px) > 4) {
      api.velocity.set(-velRef.current[0] * 0.5, velRef.current[1], -speedRef.current)
      api.position.set(Math.sign(px) * 4, py, pz)
    }

    // Death: fell off
    if (py < -20 && aliveTimer.current > 1.0) {
      endGame()
      return
    }

    // Score = distance traveled
    distanceRef.current += speedRef.current * delta
    setScore(Math.floor(distanceRef.current))
    setSpeed(Math.floor(speedRef.current))

    onPositionUpdate(new THREE.Vector3(px, py, pz))
    
    if (meshRef.current) {
      meshRef.current.position.set(px, py, pz)
    }
  })

  return (
    <group ref={meshRef}>
      {/* Main ball */}
      <mesh castShadow>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial
          color="#88ddff"
          emissive="#00aaff"
          emissiveIntensity={0.8}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      {/* Outer glow shell */}
      <mesh scale={1.4}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#00f5ff" transparent opacity={0.07} side={THREE.BackSide} />
      </mesh>
      {/* Strong point light attached to ball */}
      <pointLight color="#00f5ff" intensity={2} distance={8} />
    </group>
  )
}
