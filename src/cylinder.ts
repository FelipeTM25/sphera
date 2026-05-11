import type { LevelDef, TrackPiece } from './levels'

export type CylinderObstacle = {
  id: string
  z: number
  angle: number // radians
  arc: number   // radians (angular width)
  depth: number // world units along Z
}

export type CylinderSection = {
  startZ: number
  endZ: number
  radius: number // cylinder inner radius (surface)
  centerY: number
  surfaceY: number
  obstacles: CylinderObstacle[]
}

function wrapAngleRad(a: number) {
  const twoPi = Math.PI * 2
  let x = a % twoPi
  if (x > Math.PI) x -= twoPi
  if (x < -Math.PI) x += twoPi
  return x
}

function makeRng(seed: number) {
  // Deterministic LCG for consistent obstacle layouts.
  let s = seed >>> 0
  return () => {
    s = (1664525 * s + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function randInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min
}

function buildCylinderObstacles(opts: {
  levelId: number
  startZ: number
  segmentLength: number
  segments: number
  radius: number
}) {
  const { levelId, startZ, segmentLength: L, segments } = opts

  // Place obstacles on rings, leaving an open lane each time.
  const slotCount = 8
  const arc = (Math.PI * 2) / slotCount
  const obstacleArc = arc * 0.62
  const depth = L * 0.65

  const rng = makeRng(levelId * 10007 + Math.round(Math.abs(startZ) * 17))

  // Keep entry/exit clearer.
  const firstRing = 2
  const lastRing = Math.max(firstRing, segments - 3)
  const step = 2

  const obstacles: CylinderObstacle[] = []

  for (let ring = firstRing; ring <= lastRing; ring += step) {
    const safeSlot = randInt(rng, 0, slotCount - 1)
    // 3 open slots clustered -> feels fair; rest blocked.
    const open = new Set<number>([safeSlot, (safeSlot + 1) % slotCount, (safeSlot + slotCount - 1) % slotCount])

    for (let slot = 0; slot < slotCount; slot++) {
      if (open.has(slot)) continue
      const angle = slot * arc
      const z = startZ - ring * L
      obstacles.push({
        id: `cyl-${levelId}-${ring}-${slot}`,
        z,
        angle,
        arc: obstacleArc,
        depth,
      })
    }
  }

  return obstacles
}

export function computeCylinderSections(level: LevelDef): CylinderSection[] {
  const L = level.segmentLength

  const sections: CylinderSection[] = []

  let surfaceStartY = 0
  let timelineIndex = 0

  for (const piece of level.pieces as TrackPiece[]) {
    if (piece.kind === 'gap') {
      timelineIndex += piece.segments
      continue
    }

    if (piece.kind === 'solid') {
      for (let i = 0; i < piece.segments; i++) {
        const angle = piece.angle
        const dz = L * Math.sin(angle)
        surfaceStartY += dz
        timelineIndex += 1
      }
      continue
    }

    if (piece.kind === 'cylinder') {
      const startZ = 0 - timelineIndex * L
      const endZ = 0 - (timelineIndex + piece.segments) * L
      const radius = piece.radius
      const surfaceY = surfaceStartY
      const centerY = surfaceY + radius

      sections.push({
        startZ,
        endZ,
        radius,
        centerY,
        surfaceY,
        obstacles: buildCylinderObstacles({
          levelId: level.id,
          startZ,
          segmentLength: L,
          segments: piece.segments,
          radius,
        }),
      })

      timelineIndex += piece.segments
      // Surface Y does not change through a cylinder section.
      continue
    }
  }

  return sections
}

export function isInsideCylinder(section: CylinderSection, z: number) {
  // z decreases as you move forward.
  return z <= section.startZ && z >= section.endZ
}

export function cylinderAngleDelta(a: number, b: number) {
  return wrapAngleRad(a - b)
}
