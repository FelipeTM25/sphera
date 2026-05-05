import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface CameraControllerProps {
  ballPosition: React.MutableRefObject<THREE.Vector3>
}

const CAMERA_OFFSET = new THREE.Vector3(0, 5.5, 12)
const LERP_SPEED = 0.08

export function CameraController({ ballPosition }: CameraControllerProps) {
  const { camera } = useThree()
  const targetPos = useRef(new THREE.Vector3())

  useFrame(() => {
    const ball = ballPosition.current
    if (!ball) return

    targetPos.current.set(
      ball.x * 0.5, // partial follow on X for better feel
      ball.y + CAMERA_OFFSET.y,
      ball.z + CAMERA_OFFSET.z
    )

    camera.position.lerp(targetPos.current, LERP_SPEED)
    camera.lookAt(ball.x * 0.3, ball.y + 1, ball.z - 4)
  })

  return null
}
