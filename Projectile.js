export class Projectile {
    constructor(x, y, dx, dy, speed, damage, size, color) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.speed = speed;
        this.damage = damage;
        this.radius = size;
        this.color = color;
        this.lifeTime = 2.0;
        
        // 增强尾迹
        this.trail = [];
        this.trailTimer = 0;
        this.pulsePhase = Math.random() * Math.PI * 2;
    }

    update(dt) {
        this.x += this.dx * this.speed * dt;
        this.y += this.dy * this.speed * dt;
        this.lifeTime -= dt;
        this.pulsePhase += dt * 12;
        
        // 更密集的弹道尾迹
        this.trailTimer += dt;
        if (this.trailTimer > 0.015) {
            this.trail.push({ x: this.x, y: this.y, alpha: 1.0 });
            if (this.trail.length > 12) this.trail.shift();
            this.trailTimer = 0;
        }
        
        for (let i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].alpha -= dt * 5;
            if (this.trail[i].alpha <= 0) this.trail.splice(i, 1);
        }
    }

    draw(ctx) {
        // ── 拖尾渐变 ──
        if (this.trail.length > 1) {
            for (let i = 1; i < this.trail.length; i++) {
                const t = this.trail[i];
                const prev = this.trail[i-1];
                const progress = i / this.trail.length;
                
                ctx.beginPath();
                ctx.moveTo(prev.x, prev.y);
                ctx.lineTo(t.x, t.y);
                ctx.strokeStyle = this.color;
                ctx.lineWidth = this.radius * 1.2 * progress;
                ctx.globalAlpha = t.alpha * 0.3;
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;

        // ── 外部光晕脉冲 ──
        const pulseR = this.radius + 5 + Math.sin(this.pulsePhase) * 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, pulseR, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.08;
        ctx.shadowBlur = 0;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.globalAlpha = 1;

        // ── 中层光晕 ──
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.2;
        ctx.fill();
        ctx.globalAlpha = 1;

        // ── 主弹体（渐变）──
        const grad = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#ffffff');
        grad.addColorStop(1, this.color);

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.shadowBlur = 0;
        ctx.shadowColor = this.color;
        ctx.fill();
        
        ctx.shadowBlur = 0;
    }
}
