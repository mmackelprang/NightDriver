/** Night Driver native resolution */
export const NATIVE_WIDTH = 256;
export const NATIVE_HEIGHT = 240;

export const RENDER_SCALE = 3;
export const CANVAS_WIDTH = NATIVE_WIDTH * RENDER_SCALE;   // 768
export const CANVAS_HEIGHT = NATIVE_HEIGHT * RENDER_SCALE;  // 720

export const TARGET_FPS = 60;
export const FRAME_TIME = 1000 / TARGET_FPS;

/** Road rendering */
export const NUM_ROAD_POSTS = 8; // 8 pairs of posts visible
export const HORIZON_Y = 0.35; // horizon at 35% from top

/** Car physics */
export const GEAR_SPEEDS = [60, 120, 200, 300]; // max speed per gear (px/sec)
export const STEERING_SPEED = 2.5; // radians/sec
export const ACCELERATION = 100; // px/sec^2
export const DECELERATION = 50;  // natural decel when not accelerating

/** Timer */
export const GAME_TIME = 90; // seconds
export const CRASH_PENALTY = 3; // seconds lost on crash
export const BONUS_TIME_SCORE = 300; // score threshold for bonus time
export const BONUS_TIME_AMOUNT = 30; // seconds added

/** Colors — monochrome on black */
export const COLORS = {
  background: '#000000',
  roadPost: '#FFFFFF',
  car: '#444444',      // dashboard silhouette
  text: '#FFFFFF',
  scoreText: '#FFFFFF',
  timerWarning: '#FF0000',
};

/** Scoring */
export const SCORE_PER_SEGMENT = 1;
