import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CylinderSection, CylinderObstacle } from '../cylinder'

export function CylinderTunnel({ section }: { section: CylinderSection }) {
  const length = Math.abs(section.endZ - section.startZ)
  const centerZ = (section.startZ + section.endZ) * 0.5

  const cylGeo = useMemo(() => {
    const radialSegments = 24
    const geo = new THREE.CylinderGeometry(section.radius, section.radius, length, radialSegments, 1, true)
    // CylinderGeometry is along Y; rotate to align along Z.
    geo.rotateX(Math.PI / 2)
    return geo
  }, [section.radius, length])

  const obstacles = section.obstacles

  const obstacleDepth = obstacles[0]?.depth ?? 6
  const instRef = useRef<THREE.InstancedMesh>(null!)

  const obstacleGeo = useMemo(() => {
    return new THREE.BoxGeometry(1.15, 0.9, obstacleDepth)
  }, [obstacleDepth])

  const obstacleMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#ff3030',
    })
  }, [])

  useEffect(() => {
    const mesh = instRef.current
    if (!mesh) return
    if (obstacles.length === 0) return

    const surfaceRadius = section.radius
    const protrusion = 0.75
    const blockRadialCenter = surfaceRadius - protrusion * 0.5 - 0.05

    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3(1, 1, 1)
    const e = new THREE.Euler()

    for (let i = 0; i < obstacles.length; i++) {
      const obs: CylinderObstacle = obstacles[i]
      p.set(
        Math.cos(obs.angle) * blockRadialCenter,
        section.centerY + Math.sin(obs.angle) * blockRadialCenter,
        obs.z
      )
      e.set(0, -obs.angle, 0)
      q.setFromEuler(e)
      m.compose(p, q, s)
      mesh.setMatrixAt(i, m)
    }

    mesh.instanceMatrix.needsUpdate = true
  }, [obstacles, section.centerY, section.radius])

  return (
    <group>
      {/* Cylinder wall (inner surface) */}
      <mesh geometry={cylGeo} position={[0, section.centerY, centerZ]}>
        <meshBasicMaterial
          color="#071428"
          side={THREE.DoubleSide}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Neon rim at entry */}
      <mesh position={[0, section.centerY, section.startZ]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[section.radius + 0.04, 0.06, 10, 80]} />
        <meshBasicMaterial color="#00f5ff" transparent opacity={0.65} />
      </mesh>

      {/* Neon rim at exit */}
      <mesh position={[0, section.centerY, section.endZ]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[section.radius + 0.04, 0.06, 10, 80]} />
        <meshBasicMaterial color="#39ff14" transparent opacity={0.55} />
      </mesh>

      {/* Obstacles on inner wall */}
      {obstacles.length > 0 && (
        <instancedMesh ref={instRef} args={[obstacleGeo, obstacleMat, obstacles.length]} />
      )}
    </group>
  )
}
