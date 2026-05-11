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
  /** Refs to all track meshes for floor raycasting */
  trackMeshes: React.MutableRefObject<THREE.Mesh[]>
  /** Refs to all obstacle meshes for collision */
  obstacleMeshes: React.MutableRefObject<THREE.Mesh[]>
}

// ─── Tuning ──────────────────────────────────────────────────────────────────
const GRAVITY = 45          // units/sec²
const LATERAL_ACCEL = 140     // lateral acceleration (units/sec²)
const LATERAL_FRICTION = 9.5  // higher = stronger damping (units: 1/sec)
const LATERAL_MAX_SPEED = 15  // cap for controllability
const BALL_RADIUS = 0.5
const GROUND_TOLERANCE = 0.18  // how close to floor = "on ground" (absorbs 1 frame of fall)
const MAX_GROUND_SNAP_UP = 1.25 // max upward correction allowed when grounding (prevents snapping back after falling)
const RAY_FAR = 80             // long enough for any drop height
const HUD_UPDATE_INTERVAL = 0.05  // seconds between store speed updates (perf)

const JUMP_VELOCITY = 20
const COYOTE_TIME = 0.11        // seconds allowed to jump after leaving ground
const JUMP_BUFFER_TIME = 0.12   // seconds jump can be queued before landing

// Cylinder steering is tuned for "delicate" feel: target angular velocity with
// exponential smoothing (frame-rate independent) + small substeps on long dt.
// Max angular velocity is scaled by radius so wider tunnels don't feel hyper-sensitive
// (surface speed = radius * angVel, so we cap surface speed instead).
const CYL_TURN_RESPONSE = 11.0       // 1/sec (lower = more weight / less snap)
const CYL_TARGET_SURFACE_SPEED = 18  // target linear lateral surface speed (units/sec)
const CYL_MIN_MAX_ANG_VEL = 2.6      // floor so very wide tunnels still feel responsive
const CYL_MAX_MAX_ANG_VEL = 5.0      // ceiling so narrow tunnels never feel twitchy
const CYL_FORWARD_MULT = 0.82        // forward speed multiplier inside tunnel
const CYL_MAX_SPEED_ADD = 18         // cap forward speed inside tunnel over baseSpeed
const CYL_WALL_CLEARANCE = 0.22      // small gap between ball surface and cylinder wall (visual)
const CYL_ENTRY_BLEND = 0.6          // seconds to smoothly settle ball onto wall on entry

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

// ─── Raycaster ───────────────────────────────────────────────────────────────
const _raycaster = new THREE.Raycaster()
const _rayOrigin = new THREE.Vector3()
const _rayDir = new THREE.Vector3(0, -1, 0)
const _outPos = new THREE.Vector3()

export function Ball({ level, onPositionUpdate, trackMeshes, obstacleMeshes }: BallProps) {
  const { gameState, endGame, updateSpeed } = useGame()
  const input = useInput()

  const [ballForm, setBallForm] = useState<'normal' | 'spiky'>('normal')

  const cylinderSections = useMemo(() => computeCylinderSections(level), [level])

  // ── State refs (avoid re-renders) ──────────────────────────────────────────
  const posRef = useRef(new THREE.Vector3(level.start.x, level.start.y, level.start.z))
  const velRef = useRef(new THREE.Vector3(0, 0, 0))   // x=lateral, y=vertical, z=unused (manual forward)
  const speedRef = useRef(level.baseSpeed)             // current forward speed
  const aliveTimer = useRef(0)
  const deadRef = useRef(false)
  const onGroundRef = useRef(false)
  const hudTimer = useRef(0)
  const groupRef = useRef<THREE.Group>(null!)

  // Jump/grounding helpers
  const wasJumpHeldRef = useRef(false)
  const coyoteTimerRef = useRef(0)
  const jumpBufferRef = useRef(0)
  const prevGroundYRef = useRef<number | null>(null)
  const lastGroundVyRef = useRef(0)

  // Cylinder mode
  const inCylinderRef = useRef(false)
  const cylThetaRef = useRef(-Math.PI / 2) // bottom by default
  const cylAngVelRef = useRef(0)
  const cylSectionRef = useRef<CylinderSection | null>(null)
  // Smooth radial blend on entry so the ball "settles" onto the wall instead of teleporting.
  const cylEntryRadiusRef = useRef(0)
  const cylEntryBlendRef = useRef(1) // 0 = just entered, 1 = fully on the wall

  // ── Reset on game start ────────────────────────────────────────────────────
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

  // ── Obstacle detection helpers ─────────────────────────────────────────────
  const obsBoxMin = useRef(new THREE.Vector3())
  const obsBoxMax = useRef(new THREE.Vector3())
  const obsWorldPos = useRef(new THREE.Vector3())
  const obsBox = useRef(new THREE.Box3())

  // ── Main loop ─────────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    if (gameState !== 'playing') return
    if (deadRef.current) return

    // Slightly higher clamp avoids "slow motion" if FPS dips briefly.
    const dt = Math.min(delta, 0.08)
    aliveTimer.current += dt

    const pos = posRef.current
    const vel = velRef.current

    const wasOnGround = onGroundRef.current

    // Jump input: edge-triggered + buffer (works for both keyboard and touch)
    const jumpHeld = input.current.has('Space')
    const jumpPressed = jumpHeld && !wasJumpHeldRef.current
    wasJumpHeldRef.current = jumpHeld
    if (jumpPressed) {
      jumpBufferRef.current = JUMP_BUFFER_TIME
    } else if (jumpBufferRef.current > 0) {
      jumpBufferRef.current = Math.max(0, jumpBufferRef.current - dt)
    }

    // 1. Accelerate forward speed progressively
    speedRef.current = Math.min(
      speedRef.current + level.acceleration * dt,
      level.maxSpeed
    )
    const fwd = speedRef.current

    // Detect cylinder section (if any)
    let activeCylinder: CylinderSection | null = null
    for (const sec of cylinderSections) {
      if (isInsideCylinder(sec, pos.z)) {
        activeCylinder = sec
        break
      }
    }

    // ── Cylinder mode update ───────────────────────────────────────────────
    if (activeCylinder) {
      // Transition into cylinder
      if (!inCylinderRef.current || cylSectionRef.current !== activeCylinder) {
        inCylinderRef.current = true
        cylSectionRef.current = activeCylinder

        // Estimate starting radius and angle from current position relative to cylinder center.
        const dx = pos.x
        const dy = pos.y - activeCylinder.centerY
        const startRadius = Math.sqrt(dx * dx + dy * dy)
        const theta = Math.atan2(dy, dx)
        cylThetaRef.current = Number.isFinite(theta) ? theta : -Math.PI / 2
        cylAngVelRef.current = 0
        cylEntryRadiusRef.current = Math.max(0.1, startRadius)
        cylEntryBlendRef.current = 0 // start blending from current radius -> wall radius

        // Clear vertical/lateral velocities to avoid fighting constraints.
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
      // Ride close to the wall: just enough clearance for the spiky/glow shell.
      const wallRideRadius = Math.max(0.6, surfaceRadius - BALL_RADIUS - CYL_WALL_CLEARANCE)
      // Smooth radial settle on entry (frame-rate independent).
      cylEntryBlendRef.current = Math.min(1, cylEntryBlendRef.current + dt / CYL_ENTRY_BLEND)
      const easedBlend = cylEntryBlendRef.current * cylEntryBlendRef.current * (3 - 2 * cylEntryBlendRef.current) // smoothstep
      const ballCenterRadius =
        cylEntryRadiusRef.current + (wallRideRadius - cylEntryRadiusRef.current) * easedBlend

      // Slow down forward motion inside the tunnel for better control
      const tunnelFwd = Math.min(fwd * CYL_FORWARD_MULT, level.baseSpeed + CYL_MAX_SPEED_ADD)

      // Angular controls (left/right): rotate around cylinder
      const left = input.current.has('ArrowLeft') || input.current.has('KeyA')
      const right = input.current.has('ArrowRight') || input.current.has('KeyD')

      // Cap angular velocity so surface linear speed stays consistent regardless of radius.
      const radiusForCap = Math.max(1.0, ballCenterRadius)
      const maxAngVel = Math.min(
        CYL_MAX_MAX_ANG_VEL,
        Math.max(CYL_MIN_MAX_ANG_VEL, CYL_TARGET_SURFACE_SPEED / radiusForCap)
      )

      const inputAxis = (right ? 1 : 0) - (left ? 1 : 0)
      const desiredAngVel = inputAxis * maxAngVel

      // Sub-step cylinder integration on long frames to avoid visible stutter.
      // Keeps motion + collision stable even if FPS dips.
      const maxStep = 0.02
      const steps = Math.min(6, Math.max(1, Math.ceil(dt / maxStep)))
      const stepDt = dt / steps

      let rotX = 0
      let rotZ = 0
      const ballArc = BALL_RADIUS / Math.max(1.0, ballCenterRadius)

      for (let s = 0; s < steps; s++) {
        // Exponential smoothing toward desired angular velocity (FPS independent)
        const a = 1 - Math.exp(-CYL_TURN_RESPONSE * stepDt)
        cylAngVelRef.current = cylAngVelRef.current + (desiredAngVel - cylAngVelRef.current) * a

        // Integrate angle + forward
        cylThetaRef.current += cylAngVelRef.current * stepDt
        // Keep theta bounded to avoid numeric drift.
        cylThetaRef.current = cylinderAngleDelta(cylThetaRef.current, 0)

        pos.x = Math.cos(cylThetaRef.current) * ballCenterRadius
        pos.y = sec.centerY + Math.sin(cylThetaRef.current) * ballCenterRadius
        pos.z -= tunnelFwd * stepDt

        rotX += tunnelFwd * stepDt * 0.55
        rotZ += cylAngVelRef.current * stepDt * 0.9

        // Collision vs cylinder obstacles
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

        // Exit cylinder mid-step if we pass beyond endZ
        if (pos.z < sec.endZ) break
      }

      // Exit cylinder: once we pass beyond endZ
      if (pos.z < sec.endZ) {
        inCylinderRef.current = false
        cylSectionRef.current = null
        cylAngVelRef.current = 0
        cylEntryBlendRef.current = 1
        cylEntryRadiusRef.current = 0
        // Re-enter normal track at the bottom of the cylinder.
        cylThetaRef.current = -Math.PI / 2
        pos.x = 0
        pos.y = sec.surfaceY + BALL_RADIUS
        vel.set(0, 0, 0)
        setBallForm('normal')
      }

      // Visual update
      if (groupRef.current) {
        groupRef.current.position.copy(pos)
        groupRef.current.rotation.x -= rotX
        groupRef.current.rotation.z -= rotZ
      }

      // Report position + HUD speed
      _outPos.copy(pos)
      onPositionUpdate(_outPos)
      hudTimer.current += dt
      if (hudTimer.current >= HUD_UPDATE_INTERVAL) {
        hudTimer.current = 0
        updateSpeed(tunnelFwd)
      }
      return
    } else {
      // If we were in cylinder and left its bounds (should be rare), normalize.
      if (inCylinderRef.current) {
        inCylinderRef.current = false
        cylSectionRef.current = null
        cylAngVelRef.current = 0
        cylEntryBlendRef.current = 1
        cylEntryRadiusRef.current = 0
        setBallForm('normal')
      }
    }

    // 2. Lateral steering with smooth acceleration
    if (input.current.has('ArrowLeft') || input.current.has('KeyA')) {
      vel.x -= LATERAL_ACCEL * dt
    }
    if (input.current.has('ArrowRight') || input.current.has('KeyD')) {
      vel.x += LATERAL_ACCEL * dt
    }
    // Lateral damping (frame-rate independent)
    const lateralDamp = Math.exp(-LATERAL_FRICTION * dt)
    vel.x *= lateralDamp
    // Cap lateral speed for consistent control
    if (vel.x > LATERAL_MAX_SPEED) vel.x = LATERAL_MAX_SPEED
    if (vel.x < -LATERAL_MAX_SPEED) vel.x = -LATERAL_MAX_SPEED

    // 3. Gravity (always) — grounding resolution below will cancel downward motion.
    vel.y -= GRAVITY * dt

    // Coyote timer: refreshed while grounded, counts down in air
    if (wasOnGround) coyoteTimerRef.current = COYOTE_TIME
    else if (coyoteTimerRef.current > 0) coyoteTimerRef.current = Math.max(0, coyoteTimerRef.current - dt)

    // 4. Integrate position
    pos.x += vel.x * dt
    pos.y += vel.y * dt
    pos.z -= fwd * dt  // forward always negative Z

    // 5. No lateral clamping — ball can fall off the edges naturally

    // 6. Floor detection via downward raycast at the NEW position
    // Ray starts above the ball to avoid tunneling if it falls very fast.
    _rayOrigin.set(pos.x, pos.y + 6, pos.z)
    _raycaster.set(_rayOrigin, _rayDir)
    _raycaster.far = RAY_FAR

    const hits = _raycaster.intersectObjects(trackMeshes.current, false)
    let grounded = false

    if (hits.length > 0) {
      const floorY = hits[0].point.y          // world-space Y of track surface
      const targetY = floorY + BALL_RADIUS    // where ball center must sit

      // Ball is "on ground" if its center is within GROUND_TOLERANCE above targetY, or penetrating
      if (pos.y <= targetY + GROUND_TOLERANCE) {
        const snapUp = targetY - pos.y
        // If we're far below the surface, ignore grounding; keep falling.
        // This prevents "auto-climbing" back onto the track after missing a jump.
        if (snapUp > MAX_GROUND_SNAP_UP) {
          grounded = false
        } else {

          grounded = true

          // Follow the ground surface smoothly (no jitter on slopes)
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
      // Leaving the ground: preserve upward slope momentum to make ramp launches feel natural.
      if (wasOnGround && !jumpPressed) {
        const launchVy = Math.max(0, lastGroundVyRef.current)
        if (launchVy > vel.y) vel.y = launchVy
      }
      prevGroundYRef.current = null
    }

    // 6b. Buffered jump resolution AFTER grounding is known (smooth land+jump)
    const canJump = grounded || coyoteTimerRef.current > 0
    if (jumpBufferRef.current > 0 && canJump) {
      vel.y = JUMP_VELOCITY
      grounded = false
      coyoteTimerRef.current = 0
      jumpBufferRef.current = 0
      prevGroundYRef.current = null
    }

    onGroundRef.current = grounded

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

    // 9. Death: fell off track (Y only — no lateral boundary, ball can fall off edges)
    if (aliveTimer.current > 0.8) {
      if (pos.y < -25) {
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
          {/* Core */}
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
      {/* Strong point light attached to ball */}
      <pointLight color={ballForm === 'spiky' ? '#ff3030' : '#00f5ff'} intensity={ballForm === 'spiky' ? 1.6 : 2} distance={8} />
    </group>
  )
}
