import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { TrackSegment, type SegmentDef } from './TrackSegment'
import { Obstacle } from './Obstacle'
import { CylinderTunnel } from './CylinderTunnel'
import { useGame } from '../store/gameStore'
import type { LevelDef, ObstacleDef } from '../levels'
import { computeCylinderSections } from '../cylinder'
import { playStarCollect } from '../audio'

interface TrackProps {
  level: LevelDef
  ballPosition: React.MutableRefObject<THREE.Vector3>
  trackMeshes: React.MutableRefObject<THREE.Mesh[]>
  obstacleMeshes: React.MutableRefObject<THREE.Mesh[]>
}

function obstacleSizeFor(level: LevelDef, def: ObstacleDef, segmentWidth: number): [number, number, number] {
  if (def.size) return [def.size.w, def.size.h, def.size.d]
  switch (def.type) {
    case 'pillar':   return [1.1, 2.2, 1.1]
    case 'gate':     return [1.4, 1.2, 0.7]
    case 'low_wall': return [segmentWidth * 0.95, 0.6, 0.85]
    case 'ramp':     return [segmentWidth * 0.55, 0.75, 2.8]
    case 'barrier':  return [segmentWidth * 0.48, 1.8, 0.75]
    default:         return [level.trackWidth * 0.55, 1.1, 0.7]
  }
}

function createStarShape(outerR: number, innerR: number, points: number): THREE.Shape {
  const shape = new THREE.Shape()
  const step = Math.PI / points
  for (let i = 0; i < points * 2; i++) {
    const angle = i * step - Math.PI / 2
    const r = i % 2 === 0 ? outerR : innerR
    const x = Math.cos(angle) * r
    const y = Math.sin(angle) * r
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

const _starShape = createStarShape(0.38, 0.16, 5)
const _starExtrudeSettings: THREE.ExtrudeGeometryOptions = {
  depth: 0.14,
  bevelEnabled: true,
  bevelThickness: 0.04,
  bevelSize: 0.03,
  bevelSegments: 2,
}

// Shared star geometry (created once, reused by all Star3D instances)
const STAR_GEO = new THREE.ExtrudeGeometry(_starShape, _starExtrudeSettings)
STAR_GEO.center()
STAR_GEO.computeBoundingSphere()

function makeCheckerTexture(cols: number, rows: number, cellSize = 32): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = cols * cellSize
  canvas.height = rows * cellSize
  const ctx = canvas.getContext('2d')!
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#111111'
      ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize)
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

const CHECKER_TEX = makeCheckerTexture(8, 4)

function Star3D({ position, index }: { position: THREE.Vector3; index: number }) {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 1.8
      groupRef.current.rotation.z += delta * 0.4
    }
  })

  const initRotY = (index * Math.PI * 2) / 3

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation={[0, initRotY, 0]}
    >
      <mesh geometry={STAR_GEO} castShadow>
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffaa00"
          emissiveIntensity={1.6}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>
      <mesh geometry={STAR_GEO} scale={0.6}>
        <meshBasicMaterial color="#fffacd" />
      </mesh>
      <mesh geometry={STAR_GEO} scale={2.0}>
        <meshBasicMaterial color="#ffd700" transparent opacity={0.13} side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

function FinishArch({
  width,
  y,
  z,
}: {
  width: number
  y: number
  z: number
}) {
  const pulsRef = useRef<THREE.MeshStandardMaterial>(null!)
  const flagRef = useRef<THREE.Group>(null!)

  useFrame(({ clock }) => {
    if (pulsRef.current) {
      pulsRef.current.emissiveIntensity = 0.5 + Math.sin(clock.elapsedTime * 3) * 0.3
    }
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(clock.elapsedTime * 2.5) * 0.18
    }
  })

  const postH = 4.5
  const postR = 0.22
  const crossbarH = 0.45
  const halfW = width / 2

  return (
    <group position={[0, y, z]}>
      <mesh position={[-halfW, postH / 2 - 0.5, 0]} castShadow>
        <cylinderGeometry args={[postR, postR + 0.05, postH, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[halfW, postH / 2 - 0.5, 0]} castShadow>
        <cylinderGeometry args={[postR, postR + 0.05, postH, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.9} roughness={0.15} />
      </mesh>

      <mesh position={[0, postH - 0.5, 0]} castShadow>
        <boxGeometry args={[width + postR * 2, crossbarH, postR * 2]} />
        <meshStandardMaterial
          ref={pulsRef}
          color="#ffffff"
          emissive="#00f5ff"
          emissiveIntensity={0.5}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>

      <group ref={flagRef} position={[0, postH - 1.2, 0.15]}>
        <mesh>
          <planeGeometry args={[width * 0.82, 1.4]} />
          <meshStandardMaterial
            map={CHECKER_TEX}
            side={THREE.DoubleSide}
            metalness={0.0}
            roughness={0.8}
          />
        </mesh>
      </group>

      <mesh position={[0, postH + 0.35, 0]}>
        <boxGeometry args={[2.4, 0.5, 0.1]} />
        <meshStandardMaterial
          color="#00f5ff"
          emissive="#00f5ff"
          emissiveIntensity={1.5}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>

      <pointLight position={[0, postH, 1]} color="#00f5ff" intensity={2.5} distance={14} />
      <pointLight position={[-halfW, 1, 0]} color="#ffffff" intensity={0.8} distance={8} />
      <pointLight position={[halfW, 1, 0]} color="#ffffff" intensity={0.8} distance={8} />
    </group>
  )
}

function buildLevelLayout(level: LevelDef) {
  const L = level.segmentLength
  const W = level.trackWidth
  const D = level.segmentDepth

  const segments: SegmentDef[] = []
  const solidByTimelineIndex = new Map<number, SegmentDef>()

  let surfaceStartY = 0
  let timelineIndex = 0
  let colorIdx = 0

  for (const piece of level.pieces) {
    if (piece.kind === 'gap') {
      timelineIndex += piece.segments
      continue
    }

    if (piece.kind === 'cylinder') {
      timelineIndex += piece.segments
      continue
    }

    const wm = piece.widthMultiplier ?? 1
    const segW = W * wm

    for (let i = 0; i < piece.segments; i++) {
      const angle = piece.angle
      const dz = L * Math.sin(angle)
      const surfaceCenterY = surfaceStartY + dz * 0.5
      const centerY = surfaceCenterY - D / 2
      const centerZ = 0 - timelineIndex * L

      const seg: SegmentDef = {
        id: `seg-${level.id}-${timelineIndex}`,
        position: [0, centerY, centerZ],
        size: [segW, D, L],
        rotation: [angle, 0, 0],
        colorIndex: colorIdx++,
      }
      segments.push(seg)
      solidByTimelineIndex.set(timelineIndex, seg)

      surfaceStartY += dz
      timelineIndex += 1
    }
  }

  const lastSeg = segments[segments.length - 1]
  const finishZ = lastSeg ? lastSeg.position[2] - level.segmentLength * 0.6 : -100

  const obstacles = level.obstacles
    .map((def) => {
      const seg = solidByTimelineIndex.get(def.segmentIndex)
      if (!seg) return null
      const segmentWidth = seg.size[0]
      const size = obstacleSizeFor(level, def, segmentWidth)
      const y = seg.position[1] + level.segmentDepth / 2 + size[1] / 2 + 0.05
      return {
        id: def.id,
        type: def.type,
        position: [def.x, y, seg.position[2]] as [number, number, number],
        size,
      }
    })
    .filter(Boolean) as Array<{ id: string; type: ObstacleDef['type']; position: [number, number, number]; size: [number, number, number] }>

  const stars = level.stars
    .map((def, idx) => {
      const seg = solidByTimelineIndex.get(def.segmentIndex)
      if (!seg) return null
      const y = seg.position[1] + level.segmentDepth / 2 + def.yOffset
      return {
        id: def.id,
        index: idx,
        position: new THREE.Vector3(def.x, y, seg.position[2]),
      }
    })
    .filter(Boolean) as Array<{ id: string; index: number; position: THREE.Vector3 }>

  const finishY = lastSeg ? lastSeg.position[1] + level.segmentDepth / 2 + 1.2 : 1.2

  return { segments, obstacles, stars, finishZ, finishY }
}

export function Track({ level, ballPosition, trackMeshes, obstacleMeshes }: TrackProps) {
  const { gameState, runCollectedStars, collectStar, completeLevel } = useGame()
  const { segments, obstacles, stars, finishZ, finishY } = useMemo(() => buildLevelLayout(level), [level])
  const cylinderSections = useMemo(() => computeCylinderSections(level), [level])
  const didCompleteRef = useRef(false)

  useEffect(() => {
    didCompleteRef.current = false
  }, [gameState, level.id])

  const onTrackMeshReady = useCallback((mesh: THREE.Mesh) => {
    trackMeshes.current.push(mesh)
  }, [trackMeshes])

  const onTrackMeshRemoved = useCallback((mesh: THREE.Mesh) => {
    const idx = trackMeshes.current.indexOf(mesh)
    if (idx !== -1) trackMeshes.current.splice(idx, 1)
  }, [trackMeshes])

  const onObstacleMeshReady = useCallback((mesh: THREE.Mesh) => {
    obstacleMeshes.current.push(mesh)
  }, [obstacleMeshes])

  const onObstacleMeshRemoved = useCallback((mesh: THREE.Mesh) => {
    const idx = obstacleMeshes.current.indexOf(mesh)
    if (idx !== -1) obstacleMeshes.current.splice(idx, 1)
  }, [obstacleMeshes])

  useFrame(() => {
    if (gameState !== 'playing') return
    const ball = ballPosition.current

    for (const star of stars) {
      if (runCollectedStars[star.index]) continue
      if (ball.distanceToSquared(star.position) < 1.25 * 1.25) {
        collectStar(star.index)
        playStarCollect()
      }
    }

    if (!didCompleteRef.current && ball.z < finishZ) {
      didCompleteRef.current = true
      completeLevel()
    }
  })

  return (
    <group>
      {segments.map((seg) => (
        <TrackSegment
          key={seg.id}
          seg={seg}
          onMeshReady={onTrackMeshReady}
          onMeshRemoved={onTrackMeshRemoved}
        />
      ))}

      {(gameState === 'playing' || gameState === 'levelComplete') && cylinderSections.map((section) => (
        <CylinderTunnel key={`${level.id}:${section.startZ}`} section={section} />
      ))}

      {(gameState === 'playing' || gameState === 'levelComplete') && obstacles.map((obs) => (
        <Obstacle
          key={obs.id}
          position={obs.position}
          size={obs.size}
          type={obs.type}
          // Ramps are visual-only: rotated geometry breaks AABB, and ramps launch rather than kill
          onMeshReady={obs.type === 'ramp' ? undefined : onObstacleMeshReady}
          onMeshRemoved={obs.type === 'ramp' ? undefined : onObstacleMeshRemoved}
        />
      ))}

      {(gameState === 'playing' || gameState === 'levelComplete') && stars.map((s) =>
        runCollectedStars[s.index]
          ? null
          : <Star3D key={s.id} position={s.position} index={s.index} />
      )}

      {(gameState === 'playing' || gameState === 'levelComplete') && (
        <FinishArch width={level.trackWidth * 0.9} y={finishY} z={finishZ} />
      )}
    </group>
  )
}
