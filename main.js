import './style.css'
import { Player } from './Player.js';
import { Enemy, resetEnemyIdCounter } from './Enemy.js';
import { Projectile } from './Projectile.js';
import { Particle } from './Particle.js';
import { Gem } from './Gem.js';
import { DamageNumber } from './DamageNumber.js';
import { OrbitBlade, LightningChain, DamageAura, FireTrail, ExplosiveMine, PiercingShuriken } from './Weapons.js';
import { Boss, resetBossIdCounter } from './Boss.js';
import { Starfield, AmbientParticles, ScreenFlash, drawVignette, DeathRing, SparkParticle, BossDeathWave } from './VFX.js';
import { Terrain, generateTerrain } from './Terrain.js';
import { TreasureChest, MissionSystem } from './TreasureChest.js';
import { VirtualJoystick } from './Joystick.js';
import { BreakableCrate, DropEffect } from './BreakableCrate.js';
import { WeaponEvolutionManager } from './WeaponEvolution.js';
import { EliteEnemy, resetEliteIdCounter } from './EliteEnemy.js';
import { MetaProgression, META_UPGRADES } from './MetaProgression.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const joystick = new VirtualJoystick(canvas);

// === PERFORMANCE: disable shadowBlur globally ===
Object.defineProperty(CanvasRenderingContext2D.prototype, 'shadowBlur', {
  set: function() { /* noop */ },
  get: function() { return 0; }
});

// max entity counts
const MAX_ENEMIES = 80;
const MAX_PARTICLES = 100;
const MAX_GEMS = 200;
const MAX_DAMAGE_NUMBERS = 30;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// UI Elements
const mainMenu = document.getElementById('main-menu');
const hud = document.getElementById('hud');
const levelUpMenu = document.getElementById('level-up-menu');
const gameOverMenu = document.getElementById('game-over-menu');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const timeText = document.getElementById('time-text');
const finalTimeText = document.getElementById('final-time');
const healthBar = document.getElementById('health-bar');
const xpBar = document.getElementById('xp-bar');
const levelText = document.getElementById('level-text');
const killCountText = document.getElementById('kill-count');
const finalKillsText = document.getElementById('final-kills');
const finalLevelText = document.getElementById('final-level');
const bossWarning = document.getElementById('boss-warning');
const comboDisplay = document.getElementById('combo-display');
const pauseBtn = document.getElementById('pause-btn');
const pauseMenu = document.getElementById('pause-menu');
const resumeBtn = document.getElementById('resume-btn');
const quitBtn = document.getElementById('quit-btn');
const metaUpgradeBtn = document.getElementById('meta-upgrade-btn');
const metaUpgradeMenu = document.getElementById('meta-upgrade-menu');
const metaBackBtn = document.getElementById('meta-back-btn');
const goldDisplay = document.getElementById('gold-display');
const metaGoldDisplay = document.getElementById('meta-gold-display');

// Game State
let gameState = 'MENU';
let lastTime = performance.now();
let surviveTime = 0;

// 难度配置
const diffConfigs = {
  easy: {
    label: '简单',
    playerHp: 300, playerSpeed: 290,
    enemyContactDamage: 3, bossContactDamage: 6,
    enemyHpScale: 0.4, enemySpeedScale: 0.7,
    spawnRateBase: 1.3, spawnRateDecay: 0.003,
    batchThresholds: [40, 100, 180, 280],
    bossInterval: 75, bossHpScale: 0.5,
    xpPerGem: 1, levelXpBase: 8, levelXpScale: 1.35,
    baseDamage: 15,
  },
  normal: {
    label: '中等',
    playerHp: 150, playerSpeed: 260,
    enemyContactDamage: 5, bossContactDamage: 10,
    enemyHpScale: 0.8, enemySpeedScale: 0.9,
    spawnRateBase: 0.9, spawnRateDecay: 0.005,
    batchThresholds: [25, 70, 140, 220],
    bossInterval: 55, bossHpScale: 0.8,
    xpPerGem: 1, levelXpBase: 12, levelXpScale: 1.45,
    baseDamage: 12,
  },
  hard: {
    label: '困难',
    playerHp: 100, playerSpeed: 250,
    enemyContactDamage: 8, bossContactDamage: 16,
    enemyHpScale: 1.2, enemySpeedScale: 1.1,
    spawnRateBase: 0.6, spawnRateDecay: 0.007,
    batchThresholds: [18, 50, 100, 160],
    bossInterval: 40, bossHpScale: 1.2,
    xpPerGem: 1, levelXpBase: 15, levelXpScale: 1.55,
    baseDamage: 10,
  }
};
let selectedDifficulty = 'normal';
let diff = diffConfigs[selectedDifficulty];

// 难度选择按钮事件
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedDifficulty = btn.dataset.diff;
    diff = diffConfigs[selectedDifficulty];
  });
});

// Game Entities
let player;
let enemies = [];
let bosses = [];
let projectiles = [];
let particles = [];
let gems = [];
let damageNumbers = [];
let enemySpawnTimer = 0;
const INITIAL_SPAWN_RATE = 0.7;
let weaponTimer = 0;
let currentWeaponCooldown = 1.0;
let cameraX = 0, cameraY = 0;
let targetCameraX = 0, targetCameraY = 0;

// 地形 & 宝箱 & 任务
let terrains = [];
let chests = [];
let breakableCrates = [];
let dropEffects = [];
let healthPickups = []; // visual health orbs dropped by enemies
let lastTerrainX = 0, lastTerrainY = 0;
let crateSpawnTimer = 0;
let xpBoostTimer = 0;
const missionSystem = new MissionSystem();

// Weapons (额外武器系统)
let orbitBlades = [];
let lightningChain = null;
let damageAura = null;
let fireTrail = null;
let explosiveMine = null;
let piercingShuriken = null;

let hasOrbitBlades = false;
let hasLightning = false;
let hasAura = false;
let hasFireTrail = false;
let hasMine = false;
let hasShuriken = false;

// Evolution & Meta systems
const evoManager = new WeaponEvolutionManager();
const metaProg = new MetaProgression();
let eliteEnemies = [];
let eliteSpawnTimer = 45;
let maxComboThisRun = 0;
let bossKillsThisRun = 0;
let metaXpMult = 1;
let metaArmorReduction = 0;

// Stats
let playerXp = 0;
let playerLevel = 1;
let nextLevelXp = 5;
let playerMagnetRadius = 80;
let playerDamageBonus = 0;
let projectileCount = 1;
let killCount = 0;
let playerCritChance = 0.0; // 暴击?0~1
let playerCritDamage = 2.0; // 暴击伤害倍率

// Boss 系统
let nextBossTime = 45;
let bossWarningTimer = 0;

// 连杀系统 — LoL风格
let comboCount = 0;
let comboTimer = 0;
const COMBO_WINDOW = 2.0;
let xpMultiplier = 1;
const COMBO_TIERS = [
    { min: 3,  title: '大杀特杀', color: '#ffffff', glow: 'rgba(255,255,255,0.3)', scale: 1.0, shake: 2 },
    { min: 5,  title: '杀人如麻', color: '#4488ff', glow: 'rgba(68,136,255,0.4)',  scale: 1.1, shake: 3 },
    { min: 7,  title: '无人能挡', color: '#aa44ff', glow: 'rgba(170,68,255,0.5)',  scale: 1.2, shake: 5 },
    { min: 10, title: '超 神',    color: '#ffcc00', glow: 'rgba(255,204,0,0.6)',   scale: 1.4, shake: 8 },
    { min: 15, title: '传 说',    color: '#ff3300', glow: 'rgba(255,51,0,0.7)',    scale: 1.6, shake: 12 },
];
let lastComboTier = -1;

// 波次系统
let currentWave = 0;
let waveTimer = 0;
const WAVE_DURATION = 30;
const WAVE_REST = 3;
let waveResting = false;
let waveAnnounceTimer = 0;

// 成就系统
const achievementQueue = [];
let achievementShowTimer = 0;
const unlockedAchievements = new Set();
const ACHIEVEMENTS = [
    { id: 'firstKill',    cond: s => s.kills >= 1,      title: '初次击杀',   desc: '消灭第一个敌人', icon: '⚔' },
    { id: 'kill50',       cond: s => s.kills >= 50,     title: '猎杀者',     desc: '消灭50个敌人',   icon: '💀' },
    { id: 'kill100',      cond: s => s.kills >= 100,    title: '屠杀机器',   desc: '消灭100个敌人',  icon: '🔥' },
    { id: 'kill200',      cond: s => s.kills >= 200,    title: '毁灭之主',   desc: '消灭200个敌人',  icon: '☠' },
    { id: 'survive60',    cond: s => s.time >= 60,      title: '坚持不懈',   desc: '存活1分钟',      icon: '⏱' },
    { id: 'survive180',   cond: s => s.time >= 180,     title: '久经沙场',   desc: '存活3分钟',      icon: '🛡' },
    { id: 'survive300',   cond: s => s.time >= 300,     title: '不朽战士',   desc: '存活5分钟',      icon: '👑' },
    { id: 'combo7',       cond: s => s.combo >= 7,      title: '连杀达人',   desc: '达成7连杀',      icon: '⚡' },
    { id: 'combo10',      cond: s => s.combo >= 10,     title: '超神时刻',   desc: '达成10连杀',     icon: '✨' },
    { id: 'wave5',        cond: s => s.wave >= 5,       title: '中坚力量',   desc: '挺过第5波',      icon: '🌊' },
    { id: 'wave10',       cond: s => s.wave >= 10,      title: '传奇守卫',   desc: '挺过第10波',     icon: '🏆' },
    { id: 'eliteKill',    cond: s => s.eliteKills >= 1, title: '精英猎手',   desc: '击杀一只精英怪', icon: '💎' },
];

// Screen Shake
let shakeDuration = 0;
let shakeIntensity = 0;

// VFX
const starfield = new Starfield(150);
const ambientParticles = new AmbientParticles(50);
const screenFlash = new ScreenFlash();
let deathRings = [];
let sparkParticles = [];
let bossDeathWaves = [];
let globalTime = 0;

// menu particles
let menuParticles = [];
function initMenuParticles() {
    menuParticles = [];
    for (let i = 0; i < 60; i++) {
        menuParticles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 2 + 0.5,
            dx: (Math.random() - 0.5) * 30,
            dy: (Math.random() - 0.5) * 30,
            alpha: Math.random() * 0.4 + 0.1,
            color: ['#00f0ff','#bbf000','#ff003c','#ff6600','#ff00ff'][Math.floor(Math.random()*5)]
        });
    }
}
initMenuParticles();

function drawMenuBackground(dt) {
    for (let p of menuParticles) {
        p.x += p.dx * dt;
        p.y += p.dy * dt;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 0;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.closePath();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

// ─── 主循?───
function autoLoop(timestamp) {
  let deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  if (deltaTime > 0.1) deltaTime = 0.1;
  globalTime += deltaTime;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === 'MENU') {
    // 菜单星空背景
    starfield.draw(ctx, 0, 0, globalTime);
    drawMenuBackground(deltaTime);
  }
  if (gameState !== 'MENU') {
    // 游戏中的星空背景
    starfield.draw(ctx, cameraX, cameraY, globalTime);
    drawGrid();
  }
  if (gameState === 'PLAYING') update(deltaTime);
  if (gameState !== 'MENU') draw(ctx);

  // 后处理：屏幕闪光 + 暗角
  screenFlash.update(deltaTime);
  screenFlash.draw(ctx, canvas.width, canvas.height);
  drawVignette(ctx, canvas.width, canvas.height);
  joystick.draw(ctx);

  requestAnimationFrame(autoLoop);
}

function drawGrid() {
  const w = canvas.width, h = canvas.height;
  
  // ── 深空渐变底色 ──
  const bgGrad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w * 0.7);
  bgGrad.addColorStop(0, 'rgba(8, 12, 30, 0.6)');
  bgGrad.addColorStop(0.5, 'rgba(4, 6, 18, 0.4)');
  bgGrad.addColorStop(1, 'rgba(2, 2, 8, 0.3)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);
  
  // ── 星云?──
  drawNebulaLayer(w, h);
  
  // ── 细线网格 ──
  const gridSize = 120;
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.03)';
  ctx.lineWidth = 0.5;
  const oX = (-cameraX % gridSize + gridSize) % gridSize;
  const oY = (-cameraY % gridSize + gridSize) % gridSize;
  for (let x = oX; x < w; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = oY; y < h; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  
  // ── 交叉点光?──
  for (let x = oX; x < w; x += gridSize) {
    for (let y = oY; y < h; y += gridSize) {
      // glow dot
      const dotGrad = ctx.createRadialGradient(x, y, 0, x, y, 3);
      dotGrad.addColorStop(0, 'rgba(0, 200, 255, 0.12)');
      dotGrad.addColorStop(1, 'rgba(0, 200, 255, 0)');
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = dotGrad;
      ctx.fill();
    }
  }
}

// nebula seeds
const nebulaSeeds = [];
for (let i = 0; i < 6; i++) {
  nebulaSeeds.push({
    x: Math.random() * 3000, y: Math.random() * 3000,
    r: 150 + Math.random() * 250,
    color: ['rgba(0,100,255,', 'rgba(100,0,200,', 'rgba(200,50,0,', 'rgba(0,150,100,', 'rgba(80,0,150,', 'rgba(150,80,0,'][i],
    parallax: 0.05 + Math.random() * 0.1
  });
}

function drawNebulaLayer(w, h) {
  for (let n of nebulaSeeds) {
    const nx = ((n.x - cameraX * n.parallax) % (w + n.r * 2)) ;
    const ny = ((n.y - cameraY * n.parallax) % (h + n.r * 2)) ;
    const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.r);
    grad.addColorStop(0, n.color + '0.04)');
    grad.addColorStop(0.5, n.color + '0.015)');
    grad.addColorStop(1, n.color + '0)');
    ctx.beginPath();
    ctx.arc(nx, ny, n.r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

// ─── 通用敌人受击回调 ───
function onEnemyHit(enemy, damage) {
    // 组队模式 & 非房主: 发送伤害给房主，不本地处理
    if (isTeamMode && !isHost && teamWs?.readyState === 1) {
        let finalDamage = damage;
        let isCrit = Math.random() < playerCritChance;
        if (isCrit) finalDamage *= playerCritDamage;
        teamWs.send(JSON.stringify({ type: 'player_hit', enemyId: enemy.id, damage: finalDamage }));
        // 本地显示伤害数字（即时反馈）
        damageNumbers.push(new DamageNumber(
            enemy.x + (Math.random()-0.5)*10, enemy.y - enemy.radius,
            Math.floor(finalDamage), isCrit ? '#ff003c' : '#00ddff'
        ));
        return;
    }
    
    let finalDamage = damage;
    let isCrit = Math.random() < playerCritChance;
    if (isCrit) finalDamage *= playerCritDamage;
    
    enemy.hp -= finalDamage;
    enemy.hitFlash = 0.08;
    damageNumbers.push(new DamageNumber(
        enemy.x + (Math.random()-0.5)*10,
        enemy.y - enemy.radius,
        Math.floor(finalDamage),
        isCrit ? '#ff003c' : '#bbf000'
    ));
    createParticles(enemy.x, enemy.y, enemy.color, 3);
    // VFX 火花粒子
    for (let i = 0; i < 3; i++) sparkParticles.push(new SparkParticle(enemy.x, enemy.y, enemy.color));
}

// ─── 主更?───
function update(dt) {
    surviveTime += dt;
    const minutes = Math.floor(surviveTime / 60).toString().padStart(2, '0');
    const seconds = Math.floor(surviveTime % 60).toString().padStart(2, '0');
    timeText.innerText = `${minutes}:${seconds}`;

    // 连杀计时
    if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0) {
            comboCount = 0;
            xpMultiplier = 1;
            lastComboTier = -1;
            if (comboDisplay) comboDisplay.classList.add('hidden');
        }
    }

    // 波次系统
    if (waveAnnounceTimer > 0) waveAnnounceTimer -= dt;
    if (waveResting) {
        waveTimer -= dt;
        if (waveTimer <= 0) {
            waveResting = false;
            currentWave++;
            waveTimer = WAVE_DURATION;
            waveAnnounceTimer = 2.0;
        }
    } else {
        waveTimer -= dt;
        if (waveTimer <= 0) {
            waveResting = true;
            waveTimer = WAVE_REST;
            waveAnnounceTimer = 2.0;
        }
    }

    // 成就检测
    const achState = { kills: killCount, time: surviveTime, combo: comboCount, wave: currentWave, eliteKills: bossKillsThisRun };
    for (const ach of ACHIEVEMENTS) {
        if (!unlockedAchievements.has(ach.id) && ach.cond(achState)) {
            unlockedAchievements.add(ach.id);
            achievementQueue.push(ach);
        }
    }
    if (achievementShowTimer > 0) achievementShowTimer -= dt;
    if (achievementShowTimer <= 0 && achievementQueue.length > 0) {
        showAchievement(achievementQueue.shift());
        achievementShowTimer = 2.5;
    }

    if (!player) return;

    player.update(dt, joystick);

    // 平滑相机
    targetCameraX = player.x - canvas.width / 2;
    targetCameraY = player.y - canvas.height / 2;
    cameraX += (targetCameraX - cameraX) * 6 * dt;
    cameraY += (targetCameraY - cameraY) * 6 * dt;

    if (shakeDuration > 0) {
        shakeDuration -= dt;
        if (shakeDuration <= 0) shakeIntensity = 0;
    }

    // ─ Boss 系统 ─ (组队模式：只有房主刷Boss)
    if ((!isTeamMode || isHost) && surviveTime >= nextBossTime) {
        spawnBoss();
        nextBossTime += diff.bossInterval;
    }
    
    // Boss Warning
    if (bossWarningTimer > 0) {
        bossWarningTimer -= dt;
        if (bossWarningTimer <= 0 && bossWarning) {
            bossWarning.classList.add('hidden');
        }
    }

    // ─ 敌人刷新 ─ (组队模式：只有房主刷怪)
    if (!isTeamMode || isHost) {
      enemySpawnTimer -= dt;
      if (enemySpawnTimer <= 0) {
        let batchSize = 1;
        const bt = diff.batchThresholds;
        if (surviveTime > bt[0]) batchSize = 2;
        if (surviveTime > bt[1]) batchSize = 3;
        if (surviveTime > bt[2]) batchSize = 4;
        if (surviveTime > bt[3]) batchSize = 5;
        for (let b = 0; b < batchSize; b++) spawnEnemy();
        enemySpawnTimer = Math.max(0.05, diff.spawnRateBase - (surviveTime * diff.spawnRateDecay));
      }
    }

    // Elite spawn (组队模式：只有房主刷精英)
    if (!isTeamMode || isHost) {
      eliteSpawnTimer -= dt;
      if (eliteSpawnTimer <= 0 && eliteEnemies.length < 3) {
        const ea = Math.random() * Math.PI * 2;
        const ed = Math.max(canvas.width, canvas.height) / 1.3;
        const elite = new EliteEnemy(
            player.x + Math.cos(ea) * ed,
            player.y + Math.sin(ea) * ed,
            surviveTime
        );
        elite.hp = Math.ceil(elite.hp * diff.enemyHpScale);
        elite.maxHp = elite.hp;
        eliteEnemies.push(elite);
        damageNumbers.push(new DamageNumber(player.x, player.y - 60, '精英来袭!', '#ffdd00'));
        eliteSpawnTimer = 45 + Math.random() * 15;
      }
    }

    // ─ 基础武器 ─
    weaponTimer -= dt;
    if (weaponTimer <= 0) {
        fireWeapon();
        weaponTimer = currentWeaponCooldown;
    }

    // ─ 旋转护盾?─
    for (let blade of orbitBlades) {
        blade.update(dt);
        const bx = blade.getX(), by = blade.getY();
        // 检测与敌人碰撞
        for (let e of enemies) {
            let dist = Math.sqrt((bx - e.x)**2 + (by - e.y)**2);
            if (dist < blade.bladeLength + e.radius && blade.canHit(enemies.indexOf(e))) {
                onEnemyHit(e, blade.damage);
                blade.registerHit(enemies.indexOf(e));
            }
        }
        for (let b of bosses) {
            let dist = Math.sqrt((bx - b.x)**2 + (by - b.y)**2);
            if (dist < blade.bladeLength + b.radius && blade.canHit('boss_' + bosses.indexOf(b))) {
                onBossHit(b, blade.damage);
                blade.registerHit('boss_' + bosses.indexOf(b));
            }
        }
        // blade hits crates
        for (let j = breakableCrates.length - 1; j >= 0; j--) {
            const c = breakableCrates[j];
            let dist = Math.sqrt((bx - c.x)**2 + (by - c.y)**2);
            if (dist < blade.bladeLength + c.radius) {
                hitCrate(j);
                break;
            }
        }
    }

    // ─ 闪电?─
    if (lightningChain) {
        lightningChain.update(dt, player, enemies, onEnemyHit);
    }

    // ─ 力场光环 ─
    if (damageAura) {
        damageAura.update(dt, player, enemies, onEnemyHit);
        // aura hits crates
        for (let j = breakableCrates.length - 1; j >= 0; j--) {
            const c = breakableCrates[j];
            const dd = (player.x - c.x)**2 + (player.y - c.y)**2;
            if (dd < (damageAura.radius + c.radius)**2) hitCrate(j);
        }
    }

    // ─ 新增武器更新 ─
    if (fireTrail) {
        fireTrail.update(dt, player, enemies, onEnemyHit);
        // fire hits crates
        for (let j = breakableCrates.length - 1; j >= 0; j--) {
            const c = breakableCrates[j];
            for (const zone of fireTrail.zones) {
                if ((zone.x - c.x)**2 + (zone.y - c.y)**2 < (12 + c.radius)**2) { hitCrate(j); break; }
            }
        }
    }
    if (explosiveMine) {
        explosiveMine.update(dt, player, enemies, onEnemyHit);
        // mine explosions hit crates
        for (const exp of explosiveMine.explosions) {
            for (let j = breakableCrates.length - 1; j >= 0; j--) {
                const c = breakableCrates[j];
                if ((exp.x - c.x)**2 + (exp.y - c.y)**2 < (explosiveMine.radius + c.radius)**2) hitCrate(j);
            }
        }
    }
    if (piercingShuriken) {
        piercingShuriken.update(dt, player, enemies, onEnemyHit);
        // shuriken hits crates
        for (const shur of piercingShuriken.shurikens) {
            for (let j = breakableCrates.length - 1; j >= 0; j--) {
                const c = breakableCrates[j];
                if ((shur.x - c.x)**2 + (shur.y - c.y)**2 < (8 + c.radius)**2) hitCrate(j);
            }
        }
    }

    // ─ 经验?─
    for (let i = gems.length - 1; i >= 0; i--) {
        gems[i].update(dt, player.x, player.y, playerMagnetRadius);
        let distSq = (player.x - gems[i].x)**2 + (player.y - gems[i].y)**2;
        if (distSq < (player.radius + gems[i].radius + 5)**2) {
            const xpBoostMult = xpBoostTimer > 0 ? 2 : 1;
            addXp(gems[i].xpValue * diff.xpPerGem * xpMultiplier * xpBoostMult);
            gems.splice(i, 1);
        }
    }

    // ─ 地形碰撞 ─
    for (let t of terrains) {
        t.update(dt);
        t.pushOut(player);
        for (let e of enemies) t.pushOut(e);
    }

    // ─ 动态地形生?─
    const terrainDist = Math.sqrt((player.x - lastTerrainX)**2 + (player.y - lastTerrainY)**2);
    if (terrainDist > 350) {
        // 在玩家前进方向和周围生成新障碍物
        const dx = player.x - lastTerrainX, dy = player.y - lastTerrainY;
        const angle = Math.atan2(dy, dx);
        for (let i = 0; i < 6; i++) {
            const a = angle + (Math.random() - 0.5) * 2.5;
            const d = 800 + Math.random() * 800;
            const nx = player.x + Math.cos(a) * d;
            const ny = player.y + Math.sin(a) * d;
            const sizes = ['small', 'small', 'small', 'medium', 'medium', 'large', 'wall'];
            terrains.push(new Terrain(nx, ny, sizes[Math.floor(Math.random() * sizes.length)]));
        }
        // cleanup distant terrain
        terrains = terrains.filter(t => {
            const tdx = t.x - player.x, tdy = t.y - player.y;
            return tdx * tdx + tdy * tdy < 4000 * 4000;
        });
        breakableCrates = breakableCrates.filter(c => {
            const cdx = c.x - player.x, cdy = c.y - player.y;
            return cdx * cdx + cdy * cdy < 2000 * 2000;
        });
        lastTerrainX = player.x;
        lastTerrainY = player.y;
    }

    // ─ XP加成倒计?─
    if (xpBoostTimer > 0) xpBoostTimer -= dt;

    // ─ 可打碎宝?─
    crateSpawnTimer -= dt;
    if (crateSpawnTimer <= 0 && breakableCrates.length < 6) {
        crateSpawnTimer = 8 + Math.random() * 7;
        const ca = Math.random() * Math.PI * 2;
        const cd = 250 + Math.random() * 350;
        breakableCrates.push(new BreakableCrate(
            player.x + Math.cos(ca) * cd,
            player.y + Math.sin(ca) * cd
        ));
    }
    for (let c of breakableCrates) c.update(dt);

    // 子弹打宝箱
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        for (let j = breakableCrates.length - 1; j >= 0; j--) {
            const c = breakableCrates[j];
            const ddx = p.x - c.x, ddy = p.y - c.y;
            if (ddx * ddx + ddy * ddy < (p.radius + c.radius) ** 2) {
                hitCrate(j);
                break;
            }
        }
    }

    // Health pickup update & collection
    for (let i = healthPickups.length - 1; i >= 0; i--) {
        const hp = healthPickups[i];
        hp.age += dt;
        hp.vy += 120 * dt;
        hp.x += hp.vx * dt;
        hp.y += hp.vy * dt;
        hp.vx *= 0.97;
        if (hp.age > 0.5) {
            const dx2 = player.x - hp.x, dy2 = player.y - hp.y;
            const d2 = Math.sqrt(dx2*dx2 + dy2*dy2);
            if (d2 > 5) {
                const pull = Math.min(400, 150 + hp.age * 100);
                hp.x += (dx2/d2) * pull * dt;
                hp.y += (dy2/d2) * pull * dt;
            }
        }
        const cdx = player.x - hp.x, cdy = player.y - hp.y;
        if (cdx*cdx + cdy*cdy < (player.radius + hp.radius)**2) {
            if (hp.isHealthPack) {
                player.hp = Math.min(player.hp + 20, player.maxHp);
                damageNumbers.push(new DamageNumber(hp.x, hp.y - 20, '+20 HP', '#44ff88'));
            } else {
                applyDrop(hp.drop, hp.x, hp.y);
                screenFlash.trigger(hp.drop.color, 0.15);
            }
            healthPickups.splice(i, 1);
            updateHud();
            continue;
        }
        if (hp.age > 15) { healthPickups.splice(i, 1); }
    }

    // 掉落特效更新
    for (let i = dropEffects.length - 1; i >= 0; i--) {
        dropEffects[i].update(dt);
        if (dropEffects[i].life <= 0) dropEffects.splice(i, 1);
    }

    // ─ 宝箱拾取 ─
    for (let i = chests.length - 1; i >= 0; i--) {
        chests[i].update(dt);
        if (chests[i].collected) {
            if (chests[i].openAnim > 1) chests.splice(i, 1);
            continue;
        }
        let cdx = player.x - chests[i].x, cdy = player.y - chests[i].y;
        if (cdx*cdx + cdy*cdy < (player.radius + chests[i].radius)**2) {
            chests[i].collected = true;
            // mission chest = half level
            const halfLevelXp = Math.ceil(nextLevelXp * 0.5);
            addXp(halfLevelXp);
            damageNumbers.push(new DamageNumber(chests[i].x, chests[i].y - 20, `经验+${halfLevelXp}!`, '#ffcc00'));
            screenFlash.trigger('#ffcc00', 0.2);
        }
    }

    // ─ 任务检?─
    if (missionSystem.currentMission && !missionSystem.currentMission.completed) {
        if (missionSystem.updateProgress(killCount)) {
            const cx = player.x + (Math.random()-0.5)*300;
            const cy = player.y + (Math.random()-0.5)*300;
            chests.push(new TreasureChest(cx, cy));
            damageNumbers.push(new DamageNumber(player.x, player.y - 30, '任务完成!', '#44ff88'));
            screenFlash.trigger('#44ff88', 0.15);
        }
    }
    if (!missionSystem.currentMission || missionSystem.currentMission.completed) {
        if (chests.length === 0) missionSystem.startNewMission(killCount);
    }

    // ─ 敌人更新与玩家碰撞 ─
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        // 组队模式非房主: 不跑AI，位置由房主同步
        if (!isTeamMode || isHost) e.update(dt, player.x, player.y, terrains);
        
        // 清理死亡敌人
        if (e.hp <= 0) {
            enemies.splice(i, 1);
            createParticles(e.x, e.y, e.color, 18);
            // VFX: 死亡光环 + 火花
            deathRings.push(new DeathRing(e.x, e.y, e.color));
            for (let s = 0; s < 8; s++) sparkParticles.push(new SparkParticle(e.x, e.y, e.color));
            screenFlash.trigger(e.color, 0.06);
            registerKill(e);
            continue;
        }
        
        // 碰撞伤害
        let distSq = (player.x - e.x)**2 + (player.y - e.y)**2;
        if (distSq < (player.radius + e.radius)**2) {
            if (player.takeDamage(diff.enemyContactDamage)) {
                applyShake(5, 0.15);
                createParticles(player.x, player.y, '#00f0ff', 8);
                updateHud();
            }
            if (player.hp <= 0) { triggerGameOver(); return; }
        }
    }

    // ─ Elite enemy update ─
    for (let i = eliteEnemies.length - 1; i >= 0; i--) {
        let el = eliteEnemies[i];
        if (!isTeamMode || isHost) el.update(dt, player.x, player.y, terrains);

        if (el.hp <= 0) {
            eliteEnemies.splice(i, 1);
            createParticles(el.x, el.y, el.color, 30);
            deathRings.push(new DeathRing(el.x, el.y, el.color));
            for (let s = 0; s < 15; s++) sparkParticles.push(new SparkParticle(el.x, el.y, '#ffdd00'));
            screenFlash.trigger('#ffdd00', 0.2);
            applyShake(6, 0.2);

            // Drop lots of XP
            for (let k = 0; k < 15; k++) {
                if (gems.length < MAX_GEMS) gems.push(new Gem(
                    el.x + (Math.random()-0.5)*60,
                    el.y + (Math.random()-0.5)*60
                ));
            }

            // Try to trigger weapon evolution
            const evolvable = evoManager.getEvolvableWeapons();
            if (evolvable.length > 0) {
                const evoId = evolvable[0];
                evoManager.evolve(evoId);
                applyWeaponEvolution(evoId);
                damageNumbers.push(new DamageNumber(el.x, el.y - 30, '武器进化!', '#ffdd00'));
                screenFlash.trigger('#ffdd00', 0.4);
                applyShake(10, 0.3);
            } else {
                damageNumbers.push(new DamageNumber(el.x, el.y - 20, '精英击杀!', '#ffdd00'));
            }

            registerKill(el);
            continue;
        }

        // Elite contact damage (higher)
        let edSq = (player.x - el.x)**2 + (player.y - el.y)**2;
        if (edSq < (player.radius + el.radius)**2) {
            if (player.takeDamage(diff.enemyContactDamage * 2)) {
                applyShake(6, 0.2);
                createParticles(player.x, player.y, el.color, 10);
                updateHud();
            }
            if (player.hp <= 0) { triggerGameOver(); return; }
        }
    }

    // ─ Boss 更新 ─
    for (let i = bosses.length - 1; i >= 0; i--) {
        let b = bosses[i];
        if (!isTeamMode || isHost) b.update(dt, player.x, player.y);
        
        if (b.hp <= 0) {
            bosses.splice(i, 1);
            createParticles(b.x, b.y, b.color, 60);
            applyShake(12, 0.5);
            
            // Boss death VFX
            bossDeathWaves.push(new BossDeathWave(b.x, b.y));
            screenFlash.trigger('#ffcc00', 0.4);
            for (let s = 0; s < 30; s++) sparkParticles.push(new SparkParticle(b.x, b.y, '#ffcc00'));
            for (let s = 0; s < 15; s++) sparkParticles.push(new SparkParticle(b.x, b.y, '#ffffff'));
            
            killCount += 5;
            bossKillsThisRun++;
            if (killCountText) killCountText.innerText = killCount;
            
            for (let k = 0; k < 20; k++) {
                let gx = b.x + (Math.random()-0.5)*80;
                let gy = b.y + (Math.random()-0.5)*80;
                if (gems.length < MAX_GEMS) gems.push(new Gem(gx, gy));
            }
            
            for (let g of gems) g.magnetized = true;
            
            // Boss kill = level up
            const fullLevelXp = nextLevelXp - playerXp;
            if (fullLevelXp > 0) addXp(fullLevelXp);
            damageNumbers.push(new DamageNumber(b.x, b.y - 40, 'BOSS KILL! 升级!', '#ffcc00'));
            continue;
        }
        
        // Boss 碰撞伤害（更高）
        let distSq = (player.x - b.x)**2 + (player.y - b.y)**2;
        if (distSq < (player.radius + b.radius)**2) {
            if (player.takeDamage(diff.bossContactDamage)) {
                applyShake(8, 0.2);
                createParticles(player.x, player.y, '#ffcc00', 12);
                updateHud();
            }
            if (player.hp <= 0) { triggerGameOver(); return; }
        }
        
        // Boss bullets hit player
        for (let bi = b.bullets.length - 1; bi >= 0; bi--) {
            const bul = b.bullets[bi];
            const bdx = player.x - bul.x, bdy = player.y - bul.y;
            if (bdx*bdx + bdy*bdy < (player.radius + bul.radius)**2) {
                if (player.takeDamage(b.contactDamage || 8)) {
                    applyShake(4, 0.1);
                    createParticles(player.x, player.y, bul.color, 5);
                    updateHud();
                }
                b.bullets.splice(bi, 1);
                if (player.hp <= 0) { triggerGameOver(); return; }
            }
        }
        
        // Boss summon mechanic
        if (b.summonRequested) {
            const summonCount = 3 + Math.floor(Math.random() * 3);
            for (let s = 0; s < summonCount; s++) {
                const sa = (Math.PI * 2 / summonCount) * s;
                const e = new Enemy(
                    b.x + Math.cos(sa) * 80,
                    b.y + Math.sin(sa) * 80,
                    surviveTime
                );
                e.hp = Math.ceil(e.hp * diff.enemyHpScale * 0.5);
                e.maxHp = e.hp;
                e.speed *= diff.enemySpeedScale * 1.2;
                if (enemies.length < MAX_ENEMIES) enemies.push(e);
            }
            createParticles(b.x, b.y, '#ff00ff', 15);
            damageNumbers.push(new DamageNumber(b.x, b.y - 30, 'SUMMON!', '#ff00ff'));
            b.summonRequested = false;
        }
    }

    // ─ 弹丸更新 ─
    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].update(dt);
        if (projectiles[i].lifeTime <= 0) { projectiles.splice(i, 1); continue; }

        let hit = false;
        // vs Boss
        for (let j = bosses.length - 1; j >= 0; j--) {
            let b = bosses[j];
            let distSq = (projectiles[i].x - b.x)**2 + (projectiles[i].y - b.y)**2;
            if (distSq < (projectiles[i].radius + b.radius)**2) {
                onBossHit(b, projectiles[i].damage);
                hit = true; break;
            }
        }
        // vs Enemies
        if (!hit) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                let e = enemies[j];
                let distSq = (projectiles[i].x - e.x)**2 + (projectiles[i].y - e.y)**2;
                let sumRadii = projectiles[i].radius + e.radius;
                if (distSq < sumRadii * sumRadii) {
                    onEnemyHit(e, projectiles[i].damage);
                    hit = true; break;
                }
            }
        }
        // vs Elite enemies
        if (!hit) {
            for (let j = eliteEnemies.length - 1; j >= 0; j--) {
                let el = eliteEnemies[j];
                let distSq = (projectiles[i].x - el.x)**2 + (projectiles[i].y - el.y)**2;
                if (distSq < (projectiles[i].radius + el.radius)**2) {
                    el.hp -= projectiles[i].damage + playerDamageBonus;
                    el.hitFlash = 0.1;
                    damageNumbers.push(new DamageNumber(el.x, el.y - el.radius, projectiles[i].damage + playerDamageBonus, '#ffdd00'));
                    hit = true; break;
                }
            }
        }
        if (hit) projectiles.splice(i, 1);
    }

    // Particles & DamageNumbers & VFX
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(dt);
        if (particles[i].lifeTime <= 0) particles.splice(i, 1);
    }
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        damageNumbers[i].update(dt);
        if (damageNumbers[i].lifeTime <= 0) damageNumbers.splice(i, 1);
    }
    while (damageNumbers.length > MAX_DAMAGE_NUMBERS) damageNumbers.shift();
    // VFX 更新
    ambientParticles.update(dt);
    for (let i = deathRings.length - 1; i >= 0; i--) {
        deathRings[i].update(dt);
        if (deathRings[i].life <= 0) deathRings.splice(i, 1);
    }
    for (let i = sparkParticles.length - 1; i >= 0; i--) {
        sparkParticles[i].update(dt);
        if (sparkParticles[i].life <= 0) sparkParticles.splice(i, 1);
    }
    for (let i = bossDeathWaves.length - 1; i >= 0; i--) {
        bossDeathWaves[i].update(dt);
        if (bossDeathWaves[i].life <= 0) bossDeathWaves.splice(i, 1);
    }
}

function onBossHit(boss, damage) {
    let finalDamage = damage;
    let isCrit = Math.random() < playerCritChance;
    if (isCrit) finalDamage *= playerCritDamage;

    boss.hp -= finalDamage;
    boss.hitFlash = 0.08;
    damageNumbers.push(new DamageNumber(
        boss.x + (Math.random()-0.5)*15,
        boss.y - boss.radius,
        Math.floor(finalDamage), 
        isCrit ? '#ff003c' : '#ffcc00'
    ));
    createParticles(boss.x, boss.y, boss.color, 4);
}

// Centralized crate hit - used by projectiles AND area weapons
function hitCrate(index) {
    const c = breakableCrates[index];
    if (!c || c.destroyed) return;
    const drop = c.takeDamage(1);
    if (drop && c.destroyed) {
        // spawn a visual pickup that floats toward player
        healthPickups.push({
            x: c.x, y: c.y, drop: drop, radius: 10,
            vx: (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 40,
            age: 0, collected: false
        });
        createParticles(c.x, c.y, drop.color, 8);
        breakableCrates.splice(index, 1);
        applyShake(3, 0.1);
    }
}

function registerKill(enemy) {
    killCount++;
    if (killCountText) killCountText.innerText = killCount;
    
    // 连杀系统 — 仅XP加成，无UI播报
    comboCount++;
    comboTimer = COMBO_WINDOW;
    xpMultiplier = 1 + Math.max(0, comboCount - 2) * 0.25;
    
    // 掉落经验宝石
    let dropCount = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < dropCount; k++) {
        let gx = enemy.x + (Math.random()-0.5)*40;
        let gy = enemy.y + (Math.random()-0.5)*40;
        if (gems.length < MAX_GEMS) gems.push(new Gem(gx, gy));
    }
    
    // 5% chance to drop health pack
    if (Math.random() < 0.05) {
        healthPickups.push({
            x: enemy.x, y: enemy.y,
            drop: { type: 'fullHeal', name: '+HP', color: '#44ff88' },
            radius: 10,
            vx: (Math.random() - 0.5) * 30, vy: -50,
            age: 0, collected: false, isHealthPack: true
        });
    }
    
    applyShake(2.5, 0.06);
    if (comboCount > maxComboThisRun) maxComboThisRun = comboCount;
}

// Apply weapon evolution effects
// 成就通知
function showAchievement(ach) {
    let banner = document.getElementById('achievement-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'achievement-banner';
        banner.className = 'achievement-banner';
        document.getElementById('hud').appendChild(banner);
    }
    banner.innerHTML = '<span class="ach-icon">' + ach.icon + '</span><div class="ach-text"><div class="ach-title">' + ach.title + '</div><div class="ach-desc">' + ach.desc + '</div></div>';
    banner.classList.remove('hidden', 'ach-exit');
    banner.classList.add('ach-enter');
    setTimeout(() => { banner.classList.add('ach-exit'); }, 2000);
    setTimeout(() => { banner.classList.add('hidden'); banner.classList.remove('ach-enter', 'ach-exit'); }, 2500);
}

function applyWeaponEvolution(weaponId) {
    switch (weaponId) {
        case 'orbitBlade':
            if (hasOrbitBlades) {
                let total = orbitBlades.length * 2;
                orbitBlades = [];
                for (let i = 0; i < total; i++) orbitBlades.push(new OrbitBlade(player, i, total));
                orbitBlades.forEach(b => { b.damage = (b.damage || 8) * 1.5; });
            }
            break;
        case 'lightning':
            if (lightningChain) {
                lightningChain.chainCount *= 2;
                lightningChain.damage *= 2;
                lightningChain.range = 999;
            }
            break;
        case 'aura':
            if (damageAura) {
                damageAura.radius *= 2;
                damageAura.damage *= 2;
            }
            break;
        case 'fireTrail':
            if (fireTrail) {
                fireTrail.damage *= 3;
                fireTrail.spawnCooldown *= 0.5;
            }
            break;
        case 'mine':
            if (explosiveMine) {
                explosiveMine.damage *= 2;
                explosiveMine.radius *= 1.5;
            }
            break;
        case 'shuriken':
            if (piercingShuriken) {
                piercingShuriken.pierceCount = 999;
                piercingShuriken.damage *= 2;
            }
            break;
    }
}

function spawnEnemy() {
    if (!player) return;
    if (enemies.length >= MAX_ENEMIES) return;
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.max(canvas.width, canvas.height) / 1.4;
    const e = new Enemy(
        player.x + Math.cos(angle) * radius,
        player.y + Math.sin(angle) * radius,
        surviveTime
    );
    // 难度缩放
    e.hp = Math.ceil(e.hp * diff.enemyHpScale);
    e.maxHp = e.hp;
    e.speed *= diff.enemySpeedScale;
    enemies.push(e);
}

function spawnBoss() {
    if (!player) return;
    
    // Boss 预警
    if (bossWarning) {
        bossWarning.classList.remove('hidden');
        bossWarning.innerText = '★ BOSS 来袭 ★';
        bossWarningTimer = 3.0;
    }
    
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.max(canvas.width, canvas.height) / 1.2;
    const b = new Boss(
        player.x + Math.cos(angle) * radius,
        player.y + Math.sin(angle) * radius,
        surviveTime
    );
    b.hp = Math.ceil(b.hp * diff.bossHpScale);
    b.maxHp = b.hp;
    bosses.push(b);
}

const ATTACK_RANGE = 400;

function fireWeapon() {
    if (!player) return;
    let allTargets = enemies.concat(bosses).filter(e => {
        let d = (player.x-e.x)**2+(player.y-e.y)**2;
        return d <= ATTACK_RANGE * ATTACK_RANGE;
    }).sort((a, b) => {
        let da = (player.x-a.x)**2+(player.y-a.y)**2;
        let db = (player.x-b.x)**2+(player.y-b.y)**2;
        return da - db;
    });
    let targets = allTargets.slice(0, projectileCount);
    if (targets.length === 0) return;
    for (let target of targets) {
        let dx = target.x - player.x;
        let dy = target.y - player.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0) {
            dx /= dist; dy /= dist;
            projectiles.push(new Projectile(player.x, player.y, dx, dy, 450, diff.baseDamage + playerDamageBonus, 7, '#bbf000'));
        }
    }
}

function createParticles(x, y, color, count) {
    const remaining = MAX_PARTICLES - particles.length;
    const actual = Math.min(count, remaining);
    for (let i = 0; i < actual; i++) particles.push(new Particle(x, y, color));
}

function applyShake(intensity, duration) {
    shakeIntensity = Math.max(shakeIntensity, intensity);
    shakeDuration = Math.max(shakeDuration, duration);
}

function draw(ctx) {
   ctx.save();
   let preX = -cameraX, preY = -cameraY;
   if (shakeDuration > 0) {
       preX += (Math.random()-0.5) * shakeIntensity * 2;
       preY += (Math.random()-0.5) * shakeIntensity * 2;
   }
   ctx.translate(preX, preY);
   
   // ambient
   ambientParticles.draw(ctx, globalTime);
   
   // 力场光环（底层）
   if (damageAura && player) damageAura.draw(ctx, player);
   
   // 底层武器
   if (fireTrail) fireTrail.draw(ctx);
   if (explosiveMine) explosiveMine.draw(ctx);
   
   // boss death waves
   bossDeathWaves.forEach(w => w.draw(ctx));
   // 死亡光环
   deathRings.forEach(r => r.draw(ctx));
   
   particles.forEach(p => p.draw(ctx));
   // 火花粒子
   sparkParticles.forEach(s => s.draw(ctx));
    // 地形
    terrains.forEach(t => t.draw(ctx));
    
    gems.forEach(g => g.draw(ctx));
    
    // 宝箱
    chests.forEach(c => c.draw(ctx));
    breakableCrates.forEach(c => c.draw(ctx));
    dropEffects.forEach(e => e.draw(ctx));
    // Draw pickups (health orbs & crate drops)
    for (const hp of healthPickups) {
        ctx.save();
        ctx.translate(hp.x, hp.y);
        const pulse = 0.8 + Math.sin(hp.age * 6) * 0.2;
        // glow
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
        g.addColorStop(0, hp.drop.color + '44');
        g.addColorStop(1, hp.drop.color + '00');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();
        if (hp.isHealthPack) {
            // green + shape
            ctx.fillStyle = '#44ff88';
            ctx.fillRect(-2 * pulse, -6 * pulse, 4 * pulse, 12 * pulse);
            ctx.fillRect(-6 * pulse, -2 * pulse, 12 * pulse, 4 * pulse);
        } else {
            // colored diamond
            ctx.fillStyle = hp.drop.color;
            ctx.beginPath();
            const s = 6 * pulse;
            ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0);
            ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    }
   projectiles.forEach(p => p.draw(ctx));
   enemies.forEach(e => e.draw(ctx));
   eliteEnemies.forEach(el => el.draw(ctx));
   bosses.forEach(b => b.draw(ctx));
   
   // lightning
   if (lightningChain) lightningChain.draw(ctx);
   
   // 上层武器
   if (piercingShuriken) piercingShuriken.draw(ctx);
   for (let blade of orbitBlades) blade.draw(ctx);
   
   damageNumbers.forEach(d => d.draw(ctx));
   if (player) player.draw(ctx);

   // 绘制队友
   if (isTeamMode && player) {
       const PEER_COLORS = ['#00ddff', '#ff66aa', '#66ff44', '#ffaa00'];
       let ci = 0;
       for (const [pid, peer] of teamPeers) {
           if (!peer.x) continue;
           const color = PEER_COLORS[ci % PEER_COLORS.length];
           const sx = peer.x - cameraX;
           const sy = peer.y - cameraY;
           ctx.save();
           ctx.globalAlpha = 0.7;
           ctx.beginPath();
           ctx.arc(sx, sy, 12, 0, Math.PI * 2);
           ctx.fillStyle = color;
           ctx.fill();
           ctx.strokeStyle = '#fff';
           ctx.lineWidth = 1.5;
           ctx.stroke();
           ctx.font = '10px Outfit';
           ctx.textAlign = 'center';
           ctx.fillStyle = color;
           ctx.fillText(peer.name || '队友', sx, sy - 18);
           if (peer.hp && peer.maxHp) {
               ctx.fillStyle = 'rgba(0,0,0,0.5)';
               ctx.fillRect(sx - 12, sy + 16, 24, 3);
               ctx.fillStyle = color;
               ctx.fillRect(sx - 12, sy + 16, 24 * (peer.hp / peer.maxHp), 3);
           }
           ctx.restore();
           ci++;
       }
   }

   ctx.restore();

   // 波次标题 (HUD overlay, not affected by camera)
   if (waveAnnounceTimer > 0) {
       const alpha = Math.min(1, waveAnnounceTimer / 0.5);
       ctx.save();
       ctx.globalAlpha = alpha;
       ctx.font = 'bold 28px Outfit';
       ctx.textAlign = 'center';
       if (waveResting) {
           ctx.fillStyle = '#44ff88';
           ctx.fillText('第 ' + (currentWave) + ' 波 完成！', canvas.width / 2, 80);
       } else {
           ctx.fillStyle = '#ff6644';
           ctx.fillText('— 第 ' + currentWave + ' 波 —', canvas.width / 2, 80);
       }
       ctx.restore();
   }

   // 敌人方向指示器
   if (player) {
       const margin = 30;
       const allThreats = [...enemies.filter(e => e.hp > 10), ...eliteEnemies, ...bosses];
       for (const e of allThreats) {
           const sx = e.x - cameraX;
           const sy = e.y - cameraY;
           if (sx > -10 && sx < canvas.width + 10 && sy > -10 && sy < canvas.height + 10) continue;
           const angle = Math.atan2(e.y - player.y, e.x - player.x);
           const ix = Math.max(margin, Math.min(canvas.width - margin, canvas.width / 2 + Math.cos(angle) * (canvas.width / 2 - margin)));
           const iy = Math.max(margin, Math.min(canvas.height - margin, canvas.height / 2 + Math.sin(angle) * (canvas.height / 2 - margin)));
           const isBoss = bosses.includes(e) || eliteEnemies.includes(e);
           ctx.save();
           ctx.translate(ix, iy);
           ctx.rotate(angle);
           ctx.beginPath();
           ctx.moveTo(10, 0);
           ctx.lineTo(-6, -6);
           ctx.lineTo(-6, 6);
           ctx.closePath();
           ctx.fillStyle = isBoss ? '#ffcc00' : 'rgba(255,60,60,0.7)';
           ctx.fill();
           ctx.restore();
       }
   }
}

function addXp(amount) {
    playerXp += Math.floor(amount * metaXpMult);
    if (playerXp >= nextLevelXp) {
        playerXp -= nextLevelXp;
        playerLevel++;
        nextLevelXp = Math.floor(nextLevelXp * diff.levelXpScale);
        triggerLevelUp();
    }
    updateHud();
}

function updateHud() {
    xpBar.style.width = `${(playerXp / nextLevelXp) * 100}%`;
    levelText.innerText = playerLevel;
    if (player) healthBar.style.width = `${(player.hp / player.maxHp) * 100}%`;
    
    // 任务进度显示
    const missionEl = document.getElementById('mission-display');
    if (missionEl && missionSystem.currentMission) {
        const m = missionSystem.currentMission;
        if (!m.completed) {
            missionEl.classList.remove('hidden');
            missionEl.innerHTML = `<span class="mission-label">任务</span> ${m.desc} <span class="mission-progress">${Math.min(m.progress, m.target)}/${m.target}</span>`;
        } else {
            missionEl.classList.add('hidden');
        }
    }
}

function applyChestReward() {
    const reward = missionSystem.getRandomReward();
    missionSystem.missionsCompleted++;
    
    switch (reward.type) {
        case 'heal':
            player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.3);
            break;
        case 'damage':
            playerDamageBonus += 3;
            break;
        case 'speed':
            player.speed += 15;
            break;
        case 'magnet':
            playerMagnetRadius += 30;
            break;
        case 'crit':
            playerCritChance = Math.min(0.5, playerCritChance + 0.05);
            break;
    }
    updateHud();
}

function applyDrop(drop, x, y) {
    switch (drop.type) {
        case 'fullHeal':
            player.hp = player.maxHp;
            damageNumbers.push(new DamageNumber(x, y - 20, '满血!', '#ff3366'));
            break;
        case 'magnetAll':
            // 吸引全场宝石
            for (let g of gems) {
                g.x = player.x + (Math.random() - 0.5) * 30;
                g.y = player.y + (Math.random() - 0.5) * 30;
            }
            damageNumbers.push(new DamageNumber(x, y - 20, '磁力!', '#ffaa00'));
            break;
        case 'shield':
            player.invincibleTimer = 3.0;
            damageNumbers.push(new DamageNumber(x, y - 20, '护盾3s!', '#00ccff'));
            break;
        case 'damageUp':
            playerDamageBonus += 5;
            damageNumbers.push(new DamageNumber(x, y - 20, 'ATK+5', '#ff6600'));
            break;
        case 'speedUp':
            player.speed += 20;
            damageNumbers.push(new DamageNumber(x, y - 20, 'SPD+20', '#66ff66'));
            break;
        case 'xpBoost':
            xpBoostTimer = 15;
            damageNumbers.push(new DamageNumber(x, y - 20, '双倍经验15s!', '#aa66ff'));
            break;
        case 'crateExplosion':
            // 清屏伤害
            for (let e of enemies) {
                e.hp -= 50;
                e.hitFlash = 0.15;
            }
            screenFlash.trigger('#ff0044', 0.3);
            shakeDuration = 0.3; shakeIntensity = 8;
            damageNumbers.push(new DamageNumber(x, y - 20, '爆裂!', '#ff0044'));
            break;
        case 'multiShot':
            projectileCount++;
            damageNumbers.push(new DamageNumber(x, y - 20, '弹幕+1', '#00ffaa'));
            break;
        case 'critUp':
            playerCritChance = Math.min(0.5, playerCritChance + 0.05);
            damageNumbers.push(new DamageNumber(x, y - 20, '暴击+5%', '#ffdd00'));
            break;
    }
    updateHud();
}

function triggerLevelUp() {
    gameState = 'UPGRADE';
    levelUpMenu.classList.remove('hidden');
    levelUpMenu.classList.add('active');

    const container = document.getElementById('upgrades-container');
    container.innerHTML = '';

    const SVG = {
        blade: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 2C8 2 5 6 5 10c0 2 .8 3.5 2 4.5L12 22l5-7.5c1.2-1 2-2.5 2-4.5 0-4-3-8-7-8z" fill="#00f0ff" opacity="0.85"/></svg>',
        lightning: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M7 2l-3 10h5l-2 10 10-14h-5L15 2H7z" fill="#aa88ff"/></svg>',
        aura: '<svg viewBox="0 0 24 24" width="28" height="28"><circle cx="12" cy="12" r="10" fill="none" stroke="#ff00ff" stroke-width="1" opacity="0.5"/><circle cx="12" cy="12" r="3" fill="#ff00ff" opacity="0.6"/></svg>',
        flame: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 2C9 6 5 8 5 13c0 4 3 7 7 7s7-3 7-7c0-5-4-7-7-11z" fill="#ff6600"/></svg>',
        mine: '<svg viewBox="0 0 24 24" width="28" height="28"><circle cx="12" cy="12" r="7" fill="#333" stroke="#ff003c" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="#ff003c" opacity="0.8"/></svg>',
        shuriken: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 2l2 8 8-2-6 6 6 6-8-2-2 8-2-8-8 2 6-6-6-6 8 2 2-8z" fill="#00ffaa"/></svg>',
        heal: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 4C8 4 4 7 4 11c0 5.5 8 10 8 10s8-4.5 8-10c0-4-4-7-8-7z" fill="#22cc66"/></svg>',
        damage: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="#ffcc00"/></svg>',
        armor: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 2L4 5v6c0 5.5 3.4 10 8 11 4.6-1 8-5.5 8-11V5l-8-3z" fill="#4488ff" opacity="0.85"/></svg>',
        maxHp: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 4C8 4 4 7 4 11c0 5.5 8 10 8 10s8-4.5 8-10c0-4-4-7-8-7z" fill="#ff3366"/></svg>',
        moveSpeed: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 2L4 7v6l8 5 8-5V7l-8-5z" fill="none" stroke="#00f0ff" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="#fff"/></svg>',
        critRate: '<svg viewBox="0 0 24 24" width="28" height="28"><circle cx="12" cy="12" r="9" fill="none" stroke="#ff003c" stroke-width="1.5"/><circle cx="12" cy="12" r="1.5" fill="#ff003c"/></svg>',
        cooldown: '<svg viewBox="0 0 24 24" width="28" height="28"><circle cx="12" cy="12" r="10" fill="none" stroke="#88ccff" stroke-width="1.5"/><path d="M12 6v6l4 4" stroke="#88ccff" stroke-width="2" stroke-linecap="round"/></svg>',
        areaSize: '<svg viewBox="0 0 24 24" width="28" height="28"><circle cx="12" cy="12" r="10" fill="none" stroke="#ffaa00" stroke-width="1" stroke-dasharray="3 2"/><circle cx="12" cy="12" r="5" fill="#ffaa00" opacity="0.3"/></svg>',
        magnetRange: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 6h4v2H4V6zm12 0h4v2h-4V6zM8 6v6a4 4 0 008 0V6h4v6a8 8 0 01-16 0V6h4z" fill="#ff3355"/></svg>',
        bolt: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="#ffcc00" stroke="#ffaa00" stroke-width="1"/></svg>',
        multishot: '<svg viewBox="0 0 24 24" width="28" height="28"><circle cx="12" cy="6" r="3" fill="#bbf000"/><circle cx="6" cy="15" r="3" fill="#bbf000" opacity="0.7"/><circle cx="18" cy="15" r="3" fill="#bbf000" opacity="0.7"/></svg>',
    };
    const wSvg = { orbitBlade: SVG.blade, lightning: SVG.lightning, aura: SVG.aura, fireTrail: SVG.flame, mine: SVG.mine, shuriken: SVG.shuriken };
    const upgrades = [];
    const evoOpts = evoManager.getUpgradeOptions();
    for (const opt of evoOpts) {
        if (opt.type === 'weaponNew') {
            upgrades.push({ name: '\u2728' + opt.name, desc: opt.desc, icon: wSvg[opt.weaponId] || SVG.blade, level: 0, maxLevel: 5, isNew: true, action: () => { evoManager.upgradeWeapon(opt.weaponId); activateWeapon(opt.weaponId); } });
        } else if (opt.type === 'weaponUpgrade') {
            const w = evoManager.getWeapon(opt.weaponId);
            upgrades.push({ name: opt.name, desc: opt.desc, icon: wSvg[opt.weaponId] || SVG.blade, level: opt.level, maxLevel: 5, isNew: false, action: () => { evoManager.upgradeWeapon(opt.weaponId); applyWeaponLevelUp(opt.weaponId, w.level + 1); } });
        } else if (opt.type === 'passive') {
            upgrades.push({ name: opt.name, desc: opt.desc, icon: SVG[opt.passiveId] || SVG.damage, level: opt.level, maxLevel: 5, isNew: false, action: () => { evoManager.upgradePassive(opt.passiveId); applyPassiveEffect(opt.passiveId); } });
        } else if (opt.type === 'heal') {
            upgrades.push({ name: opt.name, desc: opt.desc, icon: SVG.heal, level: 0, maxLevel: 0, isNew: false, action: () => { player.hp = Math.min(player.hp + 30, player.maxHp); } });
        }
    }
    upgrades.push({ name: '\u6b66\u5668\u8d85\u9891', desc: '\u5c04\u51fb\u9891\u7387\u63d0\u5347', icon: SVG.bolt, level: 0, maxLevel: 0, isNew: false, action: () => { currentWeaponCooldown *= 0.82; } });
    upgrades.push({ name: '\u591a\u91cd\u5c04\u51fb', desc: '\u5f39\u4e38+1', icon: SVG.multishot, level: 0, maxLevel: 0, isNew: false, action: () => { projectileCount += 1; } });
    for (let i = upgrades.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [upgrades[i], upgrades[j]] = [upgrades[j], upgrades[i]]; }
    upgrades.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    let selected = upgrades.slice(0, 3);
    selected.forEach((upg, index) => {
        const card = document.createElement('div');
        card.className = 'card' + (upg.isNew ? ' card-new-weapon' : '');
        card.style.animationDelay = index * 0.1 + 's';
        let stars = '';
        if (upg.maxLevel > 0) { for (let i = 0; i < upg.maxLevel; i++) stars += i < upg.level ? '\u2605' : '\u2606'; }
        card.innerHTML = '<div class="card-icon">' + upg.icon + '</div><h3>' + upg.name + '</h3>' + (stars ? '<div class="card-level">' + stars + '</div>' : '') + '<p>' + upg.desc + '</p>';
        card.onclick = () => { upg.action(); resumeGame(); };
        container.appendChild(card);
    });
}
function activateWeapon(wId) {
    switch (wId) {
        case 'orbitBlade': hasOrbitBlades = true; for (let i = 0; i < 3; i++) orbitBlades.push(new OrbitBlade(player, i, 3)); break;
        case 'lightning': hasLightning = true; lightningChain = new LightningChain(); break;
        case 'aura': hasAura = true; damageAura = new DamageAura(); break;
        case 'fireTrail': hasFireTrail = true; fireTrail = new FireTrail(); break;
        case 'mine': hasMine = true; explosiveMine = new ExplosiveMine(); break;
        case 'shuriken': hasShuriken = true; piercingShuriken = new PiercingShuriken(); break;
    }
}
function applyWeaponLevelUp(wId, newLevel) {
    switch (wId) {
        case 'orbitBlade': if (hasOrbitBlades) { let n = orbitBlades.length + (newLevel <= 3 ? 2 : 3); orbitBlades = []; for (let i = 0; i < n; i++) orbitBlades.push(new OrbitBlade(player, i, n)); } break;
        case 'lightning': if (lightningChain) { lightningChain.chainCount += (newLevel <= 3 ? 1 : 2); lightningChain.damage += 5; } break;
        case 'aura': if (damageAura) { damageAura.radius += 20; damageAura.damage += (newLevel <= 3 ? 2 : 4); } break;
        case 'fireTrail': if (fireTrail) { fireTrail.damage += 5; fireTrail.spawnCooldown = Math.max(0.05, fireTrail.spawnCooldown - 0.05); } break;
        case 'mine': if (explosiveMine) { explosiveMine.damage += 15; explosiveMine.radius += 20; } break;
        case 'shuriken': if (piercingShuriken) { piercingShuriken.pierceCount += 2; piercingShuriken.damage += 10; } break;
    }
}
function applyPassiveEffect(pid) {
    switch (pid) {
        case 'damage': playerDamageBonus += 5; break;
        case 'armor': metaArmorReduction += 0.05; break;
        case 'maxHp': player.maxHp += 25; player.hp += 25; break;
        case 'moveSpeed': player.speed += 15; break;
        case 'critRate': playerCritChance += 0.08; break;
        case 'cooldown': currentWeaponCooldown *= 0.92; break;
        case 'areaSize': break;
        case 'magnetRange': playerMagnetRadius += 30; break;
    }
}

function resumeGame() {
    levelUpMenu.classList.remove('active');
    levelUpMenu.classList.add('hidden');
    gameState = 'PLAYING';
    lastTime = performance.now();
    updateHud();
}

function startGame() {
  diff = diffConfigs[selectedDifficulty]; // 重新读取难度
  gameState = 'PLAYING';
  surviveTime = 0;
  lastTime = performance.now();
  
  player = new Player(canvas.width / 2, canvas.height / 2);
  player.maxHp = diff.playerHp;
  player.hp = diff.playerHp;
  player.speed = diff.playerSpeed;
  
  enemies = []; bosses = []; projectiles = [];
  particles = []; gems = []; damageNumbers = [];
  orbitBlades = []; lightningChain = null; damageAura = null;
  fireTrail = null; explosiveMine = null; piercingShuriken = null;
  hasOrbitBlades = false; hasLightning = false; hasAura = false;
  hasFireTrail = false; hasMine = false; hasShuriken = false;
  eliteEnemies = []; eliteSpawnTimer = 45;
  enemySpawnTimer = 0; weaponTimer = 0;
  
  // Reset evolution manager
  evoManager.reset();
  maxComboThisRun = 0;
  bossKillsThisRun = 0;
  
  // Apply meta bonuses
  const metaBonus = metaProg.getStartBonuses();
  player.maxHp = diff.playerHp + metaBonus.hp;
  player.hp = player.maxHp;
  player.speed = diff.playerSpeed + metaBonus.speed;
  
  playerXp = 0; playerLevel = 1; nextLevelXp = diff.levelXpBase;
  playerMagnetRadius = 80 + metaBonus.magnet; playerDamageBonus = metaBonus.damage;
  currentWeaponCooldown = 1.0; projectileCount = 1;
  killCount = 0; comboCount = 0; comboTimer = 0; xpMultiplier = 1; lastComboTier = -1;
  currentWave = 1; waveTimer = WAVE_DURATION; waveResting = false; waveAnnounceTimer = 2.0;
  achievementQueue.length = 0; achievementShowTimer = 0; unlockedAchievements.clear();
  playerCritChance = 0.0;
  metaXpMult = metaBonus.xpMult;
  metaArmorReduction = 0;
  nextBossTime = diff.bossInterval; bossWarningTimer = 0;
  shakeDuration = 0; shakeIntensity = 0;
  deathRings = []; sparkParticles = []; bossDeathWaves = [];
  
  // 地形和任务初始化
  terrains = generateTerrain(player.x, player.y);
  chests = [];
  breakableCrates = [];
  dropEffects = [];
  healthPickups = [];
  crateSpawnTimer = 5;
  xpBoostTimer = 0;
  lastTerrainX = player.x;
  lastTerrainY = player.y;
  missionSystem.reset();
  
  cameraX = player.x - canvas.width/2;
  cameraY = player.y - canvas.height/2;
  targetCameraX = cameraX; targetCameraY = cameraY;
  
  updateHud();
  if (killCountText) killCountText.innerText = '0';
  if (comboDisplay) comboDisplay.classList.add('hidden');
  if (bossWarning) bossWarning.classList.add('hidden');

  mainMenu.classList.remove('active'); mainMenu.classList.add('hidden');
  gameOverMenu.classList.remove('active'); gameOverMenu.classList.add('hidden');
  pauseMenu.classList.remove('active'); pauseMenu.classList.add('hidden');
  hud.classList.remove('hidden'); hud.classList.add('active');
  pauseBtn.classList.remove('hidden');
}

function triggerGameOver() {
  gameState = 'GAMEOVER';
  hud.classList.remove('active'); hud.classList.add('hidden');
  gameOverMenu.classList.remove('hidden'); gameOverMenu.classList.add('active');
  const minutes = Math.floor(surviveTime / 60).toString().padStart(2, '0');
  const seconds = Math.floor(surviveTime % 60).toString().padStart(2, '0');
  finalTimeText.innerText = `${minutes}:${seconds}`;
  if (finalKillsText) finalKillsText.innerText = killCount;
  if (finalLevelText) finalLevelText.innerText = playerLevel;

  // Gold reward
  const goldEarned = metaProg.calculateRunGold(killCount, surviveTime, bossKillsThisRun, maxComboThisRun);
  metaProg.addGold(goldEarned);

  // Show gold in game over screen
  let goldEl = document.getElementById('final-gold');
  if (!goldEl) {
    goldEl = document.createElement('div');
    goldEl.id = 'final-gold';
    goldEl.className = 'settlement-gold';
    const parent = finalTimeText.parentElement;
    if (parent) parent.appendChild(goldEl);
  }
  goldEl.innerHTML = '<span class="gold-icon"><svg viewBox="0 0 24 24" width="20" height="20" style="vertical-align:middle"><circle cx="12" cy="12" r="9" fill="#ffcc00"/><text x="12" y="16" text-anchor="middle" font-size="12" fill="#996600" font-weight="bold">$</text></svg></span> +' + goldEarned + ' <span class="gold-label">金币 (总计: ' + metaProg.gold + ')</span>';
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// pause system
function togglePause() {
  if (gameState === 'PLAYING') {
    gameState = 'PAUSED';
    pauseMenu.classList.remove('hidden');
    pauseMenu.classList.add('active');
    pauseBtn.classList.add('hidden');
  } else if (gameState === 'PAUSED') {
    resumeFromPause();
  }
}

function resumeFromPause() {
  gameState = 'PLAYING';
  lastTime = performance.now();
  pauseMenu.classList.remove('active');
  pauseMenu.classList.add('hidden');
  pauseBtn.classList.remove('hidden');
}

function quitToMenu() {
  gameState = 'MENU';
  pauseMenu.classList.remove('active');
  pauseMenu.classList.add('hidden');
  pauseBtn.classList.add('hidden');
  hud.classList.remove('active');
  hud.classList.add('hidden');
  mainMenu.classList.remove('hidden');
  mainMenu.classList.add('active');
}

pauseBtn.addEventListener('click', togglePause);
resumeBtn.addEventListener('click', resumeFromPause);
quitBtn.addEventListener('click', quitToMenu);

window.addEventListener('keydown', (e) => {
  // prevent space on buttons
  if (e.key === ' ' && e.target.tagName === 'BUTTON') {
    e.preventDefault();
    return;
  }
  if (e.key === 'p' || e.key === 'P') {
    if (gameState === 'PLAYING' || gameState === 'PAUSED') {
      togglePause();
    }
  }
});

requestAnimationFrame(autoLoop);

// Meta Upgrade System

function updateGoldDisplay() {
    if (goldDisplay) goldDisplay.innerText = metaProg.gold;
    if (metaGoldDisplay) metaGoldDisplay.innerText = metaProg.gold;
}

function renderMetaUpgrades() {
    const container = document.getElementById('meta-upgrades-container');
    if (!container) return;
    container.innerHTML = '';
    updateGoldDisplay();

    for (const [id, def] of Object.entries(META_UPGRADES)) {
        const level = metaProg.getLevel(id);
        const cost = metaProg.getCost(id);
        const canBuy = metaProg.canUpgrade(id);
        const maxed = level >= def.maxLevel;

        const card = document.createElement('div');
        card.className = 'meta-card' + (canBuy ? ' can-buy' : '') + (maxed ? ' maxed' : '');

        let stars = '';
        for (let i = 0; i < def.maxLevel; i++) stars += i < level ? '\u2605' : '\u2606';

        card.innerHTML = '<div class="meta-card-icon">' + def.icon + '</div>' +
            '<div class="meta-card-info">' +
            '<div class="meta-card-name">' + def.nameZh + '</div>' +
            '<div class="meta-card-level">' + stars + '</div>' +
            '<div class="meta-card-effect">+' + (def.perLevel >= 1 ? def.perLevel : Math.round(def.perLevel * 100) + '%') + '/\u7ea7</div>' +
            '</div>' +
            '<div class="meta-card-cost">' + (maxed ? '已满' : '<svg viewBox="0 0 24 24" width="14" height="14" style="vertical-align:middle"><circle cx="12" cy="12" r="9" fill="#ffcc00"/><text x="12" y="16" text-anchor="middle" font-size="12" fill="#996600" font-weight="bold">$</text></svg>' + cost) + '</div>';

        if (canBuy) {
            card.onclick = () => { metaProg.purchase(id); renderMetaUpgrades(); };
        }
        container.appendChild(card);
    }
}

if (metaUpgradeBtn) {
    metaUpgradeBtn.addEventListener('click', () => {
        mainMenu.classList.remove('active'); mainMenu.classList.add('hidden');
        metaUpgradeMenu.classList.remove('hidden'); metaUpgradeMenu.classList.add('active');
        renderMetaUpgrades();
    });
}
if (metaBackBtn) {
    metaBackBtn.addEventListener('click', () => {
        metaUpgradeMenu.classList.remove('active'); metaUpgradeMenu.classList.add('hidden');
        mainMenu.classList.remove('hidden'); mainMenu.classList.add('active');
        updateGoldDisplay();
    });
}

// Init gold display
updateGoldDisplay();

// ═══════════════════════════════════════
// 队伍系统 - 客户端
// ═══════════════════════════════════════
let teamWs = null;
let teamRoom = null;
let myPlayerId = null;
let isHost = false;
let isTeamMode = false;
const teamPeers = new Map(); // playerId -> { name, x, y, hp, maxHp, color }

const teamLobby = document.getElementById('team-lobby');
const joinDialog = document.getElementById('join-dialog');
const roomCodeEl = document.getElementById('room-code');
const lobbyPlayersEl = document.getElementById('lobby-players');
const lobbyStatusEl = document.getElementById('lobby-status');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const readyBtn = document.getElementById('ready-btn');
const startTeamBtn = document.getElementById('start-team-btn');
const leaveRoomBtn = document.getElementById('leave-room-btn');
const joinConfirmBtn = document.getElementById('join-confirm-btn');
const joinCancelBtn = document.getElementById('join-cancel-btn');
const roomCodeInput = document.getElementById('room-code-input');
const playerNameInput = document.getElementById('player-name-input');
const joinError = document.getElementById('join-error');
const copyCodeBtn = document.getElementById('copy-code-btn');

function getWsUrl() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return proto + '://' + location.host;
}

function connectTeam(action, roomCode, playerName) {
    if (teamWs) teamWs.close();
    teamWs = new WebSocket(getWsUrl());
    
    teamWs.onopen = () => {
        if (action === 'create') {
            teamWs.send(JSON.stringify({ type: 'create_room', name: playerName || '房主' }));
        } else {
            teamWs.send(JSON.stringify({ type: 'join_room', code: roomCode, name: playerName || '玩家' }));
        }
    };
    
    teamWs.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        switch (msg.type) {
            case 'room_created':
            case 'room_joined':
                myPlayerId = msg.playerId;
                teamRoom = msg.code;
                isHost = msg.type === 'room_created' || msg.hostId === msg.playerId;
                showLobby();
                break;
                
            case 'room_state':
                updateLobbyUI(msg);
                break;
                
            case 'game_start':
                isTeamMode = true;
                selectedDifficulty = msg.difficulty || 'normal';
                hideLobby();
                startGame();
                break;
                
            case 'peer_state':
                teamPeers.set(msg.playerId, { 
                    name: msg.name, 
                    ...msg.state 
                });
                break;
                
            case 'peer_dead':
                teamPeers.delete(msg.playerId);
                break;

            // 接收房主的敌人状态 (非房主客户端)
            case 'enemy_state':
                if (!isHost && isTeamMode) applyEnemyState(msg.d);
                break;

            // 房主接收队友的伤害
            case 'player_hit':
                if (isHost && isTeamMode) applyRemoteHit(msg.enemyId, msg.damage);
                break;

            // 接收伤害特效
            case 'hit_effect':
                if (!isHost && isTeamMode && msg.d) {
                    for (const h of msg.d) {
                        damageNumbers.push(new DamageNumber(h.x, h.y, String(h.dmg), h.c || '#fff'));
                    }
                }
                break;
                
            case 'error':
                if (joinError) joinError.textContent = msg.msg;
                if (lobbyStatusEl) lobbyStatusEl.textContent = msg.msg;
                break;
        }
    };
    
    teamWs.onclose = () => {
        if (lobbyStatusEl) lobbyStatusEl.textContent = '连接断开';
    };
}

function showLobby() {
    mainMenu.classList.remove('active'); mainMenu.classList.add('hidden');
    joinDialog.classList.remove('active'); joinDialog.classList.add('hidden');
    teamLobby.classList.remove('hidden'); teamLobby.classList.add('active');
    if (roomCodeEl) roomCodeEl.textContent = teamRoom;
}

function hideLobby() {
    teamLobby.classList.remove('active'); teamLobby.classList.add('hidden');
}

function updateLobbyUI(state) {
    if (roomCodeEl) roomCodeEl.textContent = state.code;
    isHost = state.hostId === myPlayerId;
    
    if (lobbyPlayersEl) {
        lobbyPlayersEl.innerHTML = state.players.map(p => {
            const badge = p.isHost ? '<span class="host-tag">房主</span>' : '';
            const readyIcon = p.ready ? '✅' : '⬜';
            const isMe = p.id === myPlayerId ? ' (你)' : '';
            return '<div class="lobby-player">' + readyIcon + ' ' + p.name + isMe + ' ' + badge + '</div>';
        }).join('');
    }
    
    if (startTeamBtn) startTeamBtn.style.display = isHost ? '' : 'none';
    if (lobbyStatusEl) lobbyStatusEl.textContent = state.players.length + '/4 玩家';
}

// 创建房间
if (createRoomBtn) {
    createRoomBtn.addEventListener('click', () => {
        const name = prompt('输入你的名字:', '房主') || '房主';
        connectTeam('create', null, name);
    });
}

// 加入房间 - 打开弹窗
if (joinRoomBtn) {
    joinRoomBtn.addEventListener('click', () => {
        mainMenu.classList.remove('active'); mainMenu.classList.add('hidden');
        joinDialog.classList.remove('hidden'); joinDialog.classList.add('active');
        if (joinError) joinError.textContent = '';
        if (roomCodeInput) roomCodeInput.value = '';
        if (playerNameInput) playerNameInput.value = '';
    });
}

if (joinConfirmBtn) {
    joinConfirmBtn.addEventListener('click', () => {
        const code = (roomCodeInput?.value || '').toUpperCase().trim();
        const name = (playerNameInput?.value || '').trim() || '玩家';
        if (code.length !== 6) {
            if (joinError) joinError.textContent = '请输入6位房间码';
            return;
        }
        connectTeam('join', code, name);
    });
}

if (joinCancelBtn) {
    joinCancelBtn.addEventListener('click', () => {
        joinDialog.classList.remove('active'); joinDialog.classList.add('hidden');
        mainMenu.classList.remove('hidden'); mainMenu.classList.add('active');
    });
}

// 准备
let myReady = false;
if (readyBtn) {
    readyBtn.addEventListener('click', () => {
        myReady = !myReady;
        readyBtn.textContent = myReady ? '取消准备' : '准备';
        readyBtn.style.borderColor = myReady ? '#44ff88' : '';
        if (teamWs?.readyState === 1) teamWs.send(JSON.stringify({ type: 'set_ready', ready: myReady }));
    });
}

// 房主开始
if (startTeamBtn) {
    startTeamBtn.addEventListener('click', () => {
        if (teamWs?.readyState === 1) teamWs.send(JSON.stringify({ type: 'start_game' }));
    });
}

// 离开房间
if (leaveRoomBtn) {
    leaveRoomBtn.addEventListener('click', () => {
        if (teamWs) teamWs.close();
        teamWs = null; teamRoom = null; isTeamMode = false;
        teamPeers.clear();
        hideLobby();
        mainMenu.classList.remove('hidden'); mainMenu.classList.add('active');
    });
}

// 复制房间码
if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', () => {
        if (teamRoom) {
            navigator.clipboard?.writeText(teamRoom);
            copyCodeBtn.textContent = '✅';
            setTimeout(() => { copyCodeBtn.textContent = '📋'; }, 1500);
        }
    });
}

// 定期同步自己的状态给队友
setInterval(() => {
    if (teamWs?.readyState === 1 && gameState === 'PLAYING' && player && isTeamMode) {
        teamWs.send(JSON.stringify({
            type: 'player_state',
            state: { x: player.x, y: player.y, hp: player.hp, maxHp: player.maxHp }
        }));
    }
}, 100); // 10fps 同步

// ═══ 房主: 广播敌人状态 ═══
setInterval(() => {
    if (!teamWs || teamWs.readyState !== 1 || !isHost || !isTeamMode || gameState !== 'PLAYING') return;

    // 压缩格式: [id, x, y, hp, maxHp, type, color]
    const eArr = enemies.map(e => [e.id, Math.round(e.x), Math.round(e.y), e.hp, e.maxHp, e.type || 'crawler', e.color]);
    const bArr = bosses.map(b => [b.id, Math.round(b.x), Math.round(b.y), b.hp, b.maxHp, 'boss', b.color, b.radius]);
    const elArr = eliteEnemies.map(el => [el.id, Math.round(el.x), Math.round(el.y), el.hp, el.maxHp, el.name || 'elite', el.color, el.radius]);

    teamWs.send(JSON.stringify({
        type: 'enemy_state',
        d: { e: eArr, b: bArr, el: elArr }
    }));
}, 100);

// ═══ 非房主: 接收并应用敌人状态 ═══
function applyEnemyState(data) {
    if (!data || isHost) return;

    // 同步普通敌人
    const eMap = new Map();
    for (const e of enemies) eMap.set(e.id, e);
    const newEnemies = [];
    for (const [id, x, y, hp, maxHp, type, color] of (data.e || [])) {
        let e = eMap.get(id);
        if (e) {
            e.x = x; e.y = y; e.hp = hp; e.maxHp = maxHp;
        } else {
            e = new Enemy(x, y, 0);
            e.id = id; e.hp = hp; e.maxHp = maxHp; e.color = color;
        }
        newEnemies.push(e);
    }
    enemies = newEnemies;

    // 同步Boss
    const bMap = new Map();
    for (const b of bosses) bMap.set(b.id, b);
    const newBosses = [];
    for (const [id, x, y, hp, maxHp, type, color, radius] of (data.b || [])) {
        let b = bMap.get(id);
        if (b) {
            b.x = x; b.y = y; b.hp = hp; b.maxHp = maxHp;
        } else {
            b = new Boss(x, y, 0);
            b.id = id; b.hp = hp; b.maxHp = maxHp; b.color = color;
            if (radius) b.radius = radius;
        }
        newBosses.push(b);
    }
    bosses = newBosses;

    // 同步精英
    const elMap = new Map();
    for (const el of eliteEnemies) elMap.set(el.id, el);
    const newElites = [];
    for (const [id, x, y, hp, maxHp, name, color, radius] of (data.el || [])) {
        let el = elMap.get(id);
        if (el) {
            el.x = x; el.y = y; el.hp = hp; el.maxHp = maxHp;
        } else {
            el = new EliteEnemy(x, y, 0);
            el.id = id; el.hp = hp; el.maxHp = maxHp; el.color = color; el.name = name;
            if (radius) el.radius = radius;
        }
        newElites.push(el);
    }
    eliteEnemies = newElites;
}

// ═══ 房主: 处理队友的伤害 ═══
function applyRemoteHit(enemyId, damage) {
    if (!isHost) return;
    const allTargets = [...enemies, ...bosses, ...eliteEnemies];
    for (const t of allTargets) {
        if (t.id === enemyId) {
            t.hp -= damage;
            t.hitFlash = 0.15;
            damageNumbers.push(new DamageNumber(t.x, t.y, String(Math.round(damage)), '#00ddff'));
            // 广播特效给其他人
            if (teamWs?.readyState === 1) {
                teamWs.send(JSON.stringify({
                    type: 'hit_effect',
                    d: [{ x: Math.round(t.x), y: Math.round(t.y), dmg: Math.round(damage), c: '#00ddff' }]
                }));
            }
            break;
        }
    }
}

// ═══ 非房主: 发送伤害给房主 ═══
// 重写 projectile 碰撞，非房主命中时发送给房主而不是直接扣血
const origFireWeapon = fireWeapon;
// 在 update 中，非房主的 projectile 碰撞需要发送 player_hit
// 我们 hook 进 projectile 碰撞检测
