export class Gem {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.xpValue = 1;
        this.radius = 6;
        this.magnetized = false;
        this.magnetSpeed = 0;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = 2 + Math.random() * 2;
        this.bobPhase = Math.random() * Math.PI * 2;
        this.sparkTimer = 0;
        this.sparks = []; // {angle, dist, alpha}
    }

    update(dt, playerX, playerY, magnetRadius) {
        this.rotation += this.rotSpeed * dt;
        this.bobPhase += dt * 3;
        
        // 闪光
        this.sparkTimer += dt;
        if (this.sparkTimer > 0.3) {
            this.sparkTimer = 0;
            this.sparks.push({
                angle: Math.random() * Math.PI * 2,
                dist: this.radius * (0.8 + Math.random() * 0.6),
                alpha: 1.0
            });
        }
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            this.sparks[i].alpha -= dt * 3;
            if (this.sparks[i].alpha <= 0) this.sparks.splice(i, 1);
        }

        let dx = playerX - this.x;
        let dy = playerY - this.y;
        let dist = Math.sqrt(dx*dx + dy*dy);

        if (this.magnetized || dist < magnetRadius) {
            this.magnetSpeed += 800 * dt;
            if (dist > 0) {
                this.x += (dx/dist) * this.magnetSpeed * dt;
                this.y += (dy/dist) * this.magnetSpeed * dt;
            }
        }
    }

    draw(ctx) {
        const bob = Math.sin(this.bobPhase) * 2;
        const cx = this.x;
        const cy = this.y + bob;
        const r = this.radius;

        // ── 地面光晕 ──
        const groundGrad = ctx.createRadialGradient(cx, cy + r, 0, cx, cy + r, r * 2);
        groundGrad.addColorStop(0, 'rgba(0, 255, 100, 0.08)');
        groundGrad.addColorStop(1, 'rgba(0, 255, 100, 0)');
        ctx.beginPath();
        ctx.arc(cx, cy + r, r * 2, 0, Math.PI * 2);
        ctx.fillStyle = groundGrad;
        ctx.fill();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.rotation);

        // ── 水晶菱形主体 ──
        // 上半
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.4);
        ctx.lineTo(r * 0.8, 0);
        ctx.lineTo(0, r * 0.3);
        ctx.lineTo(-r * 0.8, 0);
        ctx.closePath();
        
        const topGrad = ctx.createLinearGradient(-r, -r, r, r);
        topGrad.addColorStop(0, '#aaffcc');
        topGrad.addColorStop(0.5, '#44ff88');
        topGrad.addColorStop(1, '#00aa44');
        ctx.fillStyle = topGrad;
        ctx.shadowBlur = 0;
        ctx.shadowColor = '#44ff88';
        ctx.fill();

        // 下半
        ctx.beginPath();
        ctx.moveTo(0, r * 1.0);
        ctx.lineTo(r * 0.8, 0);
        ctx.lineTo(0, r * 0.3);
        ctx.lineTo(-r * 0.8, 0);
        ctx.closePath();
        
        const botGrad = ctx.createLinearGradient(0, 0, 0, r);
        botGrad.addColorStop(0, '#44ff88');
        botGrad.addColorStop(1, '#007733');
        ctx.fillStyle = botGrad;
        ctx.fill();

        // 高光
    ctx.beginPath();
        ctx.moveTo(0, -r * 1.4);
        ctx.lineTo(r * 0.3, -r * 0.2);
        ctx.lineTo(0, r * 0.3);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fill();

        // 边缘
    ctx.beginPath();
        ctx.moveTo(0, -r * 1.4);
        ctx.lineTo(r * 0.8, 0);
        ctx.lineTo(0, r * 1.0);
        ctx.lineTo(-r * 0.8, 0);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.restore();

        // ── 闪光粒子 ──
        for (let sp of this.sparks) {
            const sx = cx + Math.cos(sp.angle) * sp.dist;
            const sy = cy + Math.sin(sp.angle) * sp.dist;
            ctx.globalAlpha = sp.alpha * 0.8;
            ctx.beginPath();
            ctx.arc(sx, sy, 1, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            
            // 十字
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(sx - 2, sy);
            ctx.lineTo(sx + 2, sy);
            ctx.moveTo(sx, sy - 2);
            ctx.lineTo(sx, sy + 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
}
