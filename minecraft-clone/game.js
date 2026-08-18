/**
 * 方块世界 — 浏览器里的体素沙盒（复刻《我的世界》核心玩法）
 *
 * 功能：程序化地形（噪声）、分块网格合并渲染、纹理图集、第一人称物理碰撞、
 *       方块破坏/放置/吸取、快捷栏、昼夜循环、粒子、音效、本地存档。
 */
import * as THREE from 'three';

/* ============================== 常量 ============================== */
const CHUNK    = 16;             // 每块边长
const WORLD    = 10;             // 10×10 块
const SIZE     = CHUNK * WORLD;  // 160×160
const HEIGHT   = 48;             // 世界高度
const REACH    = 6.0;            // 交互距离
const EPS      = 1e-3;
const UV_INSET = 0.004;          // 图集 UV 内缩，防止贴图接缝出血

const BK = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, LOG: 5, LEAVES: 6,
  PLANKS: 7, COBBLE: 8, BRICK: 9, GLASS: 10, SNOW: 11, GRAVEL: 12, BEDROCK: 13,
};

// 方块定义：纹理（顶/侧/底，图集下标）、是否实体、图标用哪个面、粒子颜色、名称
const BLOCKS = {
  [BK.GRASS]:   { name: '草方块',  top: 0, side: 1, bottom: 2, solid: true,  icon: 0, color: 0x7cb342, creative: true },
  [BK.DIRT]:    { name: '泥土',    top: 2, side: 2, bottom: 2, solid: true,  icon: 2, color: 0x8b5a2b, creative: true },
  [BK.STONE]:   { name: '石头',    top: 3, side: 3, bottom: 3, solid: true,  icon: 3, color: 0x9a9a9a, creative: true },
  [BK.SAND]:    { name: '沙子',    top: 4, side: 4, bottom: 4, solid: true,  icon: 4, color: 0xdfce9b, creative: true },
  [BK.LOG]:     { name: '橡木原木', top: 6, side: 5, bottom: 6, solid: true,  icon: 5, color: 0x6b4a2a, creative: true },
  [BK.LEAVES]:  { name: '树叶',    top: 7, side: 7, bottom: 7, solid: false, icon: 7, color: 0x4c9a3e, creative: true },
  [BK.PLANKS]:  { name: '橡木木板', top: 8, side: 8, bottom: 8, solid: true,  icon: 8, color: 0xb48a4f, creative: true },
  [BK.COBBLE]:  { name: '圆石',    top: 9, side: 9, bottom: 9, solid: true,  icon: 9, color: 0x7e7e7e, creative: true },
  [BK.BRICK]:   { name: '砖块',    top: 10, side: 10, bottom: 10, solid: true, icon: 10, color: 0x9c4f4f, creative: true },
  [BK.GLASS]:   { name: '玻璃',    top: 11, side: 11, bottom: 11, solid: true, icon: 11, color: 0xbfe0f0, creative: true },
  [BK.SNOW]:    { name: '雪块',    top: 12, side: 12, bottom: 12, solid: true, icon: 12, color: 0xf4f9ff, creative: false },
  [BK.GRAVEL]:  { name: '砂砾',    top: 13, side: 13, bottom: 13, solid: true, icon: 13, color: 0x9a918a, creative: false },
  [BK.BEDROCK]: { name: '基岩',    top: 14, side: 14, bottom: 14, solid: true, icon: 14, color: 0x33302e, creative: false },
};

const HOTBAR = [BK.GRASS, BK.DIRT, BK.STONE, BK.SAND, BK.PLANKS, BK.COBBLE, BK.BRICK, BK.GLASS, BK.LOG];

// 六个面的角点 / 法线 / UV（v 随 y 增大，适配 flipY=true 的图集）
const FACES = [
  { dir: [ 0, 1, 0], n: [ 0, 1, 0], v: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], uv: [[0,0],[1,0],[1,1],[0,1]] },
  { dir: [ 0,-1, 0], n: [ 0,-1, 0], v: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], uv: [[0,0],[1,0],[1,1],[0,1]] },
  { dir: [ 1, 0, 0], n: [ 1, 0, 0], v: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]], uv: [[0,0],[0,1],[1,1],[1,0]] },
  { dir: [-1, 0, 0], n: [-1, 0, 0], v: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]], uv: [[0,0],[0,1],[1,1],[1,0]] },
  { dir: [ 0, 0, 1], n: [ 0, 0, 1], v: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]], uv: [[0,0],[1,0],[1,1],[0,1]] },
  { dir: [ 0, 0,-1], n: [ 0, 0,-1], v: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]], uv: [[0,0],[1,0],[1,1],[0,1]] },
];

const FACE_BRIGHTNESS = { '0,1,0': 1.0, '0,-1,0': 0.52, '1,0,0': 0.82, '-1,0,0': 0.82, '0,0,1': 0.82, '0,0,-1': 0.82 };

/* ============================== 噪声 ============================== */
function hash2(x, z) {
  let h = (Math.imul(x, 374761393) + Math.imul(z, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function hash3(x, y, z) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const smooth = (t) => t * t * (3 - 2 * t);

function valueNoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = smooth(x - xi), zf = smooth(z - zi);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * xf + (c - a) * zf + (a - b - c + d) * xf * zf;
}
function fbm(x, z, oct = 4) {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += valueNoise(x * f, z * f) * amp; amp *= 0.5; f *= 2; }
  return Math.min(1, Math.max(0, v * 1.15));
}
function valueNoise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);
  const c000 = hash3(xi, yi, zi), c100 = hash3(xi + 1, yi, zi);
  const c010 = hash3(xi, yi + 1, zi), c110 = hash3(xi + 1, yi + 1, zi);
  const c001 = hash3(xi, yi, zi + 1), c101 = hash3(xi + 1, yi, zi + 1);
  const c011 = hash3(xi, yi + 1, zi + 1), c111 = hash3(xi + 1, yi + 1, zi + 1);
  const lerp = (a, b, t) => a + (b - a) * t;
  return lerp(
    lerp(lerp(c000, c100, xf), lerp(c010, c110, xf), yf),
    lerp(lerp(c001, c101, xf), lerp(c011, c111, xf), yf),
    zf
  );
}

/* ============================== 世界数据 ============================== */
const chunks = [];          // chunks[cx][cz] = { data, mesh }
const edits = new Map();    // "x,y,z" -> blockId（本地存档）

const inWorldX = (x) => x >= 0 && x < SIZE;
const inWorld  = (x, y, z) => inWorldX(x) && inWorldX(z) && y >= 0 && y < HEIGHT;

function chunkAt(cx, cz) {
  if (cx < 0 || cz < 0 || cx >= WORLD || cz >= WORLD) return null;
  let c = chunks[cx];
  if (!c) c = chunks[cx] = [];
  if (!c[cz]) c[cz] = { data: new Uint8Array(CHUNK * CHUNK * HEIGHT), mesh: null };
  return c[cz];
}

function writeBlock(x, y, z, id) {
  if (!inWorld(x, y, z)) return;
  const c = chunkAt(x >> 4, z >> 4);
  if (c) c.data[y * CHUNK * CHUNK + (z & 15) * CHUNK + (x & 15)] = id;
}

function worldGet(x, y, z) {
  if (y < 0 || y >= HEIGHT) return BK.AIR;
  if (!inWorldX(x) || !inWorldX(z)) return BK.AIR;
  const c = chunks[x >> 4] && chunks[x >> 4][z >> 4];
  if (!c) return BK.AIR;
  return c.data[y * CHUNK * CHUNK + (z & 15) * CHUNK + (x & 15)];
}

function solidAt(x, y, z) {
  const b = worldGet(x, y, z);
  const def = BLOCKS[b];
  return !!def && def.solid;
}

function heightAt(x, z) {
  let h = 14 + fbm(x * 0.011, z * 0.011) * 30;
  h += (valueNoise(x * 0.05 + 100, z * 0.05 + 100) - 0.5) * 6;
  return Math.max(2, Math.min(HEIGHT - 3, Math.floor(h)));
}

/* 生成地形：高度 → 填充 → 树 → 存档修改 */
function generateWorld() {
  const heights = new Int16Array(SIZE * SIZE);
  for (let z = 0; z < SIZE; z++)
    for (let x = 0; x < SIZE; x++)
      heights[z * SIZE + x] = heightAt(x, z);

  for (let z = 0; z < SIZE; z++) {
    for (let x = 0; x < SIZE; x++) {
      const h = heights[z * SIZE + x];
      const nearBeach = h <= 13;
      const snowy = h >= 38;
      const gravel = !nearBeach && !snowy && hash2(x * 7.31, z * 9.17) < 0.05;

      for (let y = 0; y <= h; y++) {
        let id;
        if (y === 0) id = BK.BEDROCK;
        else if (y < h - 2) id = BK.STONE;
        else if (y === h) id = nearBeach ? BK.SAND : snowy ? BK.SNOW : gravel ? BK.GRAVEL : BK.GRASS;
        else id = nearBeach ? BK.SAND : BK.DIRT;
        if (y > 2 && y < h - 2 && valueNoise3(x * 0.085, y * 0.14, z * 0.085) > 0.76) id = BK.AIR;
        if (id !== BK.AIR) writeBlock(x, y, z, id);
      }
    }
  }

  // 树
  for (let z = 2; z < SIZE - 2; z++) {
    for (let x = 2; x < SIZE - 2; x++) {
      const h = heights[z * SIZE + x];
      if (h < 15 || h > 37) continue;
      if (worldGet(x, h, z) !== BK.GRASS) continue;
      if (hash2(x * 13.7, z * 7.9) >= 0.018) continue;
      const trunkH = 4 + Math.floor(hash3(x, 7, z) * 2);
      for (let i = 1; i <= trunkH; i++) writeBlock(x, h + i, z, BK.LOG);
      const top = h + trunkH;
      for (let dy = 0; dy <= 2; dy++) {
        const r = dy >= 2 ? 1 : 2;
        for (let dx = -r; dx <= r; dx++) {
          for (let dz = -r; dz <= r; dz++) {
            if (dx === 0 && dz === 0 && dy < 2) continue;
            if (Math.abs(dx) === r && Math.abs(dz) === r && hash3(x + dx * 31, top + dy * 17, z + dz * 7) < 0.55) continue;
            if (worldGet(x + dx, top + dy, z + dz) === BK.AIR) writeBlock(x + dx, top + dy, z + dz, BK.LEAVES);
          }
        }
      }
    }
  }

  // 应用存档
  for (const [key, id] of edits) {
    const [x, y, z] = key.split(',').map(Number);
    writeBlock(x, y, z, id);
  }
}

/* ============================== 渲染 / 纹理 ============================== */
let renderer, scene, camera, atlasTex, material;

function makeAtlas() {
  const T = 16, N = 4;
  const cv = document.createElement('canvas');
  cv.width = cv.height = T * N;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;

  const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };

  const paint = (i, fn) => {
    g.save();
    g.translate((i % N) * T, Math.floor(i / N) * T);
    fn(g);
    g.restore();
  };

  paint(0, () => { // 草顶
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++)
      px(x, y, hash2(x, y) < 0.4 ? '#6aa53b' : '#7cb342');
  });
  paint(1, () => { // 草侧
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      if (y < 4) px(x, y, hash2(x, y) < 0.5 ? '#7cb342' : '#8cc152');
      else px(x, y, hash2(x * 3, y * 3) < 0.5 ? '#8b5a2b' : '#7d4f25');
    }
  });
  paint(2, () => { // 泥土
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++)
      px(x, y, hash2(x * 3, y * 3) < 0.5 ? '#8b5a2b' : '#7d4f25');
  });
  paint(3, () => { // 石头
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const v = 0x8c + Math.floor(hash2(x * 5, y * 5) * 30);
      px(x, y, `rgb(${v},${v},${v})`);
    }
  });
  paint(4, () => { // 沙子
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const v = 0xd4 + Math.floor(hash2(x * 4, y * 4) * 22);
      px(x, y, `rgb(${v},${v - 20},${v - 50})`);
    }
  });
  paint(5, () => { // 原木侧面
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const base = y % 2 === 0 ? '#6b4a2a' : '#5e3f23';
      px(x, y, hash2(x * 7, y) < 0.25 ? '#77522e' : base);
    }
  });
  paint(6, () => { // 原木顶
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const d = Math.sqrt((x - 7.5) ** 2 + (y - 7.5) ** 2);
      px(x, y, d < 6.2 ? '#a97b4f' : '#5e3f23');
    }
  });
  paint(7, () => { // 树叶
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const h = hash2(x * 9, y * 9);
      px(x, y, h < 0.55 ? '#4c9a3e' : h < 0.8 ? '#3f8534' : '#5aad4a');
    }
  });
  paint(8, () => { // 木板
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      if (y % 8 === 0 || y % 8 === 7) px(x, y, '#8a6740');
      else px(x, y, hash2(x * 3, y) < 0.5 ? '#b48a4f' : '#a87f47');
    }
  });
  paint(9, () => { // 圆石
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const blob = hash2(Math.floor(x / 3) * 7, Math.floor(y / 3) * 5);
      const v = Math.floor(0x66 + blob * 60);
      px(x, y, `rgb(${v},${v},${Math.min(255, v + 4)})`);
    }
  });
  paint(10, () => { // 砖块
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const row = y >> 2;
      const off = (row & 1) * 4;
      const inMortar = (y % 4 === 3) || ((x + off) % 8 === 7);
      px(x, y, inMortar ? '#b0a290' : '#a55a55');
    }
  });
  paint(11, () => { // 玻璃
    g.fillStyle = 'rgba(176, 219, 240, 0.95)';
    g.fillRect(0, 0, T, T);
    g.fillStyle = '#e8f6ff';
    g.fillRect(0, 0, T, 1); g.fillRect(0, 0, 1, T);
    g.fillRect(0, T - 1, T, 1); g.fillRect(T - 1, 0, 1, T);
    g.fillRect(7, 7, 2, 2);
  });
  paint(12, () => { // 雪
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const v = 0xf2 + Math.floor(hash2(x * 6, y * 6) * 13);
      px(x, y, `rgb(${v},${v},${v})`);
    }
  });
  paint(13, () => { // 砂砾
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const v = 0x66 + Math.floor(hash2(x * 6, y * 6) * 70);
      px(x, y, `rgb(${v},${v - 8},${v - 12})`);
    }
  });
  paint(14, () => { // 基岩
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const v = 0x24 + Math.floor(hash2(x * 8, y * 8) * 26);
      px(x, y, `rgb(${v},${v},${v})`);
    }
  });
  paint(15, () => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, T, T); });

  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function faceVisible(b, nb) {
  if (nb === BK.AIR) return true;
  if (b === BK.GLASS) return nb !== BK.GLASS;
  if (b === BK.LEAVES) return true;
  return false;
}

function buildChunkMesh(cx, cz) {
  const c = chunkAt(cx, cz);
  if (!c) return;
  if (c.mesh) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh = null; }

  const positions = [], normals = [], uvs = [], colors = [], indices = [];
  const ox = cx * CHUNK, oz = cz * CHUNK;

  for (let y = 0; y < HEIGHT; y++) {
    for (let z = 0; z < CHUNK; z++) {
      const wz = oz + z;
      for (let x = 0; x < CHUNK; x++) {
        const wx = ox + x;
        const b = c.data[y * CHUNK * CHUNK + z * CHUNK + x];
        if (!b || b === BK.AIR) continue;
        const def = BLOCKS[b];

        for (const face of FACES) {
          const nb = worldGet(wx + face.dir[0], y + face.dir[1], wz + face.dir[2]);
          if (!faceVisible(b, nb)) continue;

          const ny = face.n[1];
          const tile = ny === 1 ? def.top : ny === -1 ? def.bottom : def.side;
          const col = tile % 4, row = Math.floor(tile / 4);
          const u0 = col * 0.25 + UV_INSET, v0 = 1 - (row + 1) * 0.25 + UV_INSET;
          const s = 0.25 - UV_INSET * 2;
          const bright = FACE_BRIGHTNESS[face.n.join(',')] ?? 0.8;

          const base = positions.length / 3;
          for (let k = 0; k < 4; k++) {
            positions.push(face.v[k][0] + x, face.v[k][1] + y, face.v[k][2] + z);
            normals.push(face.n[0], face.n[1], face.n[2]);
            uvs.push(u0 + face.uv[k][0] * s, v0 + face.uv[k][1] * s);
            colors.push(bright, bright, bright);
          }
          indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
      }
    }
  }

  if (positions.length === 0) return;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);

  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(ox, 0, oz);
  scene.add(mesh);
  c.mesh = mesh;
}

/* 方块变更 → 重建所在块以及边界相邻块 */
function rebuildAround(x, y, z) {
  const cx = x >> 4, cz = z >> 4;
  buildChunkMesh(cx, cz);
  if ((x & 15) === 0) buildChunkMesh(cx - 1, cz);
  if ((x & 15) === 15) buildChunkMesh(cx + 1, cz);
  if ((z & 15) === 0) buildChunkMesh(cx, cz - 1);
  if ((z & 15) === 15) buildChunkMesh(cx, cz + 1);
}

function setBlock(x, y, z, id, persist = true) {
  if (!inWorld(x, y, z)) return;
  const old = worldGet(x, y, z);
  if (old === id) return;
  writeBlock(x, y, z, id);
  if (persist) {
    edits.set(`${x},${y},${z}`, id);
    scheduleSave();
  }
  rebuildAround(x, y, z);
}

/* ============================== 存储 ============================== */
const SAVE_KEY = 'mcclone_world_v1';
const PLAYER_KEY = 'mcclone_player_v1';
let saveTimer = null;

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 400);
}
function saveNow() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ edits: [...edits.entries()] }));
  } catch (e) { /* 存储满或不可用 */ }
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.edits)) {
      for (const [key, id] of data.edits) edits.set(String(key), Number(id));
    }
  } catch (e) { /* 忽略损坏的存档 */ }
}
function resetWorld() {
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(PLAYER_KEY); } catch (e) { /* noop */ }
  location.reload();
}

// 玩家位置 / 飞行状态存档
function loadPlayerPos() {
  try {
    const raw = localStorage.getItem(PLAYER_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d && typeof d.x === 'number' && inWorld(d.x, d.y, d.z)) return d;
  } catch (e) { /* 忽略 */ }
  return null;
}
function savePlayerPos() {
  try {
    localStorage.setItem(PLAYER_KEY, JSON.stringify({ x: player.x, y: player.y, z: player.z, flying }));
  } catch (e) { /* 存储不可用 */ }
}
let lastPlayerSave = 0;
const PLAYER_SAVE_INTERVAL = 3000;
function maybeSavePlayer(now) {
  if (now - lastPlayerSave >= PLAYER_SAVE_INTERVAL) {
    lastPlayerSave = now;
    savePlayerPos();
  }
}

/* ============================== 天空 / 昼夜 ============================== */
let dayTime = 0.28;    // 上午
let dayPaused = false;
const DAY_LEN = 300;   // 一个昼夜 300 秒

const skyDay   = new THREE.Color(0.53, 0.74, 0.97);
const skyNight = new THREE.Color(0.03, 0.04, 0.09);
const skyDawn  = new THREE.Color(0.98, 0.55, 0.32);
const lightDay = new THREE.Color(1.0, 0.96, 0.88);
const lightNight = new THREE.Color(0.35, 0.42, 0.65);

let sunLight, ambient, sunMesh, moonMesh, stars, clouds, cloudTex;
const skyColor = new THREE.Color();

function buildSky() {
  sunLight = new THREE.DirectionalLight(0xffffff, 0.9);
  scene.add(sunLight);
  ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const orbTexture = (color) => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, color);
    grad.addColorStop(0.55, color.replace('1)', '0.55)'));
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  sunMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshBasicMaterial({ map: orbTexture('rgba(255,241,180,1)'), transparent: true, fog: false, depthWrite: false })
  );
  moonMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 70),
    new THREE.MeshBasicMaterial({ map: orbTexture('rgba(226,236,250,1)'), transparent: true, fog: false, depthWrite: false })
  );
  scene.add(sunMesh, moonMesh);

  const starPos = [];
  for (let i = 0; i < 1400; i++) {
    const a = Math.random() * Math.PI * 2;
    const e = Math.random() * Math.PI * 0.48;
    starPos.push(Math.cos(a) * Math.cos(e) * 480, Math.sin(e) * 480, Math.sin(a) * Math.cos(e) * 480);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xffffff, size: 1.6, transparent: true, opacity: 0, fog: false, depthWrite: false,
  }));
  scene.add(stars);

  cloudTex = makeCloudTexture();
  clouds = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 420),
    new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.62, depthWrite: false, fog: false })
  );
  clouds.rotation.x = -Math.PI / 2;
  clouds.position.y = 72;
  scene.add(clouds);
}

function makeCloudTexture() {
  const W = 512, H = 128;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.92)';
  for (let i = 0; i < 26; i++) {
    const x = hash2(i * 3, 11) * W;
    const y = 12 + hash2(i * 7, 29) * (H - 30);
    const w = 26 + hash2(i * 13, 47) * 70;
    g.beginPath();
    g.ellipse(x, y, w / 2, 10 + hash2(i * 5, 61) * 12, 0, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

function updateSky(dt) {
  if (!dayPaused) dayTime = (dayTime + dt / DAY_LEN) % 1;
  const ang = dayTime * Math.PI * 2;
  const elev = Math.sin(ang);

  const sunAmt = clamp01(elev * 1.6 + 0.12);
  const nightAmt = 1 - sunAmt;
  const duskAmt = clamp01(1 - Math.abs(elev) * 5) * 0.85;

  skyColor.copy(skyNight).lerp(skyDay, sunAmt);
  skyColor.lerp(skyDawn, duskAmt * (1 - sunAmt));

  const sunPos = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0.32).multiplyScalar(430);
  const moonPos = new THREE.Vector3(-Math.cos(ang), -Math.sin(ang), -0.32).multiplyScalar(430);
  sunMesh.position.copy(sunPos);
  moonMesh.position.copy(moonPos);
  sunMesh.visible = elev > -0.15;
  moonMesh.visible = elev < 0.15;

  sunLight.position.copy(sunPos).multiplyScalar(0.35);
  sunLight.color.copy(lightDay).lerp(lightNight, nightAmt * 0.45);
  sunLight.intensity = 0.12 + sunAmt * 0.95;
  ambient.intensity = 0.16 + sunAmt * 0.42 + nightAmt * 0.05;

  stars.material.opacity = nightAmt * 0.95;
  cloudTex.offset.x += dt * 0.0035;

  scene.background = skyColor;
  scene.fog.color.copy(skyColor);
}

/* ============================== 粒子 ============================== */
const MAX_PARTICLES = 90;
let particles;
const pObj = [];

function buildParticles() {
  particles = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.11, 0.11, 0.11),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    MAX_PARTICLES
  );
  particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(particles);

  // 初始化粒子池（每个粒子隐藏在地图下方）
  const dummy = new THREE.Object3D();
  dummy.position.set(0, -100, 0);
  dummy.scale.setScalar(0.01);
  dummy.updateMatrix();
  for (let i = 0; i < MAX_PARTICLES; i++) {
    pObj.push({
      alive: false, ttl: 0, age: 0,
      color: new THREE.Color(),
      pos: new THREE.Vector3(0, -100, 0),
      v: new THREE.Vector3(),
    });
    particles.setMatrixAt(i, dummy.matrix);
  }
  particles.instanceMatrix.needsUpdate = true;
}

function spawnParticles(x, y, z, color, count = 14) {
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const idx = pCursor++ % MAX_PARTICLES;
    const p = pObj[idx];
    if (!p) return; // 防御：粒子池未就绪时直接忽略，不阻断破坏/放置
    p.alive = true;
    p.ttl = 0.45 + Math.random() * 0.35;
    p.age = 0;
    p.color.setHex(color);
    p.pos.set(
      x + (Math.random() - 0.5) * 0.5,
      y + (Math.random() - 0.5) * 0.5,
      z + (Math.random() - 0.5) * 0.5
    );
    p.v.set((Math.random() - 0.5) * 4, Math.random() * 5 + 1, (Math.random() - 0.5) * 4);
    particles.setColorAt(idx, p.color);
  }
  if (particles.instanceColor) particles.instanceColor.needsUpdate = true;
}

let pCursor = 0;
function updateParticles(dt) {
  const dummy = new THREE.Object3D();
  let alive = 0;
  pObj.forEach((p, i) => {
    if (!p.alive) return;
    p.age += dt;
    if (p.age > p.ttl) {
      p.alive = false;
      dummy.position.set(0, -100, 0);
      dummy.scale.setScalar(0.01);
    } else {
      alive++;
      p.v.y -= 22 * dt;
      p.pos.addScaledVector(p.v, dt);
      dummy.position.copy(p.pos);
      const s = 1 - p.age / p.ttl;
      dummy.scale.setScalar(0.5 + s * 0.5);
    }
    dummy.updateMatrix();
    particles.setMatrixAt(i, dummy.matrix);
  });
  particles.count = alive;
  particles.instanceMatrix.needsUpdate = true;
  if (particles.instanceColor) particles.instanceColor.needsUpdate = true;
}

/* ============================== 音效 ============================== */
let actx = null;
function ensureAudio() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
}
function noiseBurst(dur, freq, gain, type = 'bandpass') {
  if (!actx) return;
  const n = Math.floor(actx.sampleRate * dur);
  const buf = actx.createBuffer(1, n, actx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = actx.createBufferSource();
  src.buffer = buf;
  const f = actx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = 0.8;
  const g = actx.createGain();
  g.gain.setValueAtTime(gain, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
  src.connect(f).connect(g).connect(actx.destination);
  src.start();
}
function tone(f0, f1, dur, gain, type = 'square') {
  if (!actx) return;
  const o = actx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, actx.currentTime);
  o.frequency.exponentialRampToValueAtTime(f1, actx.currentTime + dur);
  const g = actx.createGain();
  g.gain.setValueAtTime(gain, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
  o.connect(g).connect(actx.destination);
  o.start(); o.stop(actx.currentTime + dur + 0.02);
}
const sfx = {
  dig()   { noiseBurst(0.13, 320 + Math.random() * 260, 0.30); },
  place() { noiseBurst(0.06, 1400, 0.10); tone(240, 160, 0.07, 0.12); },
  step()  { noiseBurst(0.05, 260, 0.045, 'lowpass'); },
  pop()   { tone(620, 880, 0.08, 0.10, 'triangle'); },
  fly()   { tone(300, 520, 0.12, 0.09, 'sine'); },
};

/* ============================== 玩家 / 输入 ============================== */
const keys = new Set();
let yaw = 0, pitch = 0;
let locked = false;
let selected = 0;
let flying = false;
let lastSpace = 0;
const mouseDown = { left: false, right: false };
let lastBreak = 0, lastPlace = 0;
let stepAcc = 0;

const player = {
  x: SIZE / 2 + 0.5, y: 90, z: SIZE / 2 + 0.5,
  w: 0.3, h: 1.8, eye: 1.62,
  vx: 0, vy: 0, vz: 0, onGround: false,
};

function spawnPlayer() {
  const cx = Math.floor(SIZE / 2), cz = Math.floor(SIZE / 2);
  let found = false;

  // 优先恢复存档位置（脚下有实体、头顶三格为空才采用）
  const saved = loadPlayerPos();
  if (saved) {
    const feet = saved.y + 0.001;
    if (solidAt(Math.floor(saved.x), Math.floor(feet) - 1, Math.floor(saved.z)) &&
        !solidAt(Math.floor(saved.x), Math.floor(feet), Math.floor(saved.z)) &&
        !solidAt(Math.floor(saved.x), Math.floor(feet) + 1, Math.floor(saved.z)) &&
        !solidAt(Math.floor(saved.x), Math.floor(feet) + 2, Math.floor(saved.z))) {
      player.x = saved.x; player.y = feet; player.z = saved.z;
      flying = !!saved.flying;
      found = true;
    }
  }

  // 从中心向外扩环，找一个头顶 6 格无实体的平地
  for (let r = 0; r < 12 && !found; r++) {
    for (let dz = -r; dz <= r && !found; dz++) {
      for (let dx = -r; dx <= r && !found; dx++) {
        const x = cx + dx, z = cz + dz;
        if (x < 0 || z < 0 || x >= SIZE || z >= SIZE) continue;
        let y = HEIGHT - 1;
        while (y > 0 && !solidAt(x, y - 1, z)) y--;
        if (y <= 2) continue;
        let clear = true;
        for (let dy = 1; dy <= 6; dy++) if (solidAt(x, y + dy, z)) { clear = false; break; }
        if (clear) {
          player.x = x + 0.5; player.z = z + 0.5; player.y = y + 1.2;
          found = true;
        }
      }
    }
  }
  if (!found) { player.x = cx + 0.5; player.y = HEIGHT - 2; player.z = cz + 0.5; }
  player.vx = player.vy = player.vz = 0;
  player.onGround = false;
}

function collides(x, y, z) {
  const x0 = Math.floor(x - player.w), x1 = Math.floor(x + player.w);
  const y0 = Math.floor(y), y1 = Math.floor(y + player.h);
  const z0 = Math.floor(z - player.w), z1 = Math.floor(z + player.w);
  for (let yy = y0; yy <= y1; yy++)
    for (let zz = z0; zz <= z1; zz++)
      for (let xx = x0; xx <= x1; xx++)
        if (solidAt(xx, yy, zz)) return true;
  return false;
}

function moveAxis(axis, amount) {
  if (!amount) return;
  if (axis === 'x') {
    const np = player.x + amount;
    if (collides(np, player.y, player.z)) {
      if (amount > 0) player.x = Math.floor(np + player.w) - player.w - EPS;
      else player.x = Math.floor(np - player.w) + 1 + player.w + EPS;
      player.vx = 0;
    } else player.x = np;
  } else if (axis === 'z') {
    const np = player.z + amount;
    if (collides(player.x, player.y, np)) {
      if (amount > 0) player.z = Math.floor(np + player.w) - player.w - EPS;
      else player.z = Math.floor(np - player.w) + 1 + player.w + EPS;
      player.vz = 0;
    } else player.z = np;
  } else {
    const np = player.y + amount;
    if (collides(player.x, np, player.z)) {
      if (amount > 0) {
        player.y = Math.floor(np + player.h) - player.h - EPS;
        player.vy = 0;
      } else {
        player.y = Math.floor(np) + 1 + EPS;
        player.vy = 0;
        player.onGround = true;
      }
    } else {
      player.y = np;
      if (amount < 0) player.onGround = false;
    }
  }
}

const GRAVITY = 26, JUMP = 9.6, WALK = 4.6;
const lerp = (a, b, t) => a + (b - a) * t;

function updatePlayer(dt) {
  const f = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  const s = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  const fl = Math.hypot(f, s) || 1;
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  const dx = (-sin * f + cos * s) / fl;
  const dz = (-cos * f - sin * s) / fl;

  const sprint = keys.has('ControlLeft') || keys.has('ControlRight');
  const sneak = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const base = sprint ? WALK * 1.6 : WALK * (sneak ? 0.4 : 1);
  const speed = flying ? (sprint ? 17 : 9.5) : base;

  const k = 1 - Math.exp(-11 * dt);
  player.vx = lerp(player.vx, dx * speed, k);
  player.vz = lerp(player.vz, dz * speed, k);

  if (flying) {
    const up = (keys.has('Space') ? 1 : 0) - (sneak ? 1 : 0);
    player.vy = lerp(player.vy, up * speed * 0.85, k);
  } else {
    if (player.onGround && keys.has('Space')) {
      player.vy = JUMP;
      player.onGround = false;
    }
    player.vy -= GRAVITY * dt;
    if (player.vy < -44) player.vy = -44;
  }

  moveAxis('x', player.vx * dt);
  moveAxis('z', player.vz * dt);
  moveAxis('y', player.vy * dt);

  // 脚步声
  if (player.onGround && Math.hypot(player.vx, player.vz) > 2.5) {
    stepAcc += dt;
    if (stepAcc > 0.42) { stepAcc = 0; sfx.step(); }
  }

  // 掉出世界 → 重生
  if (player.y < -20) { spawnPlayer(); }

  camera.position.set(player.x, player.y + player.eye, player.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}

/* ============================== 射线 / 方块交互 ============================== */
let target = null;

function raycastVoxel(ox, oy, oz, dx, dy, dz, maxD) {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
  const invX = dx !== 0 ? 1 / Math.abs(dx) : Infinity;
  const invY = dy !== 0 ? 1 / Math.abs(dy) : Infinity;
  const invZ = dz !== 0 ? 1 / Math.abs(dz) : Infinity;
  let tMaxX = dx !== 0 ? (dx > 0 ? (x + 1 - ox) : (ox - x)) * invX : Infinity;
  let tMaxY = dy !== 0 ? (dy > 0 ? (y + 1 - oy) : (oy - y)) * invY : Infinity;
  let tMaxZ = dz !== 0 ? (dz > 0 ? (z + 1 - oz) : (oz - z)) * invZ : Infinity;
  const tDeltaX = invX, tDeltaY = invY, tDeltaZ = invZ;
  let nx = 0, ny = 0, nz = 0, t = 0;

  for (let i = 0; i < 512; i++) {
    const b = worldGet(x, y, z);
    if (b !== BK.AIR) return { x, y, z, nx, ny, nz, dist: t };
    if (t >= maxD) return null;
    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) { x += stepX; t = tMaxX; tMaxX += tDeltaX; nx = -stepX; ny = 0; nz = 0; }
      else { z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ; }
    } else {
      if (tMaxY < tMaxZ) { y += stepY; t = tMaxY; tMaxY += tDeltaY; nx = 0; ny = -stepY; nz = 0; }
      else { z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ; }
    }
  }
  return null;
}

function updateTarget() {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  target = raycastVoxel(camera.position.x, camera.position.y, camera.position.z,
    dir.x, dir.y, dir.z, REACH);
}

const highlight = (() => {
  const box = new THREE.BoxGeometry(1.004, 1.004, 1.004);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(box),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
  );
  edges.visible = false;
  return edges;
})();

// 放置幽灵预览（绿色线框）
const ghost = (() => {
  const box = new THREE.BoxGeometry(1.004, 1.004, 1.004);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(box),
    new THREE.LineBasicMaterial({ color: 0x66ff66, transparent: true, opacity: 0.45 })
  );
  edges.visible = false;
  return edges;
})();

// 放置位置是否合法（世界内 + 空 + 不与玩家重叠）
function canPlaceAt(px, py, pz) {
  if (!inWorld(px, py, pz) || worldGet(px, py, pz) !== BK.AIR) return false;
  return !(
    px + 1 > player.x - player.w && px < player.x + player.w + 1 &&
    py + 1 > player.y && py < player.y + player.h &&
    pz + 1 > player.z - player.w && pz < player.z + player.w + 1
  );
}

function interact(now) {
  updateTarget();

  if (target && target.dist <= REACH) {
    highlight.visible = true;
    highlight.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);
    if (!highlight.parent) scene.add(highlight);
  } else {
    highlight.visible = false;
  }

  // 幽灵预览
  if (target && target.dist <= REACH) {
    const px = target.x + target.nx, py = target.y + target.ny, pz = target.z + target.nz;
    if (canPlaceAt(px, py, pz)) {
      ghost.visible = true;
      ghost.position.set(px + 0.5, py + 0.5, pz + 0.5);
      if (!ghost.parent) scene.add(ghost);
    } else {
      ghost.visible = false;
    }
  } else {
    ghost.visible = false;
  }

  // 破坏（长按，每 0.28s 一次）
  if (mouseDown.left && target && target.dist <= REACH && now - lastBreak > 0.28) {
    const b = worldGet(target.x, target.y, target.z);
    if (b !== BK.BEDROCK) {
      lastBreak = now;
      const def = BLOCKS[b];
      spawnParticles(target.x + 0.5, target.y + 0.5, target.z + 0.5, def ? def.color : 0x888888);
      sfx.dig();
      setBlock(target.x, target.y, target.z, BK.AIR);
    }
  }

  // 放置（每 0.22s 一次）
  if (mouseDown.right && target && target.dist <= REACH && now - lastPlace > 0.22) {
    const px = target.x + target.nx, py = target.y + target.ny, pz = target.z + target.nz;
    if (canPlaceAt(px, py, pz)) {
      lastPlace = now;
      const id = HOTBAR[selected];
      setBlock(px, py, pz, id);
      sfx.place();
      spawnParticles(px + 0.5, py + 0.5, pz + 0.5, BLOCKS[id].color, 6);
    }
  }
}

/* ============================== 快捷栏 / HUD ============================== */
const hotbarEl = document.getElementById('hotbar');
const slotEls = [];

function drawIcon(cv, tile) {
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(atlasTex.image, (tile % 4) * 16, Math.floor(tile / 4) * 16, 16, 16, 0, 0, cv.width, cv.height);
}

function buildHotbar() {
  HOTBAR.forEach((id, i) => {
    const slot = document.createElement('div');
    slot.className = 'slot' + (i === selected ? ' sel' : '');
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = i + 1;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 32;
    drawIcon(cv, BLOCKS[id].icon);
    slot.append(num, cv);
    hotbarEl.appendChild(slot);
    slotEls.push(slot);
  });
}

function selectSlot(i) {
  selected = ((i % HOTBAR.length) + HOTBAR.length) % HOTBAR.length;
  slotEls.forEach((el, j) => el.classList.toggle('sel', j === selected));
  document.getElementById('beside').textContent = BLOCKS[HOTBAR[selected]].name;
}

const statsEl = document.getElementById('stats');
const msgEl = document.getElementById('msg');
let msgTimer = null;
function showMsg(text, ms = 2200) {
  msgEl.textContent = text;
  msgEl.style.opacity = 1;
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => msgEl.style.opacity = 0, ms);
}

let fpsFrames = 0, fpsTime = 0;
function updateHUD(dt) {
  fpsFrames++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    const fps = Math.round(fpsFrames / fpsTime);
    fpsFrames = 0; fpsTime = 0;
    const b = target ? BLOCKS[worldGet(target.x, target.y, target.z)] : null;
    statsEl.innerHTML =
      `FPS ${fps}　坐标 ${player.x.toFixed(1)}, ${player.y.toFixed(1)}, ${player.z.toFixed(1)}` +
      (b ? `　瞄准: ${b.name}` : '') +
      (flying ? '　✈ 飞行中' : '');
  }
}

/* ============================== 输入事件 ============================== */
function setupInput() {
  const canvas = document.getElementById('game');

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Tab') e.preventDefault();
    keys.add(e.code);

    const num = ['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9'].indexOf(e.code);
    if (num >= 0) selectSlot(num);

    if (!locked) return;
    if (e.code === 'KeyF' && !e.repeat) {
      flying = !flying;
      sfx.fly();
      showMsg(flying ? '✈ 飞行模式' : '🦶 行走模式');
    }
    if (e.code === 'Space' && !e.repeat) {
      const now = performance.now();
      if (now - lastSpace < 260) {
        flying = !flying;
        sfx.fly();
        showMsg(flying ? '✈ 飞行模式' : '🦶 行走模式');
      }
      lastSpace = now;
    }
    if (e.code === 'KeyG' && !e.repeat) { dayPaused = !dayPaused; showMsg(dayPaused ? '🌙 昼夜暂停' : '☀️ 昼夜继续'); }
    if (e.code === 'KeyP' && !e.repeat) resetWorld();
  });
  document.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  // 鼠标监听挂在 document：指针锁定时事件会重定向到锁定元素，
  // 挂 document 可确保即使有 UI 遮挡画布，按住/松开也不会丢事件。
  document.addEventListener('mousedown', (e) => {
    if (!locked) return;
    try { ensureAudio(); } catch (err) { /* 音频初始化异常不阻断操作 */ }
    if (e.button === 0) { mouseDown.left = true; lastBreak = 0; }
    if (e.button === 2) { mouseDown.right = true; lastPlace = 0; }
    if (e.button === 1) {
      e.preventDefault(); // 阻止部分浏览器的自动滚动
      if (target && target.dist <= REACH) {
        // 中键吸取
        const id = worldGet(target.x, target.y, target.z);
        const idx = HOTBAR.indexOf(id);
        if (idx >= 0) selectSlot(idx);
      }
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouseDown.left = false;
    if (e.button === 2) mouseDown.right = false;
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  document.addEventListener('mousemove', (e) => {
    if (!locked) return;
    yaw   -= e.movementX * 0.0022;
    pitch -= e.movementY * 0.0022;
    if (pitch > 1.55) pitch = 1.55;
    if (pitch < -1.55) pitch = -1.55;
  });

  document.addEventListener('wheel', (e) => {
    if (!locked) return;
    if (e.deltaY > 0) selectSlot(selected + 1);
    else selectSlot(selected - 1);
  }, { passive: true });

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    if (!locked) {
      mouseDown.left = mouseDown.right = false;
      keys.clear();
      showPause(true);
    } else {
      showPause(false);
      ensureAudio();
    }
  });
}

/* ============================== 菜单 / 流程 ============================== */
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const pauseTitle = document.getElementById('pauseTitle');
const helpEl = document.getElementById('help');
const bar = document.getElementById('bar');
const progTxt = document.getElementById('prog-txt');
const ring = document.getElementById('ring');

function setProgress(pct, txt) {
  bar.style.width = pct + '%';
  if (txt) progTxt.textContent = txt;
}

function showPause(paused) {
  if (paused) {
    pauseTitle.style.display = 'block';
    startBtn.textContent = '▶ 继续游戏';
    ring.style.display = 'none';
    progTxt.style.display = 'none';
    helpEl.style.display = 'block';
    overlay.style.display = 'flex';
  } else {
    overlay.style.display = 'none';
  }
}

function startGame() {
  const canvas = document.getElementById('game');
  try {
    const ret = canvas.requestPointerLock();
    if (ret && typeof ret.catch === 'function') ret.catch(() => {});
  } catch (e) { /* 某些浏览器抛出同步异常 */ }
}

/* ============================== 主循环 / 初始化 ============================== */
let meshQueue = [];
const clock = new THREE.Clock();

function init() {
  const canvas = document.getElementById('game');
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  } catch (e) {
    progTxt.textContent = '⚠️ 浏览器不支持 WebGL，无法运行游戏';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x87b8e8, 45, 230);
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1200);

  atlasTex = makeAtlas();
  material = new THREE.MeshLambertMaterial({ map: atlasTex, vertexColors: true });

  buildSky();
  buildParticles();
  window.__mc_ready = true;

  // 生成地形（同步，约几百毫秒）→ 加入网格化队列
  setTimeout(() => {
    generateWorld();
    setProgress(20, '正在合并网格…');
    meshQueue = [];
    for (let cx = 0; cx < WORLD; cx++)
      for (let cz = 0; cz < WORLD; cz++)
        meshQueue.push([cx, cz]);
    // 中心区块优先（出生点附近先可见）
    meshQueue.sort((a, b) =>
      ((a[0] - WORLD / 2) ** 2 + (a[1] - WORLD / 2) ** 2) -
      ((b[0] - WORLD / 2) ** 2 + (b[1] - WORLD / 2) ** 2));
  }, 30);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // 渐进式建网格（每帧至多 3 块，避免卡顿）
  if (meshQueue.length > 0) {
    for (let i = 0; i < 3 && meshQueue.length > 0; i++) {
      const [cx, cz] = meshQueue.shift();
      buildChunkMesh(cx, cz);
    }
    const total = WORLD * WORLD;
    const done = total - meshQueue.length;
    setProgress(20 + (done / total) * 78, `正在合并网格… ${Math.round((done / total) * 100)}%`);
    if (meshQueue.length === 0) {
      setProgress(100, '世界已就绪');
      spawnPlayer();
      startBtn.style.display = 'inline-block';
      helpEl.style.display = 'block';
      document.getElementById('hud').style.display = 'block';
      showMsg('欢迎来到方块世界！', 4000);
    }
  }

  if (locked) {
    updatePlayer(dt);
    interact(performance.now() / 1000);
    updateHUD(dt);
    if (meshQueue.length === 0) maybeSavePlayer(performance.now()); // 每 3 秒节流保存位置
  } else {
    highlight.visible = false;
    ghost.visible = false;
  }

  updateSky(dt);
  updateParticles(dt);
  renderer.render(scene, camera);
}

/* ============================== 启动 ============================== */
window.addEventListener('resize', () => {
  if (!camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

loadSave();
init();                 // 先生成纹理，随后 buildHotbar 才能画图标
buildHotbar();
selectSlot(0);
setupInput();
startBtn.addEventListener('click', startGame);
window.addEventListener('beforeunload', () => { saveNow(); savePlayerPos(); });
animate();

// 调试钩子（自动化测试 / 控制台可用；不影响游戏）
const mcDebug = {
  BLOCKS, HOTBAR, BK,
  worldGet, solidAt, setBlock, raycastVoxel, player,
  setLocked(v) { locked = !!v; },
  teleport(x, y, z) { player.x = x; player.y = y; player.z = z; player.vx = player.vy = player.vz = 0; player.onGround = false; },
  setLook(ya, pi) { yaw = ya; pitch = Math.max(-1.55, Math.min(1.55, pi)); },
  get mouseState() { return { left: mouseDown.left, right: mouseDown.right, breakAt: lastBreak, placeAt: lastPlace }; },
  get targetInfo() { return target; },
  get flying() { return flying; },
  get locked() { return locked; },
  get selected() { return selected; },
  get meshReady() { return meshQueue.length === 0; },
  get renderTriangles() { return renderer ? renderer.info.render.triangles : -1; },
  get camInfo() {
    return {
      x: +camera.position.x.toFixed(2), y: +camera.position.y.toFixed(2), z: +camera.position.z.toFixed(2),
      rx: +camera.rotation.x.toFixed(3), ry: +camera.rotation.y.toFixed(3),
      bg: '#' + scene.background.getHexString(),
    };
  },
};
window.__mc = mcDebug;