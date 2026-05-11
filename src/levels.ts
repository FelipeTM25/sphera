export type LevelId = 1 | 2 | 3

export interface LevelDef {
  id: LevelId
  title: string
  difficultyLabel: string
  speed: number
  baseSpeed: number
  maxSpeed: number
  acceleration: number
  trackWidth: number
  segmentLength: number
  segmentDepth: number
  start: { x: number; y: number; z: number }
  pieces: TrackPiece[]
  obstacles: ObstacleDef[]
  stars: StarDef[]
}

export type TrackPiece =
  | { kind: 'solid'; segments: number; angle: number; widthMultiplier?: number }
  | { kind: 'gap'; segments: number }
  | { kind: 'cylinder'; segments: number; radius: number; openSlots?: number; forceBottomObstacle?: boolean }

// wall: blocks half the track — dodge left/right
// pillar: column in the path — dodge
// gate: partial opening — aim for the gap
// low_wall: spans full width but jumpable
// ramp: angled surface that launches the ball upward
// barrier: half-width side wall — hug the other side
export type ObstacleType = 'wall' | 'pillar' | 'gate' | 'low_wall' | 'ramp' | 'barrier'

export interface ObstacleDef {
  id: string
  type: ObstacleType
  segmentIndex: number
  x: number
  size?: { w: number; h: number; d: number }
}

export interface StarDef {
  id: string
  segmentIndex: number
  x: number
  yOffset: number
}

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    title: 'Principiante',
    difficultyLabel: 'Dificultad: Fácil',
    speed: 14,
    baseSpeed: 24,
    maxSpeed: 46,
    acceleration: 0.35,
    trackWidth: 9.6,
    segmentLength: 14,
    segmentDepth: 1.0,
    start: { x: 0, y: 4, z: 2 },
    pieces: [
      { kind: 'solid', segments: 4, angle: 0.00 },
      { kind: 'solid', segments: 4, angle: 0.06 },
      { kind: 'solid', segments: 3, angle: 0.09 },
      { kind: 'gap',   segments: 1 },
      { kind: 'solid', segments: 4, angle: 0.07 },
      { kind: 'gap',   segments: 1 },
      { kind: 'solid', segments: 4, angle: 0.10 },
      { kind: 'solid', segments: 3, angle: 0.08 },
      { kind: 'solid', segments: 2, angle: 0.10 },
      { kind: 'gap',   segments: 1 },
      { kind: 'solid', segments: 4, angle: 0.11 },
      { kind: 'solid', segments: 4, angle: 0.09 },
      { kind: 'gap',   segments: 1 },
      { kind: 'solid', segments: 3, angle: 0.12 },
      { kind: 'gap',   segments: 1 },
      { kind: 'solid', segments: 5, angle: 0.08 },
      { kind: 'solid', segments: 6, angle: 0.05 },
    ],
    obstacles: [
      { id: 'l1-barrier-1', type: 'barrier',  segmentIndex: 2,  x:  2.8 },
      { id: 'l1-wall-1',    type: 'wall',     segmentIndex: 4,  x: -1.8 },
      { id: 'l1-lowwall-1', type: 'low_wall', segmentIndex: 7,  x:  0.0 },
      { id: 'l1-pillar-1',  type: 'pillar',   segmentIndex: 12, x: -2.2 },
      { id: 'l1-gate-1',    type: 'gate',     segmentIndex: 14, x:  1.8 },
      { id: 'l1-lowwall-2', type: 'low_wall', segmentIndex: 13, x:  0.0 },
      { id: 'l1-barrier-2', type: 'barrier',  segmentIndex: 17, x:  1.5 },
      { id: 'l1-pillar-2',  type: 'pillar',   segmentIndex: 19, x: -0.8 },
      { id: 'l1-lowwall-3', type: 'low_wall', segmentIndex: 21, x:  0.0 },
      { id: 'l1-wall-2',    type: 'wall',     segmentIndex: 27, x:  1.6 },
      { id: 'l1-gate-2',    type: 'gate',     segmentIndex: 29, x: -1.8 },
      { id: 'l1-pillar-3',  type: 'pillar',   segmentIndex: 31, x:  0.8 },
      { id: 'l1-lowwall-4', type: 'low_wall', segmentIndex: 32, x:  0.0 },
      { id: 'l1-wall-3',    type: 'wall',     segmentIndex: 36, x: -1.6 },
      { id: 'l1-barrier-3', type: 'barrier',  segmentIndex: 37, x:  2.8 },
      { id: 'l1-pillar-4',  type: 'pillar',   segmentIndex: 41, x:  2.0 },
      { id: 'l1-gate-3',    type: 'gate',     segmentIndex: 45, x:  1.8 },
      { id: 'l1-barrier-4', type: 'barrier',  segmentIndex: 48, x: -2.8 },
    ],
    stars: [
      { id: 'l1-star-1', segmentIndex: 9,  x: -2.0, yOffset: 0.8 },
      { id: 'l1-star-2', segmentIndex: 22, x:  0.0, yOffset: 0.8 },
      { id: 'l1-star-3', segmentIndex: 47, x:  2.0, yOffset: 0.8 },
    ],
  },
  {
    id: 2,
    title: 'Intermedio',
    difficultyLabel: 'Dificultad: Media',
    speed: 18,
    baseSpeed: 32,
    maxSpeed: 68,
    acceleration: 0.85,
    trackWidth: 8.5,
    segmentLength: 14,
    segmentDepth: 1.0,
    start: { x: 0, y: 4, z: 2 },
    pieces: [
      { kind: 'solid', segments: 6, angle: 0 },
      { kind: 'solid', segments: 3, angle: 0.14 },
      { kind: 'solid', segments: 2, angle: -0.12 },
      { kind: 'solid', segments: 5, angle: 0 },
      { kind: 'solid', segments: 2, angle: 0.18 },
      { kind: 'gap', segments: 1 },
      { kind: 'solid', segments: 3, angle: -0.10 },
      { kind: 'solid', segments: 2, angle: 0.20 },
      { kind: 'gap', segments: 1 },
      { kind: 'solid', segments: 4, angle: -0.12 },
      { kind: 'solid', segments: 10, angle: 0 },
      { kind: 'solid', segments: 4, angle: 0.10 },
      { kind: 'gap', segments: 1 },
      { kind: 'solid', segments: 4, angle: -0.08 },
      { kind: 'cylinder', segments: 10, radius: 6.4, openSlots: 3 },
      { kind: 'solid', segments: 8, angle: 0 },
    ],
    obstacles: [
      { id: 'l2-wall-1', type: 'wall', segmentIndex: 4, x: -1.8 },
      { id: 'l2-wall-2', type: 'wall', segmentIndex: 10, x: 1.8 },
      { id: 'l2-pillar-1', type: 'pillar', segmentIndex: 16, x: 0.0 },
      { id: 'l2-gate-1', type: 'gate', segmentIndex: 21, x: -2.0 },
      { id: 'l2-gate-2', type: 'gate', segmentIndex: 25, x: 2.0 },
      { id: 'l2-wall-3', type: 'wall', segmentIndex: 7, x: 0.0 },
      { id: 'l2-pillar-2', type: 'pillar', segmentIndex: 13, x: 2.0 },
      { id: 'l2-gate-3', type: 'gate', segmentIndex: 30, x: 0.0 },
      { id: 'l2-lowwall-1', type: 'low_wall', segmentIndex: 40, x: 0.0 },
      { id: 'l2-wall-4', type: 'wall', segmentIndex: 41, x: -1.6 },
      { id: 'l2-pillar-3', type: 'pillar', segmentIndex: 42, x: 2.0 },
      { id: 'l2-gate-4', type: 'gate', segmentIndex: 44, x: -2.0 },
      { id: 'l2-wall-5', type: 'wall', segmentIndex: 46, x: 1.6 },
      { id: 'l2-lowwall-2', type: 'low_wall', segmentIndex: 60, x: 0.0 },
      { id: 'l2-gate-5', type: 'gate', segmentIndex: 62, x: 2.0 },
      { id: 'l2-pillar-4', type: 'pillar', segmentIndex: 64, x: -2.0 },
    ],
    stars: [
      { id: 'l2-star-1', segmentIndex: 3,  x:  0.0, yOffset: 0.8 },
      { id: 'l2-star-2', segmentIndex: 23, x: -2.0, yOffset: 0.8 },
      { id: 'l2-star-3', segmentIndex: 38, x:  2.0, yOffset: 0.8 },
    ],
  },
  {
    id: 3,
    title: 'Experto',
    difficultyLabel: 'Dificultad: Difícil',
    speed: 22,
    baseSpeed: 44,
    maxSpeed: 92,
    acceleration: 1.35,
    trackWidth: 7.2,
    segmentLength: 14,
    segmentDepth: 1.0,
    start: { x: 0, y: 4, z: 2 },
    pieces: [
      { kind: 'solid', segments: 6, angle: 0.00 },
      { kind: 'solid', segments: 3, angle: 0.18 },
      { kind: 'solid', segments: 2, angle: -0.14 },
      { kind: 'solid', segments: 4, angle: 0.12 },
      { kind: 'gap',   segments: 1 },
      { kind: 'solid', segments: 3, angle: -0.16 },
      { kind: 'solid', segments: 2, angle: 0.22 },
      { kind: 'gap',   segments: 1 },
      { kind: 'solid', segments: 6, angle: -0.10 },
      { kind: 'solid', segments: 4, angle: 0.15 },
      { kind: 'gap',   segments: 1 },
      { kind: 'solid', segments: 3, angle: 0.18 },
      { kind: 'cylinder', segments: 12, radius: 6.0 },
      { kind: 'solid', segments: 5, angle: -0.12 },
      { kind: 'gap',   segments: 1 },
      { kind: 'solid', segments: 6, angle: 0.10 },
      { kind: 'solid', segments: 4, angle: -0.18 },
      { kind: 'gap',   segments: 1 },
      { kind: 'solid', segments: 3, angle: 0.18 },
      { kind: 'gap',   segments: 1 },
      { kind: 'solid', segments: 5, angle: -0.14 },
      // Second cylinder: forceBottomObstacle = always an obstacle at the bottom entry point
      { kind: 'cylinder', segments: 14, radius: 5.8, forceBottomObstacle: true },
      { kind: 'solid', segments: 24, angle: 0.00 },
    ],
    obstacles: [
      { id: 'l3-barrier-1', type: 'barrier',  segmentIndex: 2,  x:  2.4 },
      { id: 'l3-wall-1',    type: 'wall',     segmentIndex: 5,  x: -1.8 },
      { id: 'l3-gate-1',    type: 'gate',     segmentIndex: 7,  x:  2.0 },
      { id: 'l3-lowwall-1', type: 'low_wall', segmentIndex: 12, x:  0.0 },
      { id: 'l3-barrier-2', type: 'barrier',  segmentIndex: 13, x: -2.0 },
      { id: 'l3-pillar-1',  type: 'pillar',   segmentIndex: 16, x:  0.0 },
      { id: 'l3-wall-2',    type: 'wall',     segmentIndex: 18, x:  1.8 },
      { id: 'l3-gate-2',    type: 'gate',     segmentIndex: 19, x:  1.8 },
      { id: 'l3-gate-3',    type: 'gate',     segmentIndex: 20, x: -1.8 },
      { id: 'l3-wall-3',    type: 'wall',     segmentIndex: 24, x:  0.0 },
      { id: 'l3-pillar-2',  type: 'pillar',   segmentIndex: 27, x:  2.0 },
      { id: 'l3-lowwall-2', type: 'low_wall', segmentIndex: 29, x:  0.0 },
      { id: 'l3-barrier-3', type: 'barrier',  segmentIndex: 30, x:  1.8 },
      { id: 'l3-gate-4',    type: 'gate',     segmentIndex: 34, x:  0.0 },
      { id: 'l3-pillar-3',  type: 'pillar',   segmentIndex: 35, x: -2.0 },
      // --- First cylinder exit (index ~47): first obstacle 3+ segments later ---
      { id: 'l3-wall-4',    type: 'wall',     segmentIndex: 51, x: -1.8 },
      { id: 'l3-lowwall-3', type: 'low_wall', segmentIndex: 53, x:  0.0 },
      { id: 'l3-barrier-4', type: 'barrier',  segmentIndex: 54, x:  2.0 },
      { id: 'l3-wall-5',    type: 'wall',     segmentIndex: 56, x:  1.8 },
      { id: 'l3-gate-5',    type: 'gate',     segmentIndex: 58, x: -2.0 },
      { id: 'l3-pillar-4',  type: 'pillar',   segmentIndex: 60, x:  0.0 },
      { id: 'l3-barrier-5', type: 'barrier',  segmentIndex: 62, x:  1.6 },
      { id: 'l3-wall-6',    type: 'wall',     segmentIndex: 64, x: -1.6, size: { w: 2.8, h: 1.1, d: 0.7 } },
      { id: 'l3-gate-6',    type: 'gate',     segmentIndex: 70, x:  2.0 },
      { id: 'l3-pillar-5',  type: 'pillar',   segmentIndex: 72, x: -2.0 },
      { id: 'l3-wall-7',    type: 'wall',     segmentIndex: 74, x:  0.0 },
      // --- Second cylinder exit (index ~88): obstacles 3+ segments later ---
      { id: 'l3-gate-7',    type: 'gate',     segmentIndex: 96,  x:  0.0 },
      { id: 'l3-wall-8',    type: 'wall',     segmentIndex: 104, x: -1.8 },
      { id: 'l3-pillar-6',  type: 'pillar',   segmentIndex: 110, x:  2.0 },
    ],
    stars: [
      // Star 1: early, on flat section after obstacle gap, easy to grab
      { id: 'l3-star-1', segmentIndex: 10, x:  0.0, yOffset: 0.8 },
      // Star 2: right after first cylinder exit
      { id: 'l3-star-2', segmentIndex: 49, x: -2.0, yOffset: 0.8 },
      // Star 3: after second cylinder on flat straight
      { id: 'l3-star-3', segmentIndex: 100, x: 0.0, yOffset: 0.8 },
    ],
  },
]

export function getLevelById(id: LevelId): LevelDef {
  const level = LEVELS.find((l) => l.id === id)
  if (!level) throw new Error(`Level not found: ${id}`)
  return level
}
