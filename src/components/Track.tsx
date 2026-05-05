import { useState, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { TrackSegment, type SegmentDef } from './TrackSegment'
import { Obstacle } from './Obstacle'
import { useGame } from '../store/gameStore'

const SEG_LENGTH = 14
const SEG_WIDTH = 9
const SEG_DEPTH = 1.0
const POOL = 24

interface ObsDef {
  id: string
  position: [number, number, number]
  size: [number, number, number]
  type: 'wall' | 'pillar' | 'gate'
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function buildSegments(startZ: number, count: number, colorOff: number): SegmentDef[] {
  const out: SegmentDef[] = []
  let y = 0
  for (let i = 0; i < count; i++) {
    const z = startZ - i * SEG_LENGTH
    const ramp = i > 2 && Math.random() < 0.22
    const angle = ramp ? (Math.random() < 0.5 ? -0.15 : 0.15) : 0
    if (ramp) y += angle * SEG_LENGTH * 0.5
    out.push({
      id: `${z.toFixed(1)}`,
      position: [0, y - SEG_DEPTH / 2, z],
      size: [SEG_WIDTH, SEG_DEPTH, SEG_LENGTH],
      rotation: [angle, 0, 0],
      colorIndex: (i + colorOff) % 4,
    })
  }
  return out
}

function buildObstacles(segs: SegmentDef[], startIdx: number): ObsDef[] {
  const out: ObsDef[] = []
  segs.forEach((seg, i) => {
    if (i < 3 || Math.random() > 0.3) return
    const types: ObsDef['type'][] = ['wall', 'pillar', 'gate']
    const type = types[Math.floor(Math.random() * 3)]
    const h = type === 'pillar' ? 2.0 : 1.1
    const w = type === 'wall' ? SEG_WIDTH * 0.55 : 1.1
    const xPos = rand(-2.5, 2.5)
    out.push({
      id: `obs-${startIdx + i}`,
      position: [xPos, seg.position[1] + h / 2 + SEG_DEPTH / 2 + 0.05, seg.position[2]],
      size: [w, h, 0.7],
      type,
    })
  })
  return out
}

interface TrackProps {
  ballPosition: React.MutableRefObject<THREE.Vector3>
}

// Generate initial segments immediately so physics bodies exist before ball spawns
const INITIAL_SEGS = buildSegments(0, POOL, 0)
const INITIAL_OBS = buildObstacles(INITIAL_SEGS, 0)

export function Track({ ballPosition }: TrackProps) {
  const { gameState } = useGame()
  const [segments, setSegments] = useState<SegmentDef[]>(INITIAL_SEGS)
  const [obstacles, setObstacles] = useState<ObsDef[]>(INITIAL_OBS)
  const lastZRef = useRef(6 - POOL * SEG_LENGTH)
  const colorOffRef = useRef(0)
  const obsIdxRef = useRef(POOL)

  useFrame(() => {
    if (gameState !== 'playing') return
    const bz = ballPosition.current.z
    // Spawn new batch when ball is within 120 units of track end
    if (bz < lastZRef.current + 120) {
      colorOffRef.current = (colorOffRef.current + 1) % 4
      const newSegs = buildSegments(lastZRef.current, POOL, colorOffRef.current)
      const newObs = buildObstacles(newSegs, obsIdxRef.current)
      obsIdxRef.current += POOL
      lastZRef.current -= POOL * SEG_LENGTH
      setSegments(prev => [...prev.filter(s => s.position[2] > bz - 50), ...newSegs])
      setObstacles(prev => [...prev.filter(o => o.position[2] > bz - 50), ...newObs])
    }
  })

  return (
    <group>
      {segments.map(seg => <TrackSegment key={seg.id} seg={seg} />)}
      {gameState === 'playing' && obstacles.map(obs => (
        <Obstacle key={obs.id} position={obs.position} size={obs.size} type={obs.type} />
      ))}
    </group>
  )
}
