const ENEMY_TYPES = [
    { name: 'crawler', speed: 140, hp: 20, color: '#ff3355', glowColor: '#ff0033',
      radiusBase: 14 },
    { name: 'golem', speed: 70, hp: 60, color: '#ff8800', glowColor: '#ff6600',
      radiusBase: 18 },
    { name: 'wraith', speed: 200, hp: 15, color: '#cc44ff', glowColor: '#aa22ff',
      radiusBase: 12 },
];

export class Enemy {
    constructor(x, y, difficulty) {
        this.x = x;
        this.y = y;
        
        let typeIndex = 0;
        if (difficulty > 30) typeIndex = Math.floor(Math.random() * 2);
        if (difficulty > 60) typeIndex = Math.floor(Math.random() * 3);
        
        const type = ENEMY_TYPES[typeIndex];
        this.type = type.name;
        this.speed = type.speed + Math.random() * 20;
        this.color = type.color;
        this.glowColor = type.glowColor;
        
        const hpScale = 1 + difficulty * 0.025;
        this.hp = Math.floor(type.hp * hpScale);
        this.maxHp = this.hp;
        this.radius = type.radiusBase;
        
        this.hitFlash = 0;
        this.phase = Math.random() * Math.PI * 2;
        this.facingAngle = 0;
    }

    update(dt, playerX, playerY, terrains) {
        let dx = playerX - this.x;
        let dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            dx /= dist; dy /= dist;

            // 障碍物绕行AI
            let moveX = dx, moveY = dy;
            if (terrains && terrains.length > 0) {
                const lookahead = this.radius * 3;
                const probeX = this.x + dx * lookahead;
                const probeY = this.y + dy * lookahead;

                for (const t of terrains) {
                    // 快速距离剔
    const tdx = this.x - t.x, tdy = this.y - t.y;
                    const tDist = Math.sqrt(tdx * tdx + tdy * tdy);
                    if (tDist > t.radius * 2 + lookahead) continue;

                    // 检查前方探测点是否在障碍物多边形内
                    if (this._pointInPoly(probeX, probeY, t.worldPoly)) {
                        // 计算两个切线方向（左转和右转90度）
                        const leftX = -dy, leftY = dx;   // 左转
                        const rightX = dy, rightY = -dx;  // 右转

                        // 选择更接近玩家的方向
                        const leftDot = leftX * dx + leftY * dy;
                        const rightDot = rightX * dx + rightY * dy;

                        // 混合?0%绕行 + 30%朝玩家，避免完全停滞
                        if (leftDot >= rightDot) {
                            moveX = leftX * 0.7 + dx * 0.3;
                            moveY = leftY * 0.7 + dy * 0.3;
                        } else {
                            moveX = rightX * 0.7 + dx * 0.3;
                            moveY = rightY * 0.7 + dy * 0.3;
                        }

                        // 归一
    const mLen = Math.sqrt(moveX * moveX + moveY * moveY);
                        if (mLen > 0) { moveX /= mLen; moveY /= mLen; }
                        break; // 只处理最近的一个障碍物
                    }
                }
            }

            this.x += moveX * this.speed * dt;
            this.y += moveY * this.speed * dt;
            this.facingAngle = Math.atan2(moveY, moveX);
        }
        if (this.hitFlash > 0) this.hitFlash -= dt;
        this.phase += dt * 3;
    }

    // point in poly
    _pointInPoly(px, py, verts) {
        let inside = false;
        for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
            const xi = verts[i].x, yi = verts[i].y;
            const xj = verts[j].x, yj = verts[j].y;
            if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }
        return inside;
    }

    draw(ctx) {
        const isHit = this.hitFlash > 0;
        const r = this.radius;
        const glow = isHit ? '#ffffff' : this.glowColor;

        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.type === 'crawler') {
            this.drawCrawler(ctx, r, isHit, glow);
        } else if (this.type === 'golem') {
            this.drawGolem(ctx, r, isHit, glow);
        } else {
            this.drawWraith(ctx, r, isHit, glow);
        }

        ctx.restore();

        // ── HP ?──
        if (this.hp < this.maxHp) {
            const barW = this.radius * 2.2;
            const barH = 2.5;
            const bx = this.x - barW / 2;
            const by = this.y - this.radius - 8;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
            const hpRatio = this.hp / this.maxHp;
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 0;
            ctx.shadowColor = this.color;
            ctx.fillRect(bx, by, barW * hpRatio, barH);
            ctx.shadowBlur = 0;
        }
    }

    // ══ 爬虫 ?带尖刺的菱形 ══
    drawCrawler(ctx, r, isHit, glow) {
        ctx.rotate(this.facingAngle);
        
        // 外围尖刺?根）
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i + this.phase * 0.5;
            const spikeLen = r * (0.4 + Math.sin(this.phase + i) * 0.1);
            const sx = Math.cos(angle) * r * 0.8;
            const sy = Math.sin(angle) * r * 0.8;
            const ex = Math.cos(angle) * (r * 0.8 + spikeLen);
            const ey = Math.sin(angle) * (r * 0.8 + spikeLen);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.strokeStyle = isHit ? '#fff' : this.color;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // 主体菱形
        ctx.beginPath();
        ctx.moveTo(r * 0.9, 0);
        ctx.lineTo(0, -r * 0.65);
        ctx.lineTo(-r * 0.7, 0);
        ctx.lineTo(0, r * 0.65);
        ctx.closePath();
        ctx.fillStyle = isHit ? '#442222' : '#1a0a10';
        ctx.shadowBlur = 0;
        ctx.shadowColor = glow;
        ctx.fill();
        ctx.strokeStyle = isHit ? '#ffffff' : this.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 核心
    ctx.beginPath();
        ctx.arc(r * 0.15, 0, r * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = isHit ? '#fff' : '#ff0044';
        ctx.shadowBlur = 0;
        ctx.shadowColor = '#ff0044';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(r * 0.15, 0, r * 0.06, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // ══ 石像 ?六边形装?══
    drawGolem(ctx, r, isHit, glow) {
        // 外层旋转防护
    ctx.save();
        ctx.rotate(this.phase * 0.3);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI / 4) * i;
            const px = Math.cos(a) * r * 1.1;
            const py = Math.sin(a) * r * 1.1;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = isHit ? 'rgba(255,255,255,0.3)' : `rgba(255, 136, 0, 0.15)`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // 主体六边
    ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i - Math.PI / 6;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = isHit ? '#553322' : '#1a1008';
        ctx.shadowBlur = 0;
        ctx.shadowColor = glow;
        ctx.fill();
        ctx.strokeStyle = isHit ? '#ffffff' : this.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 装甲纹理线（Y形）
        ctx.strokeStyle = isHit ? 'rgba(255,255,255,0.3)' : 'rgba(255, 136, 0, 0.25)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const a = (Math.PI * 2 / 3) * i;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
            ctx.stroke();
        }

        // 核心
        const corePulse = 0.6 + Math.sin(this.phase * 1.5) * 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 170, 0, ${corePulse})`;
        ctx.shadowBlur = 0;
        ctx.shadowColor = '#ff8800';
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // ══ 幽灵 ?半透明圆环 ══
    drawWraith(ctx, r, isHit, glow) {
        const floatY = Math.sin(this.phase * 1.5) * 3;
        ctx.translate(0, floatY);

        // 外围光圈
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(200, 100, 255, ${0.08 + Math.sin(this.phase) * 0.04})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // 主体（半透明+ 波动底部
    ctx.beginPath();
        ctx.arc(0, -r * 0.1, r * 0.7, Math.PI, 0);
        // 波浪底部
        for (let i = 0; i <= 5; i++) {
            const wx = -r * 0.7 + (r * 1.4 / 5) * i;
            const wy = r * 0.3 + Math.sin(this.phase * 2 + i * 1.5) * r * 0.15;
            ctx.lineTo(wx, wy);
        }
        ctx.closePath();
        ctx.fillStyle = isHit ? 'rgba(255,200,255,0.25)' : 'rgba(180, 80, 255, 0.15)';
        ctx.shadowBlur = 0;
        ctx.shadowColor = glow;
        ctx.fill();
        ctx.strokeStyle = isHit ? '#ffffff' : this.color;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 双眼
        for (const side of [-1, 1]) {
            const ex = side * r * 0.22;
            const ey = -r * 0.15;
            ctx.beginPath();
            ctx.arc(ex, ey, r * 0.1, 0, Math.PI * 2);
            ctx.fillStyle = isHit ? '#fff' : '#dd66ff';
            ctx.shadowBlur = 0;
            ctx.shadowColor = '#cc44ff';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(ex, ey, r * 0.04, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }
}
