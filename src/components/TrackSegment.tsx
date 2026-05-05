import { useBox } from '@react-three/cannon'
import * as THREE from 'three'

export interface SegmentDef {
  id: string
  position: [number, number, number]
  size: [number, number, number]
  rotation: [number, number, number]
  colorIndex: number
}

const TRACK_COLORS = [
  { base: '#0a1628', edge: '#00f5ff' },
  { base: '#0d1f3c', edge: '#39ff14' },
  { base: '#1a0a28', edge: '#c000ff' },
  { base: '#0a1f1a', edge: '#00ffaa' },
]

export function TrackSegment({ seg }: { seg: SegmentDef }) {
  useBox(() => ({
    type: 'Static' as const,
    position: seg.position,
    rotation: seg.rotation,
    args: seg.size,
  }))

  const color = TRACK_COLORS[seg.colorIndex % 4]
  const [w, h, d] = seg.size
  const [px, py, pz] = seg.position

  return (
    <group position={seg.position} rotation={seg.rotation}>
      <mesh receiveShadow>
        <boxGeometry args={seg.size} />
        <meshStandardMaterial color={color.base} metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Left neon edge */}
      <mesh position={[-w / 2 + 0.05, h / 2 + 0.03, 0]}>
        <boxGeometry args={[0.1, 0.1, d]} />
        <meshBasicMaterial color={color.edge} />
      </mesh>
      {/* Right neon edge */}
      <mesh position={[w / 2 - 0.05, h / 2 + 0.03, 0]}>
        <boxGeometry args={[0.1, 0.1, d]} />
        <meshBasicMaterial color={color.edge} />
      </mesh>
    </group>
  )
}
