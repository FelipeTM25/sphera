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
  | { kind: 'solid'; segments: number; angle: number; widthMultiplier?: number }
  | { kind: 'gap'; segments: number }
  | { kind: 'cylinder'; segments: number; radius: number }

// wall: tall wall blocking half the track (dodge left/right)
// pillar: single column in the middle or side (dodge)
// gate: partial opening you pass through (aim for gap)
// low_wall: low barrier spanning full width (JUMP over it)
// ramp: angled ramp before a gap (gives upward boost)
// barrier: half-width side barrier (hug the other side)
export type ObstacleType = 'wall' | 'pillar' | 'gate' | 'low_wall' | 'ramp' | 'barrier'

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
    baseSpeed: 24,
    maxSpeed: 46,
    acceleration: 0.35,
    trackWidth: 9.6,
    segmentLength: 14,
    segmentDepth: 1.0,
    start: { x: 0, y: 4, z: 2 },
    // Timeline key (cumulative, gaps count):
    //  0-3   intro flat, full
    //  4-7   gentle slope, full
    //  8-10  slope, full | GAP 11
    //  12-15 slope, full | GAP 16
    //  17-20 NARROW 0.5x | 21-23 NARROW 0.5x
    //  24-25 full | GAP 26
    //  27-30 full | 31-34 NARROW 0.5x | GAP 35
    //  36-38 full | GAP 39
    //  40-44 full | 45-50 full (finish)
    pieces: [
      { kind: 'solid', segments: 4, angle: 0.00 },                           // seg 0-3  intro
      { kind: 'solid', segments: 4, angle: 0.06 },                           // seg 4-7
      { kind: 'solid', segments: 3, angle: 0.09 },                           // seg 8-10
      { kind: 'gap',   segments: 1 },                                        // GAP 11 ← jump 1
      { kind: 'solid', segments: 4, angle: 0.07 },                           // seg 12-15
      { kind: 'gap',   segments: 1 },                                        // GAP 16 ← jump 2
      { kind: 'solid', segments: 4, angle: 0.10, widthMultiplier: 0.85 },   // seg 17-20 slightly narrow (forgiving)
      { kind: 'solid', segments: 3, angle: 0.08, widthMultiplier: 0.85 },   // seg 21-23 slightly narrow (forgiving)
      { kind: 'solid', segments: 2, angle: 0.10 },                           // seg 24-25 full
      { kind: 'gap',   segments: 1 },                                        // GAP 26 ← jump 3
      { kind: 'solid', segments: 4, angle: 0.11 },                           // seg 27-30
      { kind: 'solid', segments: 4, angle: 0.09, widthMultiplier: 0.85 },   // seg 31-34 slightly narrow (forgiving)
      { kind: 'gap',   segments: 1 },                                        // GAP 35 ← jump 4
      { kind: 'solid', segments: 3, angle: 0.12 },                           // seg 36-38
      { kind: 'gap',   segments: 1 },                                        // GAP 39 ← jump 5
      { kind: 'solid', segments: 5, angle: 0.08 },                           // seg 40-44
      { kind: 'solid', segments: 6, angle: 0.05 },                           // seg 45-50 finish
    ],
    // Obstacles — x values scaled for section width (narrow = ±2.0 max, full = ±2.8)
    obstacles: [
      // Zone intro/full
      { id: 'l1-barrier-1', type: 'barrier',  segmentIndex: 2,  x:  2.8 },
      { id: 'l1-wall-1',    type: 'wall',     segmentIndex: 4,  x: -1.8 },
      { id: 'l1-lowwall-1', type: 'low_wall', segmentIndex: 7,  x:  0.0 },  // jump! 4 segs before gap 11
      // After gap 11, full width
      { id: 'l1-pillar-1',  type: 'pillar',   segmentIndex: 12, x: -2.2 },
      { id: 'l1-gate-1',    type: 'gate',     segmentIndex: 14, x:  1.8 },
      { id: 'l1-lowwall-2', type: 'low_wall', segmentIndex: 13, x:  0.0 },  // jump! 3 segs before gap 16
      // NARROW section 17-23 (width 4.5 → half = ±2.25, safe x: ±1.5)
      { id: 'l1-barrier-2', type: 'barrier',  segmentIndex: 17, x:  1.5 },  // narrow barrier
      { id: 'l1-pillar-2',  type: 'pillar',   segmentIndex: 19, x: -0.8 },  // narrow pillar
      { id: 'l1-lowwall-3', type: 'low_wall', segmentIndex: 21, x:  0.0 },  // narrow low_wall (4 segs before gap 26)
      // Full section 27-30
      { id: 'l1-wall-2',    type: 'wall',     segmentIndex: 27, x:  1.6 },
      { id: 'l1-gate-2',    type: 'gate',     segmentIndex: 29, x: -1.8 },
      // NARROW section 31-34 (safe x: ±1.5)
      { id: 'l1-pillar-3',  type: 'pillar',   segmentIndex: 31, x:  0.8 },
      { id: 'l1-lowwall-4', type: 'low_wall', segmentIndex: 32, x:  0.0 },  // jump! 3 segs before gap 35
      // Full section 36-38, then gap 39
      { id: 'l1-wall-3',    type: 'wall',     segmentIndex: 36, x: -1.6 },
      { id: 'l1-barrier-3', type: 'barrier',  segmentIndex: 37, x:  2.8 },
      // Final stretch 40-50
      { id: 'l1-pillar-4',  type: 'pillar',   segmentIndex: 41, x:  2.0 },
      { id: 'l1-gate-3',    type: 'gate',     segmentIndex: 45, x:  1.8 },
      { id: 'l1-barrier-4', type: 'barrier',  segmentIndex: 48, x: -2.8 },
    ],
    stars: [
      { id: 'l1-star-1', segmentIndex: 9,  x: -2.0, yOffset: 1.2 },  // zone 3 full, left
      { id: 'l1-star-2', segmentIndex: 22, x:  0.0, yOffset: 1.2 },  // narrow center
      { id: 'l1-star-3', segmentIndex: 47, x:  2.0, yOffset: 1.2 },  // final stretch
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
      // Two jumps
      { kind: 'solid', segments: 2, angle: 0.18 },
      { kind: 'gap', segments: 1 },
      { kind: 'solid', segments: 3, angle: -0.10 },
      { kind: 'solid', segments: 2, angle: 0.20 },
      { kind: 'gap', segments: 1 },
      { kind: 'solid', segments: 4, angle: -0.12 },
      { kind: 'solid', segments: 10, angle: 0 },
      // Extended run (longer + denser)
      { kind: 'solid', segments: 4, angle: 0.10 },
      { kind: 'gap', segments: 1 },
      { kind: 'solid', segments: 4, angle: -0.08 },
      // Special cylinder tunnel (360° dodge section)
      { kind: 'cylinder', segments: 10, radius: 6.4 },
      // Exit + finish stretch
      { kind: 'solid', segments: 8, angle: 0 },
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

      // Extra obstacles in the extended part (indices start at 39+)
      { id: 'l2-lowwall-1', type: 'low_wall', segmentIndex: 40, x: 0.0 },
      { id: 'l2-wall-4', type: 'wall', segmentIndex: 41, x: -1.6 },
      { id: 'l2-pillar-3', type: 'pillar', segmentIndex: 42, x: 2.0 },
      { id: 'l2-gate-4', type: 'gate', segmentIndex: 44, x: -2.0 },
      { id: 'l2-wall-5', type: 'wall', segmentIndex: 46, x: 1.6 },
      // After cylinder (solid starts at 58)
      { id: 'l2-lowwall-2', type: 'low_wall', segmentIndex: 60, x: 0.0 },
      { id: 'l2-gate-5', type: 'gate', segmentIndex: 62, x: 2.0 },
      { id: 'l2-pillar-4', type: 'pillar', segmentIndex: 64, x: -2.0 },
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
    baseSpeed: 44,
    maxSpeed: 92,
    acceleration: 1.35,
    trackWidth: 7.2,
    segmentLength: 14,
    segmentDepth: 1.0,
    start: { x: 0, y: 4, z: 2 },
    pieces: [
      // Long + mixed difficulty: narrow sections, multiple gaps, and 2 cylinder tunnels.
      { kind: 'solid', segments: 6, angle: 0.00 },
      { kind: 'solid', segments: 3, angle: 0.18 },
      { kind: 'solid', segments: 2, angle: -0.14 },
      { kind: 'solid', segments: 4, angle: 0.12, widthMultiplier: 0.85 },
      { kind: 'gap',   segments: 1 },
      { kind: 'solid', segments: 3, angle: -0.16, widthMultiplier: 0.85 },
      { kind: 'solid', segments: 2, angle: 0.22 },
      { kind: 'gap',   segments: 1 },
      { kind: 'solid', segments: 6, angle: -0.10 },
      { kind: 'solid', segments: 4, angle: 0.15, widthMultiplier: 0.75 },
      { kind: 'gap',   segments: 1 },
      { kind: 'solid', segments: 3, angle: 0.18 },
      // Cylinder 1 (spiky + 360° dodge)
      { kind: 'cylinder', segments: 12, radius: 6.0 },
      { kind: 'solid', segments: 5, angle: -0.12, widthMultiplier: 0.78 },
      { kind: 'gap',   segments: 1 },
      { kind: 'solid', segments: 6, angle: 0.10 },
      { kind: 'solid', segments: 4, angle: -0.18, widthMultiplier: 0.70 },
      { kind: 'gap',   segments: 1 },
      { kind: 'solid', segments: 3, angle: 0.24, widthMultiplier: 0.70 },
      { kind: 'gap',   segments: 1 },
      { kind: 'solid', segments: 5, angle: -0.14 },
      // Cylinder 2 (harder)
      { kind: 'cylinder', segments: 14, radius: 5.8 },
      // Final stretch
      { kind: 'solid', segments: 10, angle: 0.00 },
    ],
    obstacles: [
      // Early pressure
      { id: 'l3-barrier-1', type: 'barrier',  segmentIndex: 2,  x:  2.4 },
      { id: 'l3-wall-1',    type: 'wall',     segmentIndex: 5,  x: -1.8 },
      { id: 'l3-gate-1',    type: 'gate',     segmentIndex: 7,  x:  2.0 },

      // Prep for first gap (gap at 15)
      { id: 'l3-lowwall-1', type: 'low_wall', segmentIndex: 12, x:  0.0 },
      { id: 'l3-barrier-2', type: 'barrier',  segmentIndex: 13, x: -2.0 },

      // After gap, tighter steering
      { id: 'l3-pillar-1',  type: 'pillar',   segmentIndex: 16, x:  0.0 },
      { id: 'l3-wall-2',    type: 'wall',     segmentIndex: 18, x:  1.8 },
      { id: 'l3-gate-2',    type: 'gate',     segmentIndex: 19, x:  1.8 },
      { id: 'l3-gate-3',    type: 'gate',     segmentIndex: 20, x: -1.8 },

      // Mid run (before gap at 32)
      { id: 'l3-wall-3',    type: 'wall',     segmentIndex: 24, x:  0.0 },
      { id: 'l3-pillar-2',  type: 'pillar',   segmentIndex: 27, x:  2.0 },
      { id: 'l3-lowwall-2', type: 'low_wall', segmentIndex: 29, x:  0.0 },
      { id: 'l3-barrier-3', type: 'barrier',  segmentIndex: 30, x:  1.8 },

      // Lead-in to cylinder 1
      { id: 'l3-gate-4',    type: 'gate',     segmentIndex: 34, x:  0.0 },
      { id: 'l3-pillar-3',  type: 'pillar',   segmentIndex: 35, x: -2.0 },

      // After cylinder 1 (gap at 53)
      { id: 'l3-wall-4',    type: 'wall',     segmentIndex: 48, x: -1.8 },
      { id: 'l3-lowwall-3', type: 'low_wall', segmentIndex: 51, x:  0.0 },
      { id: 'l3-barrier-4', type: 'barrier',  segmentIndex: 52, x:  2.0 },

      // Second half complexity
      { id: 'l3-wall-5',    type: 'wall',     segmentIndex: 55, x:  1.8 },
      { id: 'l3-gate-5',    type: 'gate',     segmentIndex: 57, x: -2.0 },
      { id: 'l3-pillar-4',  type: 'pillar',   segmentIndex: 59, x:  0.0 },

      // Narrow stress (wm=0.70 at 60-63)
      { id: 'l3-barrier-5', type: 'barrier',  segmentIndex: 60, x:  1.6 },
      { id: 'l3-wall-6',    type: 'wall',     segmentIndex: 62, x: -1.6, size: { w: 2.8, h: 1.1, d: 0.7 } },

      // Low wall into a gap (gap at 68)
      { id: 'l3-lowwall-4', type: 'low_wall', segmentIndex: 65, x:  0.0 },

      // Final pre-cylinder gauntlet
      { id: 'l3-gate-6',    type: 'gate',     segmentIndex: 70, x:  2.0 },
      { id: 'l3-pillar-5',  type: 'pillar',   segmentIndex: 72, x: -2.0 },
      { id: 'l3-wall-7',    type: 'wall',     segmentIndex: 73, x:  0.0 },

      // Final stretch after cylinder 2
      { id: 'l3-lowwall-5', type: 'low_wall', segmentIndex: 90, x:  0.0 },
      { id: 'l3-wall-8',    type: 'wall',     segmentIndex: 92, x: -1.8 },
      { id: 'l3-gate-7',    type: 'gate',     segmentIndex: 94, x:  2.0 },
      { id: 'l3-barrier-6', type: 'barrier',  segmentIndex: 95, x: -2.0 },
      { id: 'l3-pillar-6',  type: 'pillar',   segmentIndex: 96, x:  0.0 },
    ],
    stars: [
      { id: 'l3-star-1', segmentIndex: 26, x: -2.0, yOffset: 1.7 },
      { id: 'l3-star-2', segmentIndex: 56, x:  2.0, yOffset: 1.7 },
      { id: 'l3-star-3', segmentIndex: 91, x:  0.0, yOffset: 1.8 },
    ],
  },
]

export function getLevelById(id: LevelId): LevelDef {
  const level = LEVELS.find((l) => l.id === id)
  if (!level) throw new Error(`Level not found: ${id}`)
  return level
}
