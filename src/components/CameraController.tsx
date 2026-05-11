import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../store/gameStore'
import { computeCylinderSections, type CylinderSection } from '../cylinder'

interface CameraControllerProps {
  ballPosition: React.MutableRefObject<THREE.Vector3>
}

const BASE_OFFSET = new THREE.Vector3(0, 5.5, 12)
// BASE_LERP was previously a per-frame lerp factor (FPS dependent).
// Convert it into a per-second smoothing constant via exponential smoothing.
const BASE_SMOOTHING = 6.3 // roughly matches 0.10 lerp @ ~60fps

// Cylinder cinematic framing
const CYL_APPROACH_DISTANCE = 28   // world units before entry where camera starts blending toward tunnel framing
const CYL_EXIT_BLEND_DISTANCE = 18 // world units after exit where camera blends back to normal
const CYL_CAM_Y_OFFSET = 1.2       // raise camera slightly above cylinder axis
const CYL_CAM_BACK = 14.5          // distance behind the ball along Z
const CYL_LOOK_AHEAD = 12          // how far ahead along the tunnel the camera looks
const CYL_FOV_BOOST = 6            // extra FOV degrees while inside the tunnel for a wider feel

function pickCylinderForCamera(sections: CylinderSection[], ballZ: number): { section: CylinderSection; influence: number } | null {
  if (sections.length === 0) return null
  let best: { section: CylinderSection; influence: number } | null = null

  for (const sec of sections) {
    let influence = 0
    if (ballZ <= sec.startZ && ballZ >= sec.endZ) {
      // Inside the cylinder.
      influence = 1
    } else if (ballZ > sec.startZ) {
      // Approaching — start ramping as we get close to startZ.
      const dist = ballZ - sec.startZ
      if (dist <= CYL_APPROACH_DISTANCE) {
        const t = 1 - dist / CYL_APPROACH_DISTANCE
        // smoothstep
        influence = t * t * (3 - 2 * t)
      }
    } else {
      // Past the exit — blend back out.
      const dist = sec.endZ - ballZ
      if (dist <= CYL_EXIT_BLEND_DISTANCE) {
        const t = 1 - dist / CYL_EXIT_BLEND_DISTANCE
        influence = t * t * (3 - 2 * t)
      }
    }

    if (influence > 0 && (!best || influence > best.influence)) {
      best = { section: sec, influence }
    }
  }

  return best
}

export function CameraController({ ballPosition }: CameraControllerProps) {
  const { currentLevel, currentSpeed } = useGame()
  const { camera } = useThree()
  const targetPos = useRef(new THREE.Vector3())
  const lookAtPos = useRef(new THREE.Vector3())
  const currentLookAt = useRef(new THREE.Vector3())

  const cylinderSections = useMemo(() => computeCylinderSections(currentLevel), [currentLevel])

  // Cache the perspective camera's base FOV so we can restore/lerp it.
  const baseFovRef = useRef<number | null>(null)
  if (baseFovRef.current === null && (camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
    baseFovRef.current = (camera as THREE.PerspectiveCamera).fov
  }

  useFrame((_, delta) => {
    const ball = ballPosition.current
    if (!ball) return

    // Pull camera back slightly as speed increases (speed sensation)
    const speedRatio = Math.min(1, (currentSpeed - currentLevel.baseSpeed) / (currentLevel.maxSpeed - currentLevel.baseSpeed))
    const extraZ = speedRatio * 3.5    // up to 3.5 units further back
    const extraY = speedRatio * 1.2    // up to 1.2 units higher

    // Standard third-person framing.
    const normalTargetX = ball.x * 0.45
    const normalTargetY = ball.y + BASE_OFFSET.y + extraY
    const normalTargetZ = ball.z + BASE_OFFSET.z + extraZ
    const normalLookX = ball.x * 0.3
    const normalLookY = ball.y + 1.2
    const normalLookZ = ball.z - 5

    // Detect approach to or presence inside a cylinder section.
    const cyl = pickCylinderForCamera(cylinderSections, ball.z)
    const influence = cyl ? cyl.influence : 0

    let targetX = normalTargetX
    let targetY = normalTargetY
    let targetZ = normalTargetZ
    let lookX = normalLookX
    let lookY = normalLookY
    let lookZ = normalLookZ

    if (cyl && influence > 0) {
      const sec = cyl.section
      // Cinematic tunnel framing: stay on the cylinder axis (X=0), slightly above axis Y,
      // pull back a bit further so the tunnel mouth is fully visible.
      const cinTargetX = 0
      const cinTargetY = sec.centerY + CYL_CAM_Y_OFFSET
      const cinTargetZ = ball.z + CYL_CAM_BACK + extraZ * 0.5
      const cinLookX = 0
      const cinLookY = sec.centerY
      // Look ahead along the tunnel, clamped to the exit so we don't aim past it.
      const cinLookZ = Math.max(sec.endZ + 2, ball.z - CYL_LOOK_AHEAD)

      targetX = THREE.MathUtils.lerp(normalTargetX, cinTargetX, influence)
      targetY = THREE.MathUtils.lerp(normalTargetY, cinTargetY, influence)
      targetZ = THREE.MathUtils.lerp(normalTargetZ, cinTargetZ, influence)
      lookX = THREE.MathUtils.lerp(normalLookX, cinLookX, influence)
      lookY = THREE.MathUtils.lerp(normalLookY, cinLookY, influence)
      lookZ = THREE.MathUtils.lerp(normalLookZ, cinLookZ, influence)
    }

    targetPos.current.set(targetX, targetY, targetZ)
    lookAtPos.current.set(lookX, lookY, lookZ)

    // Frame-rate independent smoothing. Boost smoothing slightly inside the tunnel
    // so the transition is fast enough to feel intentional.
    const dtClamped = Math.min(delta, 0.05)
    const smoothing = BASE_SMOOTHING + speedRatio * 2.5 + influence * 2.0
    const t = 1 - Math.exp(-smoothing * dtClamped)
    camera.position.lerp(targetPos.current, t)

    // Smooth the lookAt target as well to avoid snapping when the framing changes.
    const lookT = 1 - Math.exp(-(smoothing + 2.0) * dtClamped)
    currentLookAt.current.lerp(lookAtPos.current, lookT)
    camera.lookAt(currentLookAt.current)

    // Gentle FOV widening inside the tunnel for a cinematic feel.
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera && baseFovRef.current != null) {
      const persp = camera as THREE.PerspectiveCamera
      const targetFov = baseFovRef.current + CYL_FOV_BOOST * influence
      const fovT = 1 - Math.exp(-4.5 * dtClamped)
      const next = persp.fov + (targetFov - persp.fov) * fovT
      if (Math.abs(next - persp.fov) > 0.01) {
        persp.fov = next
        persp.updateProjectionMatrix()
      }
    }
  })

  return null
}
