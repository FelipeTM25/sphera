import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { CylinderSection, CylinderObstacle } from '../cylinder'

export function CylinderTunnel({ section }: { section: CylinderSection }) {
  const length = Math.abs(section.endZ - section.startZ)
  const centerZ = (section.startZ + section.endZ) * 0.5

  const cylGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(section.radius, section.radius, length, 20, 1, true)
    geo.rotateX(Math.PI / 2)
    return geo
  }, [section.radius, length])

  // Rings spaced along the tunnel for depth perception
  const intermediateRings = useMemo(() => {
    const ringCount = Math.max(2, Math.min(6, Math.round(length / 22)))
    const positions: number[] = []
    for (let i = 1; i <= ringCount; i++) {
      const t = i / (ringCount + 1)
      positions.push(section.startZ + (section.endZ - section.startZ) * t)
    }
    return positions
  }, [length, section.startZ, section.endZ])

  // Approach rings outside the entry give a visual cue before the mechanic change
  const approachRings = useMemo(() => {
    return [3.5, 7.5, 12].map((d) => section.startZ + d)
  }, [section.startZ])

  const obstacles = section.obstacles

  const obstacleDepth = obstacles[0]?.depth ?? 6
  const instRef = useRef<THREE.InstancedMesh>(null!)

  const obstacleGeo = useMemo(() => {
    return new THREE.BoxGeometry(1.25, 1.0, obstacleDepth)
  }, [obstacleDepth])

  // MeshBasic: no lighting cost; color stays vivid regardless of scene lighting
  const obstacleMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({ color: '#ff2a2a' })
  }, [])

  const entryRimMat = useRef<THREE.MeshBasicMaterial>(null!)
  const exitRimMat = useRef<THREE.MeshBasicMaterial>(null!)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (entryRimMat.current) {
      entryRimMat.current.opacity = 0.6 + Math.sin(t * 2.4) * 0.2
    }
    if (exitRimMat.current) {
      exitRimMat.current.opacity = 0.5 + Math.sin(t * 2.4 + Math.PI / 2) * 0.2
    }
  })

  useEffect(() => {
    const mesh = instRef.current
    if (!mesh) return
    if (obstacles.length === 0) return

    const surfaceRadius = section.radius
    const protrusion = 0.85
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
      {/* BackSide renders only the inner face (we're always inside the tunnel) */}
      <mesh geometry={cylGeo} position={[0, section.centerY, centerZ]}>
        <meshBasicMaterial color="#08172c" side={THREE.BackSide} />
      </mesh>

      {approachRings.map((z, i) => {
        const opacity = 0.35 - i * 0.09
        return (
          <mesh key={`approach-${i}`} position={[0, section.centerY, z]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[section.radius + 0.05 + i * 0.05, 0.05, 8, 48]} />
            <meshBasicMaterial color="#00f5ff" transparent opacity={opacity} />
          </mesh>
        )
      })}

      <mesh position={[0, section.centerY, section.startZ]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[section.radius + 0.04, 0.12, 10, 64]} />
        <meshBasicMaterial ref={entryRimMat} color="#00f5ff" transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, section.centerY, section.startZ]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[section.radius + 0.5, 0.28, 8, 40]} />
        <meshBasicMaterial color="#00f5ff" transparent opacity={0.16} side={THREE.BackSide} />
      </mesh>

      <mesh position={[0, section.centerY, section.endZ]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[section.radius + 0.04, 0.1, 10, 64]} />
        <meshBasicMaterial ref={exitRimMat} color="#39ff14" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, section.centerY, section.endZ]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[section.radius + 0.5, 0.28, 8, 40]} />
        <meshBasicMaterial color="#39ff14" transparent opacity={0.14} side={THREE.BackSide} />
      </mesh>

      {intermediateRings.map((z, i) => (
        <mesh key={`ring-${i}`} position={[0, section.centerY, z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[section.radius - 0.02, 0.04, 6, 48]} />
          <meshBasicMaterial color="#5cf0ff" transparent opacity={0.28} />
        </mesh>
      ))}

      {obstacles.length > 0 && (
        <instancedMesh ref={instRef} args={[obstacleGeo, obstacleMat, obstacles.length]} />
      )}
    </group>
  )
}
