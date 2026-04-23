// ==========================================
// 旋转护盾??围绕玩家旋转的能量刀?// ==========================================
export class OrbitBlade {
    constructor(player, index, totalBlades) {
        this.player = player;
        this.angle = (Math.PI * 2 / totalBlades) * index;
        this.orbitRadius = 70;
        this.speed = 2.5;
        this.damage = 8;
        this.bladeLength = 22;
        this.bladeWidth = 6;
        this.color = '#00f0ff';
        this.hitCooldowns = new Map();
        this.trail = [];
    }

    update(dt) {
        this.angle += this.speed * dt;
        for (let [id, time] of this.hitCooldowns) {
            this.hitCooldowns.set(id, time - dt);
            if (time - dt <= 0) this.hitCooldowns.delete(id);
        }
        // 刀刃拖
    const x = this.getX(), y = this.getY();
        this.trail.push({ x, y, alpha: 0.5 });
        if (this.trail.length > 8) this.trail.shift();
        for (let t of this.trail) t.alpha -= dt * 3;
    }

    getX() { return this.player.x + Math.cos(this.angle) * this.orbitRadius; }
    getY() { return this.player.y + Math.sin(this.angle) * this.orbitRadius; }
    canHit(enemyId) { return !this.hitCooldowns.has(enemyId); }
    registerHit(enemyId) { this.hitCooldowns.set(enemyId, 0.3); }

    draw(ctx) {
        // 拖尾
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            if (t.alpha <= 0) continue;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 3 + i * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 200, 255, ${t.alpha * 0.15})`;
            ctx.fill();
        }

        const x = this.getX(), y = this.getY();
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.angle + Math.PI / 2);

        // 外围能量
    ctx.beginPath();
        ctx.ellipse(0, 0, this.bladeWidth + 4, this.bladeLength + 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 200, 255, 0.06)';
        ctx.fill();

        // 刀刃主??菱形
        ctx.beginPath();
        ctx.moveTo(0, -this.bladeLength);
        ctx.lineTo(this.bladeWidth, 0);
        ctx.lineTo(0, this.bladeLength * 0.4);
        ctx.lineTo(-this.bladeWidth, 0);
        ctx.closePath();
        const bladeGrad = ctx.createLinearGradient(0, -this.bladeLength, 0, this.bladeLength * 0.4);
        bladeGrad.addColorStop(0, '#ffffff');
        bladeGrad.addColorStop(0.3, '#66eeff');
        bladeGrad.addColorStop(1, '#0088cc');
        ctx.fillStyle = bladeGrad;
        ctx.shadowBlur = 0;
        ctx.shadowColor = this.color;
        ctx.fill();

        // 核心高光
        ctx.beginPath();
        ctx.ellipse(0, -this.bladeLength * 0.3, 2, 6, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.restore();

        // 轨道虚线
        ctx.beginPath();
        ctx.arc(this.player.x, this.player.y, this.orbitRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 10]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

// ==========================================
// 闪电??自动连锁跳跃电击
// ==========================================
export class LightningChain {
    constructor() {
        this.cooldown = 2.0;
        this.timer = 0;
        this.damage = 15;
        this.chainCount = 3;
        this.range = 200;
        this.color = '#aa88ff';
        this.activeChains = [];
    }

    update(dt, player, enemies, onHitCallback) {
        this.timer -= dt;
        for (let i = this.activeChains.length - 1; i >= 0; i--) {
            this.activeChains[i].life -= dt;
            if (this.activeChains[i].life <= 0) this.activeChains.splice(i, 1);
        }
        if (this.timer <= 0 && enemies.length > 0) {
            this.timer = this.cooldown;
            this.fire(player, enemies, onHitCallback);
        }
    }

    fire(player, enemies, onHitCallback) {
        let hitSet = new Set();
        let currentX = player.x, currentY = player.y;
        for (let c = 0; c < this.chainCount; c++) {
            let nearest = null, minDist = this.range;
            for (let e of enemies) {
                if (hitSet.has(e)) continue;
                let dist = Math.sqrt((currentX - e.x)**2 + (currentY - e.y)**2);
                if (dist < minDist) { minDist = dist; nearest = e; }
            }
            if (!nearest) break;
            // 生成多条分支闪电线段
            const segs = [];
            const steps = 8;
            const dx = (nearest.x - currentX) / steps;
            const dy = (nearest.y - currentY) / steps;
            for (let i = 0; i <= steps; i++) {
                const jx = i === 0 || i === steps ? 0 : (Math.random() - 0.5) * 25;
                const jy = i === 0 || i === steps ? 0 : (Math.random() - 0.5) * 25;
                segs.push({ x: currentX + dx * i + jx, y: currentY + dy * i + jy });
            }
            this.activeChains.push({ segs, life: 0.2 });
            // 分支
            if (Math.random() > 0.4) {
                const branchStart = Math.floor(steps * 0.3) + Math.floor(Math.random() * 3);
                const bSegs = [];
                const base = segs[branchStart];
                for (let i = 0; i < 4; i++) {
                    bSegs.push({
                        x: base.x + (Math.random() - 0.5) * 15 * (i + 1),
                        y: base.y + (Math.random() - 0.5) * 15 * (i + 1)
                    });
                }
                this.activeChains.push({ segs: bSegs, life: 0.12 });
            }
            onHitCallback(nearest, this.damage);
            hitSet.add(nearest);
            currentX = nearest.x; currentY = nearest.y;
        }
    }

    draw(ctx) {
        for (let chain of this.activeChains) {
            const alpha = chain.life / 0.2;
            if (chain.segs.length < 2) continue;

            // 外层粗发
    ctx.beginPath();
            ctx.moveTo(chain.segs[0].x, chain.segs[0].y);
            for (let i = 1; i < chain.segs.length; i++) {
                ctx.lineTo(chain.segs[i].x, chain.segs[i].y);
            }
            ctx.strokeStyle = `rgba(170, 136, 255, ${alpha * 0.3})`;
            ctx.lineWidth = 6;
            ctx.shadowBlur = 0;
            ctx.shadowColor = '#aa88ff';
            ctx.stroke();

            // 内层亮线
            ctx.beginPath();
            ctx.moveTo(chain.segs[0].x, chain.segs[0].y);
            for (let i = 1; i < chain.segs.length; i++) {
                ctx.lineTo(chain.segs[i].x, chain.segs[i].y);
            }
            ctx.strokeStyle = `rgba(220, 200, 255, ${alpha * 0.8})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 白芯
            ctx.beginPath();
            ctx.moveTo(chain.segs[0].x, chain.segs[0].y);
            for (let i = 1; i < chain.segs.length; i++) {
                ctx.lineTo(chain.segs[i].x, chain.segs[i].y);
            }
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // 端点光点
            const last = chain.segs[chain.segs.length - 1];
            ctx.beginPath();
            ctx.arc(last.x, last.y, 4 * alpha, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
            ctx.fill();

            ctx.shadowBlur = 0;
        }
    }
}

// ==========================================
// 力场光环 ?持续对周围敌人造成伤害
// ==========================================
export class DamageAura {
    constructor() {
        this.radius = 80;
        this.damage = 3;
        this.pulseCooldown = 0.5;
        this.pulseTimer = 0;
        this.color = '#ff00ff';
        this.pulseVisual = 0;
        this.rotPhase = 0;
    }

    update(dt, player, enemies, onHitCallback) {
        this.pulseTimer -= dt;
        this.rotPhase += dt * 1.5;
        if (this.pulseVisual > 0) this.pulseVisual -= dt * 3;
        if (this.pulseTimer <= 0) {
            this.pulseTimer = this.pulseCooldown;
            this.pulseVisual = 1.0;
            for (let e of enemies) {
                let dist = Math.sqrt((player.x - e.x)**2 + (player.y - e.y)**2);
                if (dist < this.radius) onHitCallback(e, this.damage);
            }
        }
    }

    draw(ctx, player) {
        if (!player) return;
        ctx.save();
        ctx.translate(player.x, player.y);

        // 旋转六边形边
    ctx.save();
        ctx.rotate(this.rotPhase);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i;
            const px = Math.cos(a) * this.radius;
            const py = Math.sin(a) * this.radius;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(255, 0, 255, 0.12)`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // 内层反向旋转
        ctx.save();
        ctx.rotate(-this.rotPhase * 0.7);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i + Math.PI / 6;
            const px = Math.cos(a) * this.radius * 0.6;
            const py = Math.sin(a) * this.radius * 0.6;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(255, 100, 255, 0.08)`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();

        // 径向光线
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI / 4) * i + this.rotPhase * 0.3;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * 15, Math.sin(a) * 15);
            ctx.lineTo(Math.cos(a) * this.radius * 0.9, Math.sin(a) * this.radius * 0.9);
            ctx.strokeStyle = `rgba(255, 0, 255, 0.05)`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        // 脉冲
    if (this.pulseVisual > 0) {
            const er = this.radius * (1 + (1 - this.pulseVisual) * 0.4);
            const grad = ctx.createRadialGradient(0, 0, this.radius * 0.8, 0, 0, er);
            grad.addColorStop(0, `rgba(255, 0, 255, 0)`);
            grad.addColorStop(0.7, `rgba(255, 0, 255, ${this.pulseVisual * 0.15})`);
            grad.addColorStop(1, `rgba(255, 0, 255, 0)`);
            ctx.beginPath();
            ctx.arc(0, 0, er, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(0, 0, er, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 150, 255, ${this.pulseVisual * 0.25})`;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 0;
            ctx.shadowColor = '#ff00ff';
            ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ==========================================
// 烈焰小径 ?移动时留下等离子灼烧地带
// ==========================================
export class FireTrail {
    constructor() {
        this.zones = [];
        this.damage = 5;
        this.spawnCooldown = 0.15;
        this.spawnTimer = 0;
        this.color = '#ff6600';
    }

    update(dt, player, enemies, onHitCallback) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && (player.dx !== 0 || player.dy !== 0)) {
            this.spawnTimer = this.spawnCooldown;
            // 散布多个小焰
    for (let k = 0; k < 2; k++) {
                this.zones.push({
                    x: player.x + (Math.random() - 0.5) * 12,
                    y: player.y + (Math.random() - 0.5) * 12,
                    life: 2.5,
                    maxLife: 2.5,
                    radius: 14 + Math.random() * 8,
                    hitTimer: 0,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }

        for (let i = this.zones.length - 1; i >= 0; i--) {
            let zone = this.zones[i];
            zone.life -= dt;
            zone.phase += dt * 6;
            if (zone.life <= 0) { this.zones.splice(i, 1); continue; }
            zone.hitTimer -= dt;
            if (zone.hitTimer <= 0) {
                zone.hitTimer = 0.5;
                for (let e of enemies) {
                    let dist = Math.sqrt((zone.x - e.x)**2 + (zone.y - e.y)**2);
                    if (dist < zone.radius + e.radius) onHitCallback(e, this.damage);
                }
            }
        }
    }

    draw(ctx) {
        for (let zone of this.zones) {
            const lifeRatio = zone.life / zone.maxLife;
            const r = zone.radius * (0.6 + lifeRatio * 0.4);
            const flicker = 0.8 + Math.sin(zone.phase) * 0.2;

            // 外层 暗红/橙色散射
    const outerGrad = ctx.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, r * 1.4);
            outerGrad.addColorStop(0, `rgba(255, 100, 0, ${lifeRatio * 0.12 * flicker})`);
            outerGrad.addColorStop(0.6, `rgba(200, 50, 0, ${lifeRatio * 0.06})`);
            outerGrad.addColorStop(1, 'rgba(100, 20, 0, 0)');
            ctx.beginPath();
            ctx.arc(zone.x, zone.y, r * 1.4, 0, Math.PI * 2);
            ctx.fillStyle = outerGrad;
            ctx.fill();

            // 中层 ?橙色核心
            const midGrad = ctx.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, r);
            midGrad.addColorStop(0, `rgba(255, 180, 50, ${lifeRatio * 0.25 * flicker})`);
            midGrad.addColorStop(0.5, `rgba(255, 100, 0, ${lifeRatio * 0.15})`);
            midGrad.addColorStop(1, `rgba(200, 60, 0, 0)`);
            ctx.beginPath();
            ctx.arc(zone.x, zone.y, r, 0, Math.PI * 2);
            ctx.fillStyle = midGrad;
            ctx.fill();

            // 内层 ?白黄亮点
            if (lifeRatio > 0.3) {
                const innerR = r * 0.3;
                const innerGrad = ctx.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, innerR);
                innerGrad.addColorStop(0, `rgba(255, 255, 220, ${lifeRatio * 0.3 * flicker})`);
                innerGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');
                ctx.beginPath();
                ctx.arc(zone.x, zone.y, innerR, 0, Math.PI * 2);
                ctx.fillStyle = innerGrad;
                ctx.fill();
            }
        }
    }
}

// ==========================================
// 爆裂雷弹 ?定期投放会爆炸的地雷
// ==========================================
export class ExplosiveMine {
    constructor() {
        this.mines = [];
        this.damage = 30;
        this.radius = 80;
        this.spawnCooldown = 3.0;
        this.spawnTimer = 0;
        this.color = '#ff003c';
        this.explosions = [];
    }

    update(dt, player, enemies, onHitCallback) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = this.spawnCooldown;
            this.mines.push({ x: player.x, y: player.y, life: 5.0, phase: 0 });
        }
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            this.explosions[i].life -= dt;
            if (this.explosions[i].life <= 0) this.explosions.splice(i, 1);
        }
        for (let i = this.mines.length - 1; i >= 0; i--) {
            let mine = this.mines[i];
            mine.life -= dt;
            mine.phase += dt * 8;
            let triggered = false;
            if (mine.life > 0) {
                for (let e of enemies) {
                    if ((mine.x - e.x)**2 + (mine.y - e.y)**2 < (15 + e.radius)**2) {
                        triggered = true; break;
                    }
                }
            }
            if (mine.life <= 0 || triggered) {
                this.explode(mine.x, mine.y, enemies, onHitCallback);
                this.mines.splice(i, 1);
            }
        }
    }

    explode(x, y, enemies, onHitCallback) {
        this.explosions.push({ x, y, radius: this.radius, life: 0.35, maxLife: 0.35 });
        for (let e of enemies) {
            if ((x - e.x)**2 + (y - e.y)**2 < (this.radius + e.radius)**2) {
                onHitCallback(e, this.damage);
            }
        }
    }

    draw(ctx) {
        // 地雷
        for (let mine of this.mines) {
            const urgency = 1 - mine.life / 5.0;
            const blinkRate = 5 + urgency * 20;
            const blink = Math.sin(mine.phase * blinkRate / 8) > 0;

            // 危险范围渐变
    const rangeGrad = ctx.createRadialGradient(mine.x, mine.y, 0, mine.x, mine.y, this.radius);
            rangeGrad.addColorStop(0, `rgba(255, 0, 60, ${0.02 + urgency * 0.03})`);
            rangeGrad.addColorStop(1, 'rgba(255, 0, 60, 0)');
            ctx.beginPath();
            ctx.arc(mine.x, mine.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = rangeGrad;
            ctx.fill();

            // 地雷核心
            ctx.beginPath();
            ctx.arc(mine.x, mine.y, 7, 0, Math.PI * 2);
            ctx.fillStyle = '#1a0010';
            ctx.shadowBlur = 0;
            ctx.shadowColor = this.color;
            ctx.fill();
            ctx.strokeStyle = blink ? '#ffffff' : this.color;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 内核闪烁
    ctx.beginPath();
            ctx.arc(mine.x, mine.y, blink ? 3 : 2, 0, Math.PI * 2);
            ctx.fillStyle = blink ? '#ffffff' : '#ff6688';
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // 爆炸
        for (let exp of this.explosions) {
            const t = 1 - exp.life / exp.maxLife; // 0
    const r = exp.radius * (0.3 + t * 0.7);

            // 外环冲击
    ctx.beginPath();
            ctx.arc(exp.x, exp.y, r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 200, 100, ${(1 - t) * 0.6})`;
            ctx.lineWidth = 3 * (1 - t);
            ctx.shadowBlur = 0;
            ctx.shadowColor = '#ff6600';
            ctx.stroke();

            // 火球核心
            const fireGrad = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, r * 0.7);
            fireGrad.addColorStop(0, `rgba(255, 255, 200, ${(1 - t) * 0.5})`);
            fireGrad.addColorStop(0.3, `rgba(255, 150, 0, ${(1 - t) * 0.3})`);
            fireGrad.addColorStop(0.7, `rgba(255, 50, 0, ${(1 - t) * 0.15})`);
            fireGrad.addColorStop(1, 'rgba(100, 0, 0, 0)');
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, r * 0.7, 0, Math.PI * 2);
            ctx.fillStyle = fireGrad;
            ctx.fill();

            ctx.shadowBlur = 0;
        }
    }
}

// ==========================================
// 穿透飞??发射可穿透多个敌人的能量星镖
// ==========================================
export class PiercingShuriken {
    constructor() {
        this.shurikens = [];
        this.damage = 15;
        this.speed = 350;
        this.spawnCooldown = 2.5;
        this.spawnTimer = 0;
        this.color = '#00ffaa';
        this.pierceCount = 3;
    }

    update(dt, player, enemies, onHitCallback) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = this.spawnCooldown;
            
            // 扫描12个方向，选怪最多的方向
            let bestAngle = Math.random() * Math.PI * 2;
            let bestCount = 0;
            const sectors = 12;
            const sectorAngle = (Math.PI * 2) / sectors;
            const scanRange = 300;
            
            for (let s = 0; s < sectors; s++) {
                const centerA = sectorAngle * s;
                let count = 0;
                for (let e of enemies) {
                    const dx = e.x - player.x, dy = e.y - player.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > scanRange) continue;
                    let eAngle = Math.atan2(dy, dx);
                    let diff = eAngle - centerA;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    if (Math.abs(diff) < sectorAngle * 0.6) count++;
                }
                if (count > bestCount) {
                    bestCount = count;
                    bestAngle = centerA;
                }
            }
            
            this.shurikens.push({
                x: player.x, y: player.y,
                dx: Math.cos(bestAngle) * this.speed,
                dy: Math.sin(bestAngle) * this.speed,
                rot: 0, hits: new Map(), hitCount: 0, life: 3.0,
                trail: []
            });
        }
        for (let i = this.shurikens.length - 1; i >= 0; i--) {
            let shur = this.shurikens[i];
            shur.x += shur.dx * dt;
            shur.y += shur.dy * dt;
            shur.rot += 15 * dt;
            shur.life -= dt;
            // 拖尾
            shur.trail.push({ x: shur.x, y: shur.y, a: 0.4 });
            if (shur.trail.length > 6) shur.trail.shift();
            for (let t of shur.trail) t.a -= dt * 3;

            for (let [id, time] of shur.hits) {
                shur.hits.set(id, time - dt);
                if (time - dt <= 0) shur.hits.delete(id);
            }
            if (shur.life <= 0 || shur.hitCount >= this.pierceCount) {
                this.shurikens.splice(i, 1); continue;
            }
            for (let e of enemies) {
                const eid = enemies.indexOf(e);
                if (!shur.hits.has(eid)) {
                    if ((shur.x - e.x)**2 + (shur.y - e.y)**2 < (12 + e.radius)**2) {
                        onHitCallback(e, this.damage);
                        shur.hits.set(eid, 1.0);
                        shur.hitCount++;
                        if (shur.hitCount >= this.pierceCount) break;
                    }
                }
            }
        }
    }

    draw(ctx) {
        for (let shur of this.shurikens) {
            // 拖尾
            for (let i = 0; i < shur.trail.length; i++) {
                const t = shur.trail[i];
                if (t.a <= 0) continue;
                ctx.beginPath();
                ctx.arc(t.x, t.y, 3 + i * 0.3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 255, 170, ${t.a * 0.12})`;
                ctx.fill();
            }

            ctx.save();
            ctx.translate(shur.x, shur.y);
            ctx.rotate(shur.rot);

            // 六芒星镖
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const outerA = (Math.PI / 3) * i - Math.PI / 2;
                const innerA = outerA + Math.PI / 6;
                ctx.lineTo(Math.cos(outerA) * 13, Math.sin(outerA) * 13);
                ctx.lineTo(Math.cos(innerA) * 5, Math.sin(innerA) * 5);
            }
            ctx.closePath();

            ctx.fillStyle = '#001a10';
            ctx.shadowBlur = 0;
            ctx.shadowColor = this.color;
            ctx.fill();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 核心
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }
}
