/** Night Driver native resolution */
export const NATIVE_WIDTH = 256;
export const NATIVE_HEIGHT = 240;

export const RENDER_SCALE = 3;
export const CANVAS_WIDTH = NATIVE_WIDTH * RENDER_SCALE;   // 768
export const CANVAS_HEIGHT = NATIVE_HEIGHT * RENDER_SCALE;  // 720

export const TARGET_FPS = 60;
export const FRAME_TIME = 1000 / TARGET_FPS;

/** Road rendering — pseudo-3D perspective */
export const DRAW_DISTANCE = 80;       // how many segments to render
export const ROAD_WIDTH = 0.7;         // road half-width at camera (normalized)
export const SEGMENT_LENGTH = 5;       // world units per segment
export const CAMERA_HEIGHT = 1.2;      // camera height above road
export const CAMERA_DEPTH = 1 / Math.tan((80 / 2) * Math.PI / 180);  // ~80° FOV

/** Car physics */
export const MAX_SPEED = 300;          // max speed (segments/sec effectively)
export const ACCELERATION = 120;       // acceleration rate
export const DECELERATION = 80;        // natural deceleration when coasting
export const BRAKE_DECEL = 200;        // deceleration when braking
export const STEERING_SPEED = 3.0;     // lateral movement speed
export const MAX_LATERAL = 0.8;        // max player X offset from center (-1 to 1 range)
export const CENTRIFUGAL_FORCE = 0.3;  // curve pushes player off-road

/** Gear system */
export const NUM_GEARS = 4;
export const GEAR_MAX_SPEEDS = [75, 150, 225, 300];  // max speed per gear
export const GEAR_ACCELS = [160, 130, 100, 80];      // acceleration per gear

/** Crash */
export const CRASH_DURATION = 1.0;    // seconds frozen during crash
export const CRASH_PENALTY = 3;       // seconds lost on crash
export const POST_HIT_WIDTH = 0.15;   // collision half-width for posts

/** Timer & scoring */
export const GAME_TIME = 90;           // starting seconds
export const BONUS_TIME_SCORE = 300;   // score for bonus time
export const BONUS_TIME_AMOUNT = 30;   // seconds added at threshold
export const SCORE_PER_SEGMENT = 1;    // score per segment passed

/** Track difficulties */
export const TRACK_CONFIGS = [
  { name: 'NOVICE',  difficulty: 0 },
  { name: 'PRO',     difficulty: 1 },
  { name: 'EXPERT',  difficulty: 2 },
  { name: 'RANDOM',  difficulty: 3 },
] as const;

/** Colors — classic Night Driver: white posts on black */
export const COLORS = {
  background: '#000000',
  post: '#FFFFFF',
  postLeft: '#FFFFFF',
  postRight: '#FFFFFF',
  centerLine: '#AAAAAA',
  car: '#333333',
  carOutline: '#666666',
  windshield: '#111111',
  dashboard: '#222222',
  text: '#FFFFFF',
  textDim: '#888888',
  timerWarning: '#FF4444',
  gear: '#00FF00',
  speed: '#00CCFF',
  title: '#FFAA00',
} as const;
