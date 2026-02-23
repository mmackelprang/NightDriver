/**
 * Night Driver renderer — pseudo-3D road with post pairs, dashboard silhouette, HUD.
 *
 * Classic segment-based pseudo-3D road: each segment projects from a horizon line
 * down to the bottom of the play area. Posts are pairs of white rectangles on black.
 */

import {
  CANVAS_WIDTH, CANVAS_HEIGHT, RENDER_SCALE, NATIVE_WIDTH, NATIVE_HEIGHT,
  DRAW_DISTANCE, ROAD_WIDTH,
  COLORS, TRACK_CONFIGS,
} from '../core/constants.js';
import type { RoadSegment } from '../road/road.js';

/** Horizon and road bottom in native coordinates */
const HORIZON_Y = 80;       // horizon near top third
const ROAD_BOTTOM = 192;    // road ends here (dashboard starts at ~197)

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  clear(): void {
    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  /**
   * Draw the road using simple scanline-based pseudo-3D.
   *
   * For each visible segment at index i (0 = farthest, DRAW_DISTANCE = closest):
   *   depth = i / DRAW_DISTANCE  (0 = horizon, 1 = near camera)
   *   screenY = horizon + depth * (roadBottom - horizon)
   *   roadWidth at this depth scales with depth²
   *   screenX offset = accumulated curve * depth
   *
   * This produces the classic "posts rushing toward you" effect.
   */
  drawRoad(
    track: RoadSegment[],
    position: number,
    playerX: number,
    speed: number,
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(RENDER_SCALE, RENDER_SCALE);

    const baseSegment = Math.floor(position);
    const segFrac = position - baseSegment;
    const halfW = NATIVE_WIDTH / 2;
    const roadRange = ROAD_BOTTOM - HORIZON_Y;

    // Pre-compute curve offsets (accumulated from far to near)
    // Build from player outward: index 0 = nearest, index DRAW_DISTANCE-1 = farthest
    const curveAccum: number[] = new Array(DRAW_DISTANCE);
    let acc = 0;
    for (let i = 0; i < DRAW_DISTANCE; i++) {
      const segIdx = (baseSegment + i) % track.length;
      acc += track[segIdx].curve;
      curveAccum[i] = acc;
    }

    // Render far to near (back-to-front) so close posts paint over distant ones
    for (let i = DRAW_DISTANCE - 1; i >= 0; i--) {
      // Depth ratio: 0 at far end, 1 at camera
      // Use fractional offset for smooth scrolling
      const rawDepth = 1 - (i - segFrac) / DRAW_DISTANCE;
      if (rawDepth <= 0 || rawDepth > 1) continue;

      // Non-linear depth for perspective effect (quadratic gives better spacing)
      const depth = rawDepth * rawDepth;

      // Screen Y position
      const screenY = HORIZON_Y + depth * roadRange;
      if (screenY < HORIZON_Y || screenY > ROAD_BOTTOM) continue;

      // Road half-width widens with proximity
      const roadHalfW = ROAD_WIDTH * halfW * depth;

      // Lateral offset: curve accumulation scaled by depth, minus player offset
      const curveShift = curveAccum[i] * depth * 40 * (speed / 300);
      const centerX = halfW + curveShift - playerX * roadHalfW;

      // Post dimensions grow with proximity
      const postW = Math.max(1, depth * 6);
      const postH = Math.max(2, depth * 16);

      // Fade with distance
      const alpha = depth;

      // Draw posts every 3 segments for proper spacing
      if (i % 3 === 0) {
        const leftX = centerX - roadHalfW;
        const rightX = centerX + roadHalfW;

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;

        // Left post
        ctx.fillRect(leftX - postW / 2, screenY - postH, postW, postH);
        // Right post
        ctx.fillRect(rightX - postW / 2, screenY - postH, postW, postH);
      }

      // Center dashes in close range
      if (i < DRAW_DISTANCE * 0.4 && i % 6 === 0 && depth > 0.1) {
        const dashW = Math.max(0.5, depth * 3);
        const dashH = Math.max(0.5, depth * 4);
        ctx.fillStyle = `rgba(170, 170, 170, ${alpha * 0.35})`;
        ctx.fillRect(centerX - dashW / 2, screenY - dashH, dashW, dashH);
      }
    }

    ctx.restore();
  }

  /** Draw the dashboard / car silhouette at the bottom of the screen */
  drawDashboard(): void {
    const ctx = this.ctx;
    const s = RENDER_SCALE;
    const w = NATIVE_WIDTH * s;
    const h = NATIVE_HEIGHT * s;

    const dashY = h * 0.82;
    const dashH = h - dashY;

    // Dashboard body
    ctx.fillStyle = COLORS.dashboard;
    ctx.fillRect(0, dashY, w, dashH);

    // Steering wheel
    ctx.fillStyle = COLORS.car;
    ctx.beginPath();
    ctx.arc(w / 2, dashY + dashH * 0.5, dashH * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Hood trapezoid
    ctx.fillStyle = COLORS.dashboard;
    ctx.beginPath();
    ctx.moveTo(w * 0.15, dashY);
    ctx.lineTo(w * 0.85, dashY);
    ctx.lineTo(w * 0.75, dashY - dashH * 0.15);
    ctx.lineTo(w * 0.25, dashY - dashH * 0.15);
    ctx.closePath();
    ctx.fill();

    // Hood outline
    ctx.strokeStyle = COLORS.carOutline;
    ctx.lineWidth = s;
    ctx.beginPath();
    ctx.moveTo(w * 0.15, dashY);
    ctx.lineTo(w * 0.25, dashY - dashH * 0.15);
    ctx.lineTo(w * 0.75, dashY - dashH * 0.15);
    ctx.lineTo(w * 0.85, dashY);
    ctx.stroke();

    // Side mirrors
    const mirrorW = w * 0.03;
    const mirrorH = dashH * 0.2;
    ctx.fillStyle = COLORS.carOutline;
    ctx.fillRect(w * 0.08, dashY - mirrorH, mirrorW, mirrorH);
    ctx.fillRect(w * 0.89, dashY - mirrorH, mirrorW, mirrorH);
  }

  /** HUD: score, timer, gear, speed */
  drawHUD(
    score: number,
    highScore: number,
    timer: number,
    gear: number,
    speed: number,
    maxSpeed: number,
    muted: boolean,
  ): void {
    const ctx = this.ctx;
    const s = RENDER_SCALE;
    const fontSize = 8 * s;

    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textBaseline = 'top';

    // Score — top left
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${String(score).padStart(5, '0')}`, 4 * s, 4 * s);

    // High score — top center
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText(`HI ${String(highScore).padStart(5, '0')}`, CANVAS_WIDTH / 2, 4 * s);

    // Timer — top right
    const timerSec = Math.max(0, Math.ceil(timer));
    ctx.textAlign = 'right';
    ctx.fillStyle = timerSec <= 10 ? COLORS.timerWarning : COLORS.text;
    ctx.fillText(`TIME ${String(timerSec).padStart(3, ' ')}`, (NATIVE_WIDTH - 4) * s, 4 * s);

    // Gear — bottom left of play area
    const bottomY = CANVAS_HEIGHT * 0.78;
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.gear;
    ctx.fillText(`GEAR ${gear + 1}`, 4 * s, bottomY);

    // Speed — bottom right of play area
    ctx.textAlign = 'right';
    const speedPct = Math.round((speed / maxSpeed) * 100);
    ctx.fillStyle = COLORS.speed;
    ctx.fillText(`${speedPct} MPH`, (NATIVE_WIDTH - 4) * s, bottomY);

    // Mute indicator
    if (muted) {
      ctx.textAlign = 'right';
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText('MUTE', (NATIVE_WIDTH - 4) * s, 16 * s);
    }
  }

  /** Crash flash effect */
  drawCrashEffect(crashTimer: number, crashDuration: number): void {
    const ratio = crashTimer / crashDuration;
    if (ratio > 0.8) {
      const flash = (ratio - 0.8) / 0.2;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.6})`;
      this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }

  // ─── Attract / Menu ─────────────────────────────────────────────

  drawAttract(frame: number, highScore: number): void {
    this.clear();
    const ctx = this.ctx;
    const s = RENDER_SCALE;

    // Pulsing title
    const titleSize = 16 * s;
    ctx.font = `bold ${titleSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const pulse = 0.7 + 0.3 * Math.sin(frame * 0.05);
    ctx.fillStyle = COLORS.title;
    ctx.globalAlpha = pulse;
    ctx.fillText('NIGHT DRIVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.2);
    ctx.globalAlpha = 1;

    // Subtitle
    const subSize = 8 * s;
    ctx.font = `bold ${subSize}px monospace`;
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('ATARI 1976', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.28);

    // Track selection
    ctx.fillStyle = COLORS.text;
    ctx.fillText('SELECT TRACK:', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.42);

    const trackY = CANVAS_HEIGHT * 0.50;
    TRACK_CONFIGS.forEach((tc, i) => {
      ctx.fillStyle = COLORS.text;
      ctx.fillText(`${i + 1} - ${tc.name}`, CANVAS_WIDTH / 2, trackY + i * subSize * 1.8);
    });

    // Controls
    const ctrlY = CANVAS_HEIGHT * 0.72;
    ctx.fillStyle = COLORS.textDim;
    const controlSize = 6 * s;
    ctx.font = `${controlSize}px monospace`;
    ctx.fillText('UP/W = GAS    DOWN/S = BRAKE', CANVAS_WIDTH / 2, ctrlY);
    ctx.fillText('LEFT/A RIGHT/D = STEER', CANVAS_WIDTH / 2, ctrlY + controlSize * 1.6);
    ctx.fillText('SHIFT = GEAR UP    CTRL = GEAR DOWN', CANVAS_WIDTH / 2, ctrlY + controlSize * 3.2);
    ctx.fillText('M = MUTE', CANVAS_WIDTH / 2, ctrlY + controlSize * 4.8);

    // High score
    ctx.font = `bold ${subSize}px monospace`;
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText(`HIGH SCORE: ${String(highScore).padStart(5, '0')}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.92);

    // Decorative animated posts
    this.drawDecorativePosts(frame);
  }

  private drawDecorativePosts(frame: number): void {
    const ctx = this.ctx;
    const s = RENDER_SCALE;
    const postW = 3 * s;
    const numPosts = 6;

    for (let i = 0; i < numPosts; i++) {
      const t = (i / numPosts + frame * 0.002) % 1;
      const y = CANVAS_HEIGHT * (0.35 + t * 0.45);
      const perspective = 1 - t;
      const spread = 40 + perspective * 80;
      const postH = (2 + perspective * 4) * s;
      const alpha = perspective * 0.6;

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(CANVAS_WIDTH / 2 - spread * s - postW / 2, y - postH, postW, postH);
      ctx.fillRect(CANVAS_WIDTH / 2 + spread * s - postW / 2, y - postH, postW, postH);
    }
  }

  drawGameOver(score: number, highScore: number, isNewHigh: boolean): void {
    this.clear();
    const ctx = this.ctx;
    const s = RENDER_SCALE;

    ctx.font = `bold ${14 * s}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.timerWarning;
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.3);

    ctx.font = `bold ${10 * s}px monospace`;
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`SCORE: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.45);

    if (isNewHigh) {
      ctx.fillStyle = COLORS.title;
      ctx.fillText('NEW HIGH SCORE!', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.55);
    }

    ctx.font = `bold ${8 * s}px monospace`;
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText(`HIGH SCORE: ${highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.65);

    ctx.font = `${7 * s}px monospace`;
    ctx.fillStyle = COLORS.text;
    ctx.fillText('PRESS ANY KEY', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.80);
  }

  drawGetReady(trackName: string, countdown: number): void {
    this.clear();
    const ctx = this.ctx;
    const s = RENDER_SCALE;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `bold ${10 * s}px monospace`;
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`TRACK: ${trackName}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.35);

    ctx.font = `bold ${20 * s}px monospace`;
    ctx.fillStyle = COLORS.title;
    const secs = Math.ceil(countdown);
    if (secs > 0) {
      ctx.fillText(String(secs), CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.5);
    } else {
      ctx.fillText('GO!', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.5);
    }

    ctx.font = `bold ${8 * s}px monospace`;
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('GET READY', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.65);
  }
}
