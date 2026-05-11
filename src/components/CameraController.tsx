import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../store/gameStore'

interface CameraControllerProps {
  ballPosition: React.MutableRefObject<THREE.Vector3>
}

const BASE_OFFSET = new THREE.Vector3(0, 5.5, 12)
// BASE_LERP was previously a per-frame lerp factor (FPS dependent).
// Convert it into a per-second smoothing constant via exponential smoothing.
const BASE_SMOOTHING = 6.3 // roughly matches 0.10 lerp @ ~60fps

export function CameraController({ ballPosition }: CameraControllerProps) {
  const { currentLevel, currentSpeed } = useGame()
  const { camera } = useThree()
  const targetPos = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const ball = ballPosition.current
    if (!ball) return

    // Pull camera back slightly as speed increases (speed sensation)
    const speedRatio = Math.min(1, (currentSpeed - currentLevel.baseSpeed) / (currentLevel.maxSpeed - currentLevel.baseSpeed))
    const extraZ = speedRatio * 3.5    // up to 3.5 units further back
    const extraY = speedRatio * 1.2    // up to 1.2 units higher

    targetPos.current.set(
      ball.x * 0.45,
      ball.y + BASE_OFFSET.y + extraY,
      ball.z + BASE_OFFSET.z + extraZ
    )

    // Frame-rate independent smoothing (snappier at high speed)
    const smoothing = BASE_SMOOTHING + speedRatio * 2.5
    const t = 1 - Math.exp(-smoothing * Math.min(delta, 0.05))
    camera.position.lerp(targetPos.current, t)
    camera.lookAt(ball.x * 0.3, ball.y + 1.2, ball.z - 5)
  })

  return null
}
