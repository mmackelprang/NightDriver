/**
 * Night Driver — main game orchestrator.
 * Timer-based first-person night racing with pseudo-3D road posts.
 */

import { StateMachine } from './states/state-machine.js';
import { InputManager } from './core/input.js';
import { SoundManager } from './systems/sound.js';
import { Renderer } from './rendering/renderer.js';
import { generateTrack, type RoadSegment } from './road/road.js';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, FRAME_TIME,
  MAX_SPEED, STEERING_SPEED, MAX_LATERAL, CENTRIFUGAL_FORCE,
  NUM_GEARS, GEAR_MAX_SPEEDS, GEAR_ACCELS,
  CRASH_DURATION, CRASH_PENALTY, POST_HIT_WIDTH,
  GAME_TIME, BONUS_TIME_SCORE, BONUS_TIME_AMOUNT,
  SCORE_PER_SEGMENT, TRACK_CONFIGS,
  BRAKE_DECEL, DECELERATION,
  ROAD_WIDTH,
} from './core/constants.js';

type GameStateKey = 'attract' | 'getReady' | 'playing' | 'gameOver';

const HIGH_SCORE_KEY = 'nightdriver_high_score';

export class Game {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly input: InputManager;
  readonly sound: SoundManager;
  readonly renderer: Renderer;
  readonly fsm: StateMachine<GameStateKey, Game>;

  private lastTime = 0;
  private accumulator = 0;

  // Game state
  track: RoadSegment[] = [];
  trackIndex = 0;        // which track config
  position = 0;          // progress along track (fractional segments)
  playerX = 0;           // lateral position (-1 to 1)
  speed = 0;             // current speed
  gear = 0;              // current gear (0-3)
  score = 0;
  highScore = 0;
  timer = GAME_TIME;
  bonusAwarded = false;

  // Crash state
  crashing = false;
  crashTimer = 0;

  // UI state
  attractFrame = 0;
  getReadyTimer = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d')!;
    this.input = new InputManager();
    this.sound = new SoundManager();
    this.renderer = new Renderer(this.ctx);
    this.fsm = new StateMachine<GameStateKey, Game>(this);

    // Load high score
    const saved = localStorage.getItem(HIGH_SCORE_KEY);
    if (saved) this.highScore = parseInt(saved, 10) || 0;

    this.registerStates();
    this.scaleCanvas();
    window.addEventListener('resize', () => this.scaleCanvas());

    this.fsm.transition('attract');
    requestAnimationFrame((t) => this.loop(t));
  }

  private scaleCanvas(): void {
    const scaleX = window.innerWidth / this.canvas.width;
    const scaleY = window.innerHeight / this.canvas.height;
    const scale = Math.min(scaleX, scaleY);
    this.canvas.style.width = `${this.canvas.width * scale}px`;
    this.canvas.style.height = `${this.canvas.height * scale}px`;
  }

  private loop(time: number): void {
    const delta = time - this.lastTime;
    this.lastTime = time;
    this.accumulator += Math.min(delta, 100);

    while (this.accumulator >= FRAME_TIME) {
      this.fsm.update(FRAME_TIME);
      this.input.endFrame();
      this.accumulator -= FRAME_TIME;
    }

    this.fsm.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  private registerStates(): void {
    // ─── ATTRACT ──────────────────────────────────────────────────
    this.fsm.register('attract', {
      enter: (g) => {
        g.attractFrame = 0;
        g.sound.stopEngine();
      },
      update: (g, _dt) => {
        g.attractFrame++;

        // Mute toggle
        if (g.input.isAnyKeyPressed('KeyM')) {
          g.sound.toggleMute();
        }

        // Track selection via number keys
        for (let i = 0; i < TRACK_CONFIGS.length; i++) {
          if (g.input.isAnyKeyPressed(`Digit${i + 1}`)) {
            g.trackIndex = i;
            g.startGame();
            return;
          }
        }

        // Any other key starts with current track
        if (g.input.isAnyKeyPressed('Space') || g.input.isAnyKeyPressed('Enter')) {
          g.startGame();
        }
      },
      render: (g) => {
        g.renderer.drawAttract(g.attractFrame, g.highScore);
      },
    });

    // ─── GET READY ────────────────────────────────────────────────
    this.fsm.register('getReady', {
      enter: (g) => {
        g.getReadyTimer = 3.0; // 3 second countdown
      },
      update: (g, dt) => {
        g.getReadyTimer -= dt / 1000;
        if (g.getReadyTimer <= -0.5) {
          g.fsm.transition('playing');
        }
      },
      render: (g) => {
        g.renderer.drawGetReady(
          TRACK_CONFIGS[g.trackIndex].name,
          g.getReadyTimer,
        );
      },
    });

    // ─── PLAYING ──────────────────────────────────────────────────
    this.fsm.register('playing', {
      update: (g, dt) => {
        const dtSec = dt / 1000;

        // Mute toggle
        if (g.input.isAnyKeyPressed('KeyM')) {
          g.sound.toggleMute();
        }

        // ── Handle crash freeze ──
        if (g.crashing) {
          g.crashTimer -= dtSec;
          g.speed *= 0.95; // Rapid deceleration during crash
          if (g.crashTimer <= 0) {
            g.crashing = false;
          }
          g.sound.updateEngine(g.speed, MAX_SPEED);
          return;
        }

        // ── Gear shifting ──
        if (g.input.isAnyKeyPressed('ShiftLeft') || g.input.isAnyKeyPressed('ShiftRight')) {
          if (g.gear < NUM_GEARS - 1) {
            g.gear++;
            g.sound.playGearShift();
          }
        }
        if (g.input.isAnyKeyPressed('ControlLeft') || g.input.isAnyKeyPressed('ControlRight')) {
          if (g.gear > 0) {
            g.gear--;
            g.sound.playGearShift();
          }
        }

        // ── Acceleration / Braking ──
        const gearMaxSpeed = GEAR_MAX_SPEEDS[g.gear];
        const gearAccel = GEAR_ACCELS[g.gear];

        if (g.input.isKeyDown('ArrowUp') || g.input.isKeyDown('KeyW')) {
          // Accelerate
          if (g.speed < gearMaxSpeed) {
            g.speed = Math.min(gearMaxSpeed, g.speed + gearAccel * dtSec);
          } else {
            // Over gear max — coast down
            g.speed = Math.max(gearMaxSpeed, g.speed - DECELERATION * dtSec);
          }
        } else if (g.input.isKeyDown('ArrowDown') || g.input.isKeyDown('KeyS')) {
          // Brake
          g.speed = Math.max(0, g.speed - BRAKE_DECEL * dtSec);
        } else {
          // Coast — natural deceleration
          g.speed = Math.max(0, g.speed - DECELERATION * dtSec);
        }

        // ── Steering ──
        const steerAmount = STEERING_SPEED * dtSec;
        if (g.input.isKeyDown('ArrowLeft') || g.input.isKeyDown('KeyA')) {
          g.playerX -= steerAmount;
        }
        if (g.input.isKeyDown('ArrowRight') || g.input.isKeyDown('KeyD')) {
          g.playerX += steerAmount;
        }

        // Apply centrifugal force from curves
        const segIdx = Math.floor(g.position) % g.track.length;
        const currentCurve = g.track[segIdx].curve;
        g.playerX += currentCurve * CENTRIFUGAL_FORCE * (g.speed / MAX_SPEED) * dtSec;

        // Clamp lateral position
        g.playerX = Math.max(-MAX_LATERAL, Math.min(MAX_LATERAL, g.playerX));

        // ── Advance position ──
        const prevPos = g.position;
        g.position += g.speed * dtSec / 50; // scale speed to segment progression
        if (g.position >= g.track.length) {
          g.position -= g.track.length; // wrap track
        }

        // ── Score from distance ──
        const segmentsPassed = Math.floor(g.position) - Math.floor(prevPos);
        if (segmentsPassed > 0) {
          g.score += segmentsPassed * SCORE_PER_SEGMENT;
        }

        // ── Bonus time ──
        if (!g.bonusAwarded && g.score >= BONUS_TIME_SCORE) {
          g.bonusAwarded = true;
          g.timer += BONUS_TIME_AMOUNT;
          g.sound.playBonusTime();
        }

        // ── Collision detection — check if player is outside road posts ──
        const lateralAbs = Math.abs(g.playerX);
        if (lateralAbs > ROAD_WIDTH - POST_HIT_WIDTH && g.speed > 20) {
          g.triggerCrash();
        }

        // ── Timer countdown ──
        g.timer -= dtSec;
        if (g.timer <= 0) {
          g.timer = 0;
          g.fsm.transition('gameOver');
          return;
        }

        // ── Engine sound ──
        g.sound.updateEngine(g.speed, MAX_SPEED);
      },

      render: (g) => {
        g.renderer.clear();
        g.renderer.drawRoad(g.track, g.position, g.playerX, g.speed);
        g.renderer.drawDashboard();
        g.renderer.drawHUD(
          g.score, g.highScore, g.timer,
          g.gear, g.speed, MAX_SPEED,
          g.sound.isMuted(),
        );
        if (g.crashing && g.crashTimer > 0) {
          g.renderer.drawCrashEffect(g.crashTimer, CRASH_DURATION);
        }
      },
    });

    // ─── GAME OVER ────────────────────────────────────────────────
    this.fsm.register('gameOver', {
      enter: (g) => {
        g.sound.stopEngine();
        // Update high score
        const isNew = g.score > g.highScore;
        if (isNew) {
          g.highScore = g.score;
          localStorage.setItem(HIGH_SCORE_KEY, String(g.highScore));
        }
      },
      update: (g) => {
        if (g.input.isAnyKeyPressed()) {
          g.fsm.transition('attract');
        }
      },
      render: (g) => {
        const isNew = g.score >= g.highScore && g.score > 0;
        g.renderer.drawGameOver(g.score, g.highScore, isNew);
      },
    });
  }

  /** Initialize a new game */
  private startGame(): void {
    const config = TRACK_CONFIGS[this.trackIndex];
    this.track = generateTrack(config.difficulty);
    this.position = 0;
    this.playerX = 0;
    this.speed = 0;
    this.gear = 0;
    this.score = 0;
    this.timer = GAME_TIME;
    this.bonusAwarded = false;
    this.crashing = false;
    this.crashTimer = 0;

    this.fsm.transition('getReady');
  }

  /** Trigger a crash */
  triggerCrash(): void {
    if (this.crashing) return;
    this.crashing = true;
    this.crashTimer = CRASH_DURATION;
    this.timer = Math.max(0, this.timer - CRASH_PENALTY);
    this.sound.playCrash();
    this.sound.playSkid();
    // Bounce player back toward center
    this.playerX *= 0.5;
  }
}
