import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { TrackSegment, type SegmentDef } from './TrackSegment'
import { Obstacle } from './Obstacle'
import { useGame } from '../store/gameStore'
import type { LevelDef, ObstacleDef } from '../levels'

interface TrackProps {
  level: LevelDef
  ballPosition: React.MutableRefObject<THREE.Vector3>
  /** Out-ref: filled with floor mesh refs for ball raycasting */
  trackMeshes: React.MutableRefObject<THREE.Mesh[]>
  /** Out-ref: filled with obstacle mesh refs for ball collision */
  obstacleMeshes: React.MutableRefObject<THREE.Mesh[]>
}

function obstacleSizeFor(level: LevelDef, def: ObstacleDef): [number, number, number] {
  if (def.size) return [def.size.w, def.size.h, def.size.d]
  if (def.type === 'pillar') return [1.1, 2.0, 1.1]
  if (def.type === 'gate') return [1.2, 1.1, 0.7]
  // wall
  return [level.trackWidth * 0.55, 1.1, 0.7]
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

    for (let i = 0; i < piece.segments; i++) {
      const angle = piece.angle
      const dz = L * Math.sin(angle)
      const surfaceCenterY = surfaceStartY + dz * 0.5
      const centerY = surfaceCenterY - D / 2
      const centerZ = 0 - timelineIndex * L

      const seg: SegmentDef = {
        id: `seg-${level.id}-${timelineIndex}`,
        position: [0, centerY, centerZ],
        size: [W, D, L],
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
      const size = obstacleSizeFor(level, def)
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
  const didCompleteRef = useRef(false)

  useEffect(() => {
    didCompleteRef.current = false
  }, [gameState, level.id])

  // ── Mesh registry callbacks ────────────────────────────────────────────────
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

  // Registries are cleared by TrackSegment/Obstacle unmounts.

  useFrame(() => {
    if (gameState !== 'playing') return
    const ball = ballPosition.current

    // Collect stars
    for (const star of stars) {
      if (runCollectedStars[star.index]) continue
      if (ball.distanceToSquared(star.position) < 1.25 * 1.25) {
        collectStar(star.index)
      }
    }

    // Finish line
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

      {(gameState === 'playing' || gameState === 'levelComplete') && obstacles.map((obs) => (
        <Obstacle
          key={obs.id}
          position={obs.position}
          size={obs.size}
          type={obs.type}
          onMeshReady={onObstacleMeshReady}
          onMeshRemoved={onObstacleMeshRemoved}
        />
      ))}

      {/* Stars (visual only; collection is distance-based) */}
      {(gameState === 'playing' || gameState === 'levelComplete') && stars.map((s) =>
        runCollectedStars[s.index]
          ? null
          : (
            <group key={s.id} position={[s.position.x, s.position.y, s.position.z]}>
              <mesh>
                <icosahedronGeometry args={[0.35, 0]} />
                <meshStandardMaterial color="#ffe680" emissive="#ffcc33" emissiveIntensity={1.2} metalness={0.2} roughness={0.3} />
              </mesh>
              <mesh scale={1.8}>
                <icosahedronGeometry args={[0.35, 0]} />
                <meshBasicMaterial color="#ffe680" transparent opacity={0.08} side={THREE.BackSide} />
              </mesh>
            </group>
          )
      )}

      {/* Finish gate (visual) */}
      <group position={[0, finishY, finishZ]}>
        <mesh>
          <boxGeometry args={[level.trackWidth * 0.85, 2.2, 0.35]} />
          <meshStandardMaterial color="#d9f3ff" emissive="#00f5ff" emissiveIntensity={0.35} metalness={0.6} roughness={0.25} />
        </mesh>
        <mesh scale={[1.08, 1.15, 1.2]}>
          <boxGeometry args={[level.trackWidth * 0.85, 2.2, 0.35]} />
          <meshBasicMaterial color="#00f5ff" transparent opacity={0.06} side={THREE.BackSide} />
        </mesh>
      </group>
    </group>
  )
}
