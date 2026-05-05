import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useSphere } from '@react-three/cannon'
import { useGame } from '../store/gameStore'
import { useKeys } from '../hooks/useKeys'
import type { LevelDef } from '../levels'

interface BallProps {
  level: LevelDef
  onPositionUpdate: (pos: THREE.Vector3) => void
}

const LATERAL_FORCE = 22

export function Ball({ level, onPositionUpdate }: BallProps) {
  const { gameState, endGame } = useGame()
  const keys = useKeys()
  const aliveTimer = useRef(0)
  const deadRef = useRef(false)
  const outVec = useRef(new THREE.Vector3())

  const jumpZones = useMemo(() => {
    // Detect "ramp -> gap" patterns and apply a short forward-speed boost to make jumps reliable.
    const zones: Array<{
      startZ: number
      endZ: number
      boost: number
      launchZ: number
      launchVy: number
    }> = []
    const L = level.segmentLength
    let timelineIndex = 0

    for (let p = 0; p < level.pieces.length; p++) {
      const piece = level.pieces[p]
      if (piece.kind === 'gap') {
        timelineIndex += piece.segments
        continue
      }

      const next = level.pieces[p + 1]
      const isRamp = Math.abs(piece.angle) >= 0.12
      const leadsToGap = next?.kind === 'gap'
      if (isRamp && leadsToGap && piece.angle > 0) {
        const rampStart = timelineIndex
        const rampSegs = piece.segments
        const gapSegs = next.segments
        const startZ = -(rampStart * L) + L * 0.75
        const endZ = -((rampStart + rampSegs + gapSegs) * L) - L * 0.75

        // Launch trigger happens near the end of the ramp, right before the gap.
        const launchZ = -((rampStart + rampSegs) * L) + L * 0.25

        // Estimate needed airtime: higher gaps => a bit more vertical velocity.
        const gapLen = gapSegs * L
        const t = Math.max(0.35, Math.min(1.25, gapLen / Math.max(8, level.speed)))
        const launchVy = Math.max(7.5, Math.min(12.5, 7.5 + t * 4.5))

        zones.push({
          startZ,
          endZ,
          boost: Math.min(level.speed * 1.3, level.speed + 10),
          launchZ,
          launchVy,
        })
      }

      timelineIndex += piece.segments
    }
    return zones
  }, [level])

  const jumpFiredRef = useRef<boolean[]>([])

  const [bodyRef, api] = useSphere(() => ({
    mass: 1,
    position: [level.start.x, level.start.y, level.start.z],
    args: [0.5],
    linearDamping: 0.05,
    angularDamping: 0.3,
    onCollide: (e) => {
      // Kill on lethal obstacle hit.
      const other = e.body as any
      const lethal = other?.userData?.lethal && other?.userData?.kind === 'obstacle'
      if (!lethal) return
      if (deadRef.current) return
      if (aliveTimer.current < 0.25) return
      deadRef.current = true
      endGame()
    },
  }))

  const posRef = useRef([0, 4, 0])
  const velRef = useRef([0, 0, 0])

  useEffect(() => {
    const unsubP = api.position.subscribe((p) => {
      // Avoid creating a new array copy every tick
      posRef.current = p as unknown as [number, number, number]
    })
    const unsubV = api.velocity.subscribe((v) => {
      velRef.current = v as unknown as [number, number, number]
    })
    return () => { unsubP(); unsubV() }
  }, [api])

  useEffect(() => {
    if (gameState === 'playing') {
      api.position.set(level.start.x, level.start.y, level.start.z)
      api.velocity.set(0, 0, -level.speed)
      api.angularVelocity.set(0, 0, 0)
      aliveTimer.current = 0
      deadRef.current = false
      jumpFiredRef.current = new Array(jumpZones.length).fill(false)
    }
  }, [gameState, api, level.start.x, level.start.y, level.start.z, level.speed, jumpZones.length])

  useFrame((_, delta) => {
    if (gameState !== 'playing') return
    if (deadRef.current) return

    aliveTimer.current += delta
    const [px, py, pz] = posRef.current

    // Only set forward velocity — let physics handle Y naturally
    let forwardSpeed = level.speed
    let desiredY = velRef.current[1]
    for (let i = 0; i < jumpZones.length; i++) {
      const z = jumpZones[i]
      if (pz <= z.startZ && pz >= z.endZ) {
        forwardSpeed = Math.max(forwardSpeed, z.boost)

        // One-time launch boost at the ramp->gap edge.
        if (!jumpFiredRef.current[i] && pz < z.launchZ) {
          jumpFiredRef.current[i] = true
          desiredY = Math.max(desiredY, z.launchVy)
        }

        break
      }
    }
    api.velocity.set(velRef.current[0], desiredY, -forwardSpeed)

    // Lateral steering
    const steer = LATERAL_FORCE * Math.min(1.5, delta * 60)
    if (keys.current.has('ArrowLeft') || keys.current.has('KeyA')) {
      api.applyForce([-steer, 0, 0], [0, 0, 0])
    }
    if (keys.current.has('ArrowRight') || keys.current.has('KeyD')) {
      api.applyForce([steer, 0, 0], [0, 0, 0])
    }

    // Death: fell off / out of bounds
    const outOfBoundsX = Math.abs(px) > level.trackWidth * 0.5 + 3
    if ((py < -18 || outOfBoundsX) && aliveTimer.current > 0.8) {
      deadRef.current = true
      endGame()
      return
    }

    outVec.current.set(px, py, pz)
    onPositionUpdate(outVec.current)
  })

  return (
    <group ref={bodyRef as any}>
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
