// ══════════════════════════════════════════?//  VFX.js ?全局视觉特效引擎
// ══════════════════════════════════════════?
// ─── 星空背景 (视差滚动) ───
export class Starfield {
    constructor(count = 120) {
        this.stars = [];
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * 4000 - 2000,
                y: Math.random() * 4000 - 2000,
                r: Math.random() * 1.5 + 0.3,
                twinkle: Math.random() * Math.PI * 2,
                speed: 0.1 + Math.random() * 0.3, // 视差系数
                color: ['#ffffff','#aaddff','#ffddaa','#ddaaff'][Math.floor(Math.random()*4)]
            });
        }
    }

    draw(ctx, cameraX, cameraY, time) {
        for (let s of this.stars) {
            const sx = (s.x - cameraX * s.speed) % 4000;
            const sy = (s.y - cameraY * s.speed) % 4000;
            const twinkle = 0.3 + Math.sin(time * 2 + s.twinkle) * 0.3;
            
            ctx.globalAlpha = twinkle;
            ctx.beginPath();
            ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
            ctx.fillStyle = s.color;
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}

// ─── 环境光粒?(世界空间中缓慢漂? ───
export class AmbientParticles {
    constructor(count = 40) {
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * 3000 - 1500,
                y: Math.random() * 3000 - 1500,
                r: Math.random() * 4 + 2,
                dx: (Math.random() - 0.5) * 8,
                dy: (Math.random() - 0.5) * 8,
                phase: Math.random() * Math.PI * 2,
                color: ['#00f0ff','#ff00ff','#bbf000','#ff6600'][Math.floor(Math.random()*4)]
            });
        }
    }

    update(dt) {
        for (let p of this.particles) {
            p.x += p.dx * dt;
            p.y += p.dy * dt;
            p.phase += dt * 0.8;
        }
    }

    draw(ctx, time) {
        for (let p of this.particles) {
            const alpha = 0.04 + Math.sin(p.phase) * 0.03;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 0;
            ctx.shadowColor = p.color;
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
}

// ─── 屏幕闪烁 (击杀/暴击时全屏闪? ───
export class ScreenFlash {
    constructor() {
        this.flashes = []; // {color, alpha, decay}
    }

    trigger(color = '#ffffff', intensity = 0.3) {
        this.flashes.push({ color, alpha: intensity });
    }

    update(dt) {
        for (let i = this.flashes.length - 1; i >= 0; i--) {
            this.flashes[i].alpha -= dt * 3;
            if (this.flashes[i].alpha <= 0) this.flashes.splice(i, 1);
        }
    }

    draw(ctx, w, h) {
        for (let f of this.flashes) {
            ctx.globalAlpha = f.alpha;
            ctx.fillStyle = f.color;
            ctx.fillRect(0, 0, w, h);
        }
        ctx.globalAlpha = 1;
    }
}

// ─── 暗角 (Vignette) ───
export function drawVignette(ctx, w, h) {
    const gradient = ctx.createRadialGradient(w/2, h/2, w*0.25, w/2, h/2, w*0.75);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
}

// ─── 死亡爆炸光环 ───
export class DeathRing {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 5;
        this.maxRadius = 50;
        this.life = 0.35;
        this.maxLife = 0.35;
    }

    update(dt) {
        this.life -= dt;
        const progress = 1 - (this.life / this.maxLife);
        this.radius = 5 + (this.maxRadius - 5) * progress;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3 * alpha;
        ctx.globalAlpha = alpha * 0.8;
        ctx.shadowBlur = 0;
        ctx.shadowColor = this.color;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
}

// ─── 拖尾闪光粒子 (更高级的粒子) ───
export class SparkParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 250 + 80;
        this.dx = Math.cos(angle) * speed;
        this.dy = Math.sin(angle) * speed;
        
        this.life = 0.3 + Math.random() * 0.4;
        this.maxLife = this.life;
        this.length = 4 + Math.random() * 8; // 拖尾长度
    }

    update(dt) {
        this.x += this.dx * dt;
        this.y += this.dy * dt;
        this.dx *= 0.96;
        this.dy *= 0.96;
        this.life -= dt;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        const speed = Math.sqrt(this.dx**2 + this.dy**2);
        if (speed < 1) return;
        
        const tailX = this.x - (this.dx / speed) * this.length;
        const tailY = this.y - (this.dy / speed) * this.length;
        
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2 * alpha;
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 0;
        ctx.shadowColor = this.color;
        ctx.stroke();
        
        // 头部亮点
        ctx.beginPath();
        ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
}

// ─── Boss 死亡特效（巨大冲击波）───
export class BossDeathWave {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.maxRadius = 300;
        this.life = 0.6;
        this.maxLife = 0.6;
    }

    update(dt) {
        this.life -= dt;
        const progress = 1 - (this.life / this.maxLife);
        // 先快后慢的缓
    const eased = 1 - Math.pow(1 - progress, 3);
        this.radius = 10 + (this.maxRadius - 10) * eased;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        
        // 外圈
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 4 * alpha;
        ctx.globalAlpha = alpha * 0.6;
        ctx.shadowBlur = 0;
        ctx.shadowColor = '#ffcc00';
        ctx.stroke();
        
        // 内圈
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * alpha;
        ctx.globalAlpha = alpha * 0.3;
        ctx.stroke();
        
        // 填充闪光
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, `rgba(255, 204, 0, ${alpha * 0.15})`);
        gradient.addColorStop(1, `rgba(255, 204, 0, 0)`);
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 1;
        ctx.fill();
        
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
}
