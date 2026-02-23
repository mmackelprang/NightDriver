/**
 * Night Driver road system — procedural track with pseudo-3D perspective.
 * Road is defined as a series of segments with curvature values.
 */

export interface RoadSegment {
  curve: number;  // lateral curvature (-1 to 1, negative = left, positive = right)
}

export function generateTrack(difficulty: number): RoadSegment[] {
  const segments: RoadSegment[] = [];
  const total = 500;
  let curve = 0;
  let curveTarget = 0;
  let changeTimer = 0;

  for (let i = 0; i < total; i++) {
    changeTimer--;
    if (changeTimer <= 0) {
      changeTimer = 15 + Math.floor(Math.random() * 40);
      const maxCurve = 0.3 + difficulty * 0.15;
      curveTarget = (Math.random() - 0.5) * 2 * maxCurve;
      // Occasionally straight
      if (Math.random() < 0.3) curveTarget = 0;
    }

    curve += (curveTarget - curve) * 0.05;
    segments.push({ curve });
  }

  return segments;
}
