import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGame } from '../store/gameStore'
import { useInput } from '../hooks/useInput'
import type { LevelDef } from '../levels'

interface BallProps {
  level: LevelDef
  onPositionUpdate: (pos: THREE.Vector3) => void
  /** Refs to all track meshes for floor raycasting */
  trackMeshes: React.MutableRefObject<THREE.Mesh[]>
  /** Refs to all obstacle meshes for collision */
  obstacleMeshes: React.MutableRefObject<THREE.Mesh[]>
}

// ─── Tuning ──────────────────────────────────────────────────────────────────
const GRAVITY = 45          // units/sec²
const LATERAL_ACCEL = 110    // lateral acceleration (units/sec²)
const LATERAL_DAMPING = 0.82 // applied each frame to lateral velocity
const BALL_RADIUS = 0.5
const GROUND_TOLERANCE = 0.18  // how close to floor = "on ground" (absorbs 1 frame of fall)
const RAY_FAR = 80             // long enough for any drop height
const HUD_UPDATE_INTERVAL = 0.1  // seconds between store speed updates (perf)

// ─── Raycaster ───────────────────────────────────────────────────────────────
const _raycaster = new THREE.Raycaster()
const _rayOrigin = new THREE.Vector3()
const _rayDir = new THREE.Vector3(0, -1, 0)
const _outPos = new THREE.Vector3()

export function Ball({ level, onPositionUpdate, trackMeshes, obstacleMeshes }: BallProps) {
  const { gameState, endGame, updateSpeed } = useGame()
  const input = useInput()

  // ── State refs (avoid re-renders) ──────────────────────────────────────────
  const posRef = useRef(new THREE.Vector3(level.start.x, level.start.y, level.start.z))
  const velRef = useRef(new THREE.Vector3(0, 0, 0))   // x=lateral, y=vertical, z=unused (manual forward)
  const speedRef = useRef(level.baseSpeed)             // current forward speed
  const aliveTimer = useRef(0)
  const deadRef = useRef(false)
  const onGroundRef = useRef(false)
  const hudTimer = useRef(0)
  const groupRef = useRef<THREE.Group>(null!)

  // ── Reset on game start ────────────────────────────────────────────────────
  useEffect(() => {
    if (gameState === 'playing') {
      posRef.current.set(level.start.x, level.start.y, level.start.z)
      velRef.current.set(0, 0, 0)
      speedRef.current = level.baseSpeed
      aliveTimer.current = 0
      deadRef.current = false
      onGroundRef.current = false
      jumpCooldown.current = 0
    }
  }, [gameState, level])

  // ── Obstacle detection helpers ─────────────────────────────────────────────
  const obsBoxMin = useRef(new THREE.Vector3())
  const obsBoxMax = useRef(new THREE.Vector3())
  const obsWorldPos = useRef(new THREE.Vector3())
  const obsBox = useRef(new THREE.Box3())
  const jumpCooldown = useRef(0)

  // ── Main loop ─────────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    if (gameState !== 'playing') return
    if (deadRef.current) return

    const dt = Math.min(delta, 0.05) // clamp to avoid physics explosion after tab switch
    aliveTimer.current += dt

    const pos = posRef.current
    const vel = velRef.current

    // 1. Accelerate forward speed progressively
    speedRef.current = Math.min(
      speedRef.current + level.acceleration * dt,
      level.maxSpeed
    )
    const fwd = speedRef.current

    // 2. Lateral steering with smooth acceleration
    if (input.current.has('ArrowLeft') || input.current.has('KeyA')) {
      vel.x -= LATERAL_ACCEL * dt
    }
    if (input.current.has('ArrowRight') || input.current.has('KeyD')) {
      vel.x += LATERAL_ACCEL * dt
    }
    // Lateral damping
    vel.x *= LATERAL_DAMPING

    // 3. Gravity & Jumping
    if (jumpCooldown.current > 0) {
      jumpCooldown.current -= dt
    }

    if (input.current.has('Space') && onGroundRef.current && jumpCooldown.current <= 0) {
      vel.y = 20  // Jump strength
      onGroundRef.current = false
      jumpCooldown.current = 0.5 // 0.5s cooldown before next jump allowed
    }

    if (!onGroundRef.current) {
      vel.y -= GRAVITY * dt
    } else if (vel.y > 0) {
      // Allow upward momentum (ramp launch) to decay naturally
      vel.y -= GRAVITY * dt * 0.5
    }

    // 4. Integrate position FIRST
    pos.x += vel.x * dt
    pos.y += vel.y * dt
    pos.z -= fwd * dt  // forward always negative Z

    // 5. Track boundary clamping
    const halfWidth = level.trackWidth * 0.5
    pos.x = Math.max(-halfWidth, Math.min(halfWidth, pos.x))
    if (pos.x === -halfWidth || pos.x === halfWidth) vel.x = 0

    // 6. Floor detection via downward raycast at the NEW position
    // Ray starts well above the ball to avoid tunneling if it falls very fast
    _rayOrigin.set(
      Math.max(-halfWidth + 0.05, Math.min(halfWidth - 0.05, pos.x)), 
      pos.y + 10, 
      pos.z
    )
    _raycaster.set(_rayOrigin, _rayDir)
    _raycaster.far = RAY_FAR

    const hits = _raycaster.intersectObjects(trackMeshes.current, false)
    onGroundRef.current = false

    if (hits.length > 0) {
      const floorY = hits[0].point.y          // world-space Y of track surface
      const targetY = floorY + BALL_RADIUS    // where ball center must sit

      // Ball is "on ground" if its center is within GROUND_TOLERANCE above targetY, or penetrating
      if (pos.y <= targetY + GROUND_TOLERANCE) {
        
        // Prevent teleporting up if we hit the front wall of a block after a long fall
        if (targetY - pos.y > 4.0) {
          if (!deadRef.current) {
            deadRef.current = true
            endGame()
          }
          return
        }

        onGroundRef.current = true

        // Penetrating — push ball out and kill downward velocity
        if (pos.y < targetY) {
          pos.y = targetY
          if (vel.y < 0) vel.y = 0
        }

        // Slope-aware vertical nudge using correctly world-transformed normal
        if (hits[0].face) {
          const worldNormal = hits[0].face.normal.clone()
          const normalMatrix = new THREE.Matrix3().getNormalMatrix(hits[0].object.matrixWorld)
          worldNormal.applyMatrix3(normalMatrix).normalize()
          // Ramp going up (worldNormal.z < 0) → nudge ball upward
          // Ramp going down (worldNormal.z > 0) → nudge ball downward
          vel.y += -worldNormal.z * fwd * 0.15
        }
      }
    }

    // 7. Update mesh position
    if (groupRef.current) {
      groupRef.current.position.copy(pos)
      // Rolling rotation (visual only)
      groupRef.current.rotation.x -= fwd * dt * 0.8
      groupRef.current.rotation.z -= vel.x * dt * 0.5
    }

    // 8. Obstacle collision (sphere vs AABB)
    if (aliveTimer.current > 0.4) {
      for (const obs of obstacleMeshes.current) {
        if (!obs.parent) continue
        obs.getWorldPosition(obsWorldPos.current)
        const geom = obs.geometry as THREE.BoxGeometry
        if (!geom.parameters) continue
        const { width, height, depth } = geom.parameters
        obsBoxMin.current.set(
          obsWorldPos.current.x - width / 2,
          obsWorldPos.current.y - height / 2,
          obsWorldPos.current.z - depth / 2
        )
        obsBoxMax.current.set(
          obsWorldPos.current.x + width / 2,
          obsWorldPos.current.y + height / 2,
          obsWorldPos.current.z + depth / 2
        )
        obsBox.current.set(obsBoxMin.current, obsBoxMax.current)

        // Closest point on box to ball center
        const closestX = Math.max(obsBoxMin.current.x, Math.min(pos.x, obsBoxMax.current.x))
        const closestY = Math.max(obsBoxMin.current.y, Math.min(pos.y, obsBoxMax.current.y))
        const closestZ = Math.max(obsBoxMin.current.z, Math.min(pos.z, obsBoxMax.current.z))
        const dx = pos.x - closestX
        const dy = pos.y - closestY
        const dz = pos.z - closestZ
        const distSq = dx * dx + dy * dy + dz * dz

        if (distSq < BALL_RADIUS * BALL_RADIUS) {
          if (!deadRef.current) {
            deadRef.current = true
            endGame()
          }
          return
        }
      }
    }

    // 9. Death: fell off
    if (aliveTimer.current > 0.8) {
      if (pos.y < -20 || Math.abs(pos.x) > level.trackWidth * 0.5 + 3) {
        if (!deadRef.current) {
          deadRef.current = true
          endGame()
        }
        return
      }
    }

    // 10. Report position
    _outPos.copy(pos)
    onPositionUpdate(_outPos)

    // 11. Update HUD speed (throttled to avoid excessive store writes)
    hudTimer.current += dt
    if (hudTimer.current >= HUD_UPDATE_INTERVAL) {
      hudTimer.current = 0
      updateSpeed(fwd)
    }
  })

  // ── Obstacle meshes are passed in, ignore cannon ──────────────────────────

  return (
    <group ref={groupRef}>
      {/* Main ball */}
      <mesh castShadow>
        <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
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
        <sphereGeometry args={[BALL_RADIUS, 16, 16]} />
        <meshBasicMaterial color="#00f5ff" transparent opacity={0.07} side={THREE.BackSide} />
      </mesh>
      {/* Strong point light attached to ball */}
      <pointLight color="#00f5ff" intensity={2} distance={8} />
    </group>
  )
}
