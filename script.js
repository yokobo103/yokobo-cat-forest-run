"use strict";

const LOGICAL_WIDTH = 960;
const LOGICAL_HEIGHT = 540;
const canvas = document.querySelector("#game");
canvas.width = LOGICAL_WIDTH;
canvas.height = LOGICAL_HEIGHT;

const ctx = canvas.getContext("2d");
const muteButton = document.querySelector("#muteButton");
ctx.imageSmoothingEnabled = false;

const WIDTH = LOGICAL_WIDTH;
const HEIGHT = LOGICAL_HEIGHT;
const WORLD_WIDTH = 3600;
const GRAVITY = 1900;
const MOVE_SPEED = 250;
const JUMP_SPEED = 690;
const MAX_HP = 5;
const BGM_VOLUME = 0.35;
const SE_VOLUME = 0.7;
const PICKUP_ITEM_SCALE = 2;

const ROBOT_SOLDIER_CROP_BOXES = [
  { x: 15, y: 228, w: 226, h: 241 },
  { x: 0, y: 228, w: 242, h: 244 },
  { x: 0, y: 233, w: 241, h: 239 },
  { x: 0, y: 241, w: 241, h: 228 },
  { x: 0, y: 244, w: 242, h: 225 },
  { x: 0, y: 252, w: 241, h: 217 },
  { x: 0, y: 247, w: 241, h: 225 },
  { x: 0, y: 244, w: 242, h: 221 },
  { x: 0, y: 208, w: 229, h: 264 },
];

const ASSETS = {
  cat: "./assets/cat-hero-spritesheet.webp",
  mouse: "./assets/mouse-enemy-spritesheet.webp",
  warrior: "./assets/mouse-warrior-spritesheet.webp",
  robotSoldier: "./assets/cleaned/robot-cat-soldier-spritesheet.webp",
  drone: "./assets/cleaned/drone-enemy-spritesheet.webp",
  ratCaptain: "./assets/cleaned/rat-captain-boss-spritesheet.webp",
  fish: "./assets/fish-pickup-spritesheet.webp",
  can: "./assets/cat-food-can-spritesheet.webp",
  heart: "./assets/heart-pickup-spritesheet.webp",
  background: "./assets/environment/forest/parallax_forest_background.webp",
  grass: "./assets/environment/grassland/grass_ground_tile.webp",
  dirt: "./assets/environment/grassland/dirt_tile.webp",
  cliff: "./assets/environment/grassland/cliff_edge_tile.webp",
  floating: "./assets/environment/grassland/floating_platform_tile.webp",
  forestTile: "./assets/environment/forest/forest_platform_tile.webp",
  metal: "./assets/environment/mecha_castle/metal_fortress_floor_tile.webp",
  wall: "./assets/environment/mecha_castle/steel_wall_tile.webp",
  hazard: "./assets/environment/mecha_castle/hazard_tile.webp",
  conveyor: "./assets/environment/mecha_castle/conveyor_tile.webp",
  fortressBg: "./assets/environment/mecha_castle/parallax_mechanical_fortress_background.webp",
  flag: "./assets/props/checkpoint_flag.webp",
  sign: "./assets/props/signboard.webp",
  chest: "./assets/props/treasure_chest.webp",
  bush: "./assets/props/bush.webp",
  rock: "./assets/props/rock.webp",
  mushroom: "./assets/props/mushroom.webp",
  lamp: "./assets/props/lamp.webp",
  statue: "./assets/props/cat_statue.webp",
  crate: "./assets/props/crate.webp",
  barrel: "./assets/props/barrel.webp",
  heartIcon: "./assets/ui/hp_heart_icon.webp",
  fishIcon: "./assets/ui/fish_counter_icon.webp",
  canIcon: "./assets/ui/cat_can_icon.webp",
  startButton: "./assets/ui/start_button.webp",
  retryButton: "./assets/ui/retry_button.webp",
  gameOverBanner: "./assets/ui/game_over_banner.webp",
  clearBanner: "./assets/ui/stage_clear_banner.webp",
};

const AUDIO_ASSETS = {
  bgm: "./assets/bgm/stage1.ogg",
  clear: "./assets/se/SE_clear.ogg",
  damage: "./assets/se/SE_damage.ogg",
  gameover: "./assets/se/SE_gameover.ogg",
  jump: "./assets/se/SE_jump.ogg",
  pickup: "./assets/se/SE_pick_fish_can.ogg",
  recover: "./assets/se/SE_recover.ogg",
  ui: "./assets/se/SE_UI.ogg",
};

class AudioManager {
  constructor(paths) {
    this.paths = paths;
    this.bgm = new Audio(paths.bgm);
    this.sounds = {};
    this.unlocked = false;
    this.muted = false;

    this.bgm.loop = true;
    this.bgm.preload = "auto";
    this.bgm.volume = BGM_VOLUME;
    this.bgm.load();

    for (const [key, src] of Object.entries(paths)) {
      if (key === "bgm") continue;
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = SE_VOLUME;
      audio.load();
      this.sounds[key] = audio;
    }
  }

  unlock() {
    this.unlocked = true;
    if (!this.muted && state === "playing") this.playBgm();
  }

  playBgm() {
    if (!this.unlocked || this.muted || state !== "playing") return;
    if (!this.bgm.paused) return;
    this.bgm.volume = BGM_VOLUME;
    this.bgm.play().catch(error => {
      console.info("BGM playback is waiting for browser audio permission.", error);
    });
  }

  stopBgm() {
    this.bgm.pause();
    this.bgm.currentTime = 0;
  }

  play(key) {
    if (!this.unlocked || this.muted) return;
    const source = this.sounds[key];
    if (!source) return;
    const sound = source.cloneNode();
    sound.volume = SE_VOLUME;
    sound.play().catch(error => {
      console.info(`Sound effect blocked until audio is available: ${key}`, error);
    });
  }

  setMuted(muted) {
    this.muted = muted;
    if (muted) {
      this.bgm.pause();
    } else if (state === "playing") {
      this.playBgm();
    }
  }
}

const audio = new AudioManager(AUDIO_ASSETS);

const KEYED_ASSETS = new Set([
  "cat",
  "mouse",
  "warrior",
  "robotSoldier",
  "drone",
  "ratCaptain",
  "fish",
  "can",
  "heart",
]);

const platforms = [
  { x: 0, y: 456, w: 560, h: 96, kind: "ground" },
  { x: 650, y: 410, w: 260, h: 32, kind: "floating" },
  { x: 1000, y: 360, w: 260, h: 32, kind: "floating" },
  { x: 1320, y: 456, w: 520, h: 96, kind: "ground" },
  { x: 1940, y: 386, w: 300, h: 32, kind: "forest" },
  { x: 2300, y: 456, w: 500, h: 96, kind: "ground" },
  { x: 2880, y: 410, w: 260, h: 32, kind: "metal" },
  { x: 3200, y: 456, w: 400, h: 96, kind: "metal" },
];

const hazards = [
  { x: 1866, y: 424, w: 64, h: 32 },
];

const decorations = [
  { key: "sign", x: 88, y: 392, w: 64, h: 64 },
  { key: "bush", x: 235, y: 400, w: 64, h: 64 },
  { key: "rock", x: 1420, y: 405, w: 56, h: 56 },
  { key: "mushroom", x: 1565, y: 400, w: 56, h: 56 },
  { key: "crate", x: 1710, y: 392, w: 64, h: 64 },
  { key: "barrel", x: 2038, y: 322, w: 64, h: 64 },
  { key: "lamp", x: 2380, y: 392, w: 64, h: 64 },
  { key: "statue", x: 2530, y: 392, w: 64, h: 64 },
  { key: "chest", x: 2660, y: 392, w: 64, h: 64 },
  { key: "crate", x: 2935, y: 346, w: 64, h: 64 },
  { key: "barrel", x: 3320, y: 392, w: 64, h: 64 },
];

const keys = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};

let images = {};
let spriteFrames = {};
let state = "loading";
let cameraX = 0;
let lastTime = 0;
let player;
let enemies;
let items;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function makeTransparent(img) {
  const work = document.createElement("canvas");
  work.width = img.width;
  work.height = img.height;
  const g = work.getContext("2d");
  g.drawImage(img, 0, 0);
  let data;

  try {
    data = g.getImageData(0, 0, work.width, work.height);
  } catch (error) {
    console.warn("Sprite transparency pass skipped. Run through a local server for clean keyed sprites.", error);
    return img;
  }

  removeKeyColors(data);
  removeConnectedSheetBackground(data, work.width, work.height);

  g.putImageData(data, 0, 0);
  return work;
}

function removeKeyColors(data) {
  for (let i = 0; i < data.data.length; i += 4) {
    const r = data.data[i];
    const g = data.data[i + 1];
    const b = data.data[i + 2];
    const isBlack = r < 10 && g < 10 && b < 10;
    const isGreen = r < 35 && g > 180 && b < 45;
    const isMagenta = r > 210 && g < 45 && b > 190;
    if (isBlack || isGreen || isMagenta) data.data[i + 3] = 0;
  }
}

function removeConnectedSheetBackground(data, width, height) {
  const seen = new Uint8Array(width * height);
  const queue = [];

  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (seen[index]) return;
    if (!isSheetBackgroundPixel(data, index)) return;
    seen[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    data.data[index * 4 + 3] = 0;
    const x = index % width;
    const y = Math.floor(index / width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }
}

function isSheetBackgroundPixel(data, pixelIndex) {
  const i = pixelIndex * 4;
  const r = data.data[i];
  const g = data.data[i + 1];
  const b = data.data[i + 2];
  const a = data.data[i + 3];
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  return a === 0 || (r > 168 && g > 168 && b > 168 && spread < 34);
}

async function loadAssets() {
  const loaded = {};
  await Promise.all(Object.entries(ASSETS).map(async ([key, src]) => {
    try {
      const img = await loadImage(src);
      loaded[key] = KEYED_ASSETS.has(key) ? makeTransparent(img) : img;
    } catch (error) {
      console.warn(`Missing or unreadable asset: ${src}`, error);
      loaded[key] = createPlaceholderImage(key);
    }
  }));
  images = loaded;
  spriteFrames = {
    cat: makeFrameSetFromRows(images.cat, 6, [0, 320, 640], 256),
    mouse: makeFrameSet(images.mouse, 7, 1),
    warrior: makeFrameSet(images.warrior, 4, 4),
    robotSoldier: makeFrameSet(images.robotSoldier, 9, 1, { cropBoxes: ROBOT_SOLDIER_CROP_BOXES }),
    drone: makeFrameSet(images.drone, 4, 2),
    ratCaptain: makeFrameSet(images.ratCaptain, 4, 5).slice(0, 4),
    fish: makeFrameSet(images.fish, 4, 1),
    can: makeFrameSet(images.can, 4, 1),
    heart: makeFrameSet(images.heart, 4, 1),
  };
}

function makeFrameSetFromRows(img, cols, rowYs, frameHeight) {
  const frames = [];
  const fw = Math.floor(img.width / cols);

  for (const sy of rowYs) {
    for (let col = 0; col < cols; col += 1) {
      frames.push(trimFrame(img, col * fw, sy, fw, frameHeight));
    }
  }

  return frames;
}

function makeFrameSet(img, cols, rows, options = {}) {
  const frames = [];
  const fw = img.width / cols;
  const fh = img.height / rows;
  const insetX = options.insetX || 0;
  const insetY = options.insetY || 0;
  const cropBoxes = options.cropBoxes || [];

  for (let index = 0; index < cols * rows; index += 1) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const cellLeft = Math.round(col * fw);
    const cellTop = Math.round(row * fh);
    const cellRight = Math.round((col + 1) * fw);
    const cellBottom = Math.round((row + 1) * fh);
    const crop = cropBoxes[index];

    if (crop) {
      frames.push(cropFrame(img, cellLeft + crop.x, cellTop + crop.y, crop.w, crop.h));
    } else {
      frames.push(trimFrame(img, cellLeft + insetX, cellTop + insetY, cellRight - cellLeft - insetX * 2, cellBottom - cellTop - insetY * 2));
    }
  }

  return frames;
}

function cropFrame(img, sx, sy, sw, sh) {
  const cropped = document.createElement("canvas");
  cropped.width = sw;
  cropped.height = sh;
  cropped.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return cropped;
}

function trimFrame(img, sx, sy, sw, sh) {
  const source = document.createElement("canvas");
  source.width = sw;
  source.height = sh;
  const sourceCtx = source.getContext("2d");
  sourceCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  let pixels;
  try {
    pixels = sourceCtx.getImageData(0, 0, sw, sh);
  } catch (error) {
    return source;
  }

  let left = sw;
  let right = 0;
  let top = sh;
  let bottom = 0;

  for (let y = 0; y < sh; y += 1) {
    for (let x = 0; x < sw; x += 1) {
      const alpha = pixels.data[(y * sw + x) * 4 + 3];
      if (alpha <= 8) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }

  if (left > right || top > bottom) return source;

  const pad = 2;
  left = Math.max(0, left - pad);
  top = Math.max(0, top - pad);
  right = Math.min(sw - 1, right + pad);
  bottom = Math.min(sh - 1, bottom + pad);

  const trimmed = document.createElement("canvas");
  trimmed.width = right - left + 1;
  trimmed.height = bottom - top + 1;
  trimmed.getContext("2d").drawImage(
    source,
    left,
    top,
    trimmed.width,
    trimmed.height,
    0,
    0,
    trimmed.width,
    trimmed.height
  );

  return trimmed;
}

function createPlaceholderImage(label) {
  const work = document.createElement("canvas");
  work.width = 64;
  work.height = 64;
  const g = work.getContext("2d");
  g.fillStyle = "#f4d49b";
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = "#5c351b";
  g.lineWidth = 4;
  g.strokeRect(2, 2, 60, 60);
  g.fillStyle = "#241a12";
  g.font = "10px sans-serif";
  g.textAlign = "center";
  g.fillText(label.slice(0, 8), 32, 36);
  return work;
}

function resetGame() {
  player = {
    x: 80, y: 340, w: 72, h: 64,
    vx: 0, vy: 0,
    hp: MAX_HP,
    canCount: 0,
    fishCount: 0,
    facing: 1,
    grounded: false,
    invulnerable: 0,
  };

  enemies = [
    { type: "mouse", x: 470, y: 396, w: 54, h: 50, min: 350, max: 535, speed: 55, dir: -1, defeated: false },
    { type: "mouse", x: 780, y: 350, w: 54, h: 50, min: 670, max: 855, speed: 45, dir: 1, defeated: false },
    { type: "mouse", x: 1090, y: 300, w: 54, h: 50, min: 1015, max: 1205, speed: 48, dir: -1, defeated: false },
    { type: "warrior", x: 1470, y: 389, w: 80, h: 67, min: 1370, max: 1770, speed: 70, dir: -1, defeated: false },
    { type: "warrior", x: 2050, y: 319, w: 80, h: 67, min: 1960, max: 2160, speed: 58, dir: 1, defeated: false },
    { type: "mouse", x: 2380, y: 396, w: 54, h: 50, min: 2315, max: 2690, speed: 65, dir: -1, defeated: false },
    { type: "warrior", x: 2560, y: 389, w: 80, h: 67, min: 2360, max: 2700, speed: 62, dir: -1, defeated: false },
    { type: "robot", x: 2925, y: 330, w: 90, h: 80, min: 2885, max: 3068, speed: 52, dir: -1, defeated: false },
    { type: "drone", x: 3090, y: 270, w: 62, h: 52, min: 2960, max: 3155, speed: 72, dir: 1, defeated: false },
    { type: "boss", x: 3415, y: 336, w: 118, h: 120, min: 3330, max: 3520, speed: 28, dir: -1, hp: 3, defeated: false },
  ];

  items = [
    makePickup("fish", 720, 354, 44, 34),
    makePickup("fish", 1070, 304, 44, 34),
    makePickup("fish", 1410, 400, 44, 34),
    makePickup("fish", 2050, 330, 44, 34),
    makePickup("fish", 2440, 400, 44, 34),
    makePickup("fish", 2990, 354, 44, 34),
    makePickup("fish", 3360, 400, 44, 34),
    makePickup("can", 1630, 390, 48, 36),
    makePickup("can", 3230, 390, 48, 36),
    makePickup("heart", 2160, 330, 40, 36),
    makePickup("heart", 3025, 354, 40, 36),
  ];

  cameraX = 0;
}

function makePickup(type, x, y, w, h) {
  const scaledW = w * PICKUP_ITEM_SCALE;
  const scaledH = h * PICKUP_ITEM_SCALE;
  return {
    type,
    x: x - (scaledW - w) / 2,
    y: y - (scaledH - h) / 2,
    w: scaledW,
    h: scaledH,
    picked: false,
  };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function resolvePlatforms(entity) {
  entity.grounded = false;
  for (const p of platforms) {
    if (!rectsOverlap(entity, p)) continue;

    const prevBottom = entity.y + entity.h - entity.vy / 60;
    if (entity.vy >= 0 && prevBottom <= p.y + 10) {
      entity.y = p.y - entity.h;
      entity.vy = 0;
      entity.grounded = true;
    } else if (entity.vy < 0 && entity.y >= p.y + p.h - 10) {
      entity.y = p.y + p.h;
      entity.vy = 0;
    } else if (entity.x + entity.w / 2 < p.x + p.w / 2) {
      entity.x = p.x - entity.w;
      entity.vx = 0;
    } else {
      entity.x = p.x + p.w;
      entity.vx = 0;
    }
  }
}

function updateGame(dt) {
  player.vx = 0;
  if (keys.left) player.vx -= MOVE_SPEED;
  if (keys.right) player.vx += MOVE_SPEED;
  if (player.vx !== 0) player.facing = Math.sign(player.vx);
  if (keys.jumpPressed && player.grounded) {
    player.vy = -JUMP_SPEED;
    audio.play("jump");
  }
  keys.jumpPressed = false;

  player.vy += GRAVITY * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.x = Math.max(0, Math.min(WORLD_WIDTH - player.w, player.x));
  resolvePlatforms(player);

  if (player.y > HEIGHT + 140) damagePlayer(999);
  if (player.invulnerable > 0) player.invulnerable -= dt;

  for (const hazard of hazards) {
    if (rectsOverlap(player, hazard)) damagePlayer(1);
  }

  for (const enemy of enemies) {
    if (enemy.defeated) continue;
    enemy.x += enemy.dir * enemy.speed * dt;
    if (enemy.x < enemy.min || enemy.x > enemy.max) enemy.dir *= -1;

    if (rectsOverlap(player, enemy)) {
      const stomp = player.vy > 170 && player.y + player.h - enemy.y < 26;
      if (stomp) {
        enemy.hp = (enemy.hp || 1) - 1;
        enemy.defeated = enemy.hp <= 0;
        player.vy = -420;
      } else {
        damagePlayer(1, enemy.x < player.x ? 1 : -1);
      }
    }
  }

  for (const item of items) {
    if (item.picked || !rectsOverlap(player, item)) continue;
    item.picked = true;
    if (item.type === "fish") {
      player.fishCount += 1;
      audio.play("pickup");
    }
    if (item.type === "can") {
      player.canCount += 1;
      audio.play("pickup");
    }
    if (item.type === "heart") {
      const hpBefore = player.hp;
      player.hp = Math.min(MAX_HP, player.hp + 1);
      if (player.hp > hpBefore) audio.play("recover");
    }
  }

  const allFish = items.filter(item => item.type === "fish").every(item => item.picked);
  const bossDefeated = enemies.every(enemy => enemy.type !== "boss" || enemy.defeated);
  const flag = { x: 3504, y: 376, w: 60, h: 80 };
  if (allFish && bossDefeated && rectsOverlap(player, flag)) finishStage();

  cameraX = Math.max(0, Math.min(WORLD_WIDTH - WIDTH, player.x - 330));
}

function damagePlayer(amount, knockback = -1) {
  if (player.invulnerable > 0 && amount < 999) return;
  player.hp -= amount;
  player.invulnerable = 1.1;
  player.vx = 320 * knockback;
  player.vy = -310;
  if (player.hp <= 0) {
    gameOver();
  } else {
    audio.play("damage");
  }
}

function gameOver() {
  if (state === "gameover") return;
  state = "gameover";
  audio.stopBgm();
  audio.play("gameover");
}

function finishStage() {
  if (state === "clear") return;
  state = "clear";
  audio.stopBgm();
  audio.play("clear");
}

function drawSpriteFrame(frames, frame, x, y, w, h, flip = false) {
  const img = frames[frame % frames.length];
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + h - dh;

  ctx.save();
  if (flip) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, dw, dh);
  } else {
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  ctx.restore();
}

function drawWorld(time) {
  drawBackground();

  ctx.save();
  ctx.translate(-cameraX, 0);
  drawDecorations(false);
  drawPlatforms();
  drawItems(time);
  drawEnemies(time);
  drawPlayer(time);
  drawDecorations(true);
  drawGoal();
  ctx.restore();

  drawHud();
  drawObjectiveNotice();
}

function drawBackground() {
  ctx.fillStyle = "#7fc8f1";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const bg = images.background;
  const fortress = images.fortressBg;
  const bgOffset = -cameraX * 0.18 % bg.width;
  for (let x = bgOffset - bg.width; x < WIDTH + bg.width; x += bg.width) {
    ctx.drawImage(bg, x, 40, bg.width, 320);
  }

  ctx.globalAlpha = 0.22;
  const fOffset = -cameraX * 0.08 % fortress.width;
  for (let x = fOffset - fortress.width; x < WIDTH + fortress.width; x += fortress.width) {
    ctx.drawImage(fortress, x, 210, fortress.width, 320);
  }
  ctx.globalAlpha = 1;
}

function drawPlatforms() {
  for (const p of platforms) {
    const topTile =
      p.kind === "forest" ? images.forestTile :
      p.kind === "floating" ? images.floating :
      p.kind === "metal" ? images.metal :
      images.grass;
    const fillTile = p.kind === "metal" ? images.wall : images.dirt;
    for (let x = p.x; x < p.x + p.w; x += 32) {
      ctx.drawImage(topTile, x, p.y, 32, 32);
      for (let y = p.y + 32; y < p.y + p.h; y += 32) {
        ctx.drawImage(fillTile, x, y, 32, 32);
      }
    }
  }

  for (let x = 1850; x < 1940; x += 32) {
    ctx.drawImage(images.metal, x, 456, 32, 32);
    ctx.drawImage(images.wall, x, 488, 32, 32);
  }
  for (let x = 1866; x < 1930; x += 32) ctx.drawImage(images.hazard, x, 424, 32, 32);
  for (let x = 2240; x < 2300; x += 32) ctx.drawImage(images.conveyor, x, 456, 32, 32);
  for (let x = 3140; x < 3200; x += 32) ctx.drawImage(images.conveyor, x, 456, 32, 32);
  ctx.drawImage(images.cliff, 528, 424, 32, 32);
}

function drawDecorations(front) {
  for (const deco of decorations) {
    const isFront = deco.key === "bush" || deco.key === "rock" || deco.key === "mushroom";
    if (isFront !== front) continue;
    ctx.drawImage(images[deco.key], deco.x, deco.y, deco.w, deco.h);
  }
}

function drawItems(time) {
  for (const item of items) {
    if (item.picked) continue;
    const bob = Math.sin(time / 180 + item.x) * 5;
    if (item.type === "fish") drawSpriteFrame(spriteFrames.fish, Math.floor(time / 150) % 4, item.x, item.y + bob, item.w, item.h);
    if (item.type === "can") drawSpriteFrame(spriteFrames.can, Math.floor(time / 170) % 4, item.x, item.y + bob, item.w, item.h);
    if (item.type === "heart") drawSpriteFrame(spriteFrames.heart, Math.floor(time / 180) % 4, item.x, item.y + bob, item.w, item.h);
  }
}

function drawEnemies(time) {
  for (const enemy of enemies) {
    if (enemy.defeated) continue;
    const walk = Math.floor(time / 160);

    if (enemy.type === "boss") {
      drawSpriteFrame(spriteFrames.ratCaptain, walk % 4, enemy.x - 52, enemy.y - 54, 220, 174, enemy.dir < 0);
      drawBossHp(enemy);
    } else if (enemy.type === "drone") {
      const bob = Math.sin(time / 260 + enemy.x) * 8;
      drawSpriteFrame(spriteFrames.drone, walk % 4, enemy.x - 20, enemy.y - 28 + bob, 104, 84, enemy.dir < 0);
    } else if (enemy.type === "robot") {
      drawSpriteFrame(spriteFrames.robotSoldier, walk % 4, enemy.x - 100, enemy.y + enemy.h - 235, 290, 235, enemy.dir < 0);
    } else if (enemy.type === "warrior") {
      drawSpriteFrame(spriteFrames.warrior, walk % 4, enemy.x - 22, enemy.y - 20, 120, 90, enemy.dir < 0);
    } else {
      drawSpriteFrame(spriteFrames.mouse, walk % 4, enemy.x - 16, enemy.y - 20, 88, 70, enemy.dir < 0);
    }
  }
}

function drawBossHp(enemy) {
  const max = 3;
  const width = 90;
  const x = enemy.x + enemy.w / 2 - width / 2;
  const y = enemy.y - 18;
  ctx.fillStyle = "rgba(20, 24, 32, .8)";
  ctx.fillRect(x, y, width, 8);
  ctx.fillStyle = "#38d2ff";
  ctx.fillRect(x + 2, y + 2, (width - 4) * Math.max(0, enemy.hp || 0) / max, 4);
}

function drawPlayer(time) {
  if (player.invulnerable > 0 && Math.floor(time / 80) % 2 === 0) return;

  let frame = 0;
  if (!player.grounded) frame = player.vy < 0 ? 10 : 11;
  else if (Math.abs(player.vx) > 1) frame = 3 + Math.floor(time / 90) % 7;
  else frame = Math.floor(time / 360) % 3;

  drawSpriteFrame(spriteFrames.cat, frame, player.x - 42, player.y - 56, 150, 120, player.facing < 0);
}

function drawGoal() {
  ctx.drawImage(images.flag, 3504, 392, 64, 64);
}

function drawObjectiveNotice() {
  if (state !== "playing") return;
  const allFish = items.filter(item => item.type === "fish").every(item => item.picked);
  const bossDefeated = enemies.every(enemy => enemy.type !== "boss" || enemy.defeated);
  if (allFish && bossDefeated) return;

  drawPanel(WIDTH / 2 - 125, 18, 250, 34);
  drawText(allFish ? "Defeat the boss" : "Collect all fish", WIDTH / 2, 41, 16, "#4b2b19", "center");
}

function drawHud() {
  drawPanel(18, 16, 270, 48);
  for (let i = 0; i < MAX_HP; i += 1) {
    ctx.globalAlpha = i < player.hp ? 1 : 0.24;
    ctx.drawImage(images.heartIcon, 30 + i * 34, 24, 28, 28);
  }
  ctx.globalAlpha = 1;
  ctx.drawImage(images.fishIcon, 208, 24, 28, 28);
  drawText(String(player.fishCount), 243, 46, 20, "#241a12");
  ctx.drawImage(images.canIcon, 252, 24, 28, 28);
  drawText(String(player.canCount), 286, 46, 20, "#241a12");
}

function drawPanel(x, y, w, h) {
  ctx.fillStyle = "rgba(244, 212, 155, .9)";
  ctx.strokeStyle = "#5c351b";
  ctx.lineWidth = 4;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
}

function drawText(text, x, y, size, color = "#fff", align = "left") {
  ctx.font = `700 ${size}px "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#161b2b";
  ctx.fillText(text, x + 2, y + 2);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawTitle(time) {
  drawBackground();
  ctx.drawImage(images.statue, 90, 356, 96, 96);
  drawSpriteFrame(spriteFrames.cat, 3 + Math.floor(time / 120) % 7, 386, 250, 190, 152);
  drawSpriteFrame(spriteFrames.mouse, Math.floor(time / 150) % 4, 640, 324, 94, 74);
  ctx.drawImage(images.bush, 730, 386, 80, 80);
  drawPanel(255, 88, 450, 166);
  drawText("Cat Forest Run", 480, 145, 46, "#7d341d", "center");
  drawText("Move: Arrow keys / A D", 480, 195, 20, "#3c2a1d", "center");
  drawText("Jump: Space / W / Up", 480, 224, 20, "#3c2a1d", "center");
  ctx.drawImage(images.startButton, 416, 276, 128, 48);
  drawText("Press Enter", 480, 352, 22, "#fff", "center");
}

function drawEndScreen(isClear) {
  drawWorld(performance.now());
  ctx.fillStyle = "rgba(10, 14, 25, .58)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.drawImage(isClear ? images.clearBanner : images.gameOverBanner, 352, 126, 256, 80);
  ctx.drawImage(images.retryButton, 416, 240, 128, 48);
  drawText(isClear ? "Stage complete" : "Try again", 480, 340, 28, "#fff", "center");
  drawText("Press Enter", 480, 382, 22, "#fff", "center");
}

function loop(time) {
  const dt = Math.min((time - lastTime) / 1000 || 0, 1 / 30);
  lastTime = time;

  if (state === "title") drawTitle(time);
  if (state === "playing") {
    updateGame(dt);
    drawWorld(time);
  }
  if (state === "gameover") drawEndScreen(false);
  if (state === "clear") drawEndScreen(true);

  requestAnimationFrame(loop);
}

function startOrRestart() {
  if (state === "title" || state === "gameover" || state === "clear") {
    audio.unlock();
    audio.play("ui");
    resetGame();
    state = "playing";
    audio.playBgm();
  }
}

window.addEventListener("keydown", event => {
  const isGameInput = ["Enter", "ArrowLeft", "KeyA", "ArrowRight", "KeyD", "ArrowUp", "KeyW", "Space"].includes(event.code);
  if (isGameInput) audio.unlock();
  if (event.code === "Enter") startOrRestart();
  if (["ArrowLeft", "KeyA"].includes(event.code)) {
    keys.left = true;
    audio.playBgm();
  }
  if (["ArrowRight", "KeyD"].includes(event.code)) {
    keys.right = true;
    audio.playBgm();
  }
  if (["ArrowUp", "KeyW", "Space"].includes(event.code)) {
    if (!keys.jump) keys.jumpPressed = true;
    keys.jump = true;
    audio.playBgm();
    event.preventDefault();
  }
});

window.addEventListener("keyup", event => {
  if (["ArrowLeft", "KeyA"].includes(event.code)) keys.left = false;
  if (["ArrowRight", "KeyD"].includes(event.code)) keys.right = false;
  if (["ArrowUp", "KeyW", "Space"].includes(event.code)) keys.jump = false;
});

canvas.addEventListener("pointerdown", () => {
  audio.unlock();
  startOrRestart();
  audio.playBgm();
});

muteButton.addEventListener("pointerdown", event => {
  event.stopPropagation();
});

muteButton.addEventListener("click", event => {
  event.stopPropagation();
  audio.unlock();
  audio.play("ui");
  audio.setMuted(!audio.muted);
  muteButton.textContent = audio.muted ? "Sound Off" : "Sound On";
  muteButton.setAttribute("aria-pressed", String(audio.muted));
});

for (const button of document.querySelectorAll(".touch-controls button")) {
  const control = button.dataset.control;
  const set = down => {
    keys[control] = down;
    if (control === "jump" && down) keys.jumpPressed = true;
    button.classList.toggle("is-down", down);
  };
  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    audio.unlock();
    button.setPointerCapture(event.pointerId);
    set(true);
    audio.playBgm();
  });
  button.addEventListener("pointerup", () => set(false));
  button.addEventListener("pointercancel", () => set(false));
}

loadAssets()
  .then(() => {
    resetGame();
    state = "title";
    requestAnimationFrame(loop);
  })
  .catch(error => {
    console.error(error);
    state = "error";
    drawText("Game start failed", WIDTH / 2, HEIGHT / 2, 28, "#fff", "center");
  });
