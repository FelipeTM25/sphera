import type { LevelDef } from './levels'

export type CylinderObstacle = {
  id: string
  z: number
  angle: number // radians
  arc: number   // angular width (radians)
  depth: number // world units along Z
}

export type CylinderSection = {
  startZ: number
  endZ: number
  radius: number
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

// Deterministic LCG for consistent obstacle layouts across sessions
function makeRng(seed: number) {
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
  openSlots?: number           // how many adjacent slots to leave clear (default 4)
  forceBottomObstacle?: boolean // always block the bottom slot (angle = -π/2 = slot 6 of 8)
}) {
  const { levelId, startZ, segmentLength: L, segments, openSlots = 4, forceBottomObstacle = false } = opts

  const slotCount = 8
  const arc = (Math.PI * 2) / slotCount
  const obstacleArc = arc * 0.45
  const depth = L * 0.65
  // Slot 6 of 8 is angle = 6*(2π/8) = 3π/2 = -π/2 (bottom, where ball enters)
  const bottomSlot = Math.round((3 * Math.PI / 2) / arc) % slotCount

  const rng = makeRng(levelId * 10007 + Math.round(Math.abs(startZ) * 17))

  const firstRing = 2
  const lastRing = Math.max(firstRing, segments - 3)
  const step = 2

  const obstacles: CylinderObstacle[] = []

  for (let ring = firstRing; ring <= lastRing; ring += step) {
    let safeSlot = randInt(rng, 0, slotCount - 1)
    // If forceBottomObstacle, ensure safeSlot is not near the bottom slot.
    // We only enforce this on the FIRST ring so the entry is blocked, 
    // but the rest of the cylinder varies naturally and isn't all on one side.
    if (forceBottomObstacle && ring === firstRing) {
      const maxAttempts = 8
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const gap: number[] = []
        for (let k = 0; k < openSlots; k++) gap.push((safeSlot + k) % slotCount)
        gap.push((safeSlot + slotCount - 1) % slotCount)
        if (!gap.includes(bottomSlot)) break
        safeSlot = (safeSlot + 1) % slotCount
      }
    }

    // Build the open set: openSlots adjacent slots starting at safeSlot
    const open = new Set<number>()
    for (let k = 0; k < openSlots; k++) {
      open.add((safeSlot + k) % slotCount)
    }
    // Always keep one slot to the left of the gap for a smooth edge
    open.add((safeSlot + slotCount - 1) % slotCount)

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

  for (const piece of level.pieces) {
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
          openSlots: piece.openSlots ?? 4,
          forceBottomObstacle: piece.forceBottomObstacle ?? false,
        }),
      })

      timelineIndex += piece.segments
      continue
    }
  }

  return sections
}

export function isInsideCylinder(section: CylinderSection, z: number) {
  // z decreases as the ball moves forward
  return z <= section.startZ && z >= section.endZ
}

export function cylinderAngleDelta(a: number, b: number) {
  return wrapAngleRad(a - b)
}
