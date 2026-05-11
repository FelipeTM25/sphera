import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../store/gameStore'
import { computeCylinderSections, type CylinderSection } from '../cylinder'

interface CameraControllerProps {
  ballPosition: React.MutableRefObject<THREE.Vector3>
}

const BASE_OFFSET = new THREE.Vector3(0, 5.5, 12)
// Exponential smoothing constant — roughly matches 0.10 lerp @ 60fps
const BASE_SMOOTHING = 6.3

const CYL_APPROACH_DISTANCE = 28
const CYL_EXIT_BLEND_DISTANCE = 18
const CYL_CAM_Y_OFFSET = 1.2
const CYL_CAM_BACK = 14.5
const CYL_LOOK_AHEAD = 12
const CYL_FOV_BOOST = 6

function pickCylinderForCamera(sections: CylinderSection[], ballZ: number): { section: CylinderSection; influence: number } | null {
  if (sections.length === 0) return null
  let best: { section: CylinderSection; influence: number } | null = null

  for (const sec of sections) {
    let influence = 0
    if (ballZ <= sec.startZ && ballZ >= sec.endZ) {
      influence = 1
    } else if (ballZ > sec.startZ) {
      const dist = ballZ - sec.startZ
      if (dist <= CYL_APPROACH_DISTANCE) {
        const t = 1 - dist / CYL_APPROACH_DISTANCE
        influence = t * t * (3 - 2 * t) // smoothstep
      }
    } else {
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
  const { currentLevel, currentSpeed, gameState } = useGame()
  const { camera } = useThree()
  const targetPos = useRef(new THREE.Vector3())
  const lookAtPos = useRef(new THREE.Vector3())
  const currentLookAt = useRef(new THREE.Vector3())
  const needsSnapRef = useRef(true)  // snap on next frame when run starts

  const cylinderSections = useMemo(() => computeCylinderSections(currentLevel), [currentLevel])

  const baseFovRef = useRef<number | null>(null)
  if (baseFovRef.current === null && (camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
    baseFovRef.current = (camera as THREE.PerspectiveCamera).fov
  }

  // Whenever a new run starts, snap the camera on the very next frame
  useEffect(() => {
    if (gameState === 'playing') needsSnapRef.current = true
  }, [gameState])

  useFrame((_, delta) => {
    const ball = ballPosition.current
    if (!ball) return

    // Pull camera back and up as speed increases for a sense of velocity
    const speedRatio = Math.min(1, (currentSpeed - currentLevel.baseSpeed) / (currentLevel.maxSpeed - currentLevel.baseSpeed))
    const extraZ = speedRatio * 3.5
    const extraY = speedRatio * 1.2

    const normalTargetX = ball.x * 0.45
    const normalTargetY = ball.y + BASE_OFFSET.y + extraY
    const normalTargetZ = ball.z + BASE_OFFSET.z + extraZ
    const normalLookX = ball.x * 0.3
    const normalLookY = ball.y + 1.2
    const normalLookZ = ball.z - 5

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
      // Cinematic tunnel framing: center on axis, look ahead along tunnel
      const cinTargetX = 0
      const cinTargetY = sec.centerY + CYL_CAM_Y_OFFSET
      const cinTargetZ = ball.z + CYL_CAM_BACK + extraZ * 0.5
      const cinLookX = 0
      const cinLookY = sec.centerY
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

    const dtClamped = Math.min(delta, 0.05)

    if (needsSnapRef.current) {
      // Hard snap: teleport camera to target on first frame of a new run
      camera.position.copy(targetPos.current)
      currentLookAt.current.copy(lookAtPos.current)
      camera.lookAt(currentLookAt.current)
      needsSnapRef.current = false
    } else {
      const smoothing = BASE_SMOOTHING + speedRatio * 2.5 + influence * 2.0
      const t = 1 - Math.exp(-smoothing * dtClamped)
      camera.position.lerp(targetPos.current, t)

      const lookT = 1 - Math.exp(-(smoothing + 2.0) * dtClamped)
      currentLookAt.current.lerp(lookAtPos.current, lookT)
      camera.lookAt(currentLookAt.current)
    }

    // FOV widens slightly inside tunnel for a cinematic feel
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
