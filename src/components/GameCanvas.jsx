import React from 'react';

// Simple retro platformer engine with original pixel art and mechanics reminiscent of classics.
// This does not use or include any Nintendo assets or level layouts.

const TILE = 16;
const SCALE = 3; // pixel-art upscale
const TS = TILE * SCALE;
const GRAVITY = 0.45;
const FRICTION_GROUND = 0.82;
const FRICTION_AIR = 0.94;
const MAX_RUN = 3.6;
const MAX_AIR = 3.2;
const JUMP_VEL = -8.5;

// Level legend
// . empty
// # ground
// B brick
// ? question block (coin)
// C coin
// = platform block
// P p ! | pipe tiles (top-left, top-right, body-right, body-left) => letters chosen to avoid confusion
// F flag pole, T flag top
// G enemy spawn
// M player start

function makeLevel() {
  // Original, inspired layout (not a copy) spanning ~260 columns.
  // Height 16 tiles. Ground at bottom rows.
  const W = 260;
  const H = 16;
  const rows = Array.from({ length: H }, () => Array(W).fill('.'));

  // Base ground
  for (let x = 0; x < W; x++) {
    for (let y = H - 2; y < H; y++) rows[y][x] = '#';
  }

  // Start area
  rows[11][2] = 'M';
  rows[8][14] = '?';
  rows[8][15] = 'B';
  rows[8][16] = '?';
  rows[8][18] = 'B';
  rows[7][18] = 'C';

  // Some steps
  for (let i = 0; i < 4; i++) rows[12 - i][28 + i] = '=';
  for (let i = 0; i < 3; i++) rows[12 - i][48 + i] = '=';

  // Pipes clusters
  placePipe(rows, 60, 12, 2);
  placePipe(rows, 76, 12, 3);
  placePipe(rows, 92, 12, 4);

  // Mid section blocks and coins
  rows[7][110] = '?';
  rows[7][114] = '?';
  rows[7][118] = '?';
  rows[6][114] = 'C';
  rows[10][130] = 'B';
  rows[8][136] = 'C';
  for (let x = 145; x < 155; x += 2) rows[6][x] = 'C';

  // Enemy spawns
  rows[12][40] = 'G';
  rows[12][65] = 'G';
  rows[12][100] = 'G';
  rows[12][150] = 'G';
  rows[12][190] = 'G';

  // Platforms
  for (let x = 160; x < 168; x++) rows[9][x] = '=';
  for (let x = 170; x < 177; x++) rows[7][x] = '=';
  for (let x = 182; x < 189; x++) rows[9][x] = '=';

  // More blocks and coins
  rows[8][172] = '?';
  rows[8][173] = '?';
  rows[8][174] = '?';
  rows[7][173] = 'C';

  // Final staircase to flag
  for (let i = 0; i < 6; i++) {
    for (let s = 0; s <= i; s++) rows[13 - s][212 + i] = '=';
  }

  // Flag
  rows[3][236] = 'T'; // flag top
  for (let y = 4; y <= 13; y++) rows[y][236] = 'F';

  // Final run
  for (let x = 240; x < W; x++) rows[13][x] = '=';

  return rows.map(r => r.join(''));
}

function placePipe(rows, x, groundYTop, height) {
  // groundYTop is the top tile where pipe top sits (y)
  rows[groundYTop][x] = 'P';
  rows[groundYTop][x + 1] = 'p';
  for (let i = 1; i < height; i++) {
    rows[groundYTop + i][x] = '|';
    rows[groundYTop + i][x + 1] = '!';
  }
}

function useResize(ref, onResize) {
  React.useEffect(() => {
    function handle() {
      if (!ref.current) return;
      const w = Math.min(window.innerWidth, 1200) - 32;
      const h = Math.round((w * 9) / 16);
      onResize(Math.max(480, w), Math.max(270, h));
    }
    handle();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, [ref, onResize]);
}

export default function GameCanvas({ onHUDChange }) {
  const canvasRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const [size, setSize] = React.useState({ w: 960, h: 540 });

  const stateRef = React.useRef(null);
  const hudRef = React.useRef({ score: 0, coins: 0, time: 400, world: '1-1', lives: 3, status: 'PLAY' });

  useResize(containerRef, (w, h) => setSize({ w, h }));

  React.useEffect(() => {
    const level = makeLevel();
    const solids = new Set(['#', 'B', '?', '=', 'P', 'p', '|', '!', 'F']);

    const coins = [];
    const enemies = [];
    const blocks = [];
    let startX = 3 * TILE;
    let startY = 10 * TILE;

    for (let y = 0; y < level.length; y++) {
      for (let x = 0; x < level[0].length; x++) {
        const c = level[y][x];
        if (c === 'C') coins.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, taken: false, bounce: 0 });
        if (c === 'G') enemies.push(spawnEnemy(x * TILE, (y - 1) * TILE));
        if (c === '?' || c === 'B') blocks.push({ x: x * TILE, y: y * TILE, type: c, bumped: false, bumpV: 0, hiddenCoin: c === '?' });
        if (c === 'M') { startX = x * TILE; startY = y * TILE; }
      }
    }

    const player = {
      x: startX,
      y: startY,
      w: 12,
      h: 14,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1,
      running: false,
      dead: false,
    };

    const camera = { x: 0 };

    const input = { left: false, right: false, jump: false, run: false, paused: false };

    function key(e, down) {
      if (e.repeat) return;
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA': input.left = down; break;
        case 'ArrowRight':
        case 'KeyD': input.right = down; break;
        case 'Space':
        case 'KeyZ': if (down) input.jump = true; if (!down) input.jump = false; break;
        case 'ShiftLeft':
        case 'ShiftRight': input.run = down; break;
        case 'KeyP': if (down) togglePause(); break;
        case 'KeyR': if (down) reset(); break;
        default: break;
      }
    }

    function togglePause() {
      hudRef.current.status = hudRef.current.status === 'PLAY' ? 'PAUSE' : 'PLAY';
      pushHUD();
    }

    function reset() {
      cancelAnimationFrame(stateRef.current?.raf || 0);
      // Restart effect by reloading state
      setup();
    }

    function pushHUD() {
      onHUDChange({ ...hudRef.current });
    }

    function spawnEnemy(x, y) {
      return { x, y, w: 14, h: 12, vx: -0.6, vy: 0, dead: false, squash: 0 };
    }

    function isSolidAt(px, py) {
      if (px < 0 || py < 0) return true;
      const cx = Math.floor(px / TILE);
      const cy = Math.floor(py / TILE);
      if (cy < 0 || cy >= level.length || cx < 0 || cx >= level[0].length) return true;
      const c = level[cy][cx];
      return solids.has(c);
    }

    function rectVsTiles(ent, dx, dy) {
      // Sweep rect and resolve with tiles
      let { x, y, w, h } = ent;
      let nx = x + dx;
      let ny = y + dy;
      // Horizontal
      if (dx !== 0) {
        const sign = Math.sign(dx);
        const step = Math.max(1, Math.floor(Math.abs(dx)));
        for (let s = 0; s < step; s++) {
          nx += sign;
          const left = Math.floor((nx) / TILE);
          const right = Math.floor((nx + w) / TILE);
          const top = Math.floor((y) / TILE);
          const bottom = Math.floor((y + h) / TILE);
          for (let cx = left; cx <= right; cx++) {
            for (let cy = top; cy <= bottom; cy++) {
              const c = safeChar(level, cy, cx);
              if (solids.has(c)) {
                if (sign > 0) nx = cx * TILE - w - 0.01; else nx = (cx + 1) * TILE + 0.01;
                s = step; // break outer
                break;
              }
            }
          }
        }
      }
      // Vertical
      let collidedBelow = false;
      if (dy !== 0) {
        const sign = Math.sign(dy);
        const step = Math.max(1, Math.floor(Math.abs(dy)));
        for (let s = 0; s < step; s++) {
          ny += sign;
          const left = Math.floor((nx) / TILE);
          const right = Math.floor((nx + w) / TILE);
          const top = Math.floor((ny) / TILE);
          const bottom = Math.floor((ny + h) / TILE);
          for (let cx = left; cx <= right; cx++) {
            for (let cy = top; cy <= bottom; cy++) {
              const c = safeChar(level, cy, cx);
              if (solids.has(c)) {
                if (sign > 0) { // moving down
                  ny = cy * TILE - h - 0.01;
                  collidedBelow = true;
                } else {
                  ny = (cy + 1) * TILE + 0.01;
                  // bump blocks when hitting from below
                  bumpBlock(cx * TILE, cy * TILE);
                }
                s = step; // break
                break;
              }
            }
          }
        }
      }
      return { x: nx, y: ny, hitBottom: collidedBelow };
    }

    function bumpBlock(px, py) {
      // Find block
      for (const b of blocks) {
        if (Math.abs(b.x - px) < 2 && Math.abs(b.y - py) < 2 && !b.bumped) {
          b.bumped = true;
          b.bumpV = -2.5;
          if (b.hiddenCoin) {
            hudRef.current.coins += 1; hudRef.current.score += 200; pushHUD();
            coins.push({ x: b.x + TILE / 2, y: b.y + TILE / 2 - 6, taken: true, bounce: 14 });
          }
        }
      }
    }

    function safeChar(level, y, x) {
      if (y < 0 || y >= level.length || x < 0 || x >= level[0].length) return '#';
      return level[y][x];
    }

    // Rendering helpers
    const skyColor = '#7ec0fd';
    const groundColor = '#6b3e1f';
    const grassColor = '#9bd66b';

    function drawTile(ctx, c, tx, ty) {
      const x = tx * TS - camera.x;
      const y = ty * TS;
      switch (c) {
        case '#': {
          // dirt ground block
          rect(ctx, x, y, TS, TS, groundColor);
          rect(ctx, x, y, TS, 6 * SCALE, grassColor);
          pixelBorder(ctx, x, y, TS, TS, '#00000033');
          break;
        }
        case '=': {
          rect(ctx, x, y, TS, TS, '#c6854a');
          checker(ctx, x, y, '#9b6336');
          pixelBorder(ctx, x, y, TS, TS, '#00000033');
          break;
        }
        case 'B': {
          rect(ctx, x, y, TS, TS, '#b75f3e');
          checker(ctx, x, y, '#8e4028');
          dot(ctx, x + TS / 2 - 4, y + TS / 2 - 4, 8, '#e5a37b');
          pixelBorder(ctx, x, y, TS, TS, '#00000033');
          break;
        }
        case '?': {
          rect(ctx, x, y, TS, TS, '#f6a000');
          // question pattern
          dot(ctx, x + 10, y + 10, 6, '#fff3c4');
          dot(ctx, x + TS - 16, y + 10, 6, '#fff3c4');
          dot(ctx, x + 10, y + TS - 16, 6, '#fff3c4');
          pixelBorder(ctx, x, y, TS, TS, '#00000055');
          break;
        }
        case 'P': case 'p': case '|': case '!': {
          const isTop = c === 'P' || c === 'p';
          const bodyCol = '#1fa05d';
          const topCol = '#2ecf7c';
          rect(ctx, x, y, TS, TS, isTop ? topCol : bodyCol);
          pixelBorder(ctx, x, y, TS, TS, '#00000055');
          break;
        }
        case 'F': case 'T': {
          if (c === 'F') {
            rect(ctx, x + TS / 2 - 4, y, 8, TS, '#ffffff');
          } else {
            rect(ctx, x + TS / 2 - 4, y, 8, TS, '#ffffff');
            rect(ctx, x + TS / 2 + 4, y + 4, 24, 12, '#ff3648');
          }
          break;
        }
        default: break;
      }
    }

    function rect(ctx, x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h));
    }
    function pixelBorder(ctx, x, y, w, h, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.floor(x) + 1, Math.floor(y) + 1, Math.floor(w) - 2, Math.floor(h) - 2);
    }
    function checker(ctx, x, y, color) {
      ctx.fillStyle = color;
      const s = 8 * SCALE;
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          ctx.fillRect(Math.floor(x + i * s), Math.floor(y + j * s), s - 1, s - 1);
        }
      }
    }
    function dot(ctx, x, y, r, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(r), Math.floor(r));
    }

    function drawCoin(ctx, c) {
      const x = c.x * SCALE - camera.x;
      const y = c.y * SCALE - (c.bounce > 0 ? c.bounce : 0);
      rect(ctx, x - 6, y - 10, 12, 20, '#ffd34d');
      rect(ctx, x - 4, y - 8, 8, 16, '#ffe68a');
    }

    function drawEnemy(ctx, e) {
      const x = e.x * SCALE - camera.x;
      const y = e.y * SCALE;
      // simple mushroom-like critter (original art)
      rect(ctx, x, y + 12, 20, 6, '#6b3e1f');
      rect(ctx, x + 2, y + 2, 24, 16, '#c85f4a');
      rect(ctx, x + 6, y + 6, 4, 4, '#381a14');
      rect(ctx, x + 16, y + 6, 4, 4, '#381a14');
      if (e.squash > 0) {
        rect(ctx, x, y + 16, 24, 4, '#381a14');
      }
    }

    function drawPlayer(ctx, p) {
      const x = p.x * SCALE - camera.x;
      const y = p.y * SCALE;
      // Original hero sprite, simple and chonky
      rect(ctx, x + 6, y, 12, 8, '#e7b591'); // head
      rect(ctx, x + 4, y + 8, 16, 8, p.running ? '#ff4d4d' : '#ff6b6b'); // body
      rect(ctx, x + 2, y + 16, 8, 10, '#2e6bff');
      rect(ctx, x + 14, y + 16, 8, 10, '#2e6bff');
      if (p.facing < 0) {
        rect(ctx, x + 8, y + 2, 4, 4, '#000');
      } else {
        rect(ctx, x + 12, y + 2, 4, 4, '#000');
      }
    }

    function updateHUDCountdown(dt) {
      hudRef.current.time -= dt * 0.06; // roughly tick down
      if (hudRef.current.time <= 0 && !player.dead) {
        player.dead = true;
        hudRef.current.status = 'DEAD';
        pushHUD();
      }
    }

    // Main loop
    const ctx = canvasRef.current.getContext('2d');
    let last = 0;

    function setup() {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.addEventListener('keydown', kd);
      window.addEventListener('keyup', ku);
      hudRef.current = { score: 0, coins: 0, time: 400, world: '1-1', lives: 3, status: 'PLAY' };
      pushHUD();
      player.x = startX; player.y = startY; player.vx = 0; player.vy = 0; player.dead = false;
      camera.x = 0;
      enemies.length = 0;
      // respawn enemies and coins
      for (let y = 0; y < level.length; y++) {
        for (let x = 0; x < level[0].length; x++) if (level[y][x] === 'G') enemies.push(spawnEnemy(x * TILE, (y - 1) * TILE));
      }
      coins.forEach(c => { if (!c.taken) return; c.taken = false; c.bounce = 0; });
      blocks.forEach(b => { b.bumped = false; b.bumpV = 0; });
      last = performance.now();
      loop(last);
    }

    function kd(e) { key(e, true); }
    function ku(e) { key(e, false); }

    function loop(t) {
      const dt = Math.min(32, t - last) / 16.6667;
      last = t;
      if (hudRef.current.status === 'PLAY') {
        step(dt);
        updateHUDCountdown(dt);
      }
      render();
      stateRef.current = { raf: requestAnimationFrame(loop) };
    }

    function step(dt) {
      // Player input
      const accel = (input.run ? 0.5 : 0.35) * dt;
      const maxH = (input.run ? MAX_RUN : MAX_AIR);
      if (input.left) { player.vx -= accel; player.facing = -1; }
      if (input.right) { player.vx += accel; player.facing = 1; }

      // Apply friction
      const friction = player.onGround ? FRICTION_GROUND : FRICTION_AIR;
      player.vx *= friction;
      player.vx = Math.max(-maxH, Math.min(maxH, player.vx));

      // Jump
      if (input.jump && player.onGround) {
        player.vy = JUMP_VEL;
        player.onGround = false;
      }

      // Gravity
      player.vy += GRAVITY * dt * 3.2;
      if (player.vy > 10) player.vy = 10;

      // Collisions
      const movedX = rectVsTiles(player, player.vx, 0);
      player.x = movedX.x;
      const movedY = rectVsTiles(player, 0, player.vy);
      player.y = movedY.y;
      player.onGround = movedY.hitBottom;

      // Interactions: coins
      for (const c of coins) {
        if (c.taken) {
          if (c.bounce > 0) c.bounce -= 1.2 * dt;
          continue;
        }
        const dx = (player.x + player.w / 2) - (c.x);
        const dy = (player.y + player.h / 2) - (c.y);
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
          c.taken = true;
          c.bounce = 14;
          hudRef.current.coins += 1; hudRef.current.score += 100; pushHUD();
        }
      }

      // Blocks bump motion
      for (const b of blocks) {
        if (b.bumped) {
          b.y += b.bumpV * dt;
          b.bumpV += 0.6 * dt;
          if (b.y >= Math.round(b._origY ??= b.y)) { b.y = b._origY; b.bumped = false; b.bumpV = 0; }
        }
      }

      // Enemies
      for (const e of enemies) {
        if (e.dead) continue;
        e.vy += GRAVITY * dt * 3.2;
        // Horizontal move with simple collision against tiles
        const nx = rectVsTiles(e, e.vx, 0).x;
        if (Math.floor(nx) === Math.floor(e.x)) {
          e.vx *= -1; // hit wall, turn
        } else {
          e.x = nx;
        }
        const down = rectVsTiles(e, 0, e.vy);
        e.y = down.y;
        // If walked off a ledge, keep falling; if hit ground, zero vy
        if (down.hitBottom) e.vy = 0;

        // Player collision
        if (!player.dead && aabbOverlap(player, e)) {
          if (player.vy > 0 && player.y + player.h - e.y < 8) {
            // stomp
            e.dead = true; e.squash = 1;
            player.vy = JUMP_VEL * 0.6;
            hudRef.current.score += 200; pushHUD();
          } else {
            // player hurt
            player.dead = true;
            hudRef.current.status = 'DEAD';
            pushHUD();
          }
        }
      }

      // Flag reach
      const flagX = 236 * TILE;
      if (player.x > flagX && !player.dead) {
        hudRef.current.status = 'WIN';
        hudRef.current.score += 1000; pushHUD();
      }

      // Camera follows
      const viewW = size.w / SCALE;
      const clampLeft = Math.max(0, player.x * SCALE - size.w * 0.4);
      camera.x = Math.max(0, Math.min(clampLeft, level[0].length * TS - size.w));
    }

    function aabbOverlap(a, b) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function render() {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, size.w, size.h);
      // Sky
      rect(ctx, 0, 0, size.w, size.h, skyColor);

      ctx.save();
      ctx.scale(SCALE, SCALE);

      // Background hills (parallax)
      drawHills(ctx, camera.x / SCALE);

      // Tiles
      const startCol = Math.floor((camera.x) / TS) - 2;
      const endCol = Math.floor((camera.x + size.w) / TS) + 2;
      for (let y = 0; y < level.length; y++) {
        for (let x = Math.max(0, startCol); x < Math.min(level[0].length, endCol); x++) {
          const c = level[y][x];
          if (c !== '.') drawTile(ctx, c, x, y);
        }
      }

      // Coins
      for (const c of coins) if (!c.taken || c.bounce > 0) drawCoin(ctx, c);

      // Enemies
      for (const e of enemies) if (!e.dead || e.squash < 20) { drawEnemy(ctx, e); if (e.dead) e.squash++; }

      // Player
      drawPlayer(ctx, player);

      ctx.restore();

      // Vignette
      const grd = ctx.createRadialGradient(size.w/2, size.h/2, size.w*0.1, size.w/2, size.h/2, size.w*0.8);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, size.w, size.h);
    }

    function drawHills(ctx, camX) {
      ctx.save();
      ctx.translate(-camX * 0.3, 0);
      const colors = ['#9be8ff', '#8cd4f7', '#7cc0ef'];
      for (let i = 0; i < 12; i++) {
        const x = i * 140; const h = 30 + (i % 3) * 12; const y = (size.h / SCALE) - 32 - h;
        rect(ctx, x, y, 120, h, colors[i % colors.length]);
      }
      ctx.restore();
    }

    setup();

    return () => {
      cancelAnimationFrame(stateRef.current?.raf || 0);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, [onHUDChange, size.w, size.h]);

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas ref={canvasRef} width={size.w} height={size.h} className="block w-full h-auto" />
    </div>
  );
}
