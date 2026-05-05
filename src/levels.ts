export type LevelId = 1 | 2 | 3

export interface LevelDef {
  id: LevelId
  title: string
  difficultyLabel: string
  // Legacy speed kept for jump-zone calculations.
  speed: number
  // Progressive speed system
  baseSpeed: number    // Starting speed (units/sec)
  maxSpeed: number     // Top speed the ball can reach
  acceleration: number // Speed gain per second
  // Track surface width.
  trackWidth: number
  // Segment length along Z.
  segmentLength: number
  // Thickness of track collider.
  segmentDepth: number
  // Level start position for the ball.
  start: { x: number; y: number; z: number }
  // Procedural but deterministic layout described as pieces.
  pieces: TrackPiece[]
  // Obstacles placed by segment index.
  obstacles: ObstacleDef[]
  // Stars placed by segment index (always 3).
  stars: StarDef[]
}

export type TrackPiece =
  | { kind: 'solid'; segments: number; angle: number }
  | { kind: 'gap'; segments: number }

export type ObstacleType = 'wall' | 'pillar' | 'gate'

export interface ObstacleDef {
  id: string
  type: ObstacleType
  // Index into the solid+gap timeline in segments.
  segmentIndex: number
  x: number
  // Optional height/width tuning.
  size?: { w: number; h: number; d: number }
}

export interface StarDef {
  id: string
  segmentIndex: number
  x: number
  // Extra Y above track surface.
  yOffset: number
}

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    title: 'Principiante',
    difficultyLabel: 'Dificultad: Fácil',
    speed: 14,
    baseSpeed: 30,
    maxSpeed: 60,
    acceleration: 0.50,
    trackWidth: 9,
    segmentLength: 14,
    segmentDepth: 1.0,
    start: { x: 0, y: 4, z: 2 },
    pieces: [
      { kind: 'solid', segments: 8, angle: 0 },
      { kind: 'solid', segments: 3, angle: 0.12 },
      { kind: 'solid', segments: 4, angle: 0 },
      { kind: 'solid', segments: 2, angle: -0.10 },
      // Small jump
      { kind: 'solid', segments: 2, angle: 0.16 },
      { kind: 'gap', segments: 1 },
      { kind: 'solid', segments: 3, angle: -0.08 },
      { kind: 'solid', segments: 10, angle: 0 },
    ],
    obstacles: [
      { id: 'l1-wall-1', type: 'wall', segmentIndex: 6, x: 1.6 },
      { id: 'l1-pillar-1', type: 'pillar', segmentIndex: 12, x: -2.0 },
      // segmentIndex 19 is a gap in this layout; move to the next solid segment.
      { id: 'l1-gate-1', type: 'gate', segmentIndex: 20, x: 0 },
      // extra obstacles so level 1 isn't too easy
      { id: 'l1-wall-2', type: 'wall', segmentIndex: 9, x: -1.8 },
      { id: 'l1-pillar-2', type: 'pillar', segmentIndex: 15, x: 2.2 },
      { id: 'l1-gate-2', type: 'gate', segmentIndex: 24, x: -1.6 },
    ],
    stars: [
      { id: 'l1-star-1', segmentIndex: 5, x: -1.8, yOffset: 1.4 },
      { id: 'l1-star-2', segmentIndex: 13, x: 0.0, yOffset: 1.6 },
      { id: 'l1-star-3', segmentIndex: 22, x: 1.8, yOffset: 1.4 },
    ],
  },
  {
    id: 2,
    title: 'Intermedio',
    difficultyLabel: 'Dificultad: Medio',
    speed: 18,
    baseSpeed: 35,
    maxSpeed: 70,
    acceleration: 0.70,
    trackWidth: 8.5,
    segmentLength: 14,
    segmentDepth: 1.0,
    start: { x: 0, y: 4, z: 2 },
    pieces: [
      { kind: 'solid', segments: 6, angle: 0 },
      { kind: 'solid', segments: 3, angle: 0.14 },
      { kind: 'solid', segments: 2, angle: -0.12 },
      { kind: 'solid', segments: 5, angle: 0 },
      // Two jumps
      { kind: 'solid', segments: 2, angle: 0.18 },
      { kind: 'gap', segments: 1 },
      { kind: 'solid', segments: 3, angle: -0.10 },
      { kind: 'solid', segments: 2, angle: 0.20 },
      { kind: 'gap', segments: 1 },
      { kind: 'solid', segments: 4, angle: -0.12 },
      { kind: 'solid', segments: 10, angle: 0 },
    ],
    obstacles: [
      { id: 'l2-wall-1', type: 'wall', segmentIndex: 4, x: -1.8 },
      { id: 'l2-wall-2', type: 'wall', segmentIndex: 10, x: 1.8 },
      { id: 'l2-pillar-1', type: 'pillar', segmentIndex: 16, x: 0.0 },
      { id: 'l2-gate-1', type: 'gate', segmentIndex: 21, x: -2.0 },
      // segmentIndex 24 is a gap in this layout; move to the next solid segment.
      { id: 'l2-gate-2', type: 'gate', segmentIndex: 25, x: 2.0 },
      // extra obstacles
      { id: 'l2-wall-3', type: 'wall', segmentIndex: 7, x: 0.0 },
      { id: 'l2-pillar-2', type: 'pillar', segmentIndex: 13, x: 2.0 },
      { id: 'l2-gate-3', type: 'gate', segmentIndex: 30, x: 0.0 },
    ],
    stars: [
      { id: 'l2-star-1', segmentIndex: 7, x: 0.0, yOffset: 1.6 },
      { id: 'l2-star-2', segmentIndex: 17, x: 2.0, yOffset: 1.5 },
      { id: 'l2-star-3', segmentIndex: 26, x: -2.0, yOffset: 1.5 },
    ],
  },
  {
    id: 3,
    title: 'Experto',
    difficultyLabel: 'Dificultad: Difícil',
    speed: 22,
    baseSpeed: 40,
    maxSpeed: 80,
    acceleration: 3.5,
    trackWidth: 7.5,
    segmentLength: 14,
    segmentDepth: 1.0,
    start: { x: 0, y: 4, z: 2 },
    pieces: [
      { kind: 'solid', segments: 5, angle: 0 },
      { kind: 'solid', segments: 2, angle: 0.18 },
      { kind: 'solid', segments: 2, angle: -0.16 },
      { kind: 'solid', segments: 3, angle: 0.12 },
      { kind: 'solid', segments: 2, angle: -0.12 },
      // Longer jump
      { kind: 'solid', segments: 2, angle: 0.22 },
      { kind: 'gap', segments: 1 },
      { kind: 'solid', segments: 4, angle: -0.14 },
      // Final section
      { kind: 'solid', segments: 10, angle: 0 },
    ],
    obstacles: [
      { id: 'l3-wall-1', type: 'wall', segmentIndex: 3, x: 2.0 },
      { id: 'l3-wall-2', type: 'wall', segmentIndex: 8, x: -2.0 },
      { id: 'l3-pillar-1', type: 'pillar', segmentIndex: 11, x: 0.0 },
      // segmentIndex 16 is a gap in this layout; move to the next solid segment.
      { id: 'l3-gate-1', type: 'gate', segmentIndex: 17, x: 1.8 },
      { id: 'l3-gate-2', type: 'gate', segmentIndex: 18, x: -1.8 },
      { id: 'l3-pillar-2', type: 'pillar', segmentIndex: 21, x: 0.0 },
    ],
    stars: [
      { id: 'l3-star-1', segmentIndex: 6, x: -1.6, yOffset: 1.6 },
      { id: 'l3-star-2', segmentIndex: 14, x: 1.6, yOffset: 1.6 },
      { id: 'l3-star-3', segmentIndex: 23, x: 0.0, yOffset: 1.7 },
    ],
  },
]

export function getLevelById(id: LevelId): LevelDef {
  const level = LEVELS.find((l) => l.id === id)
  if (!level) throw new Error(`Level not found: ${id}`)
  return level
}
