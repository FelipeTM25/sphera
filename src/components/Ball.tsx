import { useRef, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGame } from '../store/gameStore'
import { useInput } from '../hooks/useInput'
import type { LevelDef } from '../levels'
import { computeCylinderSections, cylinderAngleDelta, isInsideCylinder, type CylinderSection } from '../cylinder'

interface BallProps {
  level: LevelDef
  onPositionUpdate: (pos: THREE.Vector3) => void
  trackMeshes: React.MutableRefObject<THREE.Mesh[]>
  obstacleMeshes: React.MutableRefObject<THREE.Mesh[]>
}

// Physics tuning constants
const GRAVITY = 45
const LATERAL_ACCEL = 140
const LATERAL_FRICTION = 9.5
const LATERAL_MAX_SPEED = 15
const BALL_RADIUS = 0.5
const GROUND_TOLERANCE = 0.18
const MAX_GROUND_SNAP_UP = 1.25
const RAY_FAR = 80
const HUD_UPDATE_INTERVAL = 0.05

const JUMP_VELOCITY = 20
const COYOTE_TIME = 0.11
const JUMP_BUFFER_TIME = 0.12

// Cylinder steering tuning: exponential smoothing keeps turn feel FPS-independent.
// Surface speed cap (not angular) so wider tunnels don't feel hyper-sensitive.
const CYL_TURN_RESPONSE = 11.0
const CYL_TARGET_SURFACE_SPEED = 18
const CYL_MIN_MAX_ANG_VEL = 2.6
const CYL_MAX_MAX_ANG_VEL = 5.0
const CYL_FORWARD_MULT = 0.82
const CYL_MAX_SPEED_ADD = 18
const CYL_WALL_CLEARANCE = 0.22
const CYL_ENTRY_BLEND = 0.6

const SPIKE_COUNT = 14
const SPIKE_UP = new THREE.Vector3(0, 1, 0)
const SPIKE_DIRS = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
  new THREE.Vector3(1, 1, 0),
  new THREE.Vector3(-1, 1, 0),
  new THREE.Vector3(1, -1, 0),
  new THREE.Vector3(-1, -1, 0),
  new THREE.Vector3(1, 0, 1),
  new THREE.Vector3(-1, 0, 1),
  new THREE.Vector3(1, 0, -1),
  new THREE.Vector3(-1, 0, -1),
].map((v) => v.normalize())

function Spikes({ radius }: { radius: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!)

  const geo = useMemo(() => new THREE.ConeGeometry(0.11, 0.32, 10), [])
  const mat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#ff3030',
      emissive: new THREE.Color('#ff3030'),
      emissiveIntensity: 0.6,
      metalness: 0.7,
      roughness: 0.3,
    })
  }, [])

  useEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3(1, 1, 1)

    for (let i = 0; i < SPIKE_DIRS.length; i++) {
      const dir = SPIKE_DIRS[i]
      q.setFromUnitVectors(SPIKE_UP, dir)
      p.copy(dir).multiplyScalar(radius * 0.7)
      m.compose(p, q, s)
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [radius])

  return <instancedMesh ref={ref} args={[geo, mat, SPIKE_COUNT]} />
}

// Shared raycaster (avoids per-frame allocations)
const _raycaster = new THREE.Raycaster()
const _rayOrigin = new THREE.Vector3()
const _rayDir = new THREE.Vector3(0, -1, 0)
const _outPos = new THREE.Vector3()

export function Ball({ level, onPositionUpdate, trackMeshes, obstacleMeshes }: BallProps) {
  const { gameState, endGame, updateSpeed, tickRun } = useGame()
  const input = useInput()

  const [ballForm, setBallForm] = useState<'normal' | 'spiky'>('normal')

  const cylinderSections = useMemo(() => computeCylinderSections(level), [level])

  // State refs avoid re-renders on every frame
  const posRef = useRef(new THREE.Vector3(level.start.x, level.start.y, level.start.z))
  const velRef = useRef(new THREE.Vector3(0, 0, 0))
  const speedRef = useRef(level.baseSpeed)
  const aliveTimer = useRef(0)
  const deadRef = useRef(false)
  const onGroundRef = useRef(false)
  const hudTimer = useRef(0)
  const groupRef = useRef<THREE.Group>(null!)

  const wasJumpHeldRef = useRef(false)
  const coyoteTimerRef = useRef(0)
  const jumpBufferRef = useRef(0)
  const prevGroundYRef = useRef<number | null>(null)
  const lastGroundVyRef = useRef(0)

  // Cylinder mode state
  const inCylinderRef = useRef(false)
  const cylThetaRef = useRef(-Math.PI / 2)
  const cylAngVelRef = useRef(0)
  const cylSectionRef = useRef<CylinderSection | null>(null)
  // Smooth radial blend so ball "settles" onto wall instead of snapping
  const cylEntryRadiusRef = useRef(0)
  const cylEntryBlendRef = useRef(1)

  // Reset all state when a new run starts
  useEffect(() => {
    if (gameState === 'playing') {
      posRef.current.set(level.start.x, level.start.y, level.start.z)
      velRef.current.set(0, 0, 0)
      speedRef.current = level.baseSpeed
      aliveTimer.current = 0
      deadRef.current = false
      onGroundRef.current = false
      wasJumpHeldRef.current = false
      coyoteTimerRef.current = 0
      jumpBufferRef.current = 0
      prevGroundYRef.current = null
      lastGroundVyRef.current = 0

      inCylinderRef.current = false
      cylThetaRef.current = -Math.PI / 2
      cylAngVelRef.current = 0
      cylSectionRef.current = null
      cylEntryBlendRef.current = 1
      cylEntryRadiusRef.current = 0
      setBallForm('normal')
    }
  }, [gameState, level])

  // Direct event listener for zero-delay jump registration
  useEffect(() => {
    const onJumpDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        jumpBufferRef.current = JUMP_BUFFER_TIME
      }
    }
    const onTouchJump = (e: TouchEvent) => {
      // Top 45% of screen = jump zone
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].clientY < window.innerHeight * 0.45) {
          jumpBufferRef.current = JUMP_BUFFER_TIME
          break
        }
      }
    }
    window.addEventListener('keydown', onJumpDown)
    window.addEventListener('touchstart', onTouchJump, { passive: true })
    return () => {
      window.removeEventListener('keydown', onJumpDown)
      window.removeEventListener('touchstart', onTouchJump)
    }
  }, [])

  // Reusable vectors for obstacle AABB checks (avoids allocations)
  const obsBoxMin = useRef(new THREE.Vector3())
  const obsBoxMax = useRef(new THREE.Vector3())
  const obsWorldPos = useRef(new THREE.Vector3())
  const obsBox = useRef(new THREE.Box3())

  useFrame((_, delta) => {
    if (gameState !== 'playing') return
    if (deadRef.current) return

    // Clamp delta to avoid "slow motion" on FPS dips
    const dt = Math.min(delta, 0.08)
    aliveTimer.current += dt

    const pos = posRef.current
    const vel = velRef.current

    const wasOnGround = onGroundRef.current

    if (jumpBufferRef.current > 0) {
      jumpBufferRef.current -= dt
    }

    // Accelerate forward speed progressively
    speedRef.current = Math.min(
      speedRef.current + level.acceleration * dt,
      level.maxSpeed
    )
    const fwd = speedRef.current

    // Accumulate run stats (time + distance) every frame
    tickRun(dt, fwd)

    // Find active cylinder section (if any)
    let activeCylinder: CylinderSection | null = null
    for (const sec of cylinderSections) {
      if (isInsideCylinder(sec, pos.z)) {
        activeCylinder = sec
        break
      }
    }

    if (activeCylinder) {
      // Transition into cylinder
      if (!inCylinderRef.current || cylSectionRef.current !== activeCylinder) {
        inCylinderRef.current = true
        cylSectionRef.current = activeCylinder

        const dx = pos.x
        const dy = pos.y - activeCylinder.centerY
        const startRadius = Math.sqrt(dx * dx + dy * dy)
        const theta = Math.atan2(dy, dx)
        cylThetaRef.current = Number.isFinite(theta) ? theta : -Math.PI / 2
        cylAngVelRef.current = 0
        cylEntryRadiusRef.current = Math.max(0.1, startRadius)
        cylEntryBlendRef.current = 0

        // Clear velocities to avoid fighting the cylinder constraints
        vel.set(0, 0, 0)
        prevGroundYRef.current = null
        lastGroundVyRef.current = 0
        coyoteTimerRef.current = 0
        jumpBufferRef.current = 0
        onGroundRef.current = false

        setBallForm('spiky')
      }

      const sec = activeCylinder
      const surfaceRadius = sec.radius
      const wallRideRadius = Math.max(0.6, surfaceRadius - BALL_RADIUS - CYL_WALL_CLEARANCE)
      // Smoothstep blend from entry radius → wall radius
      cylEntryBlendRef.current = Math.min(1, cylEntryBlendRef.current + dt / CYL_ENTRY_BLEND)
      const easedBlend = cylEntryBlendRef.current * cylEntryBlendRef.current * (3 - 2 * cylEntryBlendRef.current)
      const ballCenterRadius =
        cylEntryRadiusRef.current + (wallRideRadius - cylEntryRadiusRef.current) * easedBlend

      const tunnelFwd = Math.min(fwd * CYL_FORWARD_MULT, level.baseSpeed + CYL_MAX_SPEED_ADD)

      const left = input.current.has('ArrowLeft') || input.current.has('KeyA')
      const right = input.current.has('ArrowRight') || input.current.has('KeyD')

      // Cap angular velocity so surface speed stays consistent across different radii
      const radiusForCap = Math.max(1.0, ballCenterRadius)
      const maxAngVel = Math.min(
        CYL_MAX_MAX_ANG_VEL,
        Math.max(CYL_MIN_MAX_ANG_VEL, CYL_TARGET_SURFACE_SPEED / radiusForCap)
      )

      const inputAxis = (right ? 1 : 0) - (left ? 1 : 0)
      const desiredAngVel = inputAxis * maxAngVel

      // Sub-steps keep collision stable even when FPS dips
      const maxStep = 0.02
      const steps = Math.min(6, Math.max(1, Math.ceil(dt / maxStep)))
      const stepDt = dt / steps

      let rotX = 0
      let rotZ = 0
      const ballArc = (BALL_RADIUS * 0.7) / Math.max(1.0, ballCenterRadius)

      for (let s = 0; s < steps; s++) {
        const a = 1 - Math.exp(-CYL_TURN_RESPONSE * stepDt)
        cylAngVelRef.current = cylAngVelRef.current + (desiredAngVel - cylAngVelRef.current) * a

        cylThetaRef.current += cylAngVelRef.current * stepDt
        cylThetaRef.current = cylinderAngleDelta(cylThetaRef.current, 0)

        pos.x = Math.cos(cylThetaRef.current) * ballCenterRadius
        pos.y = sec.centerY + Math.sin(cylThetaRef.current) * ballCenterRadius
        pos.z -= tunnelFwd * stepDt

        rotX += tunnelFwd * stepDt * 0.55
        rotZ += cylAngVelRef.current * stepDt * 0.9

        for (const obs of sec.obstacles) {
          const dz = Math.abs(pos.z - obs.z)
          if (dz > obs.depth * 0.5 + BALL_RADIUS) continue

          const dTheta = Math.abs(cylinderAngleDelta(cylThetaRef.current, obs.angle))
          if (dTheta < obs.arc * 0.5 + ballArc) {
            if (!deadRef.current) {
              deadRef.current = true
              endGame()
            }
            return
          }
        }

        if (pos.z < sec.endZ) break
      }

      // Exit cylinder when ball passes the end
      if (pos.z < sec.endZ) {
        inCylinderRef.current = false
        cylSectionRef.current = null
        cylAngVelRef.current = 0
        cylEntryBlendRef.current = 1
        cylEntryRadiusRef.current = 0
        cylThetaRef.current = -Math.PI / 2
        pos.x = 0
        pos.y = sec.surfaceY + BALL_RADIUS
        vel.set(0, 0, 0)
        setBallForm('normal')
      }

      if (groupRef.current) {
        groupRef.current.position.copy(pos)
        groupRef.current.rotation.x -= rotX
        groupRef.current.rotation.z -= rotZ
      }

      _outPos.copy(pos)
      onPositionUpdate(_outPos)
      hudTimer.current += dt
      if (hudTimer.current >= HUD_UPDATE_INTERVAL) {
        hudTimer.current = 0
        updateSpeed(tunnelFwd)
      }
      return
    } else {
      // Normalize if we somehow left the cylinder without a clean exit
      if (inCylinderRef.current) {
        inCylinderRef.current = false
        cylSectionRef.current = null
        cylAngVelRef.current = 0
        cylEntryBlendRef.current = 1
        cylEntryRadiusRef.current = 0
        setBallForm('normal')
      }
    }

    // Lateral steering
    if (input.current.has('ArrowLeft') || input.current.has('KeyA')) {
      vel.x -= LATERAL_ACCEL * dt
    }
    if (input.current.has('ArrowRight') || input.current.has('KeyD')) {
      vel.x += LATERAL_ACCEL * dt
    }
    // Frame-rate independent lateral damping
    const lateralDamp = Math.exp(-LATERAL_FRICTION * dt)
    vel.x *= lateralDamp
    if (vel.x > LATERAL_MAX_SPEED) vel.x = LATERAL_MAX_SPEED
    if (vel.x < -LATERAL_MAX_SPEED) vel.x = -LATERAL_MAX_SPEED

    vel.y -= GRAVITY * dt

    // Coyote time: lets player jump briefly after leaving an edge
    if (wasOnGround) coyoteTimerRef.current = COYOTE_TIME
    else if (coyoteTimerRef.current > 0) coyoteTimerRef.current = Math.max(0, coyoteTimerRef.current - dt)

    pos.x += vel.x * dt
    pos.y += vel.y * dt
    pos.z -= fwd * dt

    // Floor detection: ray starts above ball to survive fast falls
    _rayOrigin.set(pos.x, pos.y + 6, pos.z)
    _raycaster.set(_rayOrigin, _rayDir)
    _raycaster.far = RAY_FAR

    const hits = _raycaster.intersectObjects(trackMeshes.current, false)
    let grounded = false

    if (hits.length > 0) {
      const floorY = hits[0].point.y
      const targetY = floorY + BALL_RADIUS

      if (pos.y <= targetY + GROUND_TOLERANCE) {
        const snapUp = targetY - pos.y
        // Ignore if we'd need to snap up more than allowed — ball fell through, keep falling
        if (snapUp > MAX_GROUND_SNAP_UP) {
          grounded = false
        } else {
          grounded = true

          if (prevGroundYRef.current != null) {
            lastGroundVyRef.current = (targetY - prevGroundYRef.current) / dt
          }
          prevGroundYRef.current = targetY

          pos.y = targetY
          if (vel.y < 0) vel.y = 0
        }
      }
    }

    if (!grounded) {
      // Preserve ramp launch momentum when leaving ground naturally (not jumping)
      if (wasOnGround && jumpBufferRef.current <= 0) {
        const launchVy = Math.max(0, lastGroundVyRef.current)
        if (launchVy > vel.y) vel.y = launchVy
      }
      prevGroundYRef.current = null
    }

    // Buffered jump: resolves after grounding is confirmed for smooth land+jump
    const canJump = grounded || coyoteTimerRef.current > 0
    if (jumpBufferRef.current > 0 && canJump) {
      vel.y = JUMP_VELOCITY
      pos.y += vel.y * dt
      grounded = false
      coyoteTimerRef.current = 0
      jumpBufferRef.current = 0
      prevGroundYRef.current = null
    }

    onGroundRef.current = grounded

    if (groupRef.current) {
      groupRef.current.position.copy(pos)
      groupRef.current.rotation.x -= fwd * dt * 0.8
      groupRef.current.rotation.z -= vel.x * dt * 0.5
    }

    // Obstacle collision (sphere vs AABB).
    // Grace period prevents instant death on spawn before meshes settle.
    if (aliveTimer.current > 0.4) {
      for (const obs of obstacleMeshes.current) {
        if (!obs.parent) continue

        // Force world matrix update — avoids stale (0,0,0) positions on newly mounted meshes
        obs.updateWorldMatrix(true, false)
        obs.getWorldPosition(obsWorldPos.current)

        // Distance cull: skip obstacles far behind or ahead in Z
        const ozDist = Math.abs(pos.z - obsWorldPos.current.z)
        if (ozDist > 30) continue

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

    // Death: ball fell off the track
    if (aliveTimer.current > 0.8) {
      if (pos.y < -25) {
        if (!deadRef.current) {
          deadRef.current = true
          endGame()
        }
        return
      }
    }

    _outPos.copy(pos)
    onPositionUpdate(_outPos)

    // Throttled HUD update to avoid excessive store writes
    hudTimer.current += dt
    if (hudTimer.current >= HUD_UPDATE_INTERVAL) {
      hudTimer.current = 0
      updateSpeed(fwd)
    }
  })

  return (
    <group ref={groupRef}>
      {ballForm === 'normal' ? (
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
      ) : (
        <group>
          <mesh castShadow>
            <sphereGeometry args={[BALL_RADIUS * 0.85, 24, 24]} />
            <meshStandardMaterial
              color="#ff6a6a"
              emissive="#ff3030"
              emissiveIntensity={0.9}
              metalness={0.85}
              roughness={0.18}
            />
          </mesh>
          <Spikes radius={BALL_RADIUS} />
        </group>
      )}
      {/* Outer glow shell */}
      <mesh scale={ballForm === 'spiky' ? 1.12 : 1.4}>
        <sphereGeometry args={[BALL_RADIUS, 16, 16]} />
        <meshBasicMaterial
          color={ballForm === 'spiky' ? '#ff3030' : '#00f5ff'}
          transparent
          opacity={ballForm === 'spiky' ? 0.05 : 0.07}
          side={THREE.BackSide}
        />
      </mesh>
      <pointLight color={ballForm === 'spiky' ? '#ff3030' : '#00f5ff'} intensity={ballForm === 'spiky' ? 1.6 : 2} distance={8} />
    </group>
  )
}
