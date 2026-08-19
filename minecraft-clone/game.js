/**
 * 方块世界 v1.1.0 — 无限世界 + 新方块 + 背包 + 植物渲染
 *
 * 功能：动态区块加载/卸载、程序化地形（含矿物/石头变种/植物）、
 *       十字面片植物渲染、全屏创造背包、前版的全部基础系统。
 */
import * as THREE from 'three';

/* ============================== 常量 ============================== */
const CHUNK       = 16;
const HEIGHT      = 48;
const RENDER_DIST = 8;
const REACH       = 6.0;
const EPS         = 1e-3;
const UV_INSET    = 0.004;
const ATLAS_COLS  = 8;
const ATLAS_ROWS  = 6;
const TILE_SZ     = 16;
const MAX_CHUNK_LOAD_PER_FRAME = 4;
const MAX_CHUNK_UNLOAD_PER_FRAME = 8;

const BK = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, LOG: 5, LEAVES: 6,
  PLANKS: 7, COBBLE: 8, BRICK: 9, GLASS: 10, SNOW: 11, GRAVEL: 12, BEDROCK: 13,
  GRANITE: 14, DIORITE: 15, ANDESITE: 16, MYCELIUM: 17, PODZOL: 18,
  RED_SAND: 19, CLAY: 20, ICE: 21, PACKED_ICE: 22,
  COAL_ORE: 23, IRON_ORE: 24, GOLD_ORE: 25, LAPIS_ORE: 26,
  REDSTONE_ORE: 27, DIAMOND_ORE: 28, EMERALD_ORE: 29,
  SPRUCE_LOG: 30, BIRCH_LOG: 31, JUNGLE_LOG: 32, ACACIA_LOG: 33, DARK_OAK_LOG: 34,
  SPRUCE_PLANKS: 35, BIRCH_PLANKS: 36, JUNGLE_PLANKS: 37, ACACIA_PLANKS: 38, DARK_OAK_PLANKS: 39,
  OAK_SAPLING: 40, SPRUCE_SAPLING: 41, BIRCH_SAPLING: 42,
  DANDELION: 43, POPPY: 44, TALL_GRASS: 45, FERN: 46,
  BROWN_MUSHROOM: 47, RED_MUSHROOM: 48, DEAD_BUSH: 49,
};
const T = {
  GRASS_TOP: 0, GRASS_SIDE: 1, DIRT: 2, STONE: 3, SAND: 4, LOG_SIDE: 5, LOG_TOP: 6,
  LEAVES: 7, PLANKS: 8, COBBLE: 9, BRICK: 10, GLASS: 11, SNOW: 12, GRAVEL: 13, BEDROCK: 14,
  GRANITE: 15, DIORITE: 16, ANDESITE: 17, MYCELIUM_TOP: 18, MYCELIUM_SIDE: 19,
  PODZOL_TOP: 20, PODZOL_SIDE: 21, RED_SAND: 22, CLAY: 23, ICE: 24, PACKED_ICE: 25,
  COAL_ORE: 26, IRON_ORE: 27, GOLD_ORE: 28, LAPIS_ORE: 29, REDSTONE_ORE: 30, DIAMOND_ORE: 31, EMERALD_ORE: 32,
  SPRUCE_LOG_SIDE: 33, SPRUCE_LOG_TOP: 34, BIRCH_LOG_SIDE: 35, BIRCH_LOG_TOP: 36,
  JUNGLE_LOG_SIDE: 37, JUNGLE_LOG_TOP: 38, ACACIA_LOG_SIDE: 39, ACACIA_LOG_TOP: 40,
  DARK_OAK_LOG_SIDE: 41, DARK_OAK_LOG_TOP: 42,
  SPRUCE_PLANKS: 43, BIRCH_PLANKS: 44, JUNGLE_PLANKS: 45, ACACIA_PLANKS: 46, DARK_OAK_PLANKS: 47,
};
const BD = (def) => def;
const BLOCKS = {
  [BK.GRASS]:   BD({ name: '草方块',  top: T.GRASS_TOP, side: T.GRASS_SIDE, bottom: T.DIRT, solid: true, icon: T.GRASS_TOP, color: 0x7cb342, creative: true }),
  [BK.DIRT]:    BD({ name: '泥土',    top: T.DIRT, side: T.DIRT, bottom: T.DIRT, solid: true, icon: T.DIRT, color: 0x8b5a2b, creative: true }),
  [BK.STONE]:   BD({ name: '石头',    top: T.STONE, side: T.STONE, bottom: T.STONE, solid: true, icon: T.STONE, color: 0x9a9a9a, creative: true }),
  [BK.SAND]:    BD({ name: '沙子',    top: T.SAND, side: T.SAND, bottom: T.SAND, solid: true, icon: T.SAND, color: 0xdfce9b, creative: true }),
  [BK.LOG]:     BD({ name: '橡木原木', top: T.LOG_TOP, side: T.LOG_SIDE, bottom: T.LOG_TOP, solid: true, icon: T.LOG_SIDE, color: 0x6b4a2a, creative: true }),
  [BK.LEAVES]:  BD({ name: '树叶',    top: T.LEAVES, side: T.LEAVES, bottom: T.LEAVES, solid: false, icon: T.LEAVES, color: 0x4c9a3e, creative: true }),
  [BK.PLANKS]:  BD({ name: '橡木木板', top: T.PLANKS, side: T.PLANKS, bottom: T.PLANKS, solid: true, icon: T.PLANKS, color: 0xb48a4f, creative: true }),
  [BK.COBBLE]:  BD({ name: '圆石',    top: T.COBBLE, side: T.COBBLE, bottom: T.COBBLE, solid: true, icon: T.COBBLE, color: 0x7e7e7e, creative: true }),
  [BK.BRICK]:   BD({ name: '砖块',    top: T.BRICK, side: T.BRICK, bottom: T.BRICK, solid: true, icon: T.BRICK, color: 0x9c4f4f, creative: true }),
  [BK.GLASS]:   BD({ name: '玻璃',    top: T.GLASS, side: T.GLASS, bottom: T.GLASS, solid: true, icon: T.GLASS, color: 0xbfe0f0, creative: true }),
  [BK.SNOW]:    BD({ name: '雪块',    top: T.SNOW, side: T.SNOW, bottom: T.SNOW, solid: true, icon: T.SNOW, color: 0xf4f9ff, creative: true }),
  [BK.GRAVEL]:  BD({ name: '砂砾',    top: T.GRAVEL, side: T.GRAVEL, bottom: T.GRAVEL, solid: true, icon: T.GRAVEL, color: 0x9a918a, creative: true }),
  [BK.BEDROCK]: BD({ name: '基岩',    top: T.BEDROCK, side: T.BEDROCK, bottom: T.BEDROCK, solid: true, icon: T.BEDROCK, color: 0x33302e, creative: false }),
  [BK.GRANITE]:   BD({ name: '花岗岩',   top: T.GRANITE, side: T.GRANITE, bottom: T.GRANITE, solid: true, icon: T.GRANITE, color: 0xd4b088, creative: true }),
  [BK.DIORITE]:   BD({ name: '闪长岩',   top: T.DIORITE, side: T.DIORITE, bottom: T.DIORITE, solid: true, icon: T.DIORITE, color: 0xc8c8c8, creative: true }),
  [BK.ANDESITE]:  BD({ name: '安山岩',   top: T.ANDESITE, side: T.ANDESITE, bottom: T.ANDESITE, solid: true, icon: T.ANDESITE, color: 0x8a8a7a, creative: true }),
  [BK.MYCELIUM]:  BD({ name: '菌丝',     top: T.MYCELIUM_TOP, side: T.MYCELIUM_SIDE, bottom: T.DIRT, solid: true, icon: T.MYCELIUM_TOP, color: 0x9a8a8a, creative: true }),
  [BK.PODZOL]:    BD({ name: '灰化土',   top: T.PODZOL_TOP, side: T.PODZOL_SIDE, bottom: T.DIRT, solid: true, icon: T.PODZOL_TOP, color: 0x6b4a2a, creative: true }),
  [BK.RED_SAND]:  BD({ name: '红沙',     top: T.RED_SAND, side: T.RED_SAND, bottom: T.RED_SAND, solid: true, icon: T.RED_SAND, color: 0xc46a3a, creative: true }),
  [BK.CLAY]:      BD({ name: '粘土块',   top: T.CLAY, side: T.CLAY, bottom: T.CLAY, solid: true, icon: T.CLAY, color: 0x9a9a9a, creative: true }),
  [BK.ICE]:       BD({ name: '冰',       top: T.ICE, side: T.ICE, bottom: T.ICE, solid: true, icon: T.ICE, color: 0xb0d8f0, creative: true }),
  [BK.PACKED_ICE]:BD({ name: '浮冰',     top: T.PACKED_ICE, side: T.PACKED_ICE, bottom: T.PACKED_ICE, solid: true, icon: T.PACKED_ICE, color: 0xc0e0f8, creative: true }),
  [BK.COAL_ORE]:     BD({ name: '煤矿石',     top: T.COAL_ORE, side: T.COAL_ORE, bottom: T.COAL_ORE, solid: true, icon: T.COAL_ORE, color: 0x3a3a3a, creative: true }),
  [BK.IRON_ORE]:     BD({ name: '铁矿石',     top: T.IRON_ORE, side: T.IRON_ORE, bottom: T.IRON_ORE, solid: true, icon: T.IRON_ORE, color: 0xc8a88a, creative: true }),
  [BK.GOLD_ORE]:     BD({ name: '金矿石',     top: T.GOLD_ORE, side: T.GOLD_ORE, bottom: T.GOLD_ORE, solid: true, icon: T.GOLD_ORE, color: 0xe0c040, creative: true, glow: 0xffd700 }),
  [BK.LAPIS_ORE]:    BD({ name: '青金石矿石', top: T.LAPIS_ORE, side: T.LAPIS_ORE, bottom: T.LAPIS_ORE, solid: true, icon: T.LAPIS_ORE, color: 0x2a4a8a, creative: true, glow: 0x4466ff }),
  [BK.REDSTONE_ORE]: BD({ name: '红石矿石',   top: T.REDSTONE_ORE, side: T.REDSTONE_ORE, bottom: T.REDSTONE_ORE, solid: true, icon: T.REDSTONE_ORE, color: 0x8a2020, creative: true, glow: 0xff4444 }),
  [BK.DIAMOND_ORE]:  BD({ name: '钻石矿石',   top: T.DIAMOND_ORE, side: T.DIAMOND_ORE, bottom: T.DIAMOND_ORE, solid: true, icon: T.DIAMOND_ORE, color: 0x60c0c0, creative: true, glow: 0x66ffff }),
  [BK.EMERALD_ORE]:  BD({ name: '绿宝石矿石', top: T.EMERALD_ORE, side: T.EMERALD_ORE, bottom: T.EMERALD_ORE, solid: true, icon: T.EMERALD_ORE, color: 0x40b060, creative: true, glow: 0x44ff66 }),
  [BK.SPRUCE_LOG]:       BD({ name: '云杉原木',   top: T.SPRUCE_LOG_TOP, side: T.SPRUCE_LOG_SIDE, bottom: T.SPRUCE_LOG_TOP, solid: true, icon: T.SPRUCE_LOG_SIDE, color: 0x4a3520, creative: true }),
  [BK.BIRCH_LOG]:        BD({ name: '白桦原木',   top: T.BIRCH_LOG_TOP, side: T.BIRCH_LOG_SIDE, bottom: T.BIRCH_LOG_TOP, solid: true, icon: T.BIRCH_LOG_SIDE, color: 0xc0b090, creative: true }),
  [BK.JUNGLE_LOG]:       BD({ name: '丛林原木',   top: T.JUNGLE_LOG_TOP, side: T.JUNGLE_LOG_SIDE, bottom: T.JUNGLE_LOG_TOP, solid: true, icon: T.JUNGLE_LOG_SIDE, color: 0x6a5030, creative: true }),
  [BK.ACACIA_LOG]:       BD({ name: '金合欢原木', top: T.ACACIA_LOG_TOP, side: T.ACACIA_LOG_SIDE, bottom: T.ACACIA_LOG_TOP, solid: true, icon: T.ACACIA_LOG_SIDE, color: 0x8a6040, creative: true }),
  [BK.DARK_OAK_LOG]:     BD({ name: '深色橡木原木', top: T.DARK_OAK_LOG_TOP, side: T.DARK_OAK_LOG_SIDE, bottom: T.DARK_OAK_LOG_TOP, solid: true, icon: T.DARK_OAK_LOG_SIDE, color: 0x2a1a10, creative: true }),
  [BK.SPRUCE_PLANKS]:    BD({ name: '云杉木板',   top: T.SPRUCE_PLANKS, side: T.SPRUCE_PLANKS, bottom: T.SPRUCE_PLANKS, solid: true, icon: T.SPRUCE_PLANKS, color: 0x8a6a40, creative: true }),
  [BK.BIRCH_PLANKS]:     BD({ name: '白桦木板',   top: T.BIRCH_PLANKS, side: T.BIRCH_PLANKS, bottom: T.BIRCH_PLANKS, solid: true, icon: T.BIRCH_PLANKS, color: 0xd0c0a8, creative: true }),
  [BK.JUNGLE_PLANKS]:    BD({ name: '丛林木板',   top: T.JUNGLE_PLANKS, side: T.JUNGLE_PLANKS, bottom: T.JUNGLE_PLANKS, solid: true, icon: T.JUNGLE_PLANKS, color: 0x9a7a50, creative: true }),
  [BK.ACACIA_PLANKS]:    BD({ name: '金合欢木板', top: T.ACACIA_PLANKS, side: T.ACACIA_PLANKS, bottom: T.ACACIA_PLANKS, solid: true, icon: T.ACACIA_PLANKS, color: 0xb08050, creative: true }),
  [BK.DARK_OAK_PLANKS]:  BD({ name: '深色橡木木板', top: T.DARK_OAK_PLANKS, side: T.DARK_OAK_PLANKS, bottom: T.DARK_OAK_PLANKS, solid: true, icon: T.DARK_OAK_PLANKS, color: 0x3a2a1a, creative: true }),
  [BK.OAK_SAPLING]:     BD({ name: '橡树树苗',   plant: 0, color: 0x4a8a34, creative: true }),
  [BK.SPRUCE_SAPLING]:  BD({ name: '云杉树苗',   plant: 1, color: 0x3a6a28, creative: true }),
  [BK.BIRCH_SAPLING]:   BD({ name: '白桦树苗',   plant: 2, color: 0x5a9a40, creative: true }),
  [BK.DANDELION]:       BD({ name: '蒲公英',     plant: 3, color: 0xe0d040, creative: true }),
  [BK.POPPY]:           BD({ name: '虞美人',     plant: 4, color: 0xcc2020, creative: true }),
  [BK.TALL_GRASS]:      BD({ name: '草',         plant: 5, color: 0x5a8a3a, creative: true }),
  [BK.FERN]:            BD({ name: '蕨',         plant: 6, color: 0x4a7a2a, creative: true }),
  [BK.BROWN_MUSHROOM]:  BD({ name: '棕色蘑菇',   plant: 7, color: 0x8a6a50, creative: true }),
  [BK.RED_MUSHROOM]:    BD({ name: '红色蘑菇',   plant: 8, color: 0xcc4040, creative: true }),
  [BK.DEAD_BUSH]:       BD({ name: '枯死灌木',   plant: 9, color: 0x7a6a4a, creative: true }),
};
function isPlant(id) { const d = BLOCKS[id]; return d && d.plant !== undefined; }
function isSolid(id) { const d = BLOCKS[id]; return d && d.solid === true; }
const HOTBAR = [BK.GRASS, BK.DIRT, BK.STONE, BK.SAND, BK.PLANKS, BK.COBBLE, BK.BRICK, BK.GLASS, BK.LOG];
const FACES = [
  { dir:[0,1,0], n:[0,1,0], v:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]], uv:[[0,0],[1,0],[1,1],[0,1]] },
  { dir:[0,-1,0], n:[0,-1,0], v:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]], uv:[[0,0],[1,0],[1,1],[0,1]] },
  { dir:[1,0,0], n:[1,0,0], v:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]], uv:[[0,0],[0,1],[1,1],[1,0]] },
  { dir:[-1,0,0], n:[-1,0,0], v:[[0,0,1],[0,1,1],[0,1,0],[0,0,0]], uv:[[0,0],[0,1],[1,1],[1,0]] },
  { dir:[0,0,1], n:[0,0,1], v:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]], uv:[[0,0],[1,0],[1,1],[0,1]] },
  { dir:[0,0,-1], n:[0,0,-1], v:[[1,0,0],[0,0,0],[0,1,0],[1,1,0]], uv:[[0,0],[1,0],[1,1],[0,1]] },
];
const FACE_BRIGHTNESS = { '0,1,0':1.0,'0,-1,0':0.52,'1,0,0':0.82,'-1,0,0':0.82,'0,0,1':0.82,'0,0,-1':0.82 };
/* ===== 噪声 ===== */
const NOISE_OFF=1031;
function hash2(x,z){let h=(Math.imul(x+NOISE_OFF,374761393)+Math.imul(z+NOISE_OFF,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296;}
function hash3(x,y,z){let h=(Math.imul(x+NOISE_OFF,374761393)+Math.imul(y+NOISE_OFF,668265263)+Math.imul(z+NOISE_OFF,1274126177))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296;}
const smooth=t=>t*t*(3-2*t);
function valueNoise(x,z){const xi=Math.floor(x),zi=Math.floor(z);const xf=smooth(x-xi),zf=smooth(z-zi);const a=hash2(xi,zi),b=hash2(xi+1,zi),c=hash2(xi,zi+1),d=hash2(xi+1,zi+1);return a+(b-a)*xf+(c-a)*zf+(a-b-c+d)*xf*zf;}
function fbm(x,z,oct=4){let v=0,amp=0.5,f=1;for(let i=0;i<oct;i++){v+=valueNoise(x*f,z*f)*amp;amp*=0.5;f*=2;}return Math.min(1,Math.max(0,v*1.15));}
function valueNoise3(x,y,z){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z);const xf=smooth(x-xi),yf=smooth(y-yi),zf=smooth(z-zi);const c000=hash3(xi,yi,zi),c100=hash3(xi+1,yi,zi),c010=hash3(xi,yi+1,zi),c110=hash3(xi+1,yi+1,zi),c001=hash3(xi,yi,zi+1),c101=hash3(xi+1,yi,zi+1),c011=hash3(xi,yi+1,zi+1),c111=hash3(xi+1,yi+1,zi+1);const l=(a,b,t)=>a+(b-a)*t;return l(l(l(c000,c100,xf),l(c010,c110,xf),yf),l(l(c001,c101,xf),l(c011,c111,xf),yf),zf);}
function biomeTemp(x,z){const bx=Math.floor(x/32),bz=Math.floor(z/32);return hash2(bx*31,bz*37);}
function biomeHumid(x,z){const bx=Math.floor(x/24),bz=Math.floor(z/24);return hash2(bx*13,bz*17);}
/* ===== 区块系统 ===== */
const chunks=new Map();
const MAX_WORLD_RADIUS=32;
const edits=new Map();
function ck(cx,cz){return `${cx},${cz}`;}
function inWorld(x,y,z){return y>=0&&y<HEIGHT&&Math.abs(x)<MAX_WORLD_RADIUS*CHUNK&&Math.abs(z)<MAX_WORLD_RADIUS*CHUNK;}
function worldGet(x,y,z){if(y<0||y>=HEIGHT||Math.abs(x)>=MAX_WORLD_RADIUS*CHUNK||Math.abs(z)>=MAX_WORLD_RADIUS*CHUNK)return BK.AIR;const c=chunks.get(ck(x>>4,z>>4));if(!c)return BK.AIR;return c.data[y*CHUNK*CHUNK+(z&15)*CHUNK+(x&15)];}
function solidAt(x,y,z){const b=worldGet(x,y,z);const d=BLOCKS[b];return!!d&&d.solid===true;}
function writeBlock(x,y,z,id){if(!inWorld(x,y,z))return;const c=chunks.get(ck(x>>4,z>>4));if(!c)return;c.data[y*CHUNK*CHUNK+(z&15)*CHUNK+(x&15)]=id;}
function heightAt(x,z){let h=14+fbm(x*0.011,z*0.011)*30;h+=(valueNoise(x*0.05+100,z*0.05+100)-0.5)*6;return Math.max(2,Math.min(HEIGHT-3,Math.floor(h)));}
/* ===== 区块生成 ===== */
function generateChunkData(cx,cz){
  const data=new Uint8Array(CHUNK*CHUNK*HEIGHT);const ox=cx*CHUNK,oz=cz*CHUNK;
  const heights=new Int16Array(CHUNK*CHUNK);
  for(let lz=0;lz<CHUNK;lz++){const wz=oz+lz;for(let lx=0;lx<CHUNK;lx++)heights[lz*CHUNK+lx]=heightAt(ox+lx,wz);}
  for(let lz=0;lz<CHUNK;lz++){const wz=oz+lz;
    for(let lx=0;lx<CHUNK;lx++){const wx=ox+lx;const h=heights[lz*CHUNK+lx];const temp=biomeTemp(wx,wz);const humid=biomeHumid(wx,wz);
      const cold=temp<0.33,hot=temp>0.66,wet=humid>0.66,nearBeach=h<=13,snowy=h>=38;
      for(let y=0;y<=h;y++){let id=BK.STONE;if(y===0)id=BK.BEDROCK;else if(y===h){if(nearBeach)id=BK.SAND;else if(snowy)id=BK.SNOW;else if(hot&&wet)id=BK.RED_SAND;else if(cold&&wet)id=BK.PODZOL;else if(cold)id=BK.SNOW;else id=BK.GRASS;}else if(y>=h-2)id=BK.DIRT;else id=BK.STONE;
        if(y>2&&y<h-2&&valueNoise3(wx*0.085,y*0.14,wz*0.085)>0.76)id=BK.AIR;
        if(id===BK.STONE&&y>3&&y<h-1){const r=hash3(wx,y,wz);if(r<0.04)id=BK.GRANITE;else if(r<0.08)id=BK.DIORITE;else if(r<0.12)id=BK.ANDESITE;}
        if((id===BK.STONE||id===BK.GRANITE||id===BK.DIORITE||id===BK.ANDESITE)){const r=hash3(wx*7,y*13,wz*11);if(y<15&&r<0.008)id=BK.DIAMOND_ORE;else if(y<32&&r<0.015)id=BK.GOLD_ORE;else if(y<48&&r<0.025)id=BK.IRON_ORE;else if(y<48&&r<0.030)id=BK.COAL_ORE;else if(y<25&&r<0.012)id=BK.LAPIS_ORE;else if(y<18&&r<0.008)id=BK.EMERALD_ORE;else if(y<48&&r<0.022)id=BK.REDSTONE_ORE;}
        if(y===h&&id===BK.SAND&&nearBeach&&hash3(wx,0,wz)<0.15)id=BK.CLAY;
        if(id!==BK.AIR)data[y*CHUNK*CHUNK+lz*CHUNK+lx]=id;
      }
      // 地表植物
      if(h+1<HEIGHT&&h>2){const topId=data[h*CHUNK*CHUNK+lz*CHUNK+lx];
        if(topId===BK.GRASS){const r=hash3(wx,h+1,wz);if(r<0.020)treeGen(data,wx,h,wz,cx,cz,temp,humid);else if(r<0.055){const fr=hash3(wx,h+2,wz);data[(h+1)*CHUNK*CHUNK+lz*CHUNK+lx]=fr<0.25?BK.DANDELION:fr<0.45?BK.POPPY:fr<0.70?BK.TALL_GRASS:BK.FERN;}}
        else if(topId===BK.PODZOL&&hash3(wx,h+1,wz)<0.10)data[(h+1)*CHUNK*CHUNK+lz*CHUNK+lx]=BK.FERN;
        else if(topId===BK.SNOW&&h>10&&hash3(wx,h+1,wz)<0.04)data[(h+1)*CHUNK*CHUNK+lz*CHUNK+lx]=BK.DEAD_BUSH;
      }
    }
  }
  return data;
}
function treeGen(data,wx,baseY,wz,cx,cz,temp,humid){
  const lx=wx-cx*CHUNK,lz=wz-cz*CHUNK;if(lx<2||lx>13||lz<2||lz>13)return;
  const isBirch=temp>0.5&&hash3(wx,7,wz)<0.3;const isSpruce=temp<0.35;
  let logId=BK.LOG,leafId=BK.LEAVES;if(isBirch)logId=BK.BIRCH_LOG;else if(isSpruce)logId=BK.SPRUCE_LOG;
  const trunkH=4+Math.floor(hash3(wx,7,wz)*2);const idx=(y,lx,lz)=>y*CHUNK*CHUNK+lz*CHUNK+lx;
  for(let i=1;i<=trunkH;i++){const y=baseY+i;if(y<HEIGHT)data[idx(y,lx,lz)]=logId;}
  const top=baseY+trunkH;
  for(let dy=0;dy<=2;dy++){const r=dy>=2?1:2;for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){if(dx===0&&dz===0&&dy<2)continue;if(Math.abs(dx)===r&&Math.abs(dz)===r&&hash3(wx+dx*31,top+dy*17,wz+dz*7)<0.55)continue;const tx=lx+dx,tz=lz+dz;if(tx<0||tx>=CHUNK||tz<0||tz>=CHUNK)continue;const y=top+dy;if(y<HEIGHT&&data[idx(y,tx,tz)]===0)data[idx(y,tx,tz)]=leafId;}}
}
/* ===== 加载 / 卸载 ===== */
let meshQueueSet=new Set(),meshQueue=[];
function loadChunk(cx,cz){
  const key=ck(cx,cz);if(chunks.has(key))return;if(Math.abs(cx)>MAX_WORLD_RADIUS||Math.abs(cz)>MAX_WORLD_RADIUS)return;
  const data=generateChunkData(cx,cz);const ox=cx*CHUNK,oz=cz*CHUNK;
  for(const[ek,id]of edits){const[ex,ey,ez]=ek.split(',').map(Number);if((ex>>4)===cx&&(ez>>4)===cz)data[ey*CHUNK*CHUNK+(ez&15)*CHUNK+(ex&15)]=id||0;}
  chunks.set(key,{data,solidMesh:null,plantMesh:null,glowMesh:null});
  if(!meshQueueSet.has(key)){meshQueueSet.add(key);meshQueue.push([cx,cz]);}
}
function unloadChunk(cx,cz){
  const key=ck(cx,cz);const c=chunks.get(key);if(!c)return;
  if(c.solidMesh){scene.remove(c.solidMesh);c.solidMesh.geometry.dispose();c.solidMesh=null;}
  if(c.plantMesh){scene.remove(c.plantMesh);c.plantMesh.geometry.dispose();c.plantMesh=null;}
  if(c.glowMesh){scene.remove(c.glowMesh);c.glowMesh.geometry.dispose();c.glowMesh=null;}
  chunks.delete(key);
}
function updateChunks(){
  const pcx=Math.floor(player.x/CHUNK),pcz=Math.floor(player.z/CHUNK);const radius=RENDER_DIST;
  const wanted=new Set();
  for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){if(dx*dx+dz*dz>radius*radius)continue;wanted.add(ck(pcx+dx,pcz+dz));}
  const toUnload=[];for(const key of chunks.keys()){if(!wanted.has(key)){const[cx,cz]=key.split(',').map(Number);toUnload.push([cx,cz]);if(toUnload.length>=MAX_CHUNK_UNLOAD_PER_FRAME)break;}}
  for(const[cx,cz]of toUnload)unloadChunk(cx,cz);
  const toLoad=[];for(const key of wanted){if(!chunks.has(key)){const[cx,cz]=key.split(',').map(Number);toLoad.push([cx,cz]);}}
  toLoad.sort((a,b)=>(a[0]-pcx)**2+(a[1]-pcz)**2-(b[0]-pcx)**2-(b[1]-pcz)**2);
  let loaded=0;for(const[cx,cz]of toLoad){if(loaded>=MAX_CHUNK_LOAD_PER_FRAME)break;loadChunk(cx,cz);loaded++;}
}
/* ===== 纹理 / 渲染 ===== */
let renderer,scene,camera,atlasTex,solidMaterial,plantMaterial,glowMaterial,plantAtlasTex;
const pUv=[];
function makeAtlas(){
  const T=TILE_SZ,N=ATLAS_COLS,M=ATLAS_ROWS;const cv=document.createElement('canvas');cv.width=T*N;cv.height=T*M;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
  const px=(x,y,c)=>{g.fillStyle=c;g.fillRect(x,y,1,1);};const n=(x,y,s)=>Math.floor(hash2(x*s,y*s)*256);
  const nt=(r1,g1,b1,r2,g2,b2,th,seed)=>(g)=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++){const h=hash2(x*7+seed,y*13+seed*3);const r=h<th?r1+Math.floor(h*20):r2+Math.floor(h*20);const g2c=h<th?g1+Math.floor(h*20):g2+Math.floor(h*20);const b=h<th?b1+Math.floor(h*20):b2+Math.floor(h*20);px(x,y,`rgb(${Math.min(255,r)},${Math.min(255,g2c)},${Math.min(255,b)})`);}};
  const dr=(c,r,fn)=>{g.save();g.translate(c*T,r*T);fn(g);g.restore();};
  dr(0,0,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++)px(x,y,hash2(x,y)<0.4?'#6aa53b':'#7cb342');});
  dr(1,0,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++)px(x,y,y<4?(hash2(x,y)<0.5?'#7cb342':'#8cc152'):(hash2(x*3,y*3)<0.5?'#8b5a2b':'#7d4f25'));});
  dr(2,0,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++)px(x,y,hash2(x*3,y*3)<0.5?'#8b5a2b':'#7d4f25');});
  dr(3,0,nt(0x8c,0x8c,0x8c,0x8c,0x8c,0x8c,0.5,1));
  dr(4,0,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++){const v=0xd4+n(x,y,4);px(x,y,`rgb(${v},${v-20},${v-50})`);}});
  dr(5,0,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++)px(x,y,(y%2===0?'#6b4a2a':'#5e3f23'));});
  dr(6,0,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++){const d=Math.hypot(x-7.5,y-7.5);px(x,y,d<6.2?'#a97b4f':'#5e3f23');}});
  dr(7,0,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++){const h=hash2(x*9,y*9);px(x,y,h<0.55?'#4c9a3e':h<0.8?'#3f8534':'#5aad4a');}});
  dr(0,1,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++)px(x,y,(y%8===0||y%8===7)?'#8a6740':(hash2(x*3,y)<0.5?'#b48a4f':'#a87f47'));});
  dr(1,1,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++){const blob=hash2(Math.floor(x/3)*7,Math.floor(y/3)*5);const v=0x66+blob*60;px(x,y,`rgb(${v},${v},${Math.min(255,v+4)})`);}});
  dr(2,1,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++){const row=y>>2;const off=(row&1)*4;px(x,y,(y%4===3||(x+off)%8===7)?'#b0a290':'#a55a55');}});
  dr(3,1,g=>{g.fillStyle='rgba(176,219,240,0.95)';g.fillRect(0,0,T,T);g.fillStyle='#e8f6ff';g.fillRect(0,0,T,1);g.fillRect(0,0,1,T);g.fillRect(0,T-1,T,1);g.fillRect(T-1,0,1,T);g.fillRect(7,7,2,2);});
  dr(4,1,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++){const v=0xf2+n(x,y,6);px(x,y,`rgb(${v},${v},${v})`);}});
  dr(5,1,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++){const v=0x66+n(x,y,6);px(x,y,`rgb(${v},${v-8},${v-12})`);}});
  dr(6,1,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++){const v=0x24+n(x,y,8);px(x,y,`rgb(${v},${v},${v})`);}});
  dr(7,1,nt(0xd4,0xb0,0x88,0xc4,0xa0,0x78,0.5,10));
  dr(0,2,nt(0xc8,0xc8,0xc8,0xb8,0xb8,0xb8,0.5,11));
  dr(1,2,nt(0x8a,0x8a,0x7a,0x7a,0x7a,0x6a,0.5,12));
  dr(2,2,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++){const h=hash2(x*7,y*7);px(x,y,h<0.4?'#a09080':h<0.7?'#9a8a7a':'#8a7a6a');}});
  dr(3,2,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++)px(x,y,y<3?(hash2(x,y)<0.5?'#a09080':'#9a8a7a'):(hash2(x*3,y*3)<0.5?'#8b5a2b':'#7d4f25'));});
  // #6b5a3a → #9a8a6a, #5a4a2a → #8a7a5a (调亮)
  dr(4,2,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++){const h=hash2(x*5,y*5);px(x,y,h<0.5?'#9a8a6a':'#8a7a5a');}});
  dr(5,2,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++)px(x,y,y<3?(hash2(x,y)<0.5?'#9a8a6a':'#8a7a5a'):'#8b5a2b');});
  dr(6,2,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++){const v=0xc4+n(x,y,5);px(x,y,`rgb(${v},${v-60},${v-80})`);}});
  dr(7,2,nt(0x9a,0x9a,0x9a,0x9a,0x9a,0x9a,0.5,13));
  dr(0,3,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++){const v=0xb0+n(x,y,4);px(x,y,`rgb(${v},${v+20},${v+40})`);}});
  dr(1,3,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++){const v=0xc0+n(x,y,3);px(x,y,`rgb(${v},${v+20},${v+40})`);}});
  dr(2,3,nt(0x2a,0x2a,0x2a,0x9a,0x9a,0x9a,0.30,14)); // 煤（降低斑点比例）
  dr(3,3,nt(0xd4,0xb4,0x8a,0x9a,0x9a,0x9a,0.25,15)); // 铁
  dr(4,3,nt(0xe8,0xc8,0x30,0x9a,0x9a,0x9a,0.22,16)); // 金
  dr(5,3,nt(0x2a,0x4a,0x9a,0x9a,0x9a,0x9a,0.25,17)); // 青金石
  dr(6,3,nt(0x9a,0x20,0x20,0x9a,0x9a,0x9a,0.25,18)); // 红石
  dr(7,3,nt(0x50,0xd0,0xd0,0x9a,0x9a,0x9a,0.22,19)); // 钻石
  dr(0,4,nt(0x30,0xc0,0x50,0x9a,0x9a,0x9a,0.22,20)); // 绿宝石
  dr(1,4,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++)px(x,y,(y%2===0?'#4a3520':'#3a2818'));});
  dr(2,4,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++){const d=Math.hypot(x-7.5,y-7.5);px(x,y,d<6.2?'#7a5a3a':'#3a2818');}});
  dr(3,4,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++)px(x,y,(y%2===0?'#c0b090':'#b0a080'));});
  dr(4,4,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++){const d=Math.hypot(x-7.5,y-7.5);px(x,y,d<6.2?'#e0d0b0':'#b0a080');}});
  dr(5,4,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++)px(x,y,(y%2===0?'#6a5030':'#5a4020'));});
  dr(6,4,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++){const d=Math.hypot(x-7.5,y-7.5);px(x,y,d<6.2?'#8a6a40':'#5a4020');}});
  dr(7,4,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++)px(x,y,(y%2===0?'#8a6040':'#7a5030'));});
  dr(0,5,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++){const d=Math.hypot(x-7.5,y-7.5);px(x,y,d<6.2?'#9a7a50':'#7a5030');}});
  dr(1,5,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++)px(x,y,(y%2===0?'#2a1a10':'#1a0e08'));});
  dr(2,5,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++){const d=Math.hypot(x-7.5,y-7.5);px(x,y,d<6.2?'#4a2a18':'#1a0e08');}});
  dr(3,5,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++)px(x,y,(y%8===0||y%8===7)?'#6a5030':(hash2(x*3,y)<0.5?'#8a6a40':'#7a5a3a'));});
  dr(4,5,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++)px(x,y,(y%8===0||y%8===7)?'#b0a080':(hash2(x*3,y)<0.5?'#d0c0a8':'#c0b098'));});
  dr(5,5,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++)px(x,y,(y%8===0||y%8===7)?'#7a5a3a':(hash2(x*3,y)<0.5?'#9a7a50':'#8a6a40'));});
  dr(6,5,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++)px(x,y,(y%8===0||y%8===7)?'#8a6a40':(hash2(x*3,y)<0.5?'#b08050':'#a07040'));});
  dr(7,5,g=>{for(let y=0;y<T;y++)for(let x=0;x<T;x++)px(x,y,(y%8===0||y%8===7)?'#2a1a10':(hash2(x*3,y)<0.5?'#3a2a1a':'#2a1a0e'));});
  const tex=new THREE.CanvasTexture(cv);tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;tex.generateMipmaps=false;tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;return tex;
}
function makePlantAtlas(){
  const T=16,count=10;const cv=document.createElement('canvas');cv.width=T*count;cv.height=T;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;const px=(x,y,c)=>{g.fillStyle=c;g.fillRect(x,y,1,1);};
  const mp=(leafC,stemC,shape)=>{const pix=new Array(T*T).fill(null);for(let y=0;y<T;y++)for(let x=0;x<T;x++){const s=shape(x,y);if(s){const h=hash2(x*13,y*7);if(s==='stem')pix[y*T+x]=stemC;else pix[y*T+x]=h<0.3?leafC[0]:h<0.6?leafC[1]:leafC[2];}}return pix;};
  const sp=(r,g,b)=>mp([`rgb(${r},${g},${b})`,`rgb(${r-20},${g+10},${b-10})`,`rgb(${r+10},${g-10},${b+10})`],'rgb(120,80,40)',(x,y)=>{const cx=x-7.5,cy=y-7.5;if(Math.abs(cx)<2&&cy>2&&cy<6)return'stem';if(Math.hypot(cx,cy-2)<3.5)return'leaf';return null;});
  const dr=(idx,pix)=>{g.save();g.translate(idx*T,0);for(let y=0;y<T;y++)for(let x=0;x<T;x++){const c=pix[y*T+x];if(c)px(x,y,c);}g.restore();};
  dr(0,sp(80,160,60));dr(1,sp(60,120,40));dr(2,sp(100,180,70));
  dr(3,mp(['rgb(220,200,60)','rgb(240,220,80)','rgb(200,180,40)'],'rgb(60,120,40)',(x,y)=>{const cx=x-7.5,cy=y-7.5;if(Math.abs(cx)<1.5&&cy>1&&cy<5)return'stem';if(cy>4&&cy<9&&Math.abs(cx)<4)return'leaf';return null;}));
  dr(4,mp(['rgb(200,30,30)','rgb(220,50,50)','rgb(180,20,20)'],'rgb(50,110,30)',(x,y)=>{const cx=x-7.5,cy=y-7.5;if(Math.abs(cx)<1.5&&cy>1&&cy<5)return'stem';if(cy>3&&cy<8&&Math.abs(cx)<4)return'leaf';return null;}));
  dr(5,mp(['rgb(100,180,60)','rgb(80,160,40)','rgb(120,200,80)'],'rgb(60,140,30)',(x,y)=>{const cx=x-7.5;if(y>5&&y<14&&Math.abs(cx)<2.5+Math.sin(y)*1.5)return'leaf';return null;}));
  dr(6,mp(['rgb(80,150,40)','rgb(60,130,30)','rgb(100,170,50)'],'rgb(50,120,20)',(x,y)=>{const cx=x-7.5;if(y>4&&y<13&&Math.abs(cx)<1.5+Math.sin(y*0.7)*2)return'leaf';return null;}));
  dr(7,mp(['rgb(160,140,110)','rgb(140,120,90)','rgb(180,160,130)'],'rgb(200,180,150)',(x,y)=>{const cx=x-7.5,cy=y-7.5;if(Math.abs(cx)<1.5&&cy>2&&cy<5)return'stem';if(cy>4&&cy<8&&Math.hypot(cx,0)<4)return'leaf';return null;}));
  dr(8,mp(['rgb(200,60,60)','rgb(180,40,40)','rgb(220,80,80)'],'rgb(200,180,150)',(x,y)=>{const cx=x-7.5,cy=y-7.5;if(Math.abs(cx)<1.5&&cy>2&&cy<5)return'stem';if(cy>4&&cy<8&&Math.hypot(cx,0)<4)return'leaf';return null;}));
  dr(9,mp(['rgb(130,110,80)','rgb(110,90,60)','rgb(150,130,100)'],'rgb(100,80,50)',(x,y)=>{const cx=x-7.5,cy=y-7.5;if(Math.abs(cx)<2&&cy>4&&cy<10)return'leaf';return null;}));
  const tex=new THREE.CanvasTexture(cv);tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;tex.generateMipmaps=false;tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
function faceVisible(b,nb){if(nb===BK.AIR)return true;if(isPlant(nb))return true;if(b===BK.GLASS)return nb!==BK.GLASS;if(b===BK.LEAVES)return true;return false;}
function buildChunkMeshes(cx,cz){
  const c=chunks.get(ck(cx,cz));if(!c)return;
  if(c.solidMesh){scene.remove(c.solidMesh);c.solidMesh.geometry.dispose();c.solidMesh=null;}
  if(c.plantMesh){scene.remove(c.plantMesh);c.plantMesh.geometry.dispose();c.plantMesh=null;}
  if(c.glowMesh){scene.remove(c.glowMesh);c.glowMesh.geometry.dispose();c.glowMesh=null;}
  const data=c.data,ox=cx*CHUNK,oz=cz*CHUNK;
  const sPos=[],sNrm=[],sUv=[],sCol=[],sIdx=[];let pPos=[],pIdx=[],gPos=[],gCol=[],gIdx=[];
  for(let y=0;y<HEIGHT;y++)for(let z=0;z<CHUNK;z++){const wz=oz+z;for(let x=0;x<CHUNK;x++){const wx=ox+x;const b=data[y*CHUNK*CHUNK+z*CHUNK+x];if(!b||b===BK.AIR)continue;const def=BLOCKS[b];
    if(isPlant(b)){const pIdx2=def.plant;if(pIdx2===undefined)continue;const u0=pIdx2*0.1;const base=pPos.length/3;const S=0.65,O=(1-S)/2,LO=O,H1=1-O,baseY=y+0.08;
      pPos.push(LO+x,baseY,H1+z,H1+x,baseY,LO+z,H1+x,baseY+S,LO+z,LO+x,baseY+S,H1+z);pUv.push(u0,0,u0+0.1,0,u0+0.1,1,u0,1);pIdx.push(base,base+1,base+2,base,base+2,base+3);
      pPos.push(LO+x,baseY,LO+z,H1+x,baseY,H1+z,H1+x,baseY+S,H1+z,LO+x,baseY+S,LO+z);pUv.push(u0,0,u0+0.1,0,u0+0.1,1,u0,1);pIdx.push(base+4,base+5,base+6,base+4,base+6,base+7);
      pPos.push(H1+x,baseY,LO+z,LO+x,baseY,LO+z,LO+x,baseY+S,LO+z,H1+x,baseY+S,H1+z);pUv.push(u0,0,u0+0.1,0,u0+0.1,1,u0,1);pIdx.push(base+8,base+9,base+10,base+8,base+10,base+11);
      pPos.push(H1+x,baseY,H1+z,LO+x,baseY,H1+z,LO+x,baseY+S,H1+z,H1+x,baseY+S,LO+z);pUv.push(u0,0,u0+0.1,0,u0+0.1,1,u0,1);pIdx.push(base+12,base+13,base+14,base+12,base+14,base+15);continue;}
    for(const face of FACES){const nb=worldGet(wx+face.dir[0],y+face.dir[1],wz+face.dir[2]);if(!faceVisible(b,nb))continue;
      const ny=face.n[1];const tile=ny===1?def.top:ny===-1?def.bottom:def.side;const col=tile%ATLAS_COLS,row=Math.floor(tile/ATLAS_COLS);
      const u0=col*(1/ATLAS_COLS)+UV_INSET,v0=1-(row+1)*(1/ATLAS_ROWS)+UV_INSET;const s=(1/ATLAS_COLS)-UV_INSET*2,t=(1/ATLAS_ROWS)-UV_INSET*2;const bright=FACE_BRIGHTNESS[face.n.join(',')]??0.8;const base=sPos.length/3;
      for(let k=0;k<4;k++){sPos.push(face.v[k][0]+x,face.v[k][1]+y,face.v[k][2]+z);sNrm.push(face.n[0],face.n[1],face.n[2]);sUv.push(u0+face.uv[k][0]*s,v0+face.uv[k][1]*t);sCol.push(bright,bright,bright);}
      sIdx.push(base,base+1,base+2,base,base+2,base+3);
      // 发光矿石：添加发光面片
      if(def.glow){const gb=gPos.length/3;const gc=def.glow;const gr=(gc>>16)&0xff,gg=(gc>>8)&0xff,gb2=gc&0xff;for(let k=0;k<4;k++){gPos.push(face.v[k][0]+x,face.v[k][1]+y,face.v[k][2]+z);gCol.push(gr/255,gg/255,gb2/255);}gIdx.push(gb,gb+1,gb+2,gb,gb+2,gb+3);}}}}
  if(sPos.length>0){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(sPos,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(sNrm,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(sUv,2));geo.setAttribute('color',new THREE.Float32BufferAttribute(sCol,3));geo.setIndex(sIdx);const mesh=new THREE.Mesh(geo,solidMaterial);mesh.position.set(ox,0,oz);scene.add(mesh);c.solidMesh=mesh;}
  if(pPos.length>0){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pPos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(pUv,2));geo.setIndex(pIdx);const mesh=new THREE.Mesh(geo,plantMaterial);mesh.position.set(ox,0,oz);mesh.renderOrder=1;scene.add(mesh);c.plantMesh=mesh;}
  if(gPos.length>0){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(gPos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(gCol,3));geo.setIndex(gIdx);const mesh=new THREE.Mesh(geo,glowMaterial);mesh.position.set(ox,0,oz);mesh.renderOrder=2;scene.add(mesh);c.glowMesh=mesh;}
}
function rebuildAround(x,y,z){const cx=x>>4,cz=z>>4;buildChunkMeshes(cx,cz);if((x&15)===0)buildChunkMeshes(cx-1,cz);if((x&15)===15)buildChunkMeshes(cx+1,cz);if((z&15)===0)buildChunkMeshes(cx,cz-1);if((z&15)===15)buildChunkMeshes(cx,cz+1);}
function setBlock(x,y,z,id,persist=true){if(!inWorld(x,y,z))return;const old=worldGet(x,y,z);if(old===id)return;writeBlock(x,y,z,id);if(persist){edits.set(`${x},${y},${z}`,id);scheduleSave();}rebuildAround(x,y,z);}
/* ===== 存储 ===== */
const SAVE_KEY='mcclone_world_v1',PLAYER_KEY='mcclone_player_v1';let saveTimer=null;
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,400);}
function saveNow(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({edits:[...edits.entries()]}));}catch(e){}}
function loadSave(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return;const data=JSON.parse(raw);if(data&&Array.isArray(data.edits))for(const[key,id]of data.edits)edits.set(String(key),Number(id));}catch(e){}}
function resetWorld(){try{localStorage.removeItem(SAVE_KEY);localStorage.removeItem(PLAYER_KEY);}catch(e){}location.reload();}
function loadPlayerPos(){try{const raw=localStorage.getItem(PLAYER_KEY);if(!raw)return null;const d=JSON.parse(raw);if(d&&typeof d.x==='number'&&inWorld(d.x,d.y,d.z))return d;}catch(e){}return null;}
function savePlayerPos(){try{localStorage.setItem(PLAYER_KEY,JSON.stringify({x:player.x,y:player.y,z:player.z,flying}));}catch(e){}}
let lastPlayerSave=0;const PLAYER_SAVE_INTERVAL=3000;
function maybeSavePlayer(now){if(now-lastPlayerSave>=PLAYER_SAVE_INTERVAL){lastPlayerSave=now;savePlayerPos();}}
/* ===== 天空/昼夜 ===== */
let dayTime=0.28,dayPaused=false;const DAY_LEN=300;
const skyDay=new THREE.Color(0.53,0.74,0.97),skyNight=new THREE.Color(0.03,0.04,0.09),skyDawn=new THREE.Color(0.98,0.55,0.32),lightDay=new THREE.Color(1.0,0.96,0.88),lightNight=new THREE.Color(0.35,0.42,0.65);
let sunLight,ambient,sunMesh,moonMesh,stars,clouds,cloudTex;const skyColor=new THREE.Color();
function buildSky(){
  sunLight=new THREE.DirectionalLight(0xffffff,0.9);scene.add(sunLight);ambient=new THREE.AmbientLight(0xffffff,0.55);scene.add(ambient);
  const orb=(color)=>{const cv=document.createElement('canvas');cv.width=cv.height=128;const g=cv.getContext('2d');const grad=g.createRadialGradient(64,64,4,64,64,64);grad.addColorStop(0,color);grad.addColorStop(0.55,color.replace('1)','0.55)'));grad.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=grad;g.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;};
  sunMesh=new THREE.Mesh(new THREE.BoxGeometry(20,20,20),new THREE.MeshBasicMaterial({color:0xfff4a0,fog:false}));
  moonMesh=new THREE.Mesh(new THREE.BoxGeometry(16,16,16),new THREE.MeshBasicMaterial({color:0xd0d8f0,fog:false}));
  scene.add(sunMesh,moonMesh);
  const starPos=[];for(let i=0;i<1400;i++){const a=Math.random()*Math.PI*2,e=Math.random()*Math.PI*0.48;starPos.push(Math.cos(a)*Math.cos(e)*480,Math.sin(e)*480,Math.sin(a)*Math.cos(e)*480);}
  const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPos,3));
  stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xffffff,size:1.6,transparent:true,opacity:0,fog:false,depthWrite:false}));scene.add(stars);
  cloudTex=makeCloudTexture();
  clouds=new THREE.Mesh(new THREE.PlaneGeometry(1200,420),new THREE.MeshBasicMaterial({map:cloudTex,transparent:true,opacity:0.62,depthWrite:false,fog:false}));
  clouds.rotation.x=-Math.PI/2;clouds.position.y=72;scene.add(clouds);
}
function makeCloudTexture(){const W=512,H=128;const cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d');g.clearRect(0,0,W,H);g.fillStyle='rgba(255,255,255,0.92)';for(let i=0;i<26;i++){const x=hash2(i*3,11)*W,y=12+hash2(i*7,29)*(H-30),w=26+hash2(i*13,47)*70;g.beginPath();g.ellipse(x,y,w/2,10+hash2(i*5,61)*12,0,0,Math.PI*2);g.fill();}const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,1);t.colorSpace=THREE.SRGBColorSpace;return t;}
const clamp01=(v)=>Math.max(0,Math.min(1,v));
function updateSky(dt){if(!dayPaused)dayTime=(dayTime+dt/DAY_LEN)%1;const ang=dayTime*Math.PI*2,elev=Math.sin(ang);const sunAmt=clamp01(elev*1.6+0.12),nightAmt=1-sunAmt,duskAmt=clamp01(1-Math.abs(elev)*5)*0.85;
  skyColor.copy(skyNight).lerp(skyDay,sunAmt);skyColor.lerp(skyDawn,duskAmt*(1-sunAmt));
  const sunPos=new THREE.Vector3(Math.cos(ang),Math.sin(ang),0.32).multiplyScalar(430),moonPos=new THREE.Vector3(-Math.cos(ang),-Math.sin(ang),-0.32).multiplyScalar(430);
  sunMesh.position.copy(sunPos).add(camera.position);moonMesh.position.copy(moonPos).add(camera.position);sunMesh.visible=elev>-0.15;moonMesh.visible=elev<0.15;
  sunLight.position.copy(sunPos).multiplyScalar(0.35);sunLight.color.copy(lightDay).lerp(lightNight,nightAmt*0.45);sunLight.intensity=0.12+sunAmt*0.95;ambient.intensity=0.16+sunAmt*0.42+nightAmt*0.05;
  stars.material.opacity=nightAmt*0.95;cloudTex.offset.x+=dt*0.0035;scene.background=skyColor;scene.fog.color.copy(skyColor);stars.position.copy(camera.position);}
/* ===== 粒子 ===== */
const MAX_PARTICLES=90;let particles;const pObj=[];
function buildParticles(){
  particles=new THREE.InstancedMesh(new THREE.BoxGeometry(0.11,0.11,0.11),new THREE.MeshBasicMaterial({color:0xffffff}),MAX_PARTICLES);
  particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(particles);
  const dummy=new THREE.Object3D();dummy.position.set(0,-100,0);dummy.scale.setScalar(0.01);dummy.updateMatrix();
  for(let i=0;i<MAX_PARTICLES;i++){pObj.push({alive:false,ttl:0,age:0,color:new THREE.Color(),pos:new THREE.Vector3(0,-100,0),v:new THREE.Vector3()});particles.setMatrixAt(i,dummy.matrix);}
  particles.instanceMatrix.needsUpdate=true;
}
let pCursor=0;
function spawnParticles(x,y,z,color,count=14){const dummy=new THREE.Object3D();for(let i=0;i<count;i++){const idx=pCursor++%MAX_PARTICLES;const p=pObj[idx];if(!p)return;p.alive=true;p.ttl=0.45+Math.random()*0.35;p.age=0;p.color.setHex(color);p.pos.set(x+(Math.random()-0.5)*0.5,y+(Math.random()-0.5)*0.5,z+(Math.random()-0.5)*0.5);p.v.set((Math.random()-0.5)*4,Math.random()*5+1,(Math.random()-0.5)*4);particles.setColorAt(idx,p.color);}if(particles.instanceColor)particles.instanceColor.needsUpdate=true;}
function updateParticles(dt){const dummy=new THREE.Object3D();let alive=0;pObj.forEach((p,i)=>{if(!p.alive)return;p.age+=dt;if(p.age>p.ttl){p.alive=false;dummy.position.set(0,-100,0);dummy.scale.setScalar(0.01);}else{alive++;p.v.y-=22*dt;p.pos.addScaledVector(p.v,dt);dummy.position.copy(p.pos);const s=1-p.age/p.ttl;dummy.scale.setScalar(0.5+s*0.5);}dummy.updateMatrix();particles.setMatrixAt(i,dummy.matrix);});particles.count=alive;particles.instanceMatrix.needsUpdate=true;if(particles.instanceColor)particles.instanceColor.needsUpdate=true;}
/* ===== 音效 ===== */
let actx=null;
function ensureAudio(){if(!actx)actx=new(window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume();}
function noiseBurst(dur,freq,gain,type='bandpass'){if(!actx)return;const n=Math.floor(actx.sampleRate*dur);const buf=actx.createBuffer(1,n,actx.sampleRate);const d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;const src=actx.createBufferSource();src.buffer=buf;const f=actx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=0.8;const g=actx.createGain();g.gain.setValueAtTime(gain,actx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,actx.currentTime+dur);src.connect(f).connect(g).connect(actx.destination);src.start();}
function tone(f0,f1,dur,gain,type='square'){if(!actx)return;const o=actx.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,actx.currentTime);o.frequency.exponentialRampToValueAtTime(f1,actx.currentTime+dur);const g=actx.createGain();g.gain.setValueAtTime(gain,actx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,actx.currentTime+dur);o.connect(g).connect(actx.destination);o.start();o.stop(actx.currentTime+dur+0.02);}
const sfx={dig(){noiseBurst(0.13,300+Math.random()*260,0.30);},place(){noiseBurst(0.06,1400,0.10);tone(240,160,0.07,0.12);},step(){noiseBurst(0.05,260,0.045,'lowpass');},pop(){tone(620,880,0.08,0.10,'triangle');},fly(){tone(300,520,0.12,0.09,'sine');},click(){tone(400,500,0.04,0.06,'sine');}};
/* ===== 玩家 / 输入 ===== */
const keys=new Set();let yaw=0,pitch=0,locked=false,selected=0,flying=false,lastSpace=0;
const mouseDown={left:false,right:false};let lastBreak=0,lastPlace=0,stepAcc=0;
const player={x:0,y:0,z:0,w:0.3,h:1.8,eye:1.62,vx:0,vy:0,vz:0,onGround:false};
function spawnPlayer(){
  const cx=0,cz=0;let found=false;
  const saved=loadPlayerPos();
  if(saved){const feet=saved.y+0.001;if(solidAt(Math.floor(saved.x),Math.floor(feet)-1,Math.floor(saved.z))&&!solidAt(Math.floor(saved.x),Math.floor(feet),Math.floor(saved.z))&&!solidAt(Math.floor(saved.x),Math.floor(feet)+1,Math.floor(saved.z))&&!solidAt(Math.floor(saved.x),Math.floor(feet)+2,Math.floor(saved.z))){player.x=saved.x;player.y=feet;player.z=saved.z;flying=!!saved.flying;found=true;}}
  for(let r=0;r<12&&!found;r++)for(let dz=-r;dz<=r&&!found;dz++)for(let dx=-r;dx<=r&&!found;dx++){const x=cx+dx,z=cz+dz;if(Math.abs(x)>=MAX_WORLD_RADIUS*CHUNK||Math.abs(z)>=MAX_WORLD_RADIUS*CHUNK)continue;let y=HEIGHT-1;while(y>0&&!solidAt(x,y-1,z))y--;if(y<=2)continue;let clear=true;for(let dy=1;dy<=6;dy++)if(solidAt(x,y+dy,z)){clear=false;break;}if(clear){player.x=x+0.5;player.z=z+0.5;player.y=y+1.2;found=true;}}
  if(!found){player.x=0.5;player.y=35;player.z=0.5;}
  player.vx=player.vy=player.vz=0;player.onGround=false;
}
function collides(x,y,z){const x0=Math.floor(x-player.w),x1=Math.floor(x+player.w),y0=Math.floor(y),y1=Math.floor(y+player.h),z0=Math.floor(z-player.w),z1=Math.floor(z+player.w);for(let yy=y0;yy<=y1;yy++)for(let zz=z0;zz<=z1;zz++)for(let xx=x0;xx<=x1;xx++)if(solidAt(xx,yy,zz))return true;return false;}
function moveAxis(axis,amount){
  if(!amount)return;
  const sneak=keys.has('ShiftLeft')||keys.has('ShiftRight');
  if(axis==='x'){
    const np=player.x+amount;
    // 潜行时检测边缘：若下一步脚下的方块是空气则禁止移动
    if(sneak&&!flying&&player.onGround){const edgeX=amount>0?Math.floor(np+player.w+0.01):Math.floor(np-player.w-0.01);if(!solidAt(edgeX,Math.floor(player.y)-1,Math.floor(player.z))){player.vx=0;return;}}
    if(collides(np,player.y,player.z)){if(amount>0)player.x=Math.floor(np+player.w)-player.w-EPS;else player.x=Math.floor(np-player.w)+1+player.w+EPS;player.vx=0;}else player.x=np;
  }else if(axis==='z'){
    const np=player.z+amount;
    if(sneak&&!flying&&player.onGround){const edgeZ=amount>0?Math.floor(np+player.w+0.01):Math.floor(np-player.w-0.01);if(!solidAt(Math.floor(player.x),Math.floor(player.y)-1,edgeZ)){player.vz=0;return;}}
    if(collides(player.x,player.y,np)){if(amount>0)player.z=Math.floor(np+player.w)-player.w-EPS;else player.z=Math.floor(np-player.w)+1+player.w+EPS;player.vz=0;}else player.z=np;
  }else{
    const np=player.y+amount;
    if(collides(player.x,np,player.z)){if(amount>0){player.y=Math.floor(np+player.h)-player.h-EPS;player.vy=0;}else{player.y=Math.floor(np)+1+EPS;player.vy=0;player.onGround=true;}}else{player.y=np;if(amount<0)player.onGround=false;}
  }
}
const GRAVITY=26,JUMP=9.6,WALK=4.6;const lerp=(a,b,t)=>a+(b-a)*t;
function updatePlayer(dt){
  if(inventoryOpen)return;
  const f=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),s=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);const fl=Math.hypot(f,s)||1;const sin=Math.sin(yaw),cos=Math.cos(yaw);const dx=(-sin*f+cos*s)/fl,dz=(-cos*f-sin*s)/fl;
  const sprint=keys.has('ControlLeft')||keys.has('ControlRight'),sneak=keys.has('ShiftLeft')||keys.has('ShiftRight');const base=sprint?WALK*1.6:WALK*(sneak?0.4:1);const speed=flying?(sprint?17:9.5):base;
  const k=1-Math.exp(-11*dt);player.vx=lerp(player.vx,dx*speed,k);player.vz=lerp(player.vz,dz*speed,k);
  if(flying){const up=(keys.has('Space')?1:0)-(sneak?1:0);player.vy=lerp(player.vy,up*speed*0.85,k);}else{if(player.onGround&&keys.has('Space')){player.vy=JUMP;player.onGround=false;}player.vy-=GRAVITY*dt;if(player.vy<-44)player.vy=-44;}
  moveAxis('x',player.vx*dt);moveAxis('z',player.vz*dt);moveAxis('y',player.vy*dt);
  if(player.onGround&&Math.hypot(player.vx,player.vz)>2.5){stepAcc+=dt;if(stepAcc>0.42){stepAcc=0;sfx.step();}}
  if(player.y<-20)spawnPlayer();
  camera.position.set(player.x,player.y+player.eye-(sneak&&!flying?0.45:0),player.z);camera.rotation.order='YXZ';camera.rotation.y=yaw;camera.rotation.x=pitch;
}
/* ===== 射线 ===== */
let target=null;
function raycastVoxel(ox,oy,oz,dx,dy,dz,maxD){let x=Math.floor(ox),y=Math.floor(oy),z=Math.floor(oz);const stepX=dx>0?1:-1,stepY=dy>0?1:-1,stepZ=dz>0?1:-1;const invX=dx!==0?1/Math.abs(dx):Infinity,invY=dy!==0?1/Math.abs(dy):Infinity,invZ=dz!==0?1/Math.abs(dz):Infinity;let tMaxX=dx!==0?(dx>0?(x+1-ox):(ox-x))*invX:Infinity,tMaxY=dy!==0?(dy>0?(y+1-oy):(oy-y))*invY:Infinity,tMaxZ=dz!==0?(dz>0?(z+1-oz):(oz-z))*invZ:Infinity;const tDeltaX=invX,tDeltaY=invY,tDeltaZ=invZ;let nx=0,ny=0,nz=0,t=0;for(let i=0;i<512;i++){const b=worldGet(x,y,z);if(b!==BK.AIR)return{x,y,z,nx,ny,nz,dist:t};if(t>=maxD)return null;if(tMaxX<tMaxY){if(tMaxX<tMaxZ){x+=stepX;t=tMaxX;tMaxX+=tDeltaX;nx=-stepX;ny=0;nz=0;}else{z+=stepZ;t=tMaxZ;tMaxZ+=tDeltaZ;nx=0;ny=0;nz=-stepZ;}}else{if(tMaxY<tMaxZ){y+=stepY;t=tMaxY;tMaxY+=tDeltaY;nx=0;ny=-stepY;nz=0;}else{z+=stepZ;t=tMaxZ;tMaxZ+=tDeltaZ;nx=0;ny=0;nz=-stepZ;}}}return null;}
function updateTarget(){const dir=new THREE.Vector3();camera.getWorldDirection(dir);target=raycastVoxel(camera.position.x,camera.position.y,camera.position.z,dir.x,dir.y,dir.z,REACH);}
const highlight=(()=>{const box=new THREE.BoxGeometry(1.004,1.004,1.004);const edges=new THREE.LineSegments(new THREE.EdgesGeometry(box),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.85}));edges.visible=false;return edges;})();
const ghost=(()=>{const box=new THREE.BoxGeometry(1.004,1.004,1.004);const edges=new THREE.LineSegments(new THREE.EdgesGeometry(box),new THREE.LineBasicMaterial({color:0x66ff66,transparent:true,opacity:0.45}));edges.visible=false;return edges;})();
function canPlaceAt(px,py,pz){if(!inWorld(px,py,pz)||worldGet(px,py,pz)!==BK.AIR)return false;return!(px+1>player.x-player.w&&px<player.x+player.w+1&&py+1>player.y&&py<player.y+player.h&&pz+1>player.z-player.w&&pz<player.z+player.w+1);}
function interact(now){
  updateTarget();
  if(target&&target.dist<=REACH){highlight.visible=true;highlight.position.set(target.x+0.5,target.y+0.5,target.z+0.5);if(!highlight.parent)scene.add(highlight);}else highlight.visible=false;
  if(target&&target.dist<=REACH){const px=target.x+target.nx,py=target.y+target.ny,pz=target.z+target.nz;if(canPlaceAt(px,py,pz)){ghost.visible=true;ghost.position.set(px+0.5,py+0.5,pz+0.5);if(!ghost.parent)scene.add(ghost);}else ghost.visible=false;}else ghost.visible=false;
  if(!inventoryOpen&&mouseDown.left&&target&&target.dist<=REACH&&now-lastBreak>0.28){const b=worldGet(target.x,target.y,target.z);if(b!==BK.BEDROCK){lastBreak=now;const def=BLOCKS[b];spawnParticles(target.x+0.5,target.y+0.5,target.z+0.5,def?def.color:0x888888);sfx.dig();setBlock(target.x,target.y,target.z,BK.AIR);}}
  if(!inventoryOpen&&mouseDown.right&&target&&target.dist<=REACH&&now-lastPlace>0.22){const px=target.x+target.nx,py=target.y+target.ny,pz=target.z+target.nz;if(canPlaceAt(px,py,pz)){lastPlace=now;const id=HOTBAR[selected];setBlock(px,py,pz,id);sfx.place();spawnParticles(px+0.5,py+0.5,pz+0.5,BLOCKS[id].color,6);}}
}
/* ===== 背包 UI ===== */
// 背包分类标签页
const INV_TABS=[
  {name:'🏗 建筑',blocks:[BK.STONE,BK.COBBLE,BK.BRICK,BK.GLASS,BK.LEAVES,BK.ICE,BK.PACKED_ICE,BK.PLANKS,BK.SPRUCE_PLANKS,BK.BIRCH_PLANKS,BK.JUNGLE_PLANKS,BK.ACACIA_PLANKS,BK.DARK_OAK_PLANKS,BK.GRANITE,BK.DIORITE,BK.ANDESITE]},
  {name:'🌍 地形',blocks:[BK.GRASS,BK.DIRT,BK.SAND,BK.RED_SAND,BK.GRAVEL,BK.SNOW,BK.CLAY,BK.MYCELIUM,BK.PODZOL,BK.BEDROCK]},
  {name:'⛏ 矿物',blocks:[BK.COAL_ORE,BK.IRON_ORE,BK.GOLD_ORE,BK.LAPIS_ORE,BK.REDSTONE_ORE,BK.DIAMOND_ORE,BK.EMERALD_ORE]},
  {name:'🌿 植物',blocks:[BK.OAK_SAPLING,BK.SPRUCE_SAPLING,BK.BIRCH_SAPLING,BK.DANDELION,BK.POPPY,BK.TALL_GRASS,BK.FERN,BK.BROWN_MUSHROOM,BK.RED_MUSHROOM,BK.DEAD_BUSH]},
  {name:'🪵 木材',blocks:[BK.LOG,BK.SPRUCE_LOG,BK.BIRCH_LOG,BK.JUNGLE_LOG,BK.ACACIA_LOG,BK.DARK_OAK_LOG]},
];
let inventoryOpen=false,invTab=0;
function buildInventoryUI(){
  const div=document.createElement('div');div.id='inventory-overlay';div.style.cssText='position:fixed;inset:0;z-index:30;background:rgba(10,14,22,0.88);display:none;flex-direction:column;align-items:center;justify-content:center;';
  const panel=document.createElement('div');panel.style.cssText='background:rgba(30,38,54,0.95);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:20px 20px 14px;max-width:620px;width:90vw;';
  // 标签栏
  const tabBar=document.createElement('div');tabBar.style.cssText='display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;';
  INV_TABS.forEach((tab,i)=>{
    const btn=document.createElement('button');btn.textContent=tab.name;btn.dataset.idx=i;
    btn.style.cssText='padding:6px 14px;border:none;border-radius:8px;font-size:13px;cursor:pointer;background:'+(i===invTab?'#5fd35f':'rgba(255,255,255,0.1)')+';color:'+(i===invTab?'#10231a':'#d0d8e8')+';';
    btn.addEventListener('click',()=>{invTab=i;renderInvGrid();});
    tabBar.appendChild(btn);
  });
  panel.appendChild(tabBar);
  // 网格
  const grid=document.createElement('div');grid.id='inv-grid';grid.style.cssText='display:grid;grid-template-columns:repeat(8,1fr);gap:5px;min-height:260px;';
  panel.appendChild(grid);
  // 底部快捷栏
  const invHotbar=document.createElement('div');invHotbar.id='inv-hotbar';invHotbar.style.cssText='display:flex;gap:4px;padding:8px 4px 4px;margin-top:12px;border-top:1px solid rgba(255,255,255,0.1);justify-content:center;';
  panel.appendChild(invHotbar);
  div.appendChild(panel);
  document.body.appendChild(div);
  // 渲染网格
  function renderInvGrid(){
    grid.innerHTML='';
    const tab=INV_TABS[invTab];
    tab.blocks.forEach(id=>{
      const def=BLOCKS[id];if(!def)return;
      const slot=document.createElement('div');slot.style.cssText='width:48px;height:48px;background:rgba(255,255,255,0.08);border:2px solid rgba(255,255,255,0.2);border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;';
      const cv=document.createElement('canvas');cv.width=32;cv.height=32;slot.appendChild(cv);
      const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
      if(def.plant!==undefined)g.drawImage(plantAtlasTex.image,def.plant*16,0,16,16,0,0,32,32);
      else{const tile=def.icon;const col=tile%ATLAS_COLS,row=Math.floor(tile/ATLAS_COLS);g.drawImage(atlasTex.image,col*16,row*16,16,16,0,0,32,32);}
      slot.addEventListener('click',()=>{HOTBAR[selected]=id;rebuildHotbar();renderInvHotbar();document.getElementById('beside').textContent=BLOCKS[id].name;sfx.click();});
      grid.appendChild(slot);
    });
  }
  // 渲染底部快捷栏
  function renderInvHotbar(){
    invHotbar.innerHTML='';
    HOTBAR.forEach((id,i)=>{
      const slot=document.createElement('div');slot.style.cssText='width:44px;height:44px;background:rgba(255,255,255,'+(i===selected?'0.22)':'0.08)')+';border:2px solid '+(i===selected?'rgba(255,255,255,0.9)':'rgba(255,255,255,0.28)')+';border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;';
      const cv=document.createElement('canvas');cv.width=28;cv.height=28;slot.appendChild(cv);
      const g=cv.getContext('2d');g.imageSmoothingEnabled=false;const def=BLOCKS[id];
      if(def.plant!==undefined)g.drawImage(plantAtlasTex.image,def.plant*16,0,16,16,0,0,28,28);
      else{const tile=def.icon;const col=tile%ATLAS_COLS,row=Math.floor(tile/ATLAS_COLS);g.drawImage(atlasTex.image,col*16,row*16,16,16,0,0,28,28);}
      slot.addEventListener('click',()=>{selectSlot(i);renderInvHotbar();});
      invHotbar.appendChild(slot);
    });
  }
  renderInvGrid();renderInvHotbar();
}
function toggleInventory(){
  inventoryOpen=!inventoryOpen;const el=document.getElementById('inventory-overlay');
  if(el)el.style.display=inventoryOpen?'flex':'none';
  if(inventoryOpen){mouseDown.left=mouseDown.right=false;highlight.visible=false;ghost.visible=false;document.exitPointerLock();}
}
function rebuildHotbar(){
  hotbarEl.innerHTML='';slotEls.length=0;
  HOTBAR.forEach((id,i)=>{
    const slot=document.createElement('div');slot.className='slot'+(i===selected?' sel':'');
    const num=document.createElement('span');num.className='num';num.textContent=i+1;
    const cv=document.createElement('canvas');cv.width=32;cv.height=32;drawIcon(cv,BLOCKS[id].icon);
    slot.append(num,cv);hotbarEl.appendChild(slot);slotEls.push(slot);
  });
}
/* ===== 快捷栏 / HUD ===== */
const hotbarEl=document.getElementById('hotbar');const slotEls=[];
function drawIcon(cv,tile){const g=cv.getContext('2d');g.imageSmoothingEnabled=false;const col=tile%ATLAS_COLS,row=Math.floor(tile/ATLAS_COLS);g.drawImage(atlasTex.image,col*16,row*16,16,16,0,0,cv.width,cv.height);}
function buildHotbar(){HOTBAR.forEach((id,i)=>{const slot=document.createElement('div');slot.className='slot'+(i===selected?' sel':'');const num=document.createElement('span');num.className='num';num.textContent=i+1;const cv=document.createElement('canvas');cv.width=32;cv.height=32;drawIcon(cv,BLOCKS[id].icon);slot.append(num,cv);hotbarEl.appendChild(slot);slotEls.push(slot);});}
function selectSlot(i){selected=((i%HOTBAR.length)+HOTBAR.length)%HOTBAR.length;slotEls.forEach((el,j)=>el.classList.toggle('sel',j===selected));document.getElementById('beside').textContent=BLOCKS[HOTBAR[selected]].name;}
const statsEl=document.getElementById('stats'),msgEl=document.getElementById('msg');let msgTimer=null;
function showMsg(text,ms=2200){msgEl.textContent=text;msgEl.style.opacity=1;clearTimeout(msgTimer);msgTimer=setTimeout(()=>msgEl.style.opacity=0,ms);}
let fpsFrames=0,fpsTime=0;
function updateHUD(dt){fpsFrames++;fpsTime+=dt;if(fpsTime>=0.5){const fps=Math.round(fpsFrames/fpsTime);fpsFrames=0;fpsTime=0;const b=target?BLOCKS[worldGet(target.x,target.y,target.z)]:null;statsEl.innerHTML=`FPS ${fps}　坐标 ${player.x.toFixed(1)}, ${player.y.toFixed(1)}, ${player.z.toFixed(1)}${b?'　瞄准: '+b.name:''}${flying?'　✈ 飞行中':''}`;}}
/* ===== 输入事件 ===== */
function setupInput(){
  document.addEventListener('keydown',(e)=>{
    if(e.code==='Tab')e.preventDefault();keys.add(e.code);
    if(e.code==='KeyE'&&!e.repeat){if(locked){toggleInventory();return;}}
    const num=['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9'].indexOf(e.code);if(num>=0)selectSlot(num);
    if(inventoryOpen&&e.code==='Escape'){toggleInventory();return;}
    if(!locked)return;
    if(e.code==='KeyF'&&!e.repeat){flying=!flying;sfx.fly();showMsg(flying?'✈ 飞行模式':'🦶 行走模式');}
    if(e.code==='Space'&&!e.repeat){const now=performance.now();if(now-lastSpace<260){flying=!flying;sfx.fly();showMsg(flying?'✈ 飞行模式':'🦶 行走模式');}lastSpace=now;}
    if(e.code==='KeyG'&&!e.repeat){dayPaused=!dayPaused;showMsg(dayPaused?'🌙 昼夜暂停':'☀️ 昼夜继续');}
    if(e.code==='KeyP'&&!e.repeat)resetWorld();
  });
  document.addEventListener('keyup',(e)=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
  document.addEventListener('mousedown',(e)=>{if(!locked||inventoryOpen)return;try{ensureAudio();}catch(err){}mouseDown.left=e.button===0;mouseDown.right=e.button===2;if(e.button===0)lastBreak=0;if(e.button===2)lastPlace=0;if(e.button===1){e.preventDefault();if(target&&target.dist<=REACH){const id=worldGet(target.x,target.y,target.z);const idx=HOTBAR.indexOf(id);if(idx>=0)selectSlot(idx);}}});
  window.addEventListener('mouseup',(e)=>{if(e.button===0)mouseDown.left=false;if(e.button===2)mouseDown.right=false;});
  document.addEventListener('contextmenu',(e)=>e.preventDefault());
  document.addEventListener('mousemove',(e)=>{if(!locked)return;yaw-=e.movementX*0.0022;pitch-=e.movementY*0.0022;if(pitch>1.55)pitch=1.55;if(pitch<-1.55)pitch=-1.55;});
  document.addEventListener('wheel',(e)=>{if(!locked)return;if(e.deltaY>0)selectSlot(selected+1);else selectSlot(selected-1);},{passive:true});
  document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===document.getElementById('game');if(!locked){mouseDown.left=mouseDown.right=false;keys.clear();showPause(true);}else{showPause(false);ensureAudio();}});
}
/* ===== 菜单 / 流程 ===== */
const overlay=document.getElementById('overlay'),startBtn=document.getElementById('startBtn'),pauseTitle=document.getElementById('pauseTitle'),helpEl=document.getElementById('help'),bar=document.getElementById('bar'),progTxt=document.getElementById('prog-txt'),ring=document.getElementById('ring');
let ready=false;
function setProgress(pct,txt){bar.style.width=pct+'%';if(txt)progTxt.textContent=txt;}
function showPause(paused){if(paused){pauseTitle.style.display='block';startBtn.textContent='▶ 继续游戏';ring.style.display='none';progTxt.style.display='none';helpEl.style.display='block';overlay.style.display='flex';}else{overlay.style.display='none';}}
function startGame(){const canvas=document.getElementById('game');try{const ret=canvas.requestPointerLock();if(ret&&typeof ret.catch==='function')ret.catch(()=>{});}catch(e){}}
/* ===== 主循环 / 初始化 ===== */
const clock=new THREE.Clock();
function init(){
  const canvas=document.getElementById('game');
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});}catch(e){progTxt.textContent='⚠️ 浏览器不支持 WebGL';return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setSize(window.innerWidth,window.innerHeight);
  scene=new THREE.Scene();scene.fog=new THREE.Fog(0x87b8e8,45,230);camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,1200);
  atlasTex=makeAtlas();plantAtlasTex=makePlantAtlas();
  solidMaterial=new THREE.MeshLambertMaterial({map:atlasTex,vertexColors:true});
  plantMaterial=new THREE.MeshBasicMaterial({map:plantAtlasTex,transparent:true,alphaTest:0.15,depthWrite:true,depthTest:true,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
  glowMaterial=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0.45,blending:THREE.AdditiveBlending,depthWrite:false});
  buildSky();buildParticles();window.__mc_ready=true;
  // 先加载初始区块，再生成玩家
  const pcx=0,pcz=0;
  for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)loadChunk(pcx+dx,pcz+dz);
  spawnPlayer();
  ready=true;
  startBtn.style.display='inline-block';helpEl.style.display='block';document.getElementById('hud').style.display='block';
  setProgress(100,'世界已就绪');showMsg('欢迎来到方块世界！',4000);
  buildInventoryUI();
}
function animate(){
  requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),0.05);
  if(ready)updateChunks();
  // 网格化队列
  if(meshQueue.length>0){for(let i=0;i<3&&meshQueue.length>0;i++){const[cx,cz]=meshQueue.shift();buildChunkMeshes(cx,cz);}meshQueueSet.clear();}
  if(locked&&!inventoryOpen){updatePlayer(dt);interact(performance.now()/1000);updateHUD(dt);if(ready)maybeSavePlayer(performance.now());}else{highlight.visible=false;ghost.visible=false;}
  updateSky(dt);updateParticles(dt);renderer.render(scene,camera);
}
/* ===== 启动 ===== */
window.addEventListener('resize',()=>{if(!camera)return;camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);});
loadSave();init();buildHotbar();selectSlot(0);setupInput();startBtn.addEventListener('click',startGame);
window.addEventListener('beforeunload',()=>{saveNow();savePlayerPos();});animate();
// 调试钩子
const mcDebug={
  BLOCKS,HOTBAR,BK,worldGet,solidAt,setBlock,raycastVoxel,player,
  setLocked(v){locked=!!v;},setLook(ya,pi){yaw=ya;pitch=Math.max(-1.55,Math.min(1.55,pi));},
  teleport(x,y,z){player.x=x;player.y=y;player.z=z;player.vx=player.vy=player.vz=0;player.onGround=false;},
  get flying(){return flying;},get locked(){return locked;},get selected(){return selected;},
  get meshReady(){return ready;},
  get renderTriangles(){return renderer?renderer.info.render.triangles:-1;},
  get mouseState(){return{left:mouseDown.left,right:mouseDown.right,breakAt:lastBreak,placeAt:lastPlace};},
  get targetInfo(){return target;},
  get camInfo(){return{x:+camera.position.x.toFixed(2),y:+camera.position.y.toFixed(2),z:+camera.position.z.toFixed(2),rx:+camera.rotation.x.toFixed(3),ry:+camera.rotation.y.toFixed(3),bg:'#'+scene.background.getHexString()};},
};
window.__mc=mcDebug;